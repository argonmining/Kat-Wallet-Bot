import { RpcClient, Encoding, ScriptBuilder, Opcodes, PrivateKey, addressFromScriptPublicKey, createTransactions, kaspaToSompi, Transaction } from "../../wasm/kaspa/kaspa";
import { Logger } from "./logger";
import { AppError } from "./errorHandler";
import { getRpcClient, disconnectRpc } from "./rpcConnection";
import { Network } from "./userSettings";

export const mintToken = async (userId: string, network: Network, ticker: string, priorityFeeValue: string, privateKeyString: string, timeout: number = 60000) => {
    let rpc: RpcClient | null = null;
    try {
        Logger.info(`Initiating minting process for ${ticker} tokens`);

        rpc = await getRpcClient(userId, network);
        Logger.debug("RPC connection established");

        const privateKey = new PrivateKey(privateKeyString);
        const publicKey = privateKey.toPublicKey();
        const address = publicKey.toAddress(network);
        Logger.info(`Minting token ${ticker} for address: ${address.toString()}`);

        const data = { "p": "krc-20", "op": "mint", "tick": ticker };

        const script = new ScriptBuilder()
            .addOp(Opcodes.OpFalse)
            .addOp(Opcodes.OpIf)
            .addData(Buffer.from("kasplex"))
            .addI64(0n)
            .addData(Buffer.from(JSON.stringify(data, null, 0)))
            .addOp(Opcodes.OpEndIf)
            .addData(publicKey.toXOnlyPublicKey().toString())
            .addOp(Opcodes.OpCheckSig);

        const P2SHAddress = addressFromScriptPublicKey(script.createPayToScriptHashScript(), network)!;
        Logger.debug(`P2SH Address: ${P2SHAddress.toString()}`);

        const { entries } = await rpc.getUtxosByAddresses({ addresses: [address.toString()] });
        
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

        for (const transaction of transactions) {
            transaction.sign([privateKey]);
            Logger.debug(`Transaction signed with ID: ${transaction.id}`);

            const hash = await transaction.submit(rpc);
            Logger.info(`Submitted P2SH commit transaction: ${hash}`);

            // Wait for the transaction to be accepted
            let attempts = 0;
            const maxAttempts = 10;
            const pollInterval = 6000; // 6 seconds

            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                
                try {
                    const { entries } = await rpc.getUtxosByAddresses({ addresses: [P2SHAddress.toString()] });
                    if (entries.some(entry => entry.outpoint?.transactionId === hash)) {
                        Logger.info(`Transaction confirmed: ${hash}`);
                        return hash;
                    }
                } catch (error) {
                    Logger.error(`Error checking transaction status: ${error}`);
                }

                attempts++;
            }

            Logger.warn(`Transaction not confirmed after ${maxAttempts} attempts. Hash: ${hash}`);
        }

        return null; // Return null if no transaction was confirmed

    } catch (error) {
        Logger.error(`Error during token minting: ${error}`);
        throw new AppError('Minting Error', `Error during token minting: ${error}`, 'MINTING_ERROR');
    } finally {
        if (rpc) {
            await disconnectRpc(userId, network);
        }
    }
};