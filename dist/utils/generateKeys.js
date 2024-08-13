"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generate24WordMnemonic = generate24WordMnemonic;
exports.generatePrivateKeyFromMnemonic = generatePrivateKeyFromMnemonic;
const bip39 = __importStar(require("bip39"));
const crypto_1 = require("crypto");
const bip32_1 = require("bip32");
const ecc = __importStar(require("tiny-secp256k1")); // Secp256k1 library for elliptic curve operations
// Initialize BIP32 with the secp256k1 library
const bip32 = (0, bip32_1.BIP32Factory)(ecc);
// Function to generate a 24-word mnemonic phrase
async function generate24WordMnemonic() {
    // Generate 256 bits (32 bytes) of entropy
    const entropy = (0, crypto_1.randomBytes)(32);
    // Generate mnemonic using the entropy
    const mnemonic = bip39.entropyToMnemonic(entropy.toString('hex'));
    return mnemonic;
}
// Function to generate a private key from mnemonic
async function generatePrivateKeyFromMnemonic(mnemonic) {
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
async function main() {
    try {
        // Generate mnemonic
        const mnemonic = await generate24WordMnemonic();
        console.log(`MNEMONIC="${mnemonic}"`);
        // Generate private key from mnemonic
        const privateKey = await generatePrivateKeyFromMnemonic(mnemonic);
        console.log(`PRIVATE_KEY="${privateKey}"`);
    }
    catch (error) {
        console.error(`Error: ${error.message}`);
    }
}
main();
