import Twitter from "twitter"

import env from "./constants";
import { transfer, EOAtransfer } from './arb'
import { messageSlack } from "./slack"

//  simple DOS guard


/* app only / bearer token AUTH doesn't support streaming, it seems, so we're sticking with
user-based auth here for now
*/

const swapMessage = ()=>{
    const msgs = ["Start swapping!", "Swap it up!", "Swap til you drop!", "Swap responsibly!"]
    return msgs[Math.floor(Math.random() * msgs.length)];
}

const burnMessage = ()=>{
    const msgs = ["Feel the burn!", "Burn it up!", "Burn baby burn!"]
    return msgs[Math.floor(Math.random() * msgs.length)];
}

const newFaucetMessage = ()=>{
    const msgs = ["Enjoy!", "Arbitrum awaits!", "Go get em!", "Have at it!", "Don't spend it all in one place :)", "Godspeed!"]
    return msgs[Math.floor(Math.random() * msgs.length)];
}


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
    const stream = client.stream('statuses/filter', {track: '@nitro_devnet', tweet_mode: "extended"});
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
    intervalSize = 1000*30
    constructor(){
        this.runQueue()
    }
    get somePending(){
        return this.queue.length > 0
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



export const tweetQueue = new TweetQueue()


export const processOldTweets = async (options ={verbose: false})=>{
    console.warn(new Date().toString());
    const { verbose } = options
    try {
        const faucetTweets = await client.get('statuses/home_timeline', {count: 200, tweet_mode: "extended"})
        // sanity check:
        
        
        if (faucetTweets.length === 0){
            console.log('no tweets found in own TL');
            return 
        }
        // sanity check
        const tweetBenchmarkDate = new Date( faucetTweets[faucetTweets.length -1 ].created_at)

        const tweetsRespondedToIds = new Set ( faucetTweets.map((tweet)=> tweet.in_reply_to_status_id).filter((t)=>t) )

        let userRequestTweets = (await client.get('statuses/mentions_timeline', {count: 200, tweet_mode: "extended", since_id:1325265507042402300}))
        if (!userRequestTweets.some((tweet)=> tweetsRespondedToIds.has(tweet.id))){
            console.warn("WARNING: no responses in last tweet batch, suspicious....");
        }
        
        const unrepliedFaucetRequests = userRequestTweets.filter((tweet)=> isFaucetRequest(tweet.full_text) && !tweetsRespondedToIds.has(tweet.id) && new Date(tweet.created_at) > tweetBenchmarkDate);
        console.info('tweets that need replying:', unrepliedFaucetRequests.length);
        for (let i = 0; i < unrepliedFaucetRequests.length; i++) {
            await processTweetNewFaucet(unrepliedFaucetRequests[i])
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

const isFaucetRequest = (tweetText: string): boolean=>{
    return tweetText.toLowerCase().includes("nitro devnet")
}


let recipientHash = {}
// setInterval(()=>{
//     recipientHash = {}
// }, 1000 * 60 * 60)

export const processTweetNewFaucet =  (tweet)=>{
    console.warn(new Date().toString());

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

    if (!isFaucetRequest(full_text)){
        console.info('not a faucet request')
        return
    }
    
    if (recipientHash[userId]){
        console.info('user in recipient hash already')
        return 
    }

    tweetQueue.addToQueue(`This faucet is deprecated! Check out our new smart contract faucet here; ${newFaucetMessage()} http://faucet.arbitrum.io/`, tweet)
    recipientHash[userId] = true
}

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
    console.info(`Processing tweet from @${screen_name}: ${id_str}`)
    console.info(created_at)
    console.info(`Text: '${full_text}'`);



    if (!isFaucetRequest(full_text)){
        console.info('not a faucet request')
        return
    }

    const address = extractAddress(full_text)
    if (!address){
        console.info('No address',tweet.id_str)
        return tweetQueue.addToQueue("Missing Address — Include an Ethereum address in your tweet!", tweet)
    }

    if (recipientHash[userId]){
        return tweetQueue.addToQueue(`Looks like you were recently sent some funds - slow down there!`, tweet)
    }
    let txStatus = null;
    try {

        const tx = await EOAtransfer(address)
        const receipt = await tx.wait()
        const { transactionHash, status } = receipt
        txStatus = status
        console.info('Transfer finished')
        if (status === 0){
            console.warn(receipt);
            tweetQueue.addToQueue(`Unable to send ether 🤔. @OffchainLabs is on the case!`, tweet)
            throw new Error ('Transaction reverted')
        }
        recipientHash[userId] = true
        const message = `Your Ether has been sent on the nitro-testnet: https://nitro-devnet-explorer.arbitrum.io/tx/${transactionHash}.\r\n\r\n`
        tweetQueue.addToQueue(message, tweet)

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
        messageSlack(`${screen_name}'s faucet request failed: \n\n Message:" ${err.message}" \n\n TxStatus: ${readableStatus} https://twitter.com/${screen_name}/status/${id_str}`)
        console.warn("Error sending tx", err);
        }
    }
