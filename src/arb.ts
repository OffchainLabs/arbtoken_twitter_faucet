import * as fetch from "node-fetch";
import { ethers } from 'ethers'
import { ArbProvider, ArbWallet } from 'arb-provider-ethers'
import env from './constants'
import { ArbERC20Factory } from 'arb-provider-ethers/dist/lib/abi/ArbERC20Factory'
import { FaucetWalletFactory } from './FaucetWalletFactory'

(global as any).fetch = fetch;

const arbProvider = new ethers.providers.JsonRpcProvider(env.arbProviderUrl)


const arbWallet = new ethers.Wallet(env.privateKey, arbProvider);
	const arbFaucetWallet = FaucetWalletFactory.connect(
  env.faucetWalletAddress,
  arbWallet
)

const arbTokenContract = ArbERC20Factory.connect(
	env.tokenAddress || "0xAddA0B73Fe69a6E3e7c1072Bb9523105753e08f8"/** stub so it doesn't complain on start up*/ , 
	arbWallet
)

export const transfer = async (to: string) => {
	if(!env.tokenAddress )return
	const nonce = (await arbWallet.getTransactionCount())
	return arbTokenContract.transfer(to, ethers.utils.parseEther("1000"), { nonce })
}

export const transferAndWaitForReceipt = async (to: string)=> {
	const tx = await transfer(to)
	const rec = await tx.wait()
	console.info(rec);
	console.log(`Your Arbiswap test tokens have been sent: https://explorer.offchainlabs.com/#/tx/${rec.transactionHash}.\r\n\r\nStart swapping! https://swap.arbitrum.io/#/swap?inputCurrency=0xF36D7A74996E7DeF7A6bD52b4C2Fe64019DADa25&outputCurrency=ETH`);


}

export const getUsersTokenBalance = async (address: string)=>{
	const bal = await arbTokenContract.balanceOf(address)
	console.log(bal.toString());
	return bal
}

export const faucetContractTransfer = (to: string) => {
	return arbFaucetWallet.transfer(to)
}

export const resetFaucet = (ethValue: ethers.utils.BigNumber, tokenValue: ethers.utils.BigNumber) => {
	return arbFaucetWallet.updateFaucet(env.tokenAddress, tokenValue, ethValue)
}

export const EOAtransfer = (to: string) => {
	return arbWallet.sendTransaction({
		to,
		value: ethers.utils.parseEther("0.01")

	})
}
export const getWalletAddress = async (): Promise<string> => {
	return arbWallet.getAddress()
}

export const getFaucetAddress = (): string => {
	return env.faucetWalletAddress
}

export const getTokenBalance = (): Promise<ethers.utils.BigNumber> => {
	return arbTokenContract.balanceOf(arbWallet.address)
}

export const getEthBalance = async (): Promise<ethers.utils.BigNumber> => {
	return arbProvider.getBalance(env.faucetWalletAddress)
}
