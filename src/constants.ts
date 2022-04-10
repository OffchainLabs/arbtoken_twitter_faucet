require('dotenv').config()

export default  {
    consumerKey: process.env.CONSUMER_KEY,
    consumerSecret: process.env.CONSUMER_SECRET,
    accessTokenKey: process.env.ACCESS_TOKEN_KEY,
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
    arbProviderUrl: process.env.ARB_PROVIDER_URL,
    arbValidatorUrl: process.env.ARB_VALIDATOR_URL,
    privateKey: process.env.PRIVATE_KEY,
    tokenAddress: process.env.TOKEN_ADDRESS,
    bearerToken: process.env.BEARER_TOKEN,
    faucetWalletAddress: process.env.FAUCET_WALLET_ADDRESS,
    port: process.env.PORT,
    devMode: process.env.DEV_MODE
}
