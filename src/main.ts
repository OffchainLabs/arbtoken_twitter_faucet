import  argv  from './getClargs';
import { startFaucetProcess } from "./index";
import { getToken } from "./scripts/get_token";
import { exit } from 'process';
import env from "./constants";

const main = async () => {
    switch (argv.action) {
        case "start":
            if(!argv.chainid) {
                throw new Error("Error: arg chainid needed");
            }
            return startFaucetProcess();

        case "get_token":
            if(!env.consumerKey) throw new Error("Error: env CONSUMER_KEY needed");
            if(!env.consumerSecret) throw new Error("Error: env CONSUMER_SECRET needed");
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

