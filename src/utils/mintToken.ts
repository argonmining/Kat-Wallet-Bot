import { RpcClient, ScriptBuilder, Opcodes, PrivateKey, addressFromScriptPublicKey, createTransactions, kaspaToSompi, UtxoEntry } from "../../wasm/kaspa/kaspa";
import { Network } from './userSettings';
import { getRpcClient } from './rpcConnection';
import { Logger } from './logger';
import { AppError } from './errorHandler';

async function waitForTransactionAcceptance(RPC: any, transactionId: string, address: string, maxAttempts: number = 30): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const { entries } = await RPC.getUtxosByAddresses({ addresses: [address] });
            Logger.debug(`UTXO entries for address ${address}: ${JSON.stringify(entries)}`);
            
            const transactionAccepted = entries.some((entry: { outpoint?: { transactionId: string } }) => {
                const matches = entry.outpoint && entry.outpoint.transactionId === transactionId;
                Logger.debug(`Checking entry: ${JSON.stringify(entry.outpoint)}. Matches: ${matches}`);
                return matches;
            });

            if (transactionAccepted) {
                Logger.info(`Transaction ${transactionId} accepted`);
                return;
            }
            Logger.debug(`Waiting for transaction ${transactionId} to be accepted. Attempt ${attempt + 1}/${maxAttempts}`);
        } catch (error) {
            Logger.error(`Error checking transaction status: ${error}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between attempts
    }
    throw new Error(`Transaction ${transactionId} not accepted after ${maxAttempts} attempts`);
}

export const mintToken = async (userId: string, network: Network, ticker: string, priorityFeeValue: string, privateKeyString: string): Promise<string> => {
    Logger.info(`Starting token minting process for user: ${userId}`);

    try {
        const RPC = await getRpcClient(userId, network);
        const privateKey = new PrivateKey(privateKeyString);
        const publicKey = privateKey.toPublicKey();
        const address = publicKey.toAddress(network);

        Logger.info(`Minting token ${ticker} for address: ${address.toString()}`);

        const data = { "p": "krc-20", "op": "mint", "tick": ticker };

        const script = new ScriptBuilder()
            .addData(publicKey.toXOnlyPublicKey().toString())
            .addOp(Opcodes.OpCheckSig)
            .addOp(Opcodes.OpFalse)
            .addOp(Opcodes.OpIf)
            .addData(Buffer.from("kasplex"))
            .addI64(0n)
            .addData(Buffer.from(JSON.stringify(data, null, 0)))
            .addOp(Opcodes.OpEndIf);

        const P2SHAddress = addressFromScriptPublicKey(script.createPayToScriptHashScript(), network)!;
        Logger.debug(`P2SH Address: ${P2SHAddress.toString()}`);

        const { entries } = await RPC.getUtxosByAddresses({ addresses: [address.toString()] });
        Logger.debug(`Priority fee value before createTransactions: ${priorityFeeValue}, type: ${typeof priorityFeeValue}`);

        const { transactions } = await createTransactions({
            priorityEntries: [],
            entries,
            outputs: [{
                address: P2SHAddress.toString(),
                amount: kaspaToSompi("0.3")!
            }],
            changeAddress: address.toString(),
            priorityFee: kaspaToSompi(priorityFeeValue)!,
            networkId: network
        });

        Logger.debug(`Transactions created: ${JSON.stringify(transactions, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        )}`);

        for (const transaction of transactions) {
            transaction.sign([privateKey]);
            Logger.debug(`Main: Transaction signed with ID: ${transaction.id}`);
            const commitHash = await transaction.submit(RPC);
            Logger.info(`Submitted P2SH commit transaction: ${commitHash}`);
            Logger.debug(`Transaction details: ${JSON.stringify(transaction)}`);

            // Wait for the commit transaction to be accepted
            await waitForTransactionAcceptance(RPC, commitHash, address.toString());

            // Add a delay before attempting the reveal transaction
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay

            try {
                const { entries } = await RPC.getUtxosByAddresses({ addresses: [address.toString()] });
                const revealUTXOs = await RPC.getUtxosByAddresses({ addresses: [P2SHAddress.toString()] });

                Logger.debug(`Reveal UTXOs: ${JSON.stringify(revealUTXOs, (key, value) => 
                    typeof value === 'bigint' ? value.toString() : value
                )}`);

                if (!revealUTXOs.entries || revealUTXOs.entries.length === 0) {
                    Logger.error('No UTXOs found for reveal transaction');
                    throw new Error('No UTXOs found for reveal transaction');
                }

                const { transactions: revealTransactions } = await createTransactions({
                    priorityEntries: [revealUTXOs.entries[0]],
                    entries,
                    outputs: [],
                    changeAddress: address.toString(),
                    priorityFee: kaspaToSompi(priorityFeeValue)!,
                    networkId: network
                });

                for (const revealTx of revealTransactions) {
                    revealTx.sign([privateKey], false);
                    Logger.debug(`Reveal transaction signed with ID: ${revealTx.id}`);
                    const ourOutput = revealTx.transaction.inputs.findIndex((input) => input.signatureScript === '');

                    if (ourOutput !== -1) {
                        const signature = await revealTx.createInputSignature(ourOutput, privateKey);
                        revealTx.fillInput(ourOutput, script.encodePayToScriptHashSignatureScript(signature));
                    }

                    const revealHash = await revealTx.submit(RPC);
                    Logger.info(`Submitted reveal transaction: ${revealHash}`);

                    // Wait for the reveal transaction to be accepted
                    await waitForTransactionAcceptance(RPC, revealHash, address.toString());

                    return revealHash;
                }
            } catch (revealError) {
                Logger.error(`Reveal transaction error: ${revealError}`);
                throw new Error(`Error during reveal transaction: ${revealError}`);
            }
        }

        // In case no transactions were processed
        return `No transactions were processed for minting ${ticker}`;

    } catch (error) {
        Logger.error(`Error during token minting: ${error}`);
        throw new AppError('Minting Error', `Error during token minting: ${error}`, 'MINTING_ERROR');
    }
};