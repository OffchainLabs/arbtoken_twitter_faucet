import  argv  from './getClargs'
import { startFaucetProcess } from "./index"
import { getToken } from "./scripts/get_token"
import { tokenGenProcess } from "./scripts/access_token_gen"
import { transferProcess } from "./transfer"
import { exit } from 'process'
import env from "./constants"

//     "start": "tsc && node dist/index.js",
//     "scrap": "tsc && node dist/v2.js",
//     "get_token": "tsc && node dist/scripts/get_token.js",
//     "lint": "tsc --noEmit && eslint '*/**/*.{js,ts,tsx}' --quiet --fix",
//     "token_gen": "tsc && node dist/scripts/access_token_gen.js",
//     "devstart": "NODE_ENV=dev yarn start",
//     "transfer": "tsc && node dist/transfer.js"
const main = async () => {
    switch (argv.action) {
        case "start":
            if(!argv.chainid) {
                console.error("Error: arg chainid needed")
                exit(1)
            }
            return startFaucetProcess()
            // "start": "tsc && node dist/index.js",
            // "get_token": "tsc && node dist/scripts/get_token.js",
        case "scrap":

        case "get_token":
            // `${env.consumerKey}:${env.consumerSecret}`
            if(!env.consumerKey || !env.consumerSecret) {
                if(!env.consumerKey) console.error("Error: env CONSUMER_KEY needed")
                if(!env.consumerSecret) console.error("Error: env CONSUMER_SECRET needed")
            }
            return getToken()

        case "token_gen":
            return tokenGenProcess()

        case "transfer":
            return transferProcess()
            
        default:
            throw new Error("Not a right action value");
    }
}

main()
.then(() => console.log("Done!"))
  .catch((err) => {
    console.error(JSON.stringify(err));
    throw err;
  });
