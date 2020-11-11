import { transferAndWaitForReceipt } from './arb'
const address = process.argv[process.argv.length - 1]
console.log("transfering to", address);

transferAndWaitForReceipt(address)
