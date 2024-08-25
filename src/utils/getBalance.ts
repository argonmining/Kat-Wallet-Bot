import { Address, NetworkType, sompiToKaspaStringWithSuffix } from '../../wasm/kaspa/kaspa';
import { getRpcClient } from './rpcConnection';
import { userSettings, Network } from './userSettings';
import { retryableRequest, handleNetworkError } from './networkUtils';
import { Logger } from './logger';
import { AppError } from './errorHandler';

interface BalanceResult {
    kaspaBalance: string;
    krc20Balances: string[];
}

export async function getBalance(userId: string, network: Network): Promise<BalanceResult> {
    Logger.info(`Fetching balance for user: ${userId}`);

    const userSession = userSettings.get(userId);
    if (!userSession || !userSession.address) {
        throw new AppError('User Not Found', 'User wallet not found or address is missing', 'USER_NOT_FOUND');
    }

    try {
        return await retryableRequest(async () => {
            const rpc = await getRpcClient(userId, network);
            const address = new Address(userSession.address as string);
            const balanceResponse = await rpc.getBalanceByAddress({ address: address.toString() });
            
            if (!balanceResponse) {
                throw new AppError('Balance Retrieval Failed', 'Failed to retrieve balance', 'BALANCE_RETRIEVAL_FAILED');
            }

            const networkType = NetworkType[userSession.network as keyof typeof NetworkType];
            const kaspaBalance = sompiToKaspaStringWithSuffix(balanceResponse.balance, networkType);

            // TODO: Implement KRC20 balance fetching
            const krc20Balances: string[] = [];

            Logger.info(`Balance fetched successfully for user: ${userId}: ${kaspaBalance}`);
            return { kaspaBalance, krc20Balances };
        }, 'Error fetching balance');
    } catch (error) {
        throw handleNetworkError(error, 'fetching balance');
    }
}