import * as fetch from "node-fetch";
import { ethers } from 'ethers'
import { ArbProvider, ArbWallet } from 'arb-provider-ethers'
import env from './constants'
import { ArbERC20Factory } from 'arb-provider-ethers/dist/lib/abi/ArbERC20Factory'
import { FaucetWalletFactory } from './FaucetWalletFactory'

(global as any).fetch = fetch;

const ethereumProvider = new ethers.providers.JsonRpcProvider(env.ethProviderUrl)
const arbProvider = new ethers.providers.JsonRpcProvider(env.arbProviderUrl)


const ethereumWallet = new ethers.Wallet(env.privateKey, ethereumProvider);
const arbWallet = new ethers.Wallet(env.privateKey, arbProvider);
const arbFaucetWallet = FaucetWalletFactory.connect(
  env.faucetWalletAddress,
  arbWallet
)

const arbTokenContract = ArbERC20Factory.connect(
	env.tokenAddress,
	arbWallet
)

export const transfer = (to: string) => {
	return arbTokenContract.transfer(to, ethers.utils.parseEther("1000"))
}

export const transferAndWaitForReceipt = async (to: string)=> {
	const tx = await transfer(to)
	const rec = await tx.wait()
	console.info(rec);
	console.log(`Your Arbiswap test tokens have been sent: https://explorer.offchainlabs.com/#/tx/${rec.transactionHash}.\r\n\r\nStart swapping! https://swap.arbitrum.io/#/swap?inputCurrency=0xF36D7A74996E7DeF7A6bD52b4C2Fe64019DADa25&outputCurrency=ETH`);


}

export const faucetContractTransfer = (to: string) => {
  return arbFaucetWallet.transfer(to)
}

export const resetFaucet = (ethValue: ethers.utils.BigNumber, tokenValue: ethers.utils.BigNumber) => {
	return arbFaucetWallet.updateFaucet(env.tokenAddress, tokenValue, ethValue)
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

export const getWalletEthBalance = async (): Promise<ethers.utils.BigNumber> => {
	return ethereumProvider.getBalance(await arbWallet.getAddress())
}
