import { IProvider } from '@web3auth/base';
import { BundlerClient, ENTRYPOINT_ADDRESS_V07, SmartAccountClient, createBundlerClient, createSmartAccountClient, providerToSmartAccountSigner } from 'permissionless';
import { SimpleSmartAccount, SmartAccountSigner } from 'permissionless/accounts';
import { useState, useEffect } from 'react';
import { EIP1193Provider, HttpTransportConfig, defineChain } from 'viem';
import { signerToSimpleSmartAccount } from "permissionless/accounts";
import { createPublicClient, http } from "viem";
import { ENTRYPOINT_ADDRESS_V07_TYPE } from 'permissionless/types';
import { JiffyPaymaster } from '@jiffy-labs/web3a';

const vanarTestnetChain = defineChain({
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
});
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
});

const jiffyscanUrl = "https://vanar.jiffyscan.xyz";
const jiffyscanKey = process.env.NEXT_PUBLIC_JIFFYSCAN_API_KEY as string;
const options: HttpTransportConfig = {
    fetchOptions: {
        headers: {
            'x-api-key': jiffyscanKey,
        }
    }
};

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

            const smartAccountSigner = await providerToSmartAccountSigner(provider as EIP1193Provider);
            setSmartAccountSigner(smartAccountSigner);

            const paymasterClient = new JiffyPaymaster(jiffyscanUrl, 2040, {
                'x-api-key': jiffyscanKey,
            });

            const bundlerClient = createBundlerClient({
                transport: http(jiffyscanUrl, options),
                entryPoint: ENTRYPOINT_ADDRESS_V07,
            });

            const publicClient = createPublicClient({
                transport: http("https://rpc.vanarchain.com/"),
                chain: vanarMainnetChain,
            });

            const smartAccount = await signerToSimpleSmartAccount(publicClient, {
                signer: smartAccountSigner,
                entryPoint: ENTRYPOINT_ADDRESS_V07,
                factoryAddress: '0xd02a5f77c53a3520b92677efcfeda69ac123ebce',
            });

            const smartAccountClient = createSmartAccountClient({
                account: smartAccount,
                entryPoint: ENTRYPOINT_ADDRESS_V07,
                chain: vanarMainnetChain,
                bundlerTransport: http(jiffyscanUrl, options),
                middleware: {
                    sponsorUserOperation: paymasterClient.sponsorUserOperationV7,
                },
            });

            setSimpleSmartAccount(smartAccount);
            setPublicClient(publicClient);
            setBundlerClient(bundlerClient);
            setSmartAccountClient(smartAccountClient);
        };
        init();
    }, [provider]);

    useEffect(() => {
        if (!smartAccountClient) return;
        console.log('smart account', smartAccountClient.account?.address);
    }, [smartAccountClient]);

    const sendTransaction = async (to: `0x${string}`, value: bigint, data: `0x${string}`) => {
        if (!smartAccountClient) return;
        const tx = await smartAccountClient.sendTransaction({
            to,
            value,
            data,
            maxFeePerGas: BigInt(1000000000),
            maxPriorityFeePerGas: BigInt(1000000000),
            account: smartAccountClient.account as unknown as `0x${string}`,
            chain: undefined,
        });
        console.log(tx);
        return tx;
    };

    const fetchUserOperationHash = async (txHash: string) => {
        const uoHash = "";
        let retries = 0;
        let resObj = null;

        while (retries < 20) {
            const res = await fetch(`https://api.jiffyscan.xyz/v0/getBundleActivity?bundle=${txHash}&network=vanar-mainnet&first=10&skip=0`, {
                headers: {
                    "x-api-key": jiffyscanKey,
                },
            });
            resObj = JSON.parse(await res.text());

            if ("bundleDetails" in resObj && "userOps" in resObj.bundleDetails && resObj.bundleDetails.userOps.length > 0) {
                return resObj.bundleDetails.userOps[0].userOpHash;
            } else {
                console.log("No bundle details found, retrying...");
                retries++;
                await new Promise((r) => setTimeout(r, 3000)); // wait for 3 seconds before retrying
            }
        }

        if (retries >= 5) {
            console.log("Failed to fetch bundle details after 5 retries");
        }

        return uoHash;
    };

    return { provider, setProvider, sendTransaction, smartAccountClient, simpleSmartAccount, fetchUserOperationHash };
}

export default useSmartAccount;
