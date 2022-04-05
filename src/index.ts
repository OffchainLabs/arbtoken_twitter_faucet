import { startStream, processTweet,processOldTweets, processTweetNewFaucet, getRateLimit } from './twitter'
import { transfer, resetFaucet, getTokenBalance, getEthBalance, getWalletAddress, getFaucetAddress } from './arb'
import { ethers } from 'ethers'
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
