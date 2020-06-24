import { startStream, reply } from './twitter'
import { transfer, resetFaucet, getAssertion, getTokenBalance, getEthBalance, getWalletEthBalance, getWalletAddress, getFaucetAddress } from './arb'
import { ethers } from 'ethers'
import express from 'express'
import db from './db'
const cors = require('cors')
import bodyParser from 'body-parser'
import morgan from 'morgan'
import env from "./constants";
const app = express()

if (process.env.NODE_ENV === 'dev'){
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'
} else {
    require('https').globalAgent.options.ca = require('ssl-root-cas/latest').create();
}



app.use(cors())
app.use(bodyParser())
app.use(morgan('combined'));

/* nedb' autoload flag should, in theory take care of loading db, but seeing stale lookups after insert for some reason. hence: */
const loadDB = (req, res, next)=>{
    db.loadDatabase(next)
}

app.post('/funds',loadDB, (req, res) => {
    const { address, token } = req.body
    const targetAddress = extractAddress(address)

    db.findOne({ token }, async(err, tokenRecord) => {
        if(err){
            return res.status(500).json(`Error: ${err.toString()}`)
        }
        if (!tokenRecord){
            return res.status(500).json('Invalid access token')
        }
        if (!targetAddress){
            return res.status(500).json('Invalid address')
        }
        if (tokenRecord.requests > 20){
            return res.status(500).json('Rate limit exceeded')
        }
        try {
            const txn = await send(targetAddress)
            db.update(tokenRecord, {...tokenRecord,  requests: tokenRecord.requests + 1 } )
            res.json(txn)
        } catch (err) {
            return res.status(500).json(`Failed to transfer funds, ${err.toString()}`)
        }

      });
})

app.get('/ping', (req, res)=>{
    res.send('pong')
})

app.listen(env.port, () => console.log(`Listening on port ${env.port}`))




//  simple dos guard
let recipientHash = {}
setInterval(()=>{
    recipientHash = {}
}, 1000 * 60 * 30)

startStream( async (tweet)=> {
    console.info(tweet && `incoming tweet: ${tweet.text}`);

    if (!isFaucetRequest(tweet.text)){
        console.info('not a faucet request')
        return
    }

    const address = extractAddress(tweet.text)
    if (!address){
        console.info('no address')
        return reply("Missing Address!", tweet)
    }

    const { id: userId }  = tweet.user;

    if (recipientHash[userId]){
        return reply(`Looks like you were recently sent some funds - slow down there!`, tweet)
    }

    const tx = await transfer(address)
    const receipt = await tx.wait()
    const { transactionHash } = receipt

    const assertionTxHash = await getAssertion(transactionHash)
    recipientHash[userId] = true
    console.info('transfer complete!')
    // TODO: transactionHash is the arbitrum transaction hash so the etherscan link wouldn't be valid
    // What would be good to put here? If we wanted we could get the transaction of the assertion that
    // processed the transfer or the hash of the message batch that included it
    reply(`Your funds have been sent, and are now available to use on the Arbiswap rollup chain! http://uniswap-demo.offchainlabs.com/`, tweet)


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
    console.log("Wallet Address:", await getWalletAddress())
    console.log("Wallet Eth Balance (For making txes):", ethers.utils.formatEther(await getWalletEthBalance()))
    console.log()
    console.log("Faucet Address:", getFaucetAddress())
    console.log("Faucet Eth Balance:", ethers.utils.formatEther(await getEthBalance()))
    console.log("Faucet Token Balance:", ethers.utils.formatEther(await getTokenBalance()))
}

async function send(address: string) {
        const tx = await transfer(address)
        const receipt = await tx.wait()
        const { transactionHash } = receipt

        const assertionTxHash = await getAssertion(transactionHash)

        console.log(`Funds sent! https://ropsten.etherscan.io/tx/${assertionTxHash}`)
        return assertionTxHash
}

debugPrint()
// send("0x38299D74a169e68df4Da85Fb12c6Fd22246aDD9F")
