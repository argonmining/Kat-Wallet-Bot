import { UtxoProcessor, UtxoContext, createTransactions, PrivateKey, Address } from "../../wasm/kaspa/kaspa";
import { getRpcClient } from './rpcConnection';
import { userSettings, Network } from './userSettings';

const waitForMatureUtxo = async (context: UtxoContext, transactionId: string): Promise<void> => {
    const pollingInterval = 5000; // 5 seconds
    const maxAttempts = 60; // 5 minutes

    for (let i = 0; i < maxAttempts; i++) {
        if (context.matureLength > 0) {
            console.log(`Transaction ID ${transactionId} is now mature.`);
            return;
        }
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
    }

    throw new Error(`Timeout waiting for transaction ID ${transactionId} to mature.`);
};

export const sendKaspa = async (userId: string, amount: bigint, destinationAddress: string, network: Network) => {
    const userSession = userSettings.get(userId);
    if (!userSession || !userSession.address || !userSession.privateKey) {
        throw new Error('User wallet not found or incomplete wallet information');
    }

    const rpc = await getRpcClient(userId, network);
    const processor = new UtxoProcessor({ rpc, networkId: network });
    const context = new UtxoContext({ processor });

    try {
        await context.trackAddresses([userSession.address]);

        const { transactions } = await createTransactions({
            entries: context,
            outputs: [{ address: new Address(destinationAddress), amount }],
            changeAddress: new Address(userSession.address),
            priorityFee: 0n
        });

        if (transactions.length === 0) {
            throw new Error('No transaction created');
        }

        const privateKey = new PrivateKey(userSession.privateKey);
        await transactions[0].sign([privateKey]);
        const txId = await transactions[0].submit(rpc);

        await waitForMatureUtxo(context, txId);

        console.log(`Transaction ${txId} sent successfully`);
        return txId;
    } catch (error) {
        console.error('Error in sendKaspa:', error);
        throw error;
    } finally {
        processor.stop();
    }
};