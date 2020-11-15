import Twitter from "twitter"

import env from "./constants";
import { transfer } from './arb'
import { messageSlack } from "./slack"

//  simple DOS guard


/* app only / bearer token AUTH doesn't support streaming, it seems, so we're sticking with
user-based auth here for now
*/


const client = new Twitter({
        consumer_key: env.consumerKey,
        consumer_secret: env.consumerSecret,
        access_token_key: env.accessTokenKey,
        access_token_secret: env.accessTokenSecret
    });


export const getRateLimit = async  ()=>{
    const res = await client.get('https://api.twitter.com/1.1/application/rate_limit_status.json',{})
    console.warn(res.resources);

}

export const startStream = (cb)=>{
    const stream = client.stream('statuses/filter', {track: '@Arbi_Swap', tweet_mode: "extended"});
    stream.on('data', cb);
    stream.on('error', (err) => { console.log("Steam Error:", err) })
}

interface TweetToSend{
    tweet: any;
    text: string;
}
class TweetQueue{
    lastTweetSent = 0
    queue: TweetToSend[] = []
    intervalSize = 20000
    constructor(){
        this.runQueue()
    }
    addToQueue = (text: string, tweet: any)=>{
        if (this.queue.find((queuedTweet)=> tweet.id === queuedTweet.tweet.id)){
            console.info('*** Tweet already in queue ***', tweet.id)
        } else {
            this.queue.push({text, tweet})
        }
    }
    private runQueue = ()=>{
        setTimeout(()=>{
            if (this.queue.length === 0 || new Date().getTime() - this.lastTweetSent < this.intervalSize){
                this.runQueue()
                return
            }
            const tweetToSend = this.queue.shift()
            const { text, tweet }= tweetToSend
            client.post('statuses/update',{
                status:`@${tweet.user.screen_name} ${text}`,
                in_reply_to_status_id: tweet.id_str
            }).then((data)=>{
                this.lastTweetSent = new Date().getTime()
                console.info(`successfully replied: ${this.queue.length} tweets in queue`)
            }).catch((err)=>{
                console.warn('error replying to tweet', err);
            }).finally(this.runQueue)
        }, 2000)
    }
}



const tweetQueue = new TweetQueue()


export const processOldTweets = async (options ={verbose: false})=>{
    const { verbose } = options
    try {
        const faucetTweets = await client.get('statuses/home_timeline', {count: 100, tweet_mode: "extended"})
        // sanity check:
        if (faucetTweets.length !== 100){
            throw new Error("Could not fetch own timeline "+ faucetTweets.length )
        }

        const tweetsRespondedToIds = new Set ( faucetTweets.map((tweet)=> tweet.in_reply_to_status_id).filter((t)=>t) )

        let latestRepliedTweet = - 1
        let userRequestTweets = []
        let attempt = 0

        while (attempt < 10 && latestRepliedTweet === -1) {
            if (attempt > 0){
                console.info("searching backlog, attempt", attempt)
            }
            userRequestTweets = userRequestTweets.concat((await client.get('search/tweets', {q: '@Arbi_Swap gimme tokens', count: 100, tweet_mode: "extended"})).statuses )
            latestRepliedTweet = userRequestTweets.findIndex((tweet)=> tweetsRespondedToIds.has(tweet.id))
            attempt ++
        }

        if (latestRepliedTweet > -1){
            const tweetsToReplyTo = userRequestTweets.slice(0, latestRepliedTweet).reverse();
            (verbose || tweetsToReplyTo.length > 0 ) &&   console.log("*** # of backlogged tweets: ***", tweetsToReplyTo.length);
            tweetsToReplyTo.length > 0 && console.log(tweetsToReplyTo.map((tweet)=> tweet.user.screen_name) .join(","))
            tweetsToReplyTo.forEach(processTweet)
        } else {
            throw new Error("Could not find last replied tweet")

        }
    } catch (err){
        console.warn("ERROR PROCESSING OLD TWEETS:");
        console.warn(err);

    }

}

const extractAddress = (str: string): string=> {
    return str
        .replace( /\n/g, " " )
        .split(" ")
        .find((subStr)=> subStr.startsWith("0x") && subStr.length == 42)
}

const isFaucetRequest = (tweetText): boolean=>{
    return tweetText.includes("gimme") && tweetText.includes("tokens")
}


let recipientHash = {}
setInterval(()=>{
    recipientHash = {}
}, 1000 * 60 * 30)
export const processTweet = async  (tweet)=>{

    const { created_at, user: { screen_name, id: userId }, id_str } = tweet

    const full_text = ((tweet)=>{
        const { full_text, extended_tweet, text } = tweet

        if (full_text){
            return full_text
        } else if (extended_tweet){
            return extended_tweet.full_text
        } else {
            return text
        }
    })(tweet)


    console.info('')
    console.info('*** *** *** *** *** *** *** *** *** *** ***')
    console.info(`Processing tweet from @${screen_name}:`)
    console.info(created_at)
    console.info(`Text: '${full_text}'`);



    if (!isFaucetRequest(full_text)){
        console.info('not a faucet request')
        return
    }

    const address = extractAddress(full_text)
    if (!address){
        console.info('no address')
        return tweetQueue.addToQueue("Missing Address — Include an Ethereum address in your tweet!", tweet)
    }

    if (recipientHash[userId]){
        return tweetQueue.addToQueue(`Looks like you were recently sent some funds - slow down there!`, tweet)
    }
    let txStatus = null;
    try {

        const tx = await transfer(address)
        const receipt = await tx.wait()
        const { transactionHash, status } = receipt
        txStatus = status
        console.info('Transfer finished')
        if (status === 0){
            console.warn(receipt);
            tweetQueue.addToQueue(`Unable to send tokens 🤔. @OffchainLabs is on the case!`, tweet)
            throw new Error ('Transaction reverted')
        }
        recipientHash[userId] = true
        tweetQueue.addToQueue(`Your Arbiswap test tokens have been sent: https://explorer.offchainlabs.com/#/tx/${transactionHash}.\r\n\r\nStart swapping! https://swap.arbitrum.io/#/swap?inputCurrency=0xF36D7A74996E7DeF7A6bD52b4C2Fe64019DADa25&outputCurrency=ETH`, tweet)
    } catch(err){

        const readableStatus = ((txStatus)=>{
            switch (txStatus) {
                case 0:
                    return "reverted"
                case 1:
                    return "succeeded"
                case null:
                    return "unknown"
            }
        })(txStatus)
        messageSlack(`${screen_name}'s faucet request failed: \n\n Message:" ${err.message}" \n\n TxStatus: ${readableStatus} https://twitter.com/${screen_name}/status/${id_str}}`)
        console.warn("Error sending tx", err);
        }
    }
