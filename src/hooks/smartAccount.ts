import { CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from '@web3auth/base';
import { BundlerClient, ENTRYPOINT_ADDRESS_V07, SmartAccountClient, bundlerActions, createBundlerClient, createSmartAccountClient, providerToSmartAccountSigner } from 'permissionless';
import { SimpleSmartAccount, SmartAccount, SmartAccountSigner } from 'permissionless/accounts';
import { useState, useEffect } from 'react';
import { EIP1193Provider, HttpTransportConfig, defineChain } from 'viem';

import { signerToSimpleSmartAccount } from "permissionless/accounts"
import { createPublicClient, http } from "viem"
import { ENTRYPOINT_ADDRESS_V07_TYPE } from 'permissionless/types';
import { JiffyPaymaster } from '@jiffy-labs/web3a';
import { signerToEcdsaKernelSmartAccount } from "permissionless/accounts"

import { Web3Auth } from "@web3auth/modal";
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider';
import Web3 from 'web3';
import { Hex } from 'viem';
import { KERNEL_V3_1 } from '@zerodev/sdk/constants';
import { createZeroDevPaymasterClient } from '@zerodev/sdk';
 
// const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID;
const clientId = "BKUX3cyb0vRlOfo56ZPoWAQE4Fv9YVMQ17UJuDI5u-b9SNrG4WjYktMdhXA-6YfooQM2RsRcKRPhKTQPtZbEdlQ"

const chainConfig = {
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    chainId: "0xa045c", // hex of 19 for Songbird Canary network
    rpcTarget: "https://rpc.open-campus-codex.gelato.digital",
    displayName: "Open Campus Codex",
    blockExplorerUrl: "https://opencampus-codex.blockscout.com/",
    ticker: "EDU",
    tickerName: "EDU",
    logo: "https://cryptologos.cc/logos/flare-flr-logo.png",
};

const privateKeyProvider = new EthereumPrivateKeyProvider({
    config: { chainConfig },
  });
  
// Config options here will be specific to your project.  See the Web3Auth docs for more info.
const web3auth = new Web3Auth({
    clientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
  privateKeyProvider,
});

const vanarTestnetChain = defineChain({
    // vanar testnet
    id: 78600,
    name: "VANRY_TESTNET",
    nativeCurrency: {
        decimals: 18,
        name: "VANRY",
        symbol: "VANRY",
    },
    rpcUrls: {
        default: {
            http: ["https://rpca-vanguard.vanarchain.com/"],
            webSocket: ["wss://ws.vanarchain.com/"],
        },
    },
    blockExplorers: {
        default: {
            name: "Explorer",
            url: "https://explorer-vanguard.vanarchain.com",
        },
    },
})

const vanarMainnetChain = defineChain({
    // vanar testnet
    id: 2040,
    name: "VANRY_TESTNET",
    nativeCurrency: {
        decimals: 18,
        name: "VANRY",
        symbol: "VANRY",
    },
    rpcUrls: {
        default: {
            http: ["https://rpc.vanarchain.com/"],
            webSocket: ["wss://ws.vanarchain.com/"],
        },
    },
    blockExplorers: {
        default: {
            name: "Explorer",
            url: "https://explorer.vanarchain.com",
        },
    },
})

const educhain = defineChain({
      // educhain
      id: 656476,
      name: "Open Campus Codex",
      nativeCurrency: {
        decimals: 18,
        name: "EDU",
        symbol: "EDU",
      },
      rpcUrls: {
        default: {
          http: ["https://rpc.open-campus-codex.gelato.digital"],
          // webSocket: ["wss://ws-vanguard.vanarchain.com/"],
        },
      },
      blockExplorers: {
        default: {
          name: "Explorer",
          url: "https://opencampus-codex.blockscout.com/",
        },
      },
    })
    
    const chain = educhain
    const PROJECT_ID= `d752f5fe-b0cc-4cb3-a781-e0a5b4931115`
    const BUNDLER_RPC =  'https://rpc.zerodev.app/api/v2/bundler/d752f5fe-b0cc-4cb3-a781-e0a5b4931115'
    const PAYMASTER_RPC = 'https://rpc.zerodev.app/api/v2/paymaster/d752f5fe-b0cc-4cb3-a781-e0a5b4931115'
    const entryPoint = ENTRYPOINT_ADDRESS_V07
    const kernelVersion = KERNEL_V3_1

function useSmartAccount() {
    const [provider, setProvider] = useState<IProvider | null>(null);
    const [smartAccountSigner, setSmartAccountSigner] = useState<SmartAccountSigner | null>(null);
    const [simpleSmartAccount, setSimpleSmartAccount] = useState<SimpleSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE> | null>(null);
    const [smartAccountClient, setSmartAccountClient] = useState<SmartAccountClient<ENTRYPOINT_ADDRESS_V07_TYPE> | null>(null);
    const [publicClient, setPublicClient] = useState<ReturnType<typeof createPublicClient> | null>(null);
    const [bundlerClient, setBundlerClient] = useState<BundlerClient<ENTRYPOINT_ADDRESS_V07_TYPE> | null>(null);

    useEffect(() => {
        const init = async () => {
            if (!provider) return;

            console.log("Provider details:", provider); // Check what's inside provider
            
           
            const smartAccountSigner = await providerToSmartAccountSigner(provider as EIP1193Provider);
            setSmartAccountSigner(smartAccountSigner);
            
             // Construct a public client
            const publicClient = createPublicClient({
                transport: http(BUNDLER_RPC),
            })

            // const smartAccount = await signerToSimpleSmartAccount(publicClient, {
            //     signer: smartAccountSigner,
            //     entryPoint: ENTRYPOINT_ADDRESS_V07,
            //     factoryAddress: '0x0baDC4D69Ac9e13786C8fC30eB543C3472Fd77EA'
            // })
            
            

            
            

            const smartAccount = await signerToEcdsaKernelSmartAccount(publicClient, {
                signer: smartAccountSigner,
                entryPoint: ENTRYPOINT_ADDRESS_V07, // v0.7 entrypoint
            });

            const smartAccountClient = createSmartAccountClient({
                account: smartAccount,
                entryPoint: ENTRYPOINT_ADDRESS_V07,
                chain: educhain, // or whatever chain you are using
                bundlerTransport: http(BUNDLER_RPC),
                middleware: {
                    sponsorUserOperation: async ({ userOperation }) => {
                        const zerodevPaymaster = createZeroDevPaymasterClient({
                          chain,
                          entryPoint,
                          transport: http(PAYMASTER_RPC),
                        })
                        return zerodevPaymaster.sponsorUserOperation({
                            userOperation,
                            entryPoint,
                          })
                    }
                },
            })

            const accountAddress = smartAccountClient.account.address
            console.log("My account:", accountAddress)

            setSimpleSmartAccount(smartAccount as unknown as SimpleSmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE>);
            setPublicClient(publicClient);
            setBundlerClient(bundlerClient);
            setSmartAccountClient(smartAccountClient);
        }
        init();
    }, [provider])

    useEffect(() => {
        if (!smartAccountClient) return;
        console.log('smart account', smartAccountClient.account?.address)
    })

    const sendTransaction = async (to: `0x${string}`, value: bigint, data: `0x${string}`) => {
        if (!smartAccountClient) return;
        console.log('data', data);
        //@ts-ignore
        const tx = await smartAccountClient.sendTransaction({
            to,
            value,
            data,
            maxFeePerGas: BigInt(1000000000),
            maxPriorityFeePerGas: BigInt(1000000000)
        })
        console.log(tx);
        return tx;
    }

    return { provider, setProvider, sendTransaction, smartAccountClient, simpleSmartAccount };
}

export default useSmartAccount;