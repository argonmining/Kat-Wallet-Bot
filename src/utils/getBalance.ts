import { Address, NetworkType, sompiToKaspaStringWithSuffix } from '../../wasm/kaspa/kaspa';
import { getRpcClient } from './rpcConnection';
import { userSettings, Network } from './userSettings';

export async function getBalance(userId: string, network: Network): Promise<string> {
    console.log(`[getBalance] Fetching balance for user: ${userId}`);

    const userSession = userSettings.get(userId);
    if (!userSession || !userSession.address) {
        throw new Error('User wallet not found or address is missing');
    }

    const rpc = await getRpcClient(userId, network);

    try {
        const address = new Address(userSession.address);
        const balanceResponse = await rpc.getBalanceByAddress({ address: address.toString() });
        
        if (!balanceResponse) {
            throw new Error('Failed to retrieve balance');
        }

        const networkType = NetworkType[userSession.network as keyof typeof NetworkType];
        const balance = sompiToKaspaStringWithSuffix(balanceResponse.balance, networkType);

        console.log(`[getBalance] Balance fetched successfully for user: ${userId}`, balance);
        return balance;
    } catch (error) {
        console.error(`[getBalance] Error fetching balance for user: ${userId}`, error);
        throw new Error('Failed to fetch balance');
    }
}