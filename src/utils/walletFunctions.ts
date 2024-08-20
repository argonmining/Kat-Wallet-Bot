import { RpcClient, PrivateKey, Keypair, Address } from '../../wasm/kaspa/kaspa.js';
import { generate24WordMnemonic, generatePrivateKeyFromMnemonic } from './keyGen';

const networkEndpoints = {
    Mainnet: 'wss://mainnet.kaspa.org',
    'Testnet-10': 'wss://testnet10.kaspa.org',
    'Testnet-11': 'wss://testnet11.kaspa.org',
} as const;

type Network = keyof typeof networkEndpoints;

interface UserSession {
    network: Network;
    privateKey: string;
    address: string;
}

const userSettings = new Map<string, UserSession>();

export const generateNewWallet = async (userId: string, network: Network) => {
    const mnemonic = await generate24WordMnemonic();
    const privateKey = await generatePrivateKeyFromMnemonic(mnemonic);
    const keypair = new PrivateKey(privateKey).toKeypair();
    const address = keypair.toAddress().toString(); // Correctly using toAddress()
    console.log(`[generateNewWallet] New wallet generated for user ${userId} on network ${network} with address ${address}`);
    return { mnemonic, privateKey, address };
};

export const importWalletFromPrivateKey = async (privateKey: string, userId: string, network: Network) => {
    const keypair = new PrivateKey(privateKey).toKeypair();
    const address = keypair.toAddress().toString(); // Correctly using toAddress()
    console.log(`[importWalletFromPrivateKey] Wallet imported for user ${userId} on network ${network} with address ${address}`);
    return { privateKey, address };
};

export const sendKaspa = async (userId: string, amount: number, destinationAddress: string) => {
    const userSession = userSettings.get(userId);
    if (!userSession) {
        throw new Error('User session not found');
    }

    const { privateKey, network } = userSession;
    const endpointUrl = networkEndpoints[network]; // Now TypeScript understands this indexing

    const rpcClient = new RpcClient({ url: endpointUrl });

    try {
        const keypair = new PrivateKey(privateKey).toKeypair();
        const utxos = await rpcClient.getUtxos(keypair.toAddress().toString()); // Correctly using toAddress()

        const transaction = await createTransaction(utxos, keypair, destinationAddress, amount);
        const signedTransaction = await signTransaction(transaction, keypair);

        const txid = await rpcClient.submitTransaction(signedTransaction);
        console.log(`Transaction successfully sent with ID: ${txid}`);
        return txid;
    } catch (error) {
        console.error('Failed to send transaction:', error);
        throw new Error('Failed to send Kaspa');
    } finally {
        rpcClient.disconnect();
    }
};

// Example placeholder functions for transaction creation and signing
const createTransaction = async (utxos: any, keypair: Keypair, destinationAddress: string, amount: number) => {
    // Logic to create the transaction
    return {};
};

const signTransaction = async (transaction: any, keypair: Keypair) => {
    // Logic to sign the transaction
    return transaction;
};
