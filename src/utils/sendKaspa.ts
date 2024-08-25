import { UtxoProcessor, UtxoContext, createTransactions, PrivateKey, Address } from "../../wasm/kaspa/kaspa";
import { getRpcClient } from './rpcConnection';
import { userSettings, Network, UserSession } from './userSettings';

export const sendKaspa = async (userId: string, amount: bigint, destinationAddress: string, network: Network) => {
    const userSession = userSettings.get(userId);
    if (!userSession || !userSession.address || !userSession.privateKey) {
        throw new Error('User wallet not found or incomplete wallet information');
    }

    // Type guard to ensure address is a string
    if (typeof userSession.address !== 'string' || typeof userSession.privateKey !== 'string') {
        throw new Error('Invalid address or private key format');
    }

    const rpc = await getRpcClient(userId, network);
    const processor = new UtxoProcessor({ rpc, networkId: network });
    const context = new UtxoContext({ processor });

    try {
        // Initialize the UtxoProcessor
        await new Promise<void>((resolve) => {
            const listener = async () => {
                console.log(`[sendKaspa] UtxoProcessor initialized for user: ${userId}`);
                await context.trackAddresses([userSession.address as string]);
                processor.removeEventListener('utxo-proc-start', listener);
                resolve();
            };
            processor.addEventListener('utxo-proc-start', listener);
            processor.start();
        });

        const userAddress = new Address(userSession.address as string);

        const { transactions, summary } = await createTransactions({
            entries: context,
            outputs: [{ address: new Address(destinationAddress), amount }],
            changeAddress: userAddress,
            priorityFee: 0n
        });

        if (transactions.length === 0) {
            throw new Error('No transaction created');
        }

        const privateKey = new PrivateKey(userSession.privateKey as string);

        for (const transaction of transactions) {
            console.log(`[sendKaspa] Signing and submitting transaction: ${transaction.id}`);
            await transaction.sign([privateKey]);
            await transaction.submit(rpc);
            emitTransactionEvent(userId, transaction.id);
        }

        console.log(`[sendKaspa] All transactions sent successfully. Final ID: ${summary.finalTransactionId}`);
        return summary.finalTransactionId;
    } catch (error) {
        console.error('[sendKaspa] Error:', error);
        throw error;
    } finally {
        processor.stop();
    }
};

// Custom event system
type TransactionEventListener = (userId: string, txId: string) => void;
const transactionEventListeners: TransactionEventListener[] = [];

export const addTransactionEventListener = (listener: TransactionEventListener) => {
    transactionEventListeners.push(listener);
};

const emitTransactionEvent = (userId: string, txId: string) => {
    transactionEventListeners.forEach(listener => listener(userId, txId));
};