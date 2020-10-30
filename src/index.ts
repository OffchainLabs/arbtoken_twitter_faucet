import { startStream, reply } from './twitter'
import { transfer, resetFaucet, getTokenBalance, getEthBalance, getWalletEthBalance, getWalletAddress, getFaucetAddress } from './arb'
import { ethers } from 'ethers'
import express from 'express'


//  simple DOS guard
let recipientHash = {}
setInterval(()=>{
    recipientHash = {}
}, 1000 * 60 * 30)

startStream( async (tweet)=> {
    const { id: userId, screen_name }  = tweet.user;
    console.info('')
    console.info('*** *** *** *** *** *** *** *** *** *** ***')
    console.info(`Incoming tweet from @${screen_name}:`)
    console.info(`Text: '${tweet.text}'`);

    if (!isFaucetRequest(tweet.text)){
        console.info('not a faucet request')
        return
    }

    const address = extractAddress(tweet.text)
    if (!address){
        console.info('no address')
        return reply("Missing Address — Include an Ethereum address in your tweet!", tweet)
    }

    if (recipientHash[userId]){
        return reply(`Looks like you were recently sent some funds - slow down there!`, tweet)
    }

    const tx = await transfer(address)
    const receipt = await tx.wait()
    const { transactionHash } = receipt

    // const assertionTxHash = await getAssertion(transactionHash)
    recipientHash[userId] = true
    // TODO: check no revert?
    console.info('Transfer successful!')

    reply(`Your funds have been sent: https://explorer.offchainlabs.com/#/tx/${transactionHash}.\r\n\r\nStart swapping! https://swap.arbitrum.io/#/swap`, tweet)


})

const extractAddress = (str: string): string=> {
    return str
        .split(" ")
        .filter((subStr)=> subStr.startsWith("0x") && subStr.length == 42)
        [0] || ""
}

const isFaucetRequest = (tweetText): boolean=>{
    return tweetText.includes("gimme") && tweetText.includes("tokens")
}

async function debugPrint() {
    console.log("Wallet Address", await getWalletAddress());
    console.log("Wallet Eth Balance (For making txes):", ethers.utils.formatEther(await getWalletEthBalance()))
    console.log("Faucet Token Balance:", ethers.utils.formatEther(await getTokenBalance()))
}

debugPrint()
