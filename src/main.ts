import  argv  from './getClargs';
import { startFaucetProcess } from "./index";
import { getToken } from "./scripts/get_token";
import { exit } from 'process';
import env from "./constants";

const main = async () => {
    switch (argv.action) {
        case "start":
            if(!argv.chainid) {
                console.error("Error: arg chainid needed");
                exit(1);
            }
            return startFaucetProcess();
            // "start": "tsc && node dist/index.js",
            // "get_token": "tsc && node dist/scripts/get_token.js",
        case "get_token":
            // `${env.consumerKey}:${env.consumerSecret}`
            if(!env.consumerKey || !env.consumerSecret) {
                if(!env.consumerKey) console.error("Error: env CONSUMER_KEY needed");
                if(!env.consumerSecret) console.error("Error: env CONSUMER_SECRET needed");
            }
            return getToken();

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

