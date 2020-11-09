import { startStream, processOldTweets, processTweet } from './twitter'
import { transfer, resetFaucet, getTokenBalance, getEthBalance, getWalletEthBalance, getWalletAddress, getFaucetAddress } from './arb'
import { ethers } from 'ethers'
import express from 'express'


async function debugPrint() {
    console.log("Wallet Address", await getWalletAddress());
    console.log("Wallet Eth Balance (For making txes):", ethers.utils.formatEther(await getWalletEthBalance()))
    console.log("Faucet Token Balance:", ethers.utils.formatEther(await getTokenBalance()))
}

debugPrint()

startStream( async (tweet)=> {
    const { id: userId, screen_name }  = tweet.user;
    console.info('')
    console.info('*** *** *** *** *** *** *** *** *** *** ***')
    console.info(`Incoming tweet from @${screen_name}:`)
    console.info(`Text: '${tweet.text}'`);

    processTweet(tweet)

})

processOldTweets()
