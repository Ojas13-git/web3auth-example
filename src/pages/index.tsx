

"use client";

import { useEffect, useState } from "react";
import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { createPublicClient, custom, Address, encodeFunctionData, createWalletClient } from "viem";
import { NETWORK_RPC_MAP } from "./constants";
import useSmartAccount from "@/hooks/smartAccount";

const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID;

const chainConfig = {
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    chainId: "0x7f8", // hex of 19 for Songbird Canary network
    rpcTarget: "https://rpc.vanarchain.com/",
    displayName: "Vanar Network",
    blockExplorerUrl: "https://explorer.vanarchain.com/",
    ticker: "VANRY",
    tickerName: "VANRY",
    logo: "https://cryptologos.cc/logos/flare-flr-logo.png",
};
const chainId = 2040;
const privateKeyProvider = new EthereumPrivateKeyProvider({
    config: { chainConfig },
});

const web3auth = new Web3Auth({
    clientId: clientId || "",
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
    privateKeyProvider,
});

function App() {
    const { provider, setProvider, sendTransaction: sendSmartTransaction, simpleSmartAccount, smartAccountClient, fetchUserOperationHash } = useSmartAccount();
    const [loggedIn, setLoggedIn] = useState(false);
    const [consoleOutput, setConsoleOutput] = useState<string>("");

    useEffect(() => {
        const init = async () => {
            try {
                await web3auth.initModal();
                setProvider(web3auth.provider);

                if (web3auth.connected) {
                    setLoggedIn(true);
                }
            } catch (error) {
                console.error(error);
            }
        };

        init();
    }, []);

    const login = async () => {
        const web3authProvider = await web3auth.connect();
        setProvider(web3authProvider);
        if (web3auth.connected) {
            setLoggedIn(true);
        }
    };

    const logout = async () => {
        await web3auth.logout();
        setProvider(null);
        setLoggedIn(false);
    };

    const getAccounts = async (): Promise<Address | undefined> => {
        if (!provider) {
            uiConsole("provider not initialized yet");
            return;
        }

        try {
            const address = await simpleSmartAccount?.address;
            uiConsole(address);
            return address as Address; // Assuming the first address is used
        } catch (error) {
            console.error("Error getting accounts:", error);
        }
    };

    const getBalance = async () => {
        if (!provider) {
            uiConsole("provider not initialized yet");
            return;
        }

        const publicClient = createPublicClient({
            chain: NETWORK_RPC_MAP[chainId],
            transport: custom(provider),
        });

        try {
            const address = await getAccounts();
            if (!simpleSmartAccount?.address) {
                throw new Error("Address not found");
            }
            const balance = await publicClient.getBalance({ address: simpleSmartAccount?.address });
            uiConsole({ balance: balance.toString() }); // Convert BigInt to string
        } catch (error) {
            console.error("Error getting balance:", error);
        }
    };

    const sendTransaction = async () => {
        if (!provider) {
            uiConsole("provider not initialized yet");
            return;
        }
        
        try {
            uiConsole("Sending transaction...");
            const txHash = await sendSmartTransaction("0x0B3074cd5891526420d493B13439f3D4b8be6144", BigInt("0"), "0x");
            uiConsole("Transaction Receipt:", txHash, null, "sendTransaction");
        } catch (error) {
            console.error("Error sending transaction:", error);
        }
    };

    const mintTokens = async () => {
        if (!smartAccountClient) {
            uiConsole("smartAccountClient not initialized yet");
            return;
        }
        try {
            uiConsole("Minting 50 tokens...");
            const txHash = await sendSmartTransaction(
                "0x41716E1Ceb7FFF7B76929dd793043f005c7899a3",
                BigInt("0"),
                encodeFunctionData({
                    functionName: "mintFifty",
                    abi: [
                        {
                            inputs: [
                                {
                                    internalType: "uint256",
                                    name: "_amount",
                                    type: "uint256",
                                },
                            ],
                            name: "mintFifty",
                            outputs: [],
                            stateMutability: "nonpayable",
                            type: "function",
                        },
                    ],
                    args: [BigInt("50")],
                })
            );
            const uoHash = await fetchUserOperationHash(`${txHash}`);
            uiConsole("Transaction Receipt:", txHash, uoHash, "mintTokens");
        } catch (error) {
            console.error("Error sending transaction:", error);
        }
    };

    const signMessage = async () => {
        if (!provider) {
            uiConsole("provider not initialized yet");
            return;
        }

        const walletClient = createWalletClient({
            chain: NETWORK_RPC_MAP[chainId],
            transport: custom(provider),
        });

        try {
            const address = await getAccounts();
            if (!address) {
                throw new Error("Address not found");
            }
            const originalMessage = "YOUR_MESSAGE";

            // Sign the message
            const signedMessage = await walletClient.signMessage({
                account: address,
                message: originalMessage,
            });

            uiConsole(signedMessage);
        } catch (error) {
            console.error("Error signing message:", error);
        }
    };

    function uiConsole(...args: any[]): void {
        const [message, txHash, uoHash, type] = args;
        let output = `${message}`;

        if (txHash) {
            const explorerUrl = "https://explorer.vanarchain.com/tx/";
            const mintUrl = `https://jiffyscan.xyz/userOpHash/${uoHash}?network=vanar-mainnet`;
            const link = type === "sendTransaction" ? `${explorerUrl}${txHash}` : mintUrl;
            output += `
                <div class="flex flex-col">
                    <a href="${link}" target="_blank" class="text-blue-500 hover:underline">${txHash}</a>
                    <button onclick="copyToClipboard('${txHash}')" class="ml-2 btn btn-primary text-gray-100 hover:underline">Copy Hash</button>
                </div>
                <script>
                    function copyToClipboard(text) {
                        navigator.clipboard.writeText(text).then(() => {
                            alert('Transaction hash copied to clipboard!');
                        }, (err) => {
                            console.error('Failed to copy text: ', err);
                        });
                    }
                </script>
            `;
        }

        setConsoleOutput(output);
        console.log(...args);
    }

    const loggedInView = (
        <div className="container mx-auto p-4">
            <div className="flex flex-col items-center">
                <div className="bg-white shadow-md rounded p-6 w-full max-w-md">
                    <h2 className="text-xl font-bold mb-4">Smart Account Dashboard</h2>
                    <div className="mt-4 flex flex-col space-y-4">
                        <button onClick={getAccounts} className="btn btn-primary">
                            Get Accounts
                        </button>
                        <button onClick={getBalance} className="btn btn-primary">
                            Get Balance
                        </button>
                        <button onClick={sendTransaction} className="btn btn-primary">
                            Send Transaction
                        </button>
                        <button onClick={mintTokens} className="btn btn-primary">
                            Mint Tokens
                        </button>
                        <button onClick={logout} className="btn btn-secondary">
                            Log Out
                        </button>
                    </div>
                    <div id="console" className="mt-4 w-full max-w-md">
                        <p className="bg-gray-100 text-gray-900 p-4 rounded overflow-x-auto whitespace-nowrap" dangerouslySetInnerHTML={{ __html: consoleOutput }}>
                            {/* Console output goes here */}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    const unloggedInView = (
        <div className="container mx-auto p-4">
            <div className="flex flex-col items-center">
                <div className="bg-white shadow-md rounded p-6 w-full max-w-md">
                    <button onClick={login} className="btn btn-primary w-full">
                        Login
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
            <h1 className="text-4xl font-bold mb-8">Account Abstraction Flow</h1>
            {loggedIn ? loggedInView : unloggedInView}
        </div>
    );
}

export default App;
