import { startStream, processTweet,processOldTweets, processTweetNewFaucet, getRateLimit } from './twitter'
import { transfer, resetFaucet, getTokenBalance, getEthBalance, getWalletAddress, getFaucetAddress, EOAtransfer } from './arb'
import { ethers } from 'ethers'
import { messageSlack } from './slack'
import express from 'express'
async function debugPrint() {
    console.log("Wallet Address", await getWalletAddress());
    console.log("Wallet Eth Balance (For making txes):", ethers.utils.formatEther(await getEthBalance()))
    // console.log("Faucet Token Balance:", ethers.utils.formatEther(await getTokenBalance()))
}

debugPrint()

startStream( async (tweet)=> {

    processTweet(tweet)

})

processOldTweets({verbose: true})

// Safety check for any missed tweets
setInterval(()=>{
    processOldTweets()
}, 1000*60*5)

// check faucet balance
setInterval(async ()=>{
    const bal = +ethers.utils.formatEther(await getEthBalance())    
    if(bal < 30){
        const address = await getWalletAddress()
        messageSlack(`Faucet is running low; only has ${bal} Eth left; send Eth to ${address}`)
    }
}, 1000 * 60 * 15 )
