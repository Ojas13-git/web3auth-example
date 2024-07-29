import { IProvider } from '@web3auth/base';
import { BundlerClient, ENTRYPOINT_ADDRESS_V07, SmartAccountClient, createBundlerClient, createSmartAccountClient, providerToSmartAccountSigner } from 'permissionless';
import { SimpleSmartAccount, SmartAccount, SmartAccountSigner } from 'permissionless/accounts';
import { useState, useEffect } from 'react';
import { EIP1193Provider, HttpTransportConfig, defineChain } from 'viem';
import { signerToSimpleSmartAccount } from "permissionless/accounts"
import { createPublicClient, http } from "viem"
import { ENTRYPOINT_ADDRESS_V07_TYPE } from 'permissionless/types';
import { JiffyPaymaster } from '@jiffy-labs/web3a';

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
const jiffyscanUrl = "https://vanar.jiffyscan.xyz";
const jiffyscanKey = process.env.NEXT_PUBLIC_JIFFYSCAN_API_KEY as string;
const options: HttpTransportConfig = {
    fetchOptions: {
        headers: {
            'x-api-key': jiffyscanKey,
        }
    }
}

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
            console.log(provider)
            const smartAccountSigner = await providerToSmartAccountSigner(provider as EIP1193Provider)
            setSmartAccountSigner(smartAccountSigner);

            const paymasterClient = new JiffyPaymaster(jiffyscanUrl, 2040,
                {
                    'x-api-key': jiffyscanKey,
                }
            );

            const bundlerClient = createBundlerClient({
                transport: http(jiffyscanUrl, options),
                entryPoint: ENTRYPOINT_ADDRESS_V07,
            })

            const publicClient = createPublicClient({
                transport: http("https://rpc.vanarchain.com/"),
                chain: vanarMainnetChain,
            })

            const smartAccount = await signerToSimpleSmartAccount(publicClient, {
                signer: smartAccountSigner,
                entryPoint: ENTRYPOINT_ADDRESS_V07,
                factoryAddress: '0x0baDC4D69Ac9e13786C8fC30eB543C3472Fd77EA'
            })

            const smartAccountClient = createSmartAccountClient({
                account: smartAccount,
                entryPoint: ENTRYPOINT_ADDRESS_V07,
                chain: vanarMainnetChain, // or whatever chain you are using
                bundlerTransport: http(jiffyscanUrl, options),
                middleware: {
                    sponsorUserOperation: paymasterClient.sponsorUserOperationV7,
                },
            })

            setSimpleSmartAccount(smartAccount);
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