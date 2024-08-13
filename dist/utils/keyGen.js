import * as bip39 from 'bip39';
import { randomBytes } from 'crypto';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1'; // Secp256k1 library for elliptic curve operations
// Initialize BIP32 with the secp256k1 library
const bip32 = BIP32Factory(ecc);
// Function to generate a 24-word mnemonic phrase
export async function generate24WordMnemonic() {
    // Generate 256 bits (32 bytes) of entropy
    const entropy = randomBytes(32);
    // Generate mnemonic using the entropy
    const mnemonic = bip39.entropyToMnemonic(entropy.toString('hex'));
    return mnemonic;
}
// Function to generate a private key from mnemonic
export async function generatePrivateKeyFromMnemonic(mnemonic) {
    // Validate the mnemonic
    if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
    }
    // Convert mnemonic to seed
    const seed = await bip39.mnemonicToSeed(mnemonic);
    // Create a BIP32 node from the seed
    const rootNode = bip32.fromSeed(seed);
    // Derive private key (from the root)
    const accountNode = rootNode.derivePath("m/44'/0'/0'/0/0"); // Example derivation path
    // Check if the private key is defined
    if (!accountNode.privateKey) {
        throw new Error('Failed to derive private key');
    }
    // Return the private key in the specified format
    return accountNode.privateKey.toString('hex');
}
// Driver function to generate mnemonic and private key
export async function main() {
    try {
        // Generate mnemonic
        const mnemonic = await generate24WordMnemonic();
        console.log(`MNEMONIC="${mnemonic}"`);
        // Generate private key from mnemonic
        const privateKey = await generatePrivateKeyFromMnemonic(mnemonic);
        console.log(`PRIVATE_KEY="${privateKey}"`);
    }
    catch (error) {
        // Safely accessing the error message
        if (error instanceof Error) {
            console.error(`Error: ${error.message}`);
        }
        else {
            console.error('An unknown error occurred');
        }
    }
}
// Automatically run the main function if this module is executed directly
if (import.meta.url === new URL(import.meta.url, import.meta.url).href) {
    main();
}
