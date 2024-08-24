import { PrivateKey, Address, NetworkType } from '../../wasm/kaspa/kaspa';
import { userSettings, Network } from './userSettings';

const getNetworkType = (network: Network): NetworkType => {
    switch (network) {
        case 'Mainnet':
            return NetworkType.Mainnet;
        case 'Testnet-10':
        case 'Testnet-11':
            return NetworkType.Testnet;
        default:
            throw new Error(`Invalid network: ${network}`);
    }
};

export async function importWalletFromPrivateKey(privateKeyString: string, userId: string, network: Network = 'Mainnet'): Promise<{ address: string; privateKey: string }> {
    try {
        // Validate and create a PrivateKey instance
        const privateKey = new PrivateKey(privateKeyString);

        // Generate an address from the private key
        const address = privateKey.toAddress(getNetworkType(network));

        // Store user settings
        userSettings.set(userId, {
            network,
            privateKey: privateKey.toString(),
            address: address.toString()
        });

        return {
            address: address.toString(),
            privateKey: privateKey.toString()
        };
    } catch (error) {
        console.error('Error importing wallet:', error);
        throw error;
    }
}