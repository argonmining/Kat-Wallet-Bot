import { Mnemonic, PrivateKey, Address, NetworkType } from '../../wasm/kaspa/kaspa';
import { userSettings, Network } from './userSettings';

export async function generateNewWallet(userId: string, network: Network): Promise<{ address: string; privateKey: string; mnemonic: string }> {
    console.log(`[generateNewWallet] Generating new wallet for user: ${userId} on network: ${network}`);

    try {
        // Generate a new mnemonic (24 words)
        const mnemonic = Mnemonic.random(24);
        console.log(`[generateNewWallet] Mnemonic generated successfully: ${mnemonic.toString()}`);

        // Generate private key from mnemonic
        const seed = mnemonic.toSeed();
        console.log(`[generateNewWallet] Seed generated successfully: ${seed}`);
        console.log(`[generateNewWallet] Seed type: ${typeof seed}, Seed length: ${seed.length}`);

        // Validate seed length and slice if necessary
        const validSeed = seed.length === 128 ? seed.slice(0, 64) : seed;
        if (validSeed.length !== 64) {
            throw new Error(`Invalid seed length: ${validSeed.length}`);
        }

        // Generate private key from seed
        const privateKey = new PrivateKey(validSeed);
        console.log(`[generateNewWallet] Private key generated successfully: ${privateKey.toString()}`);

        // Generate public key
        const publicKey = privateKey.toPublicKey();
        console.log(`[generateNewWallet] Public key generated successfully: ${publicKey.toString()}`);

        // Generate address from public key
        const networkType = userSettings.getNetworkType(network);
        console.log(`[generateNewWallet] Network type: ${networkType}`);
        
        const address = publicKey.toAddress(networkType);
        console.log(`[generateNewWallet] Address generated successfully: ${address.toString()}`);

        // Store user settings
        userSettings.set(userId, {
            network,
            privateKey: privateKey.toString(),
            address: address.toString()
        });
        console.log(`[generateNewWallet] User settings stored successfully`);

        return {
            address: address.toString(),
            privateKey: privateKey.toString(),
            mnemonic: mnemonic.toString()
        };
    } catch (error) {
        console.error(`[generateNewWallet] Error generating wallet for user: ${userId}`, error);
        throw new Error('Failed to generate new wallet');
    }
}