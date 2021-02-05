import { startStream, processOldTweets, processTweetNewFaucet } from './twitter'
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

    processTweetNewFaucet(tweet)

})

// processOldTweets({verbose: true})

// setInterval(()=>{
//     processOldTweets()
// }, 1000*60*2)
