"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importWalletFromPrivateKey = exports.generateNewWallet = void 0;
const keyGen_1 = require("./keyGen");
const kaspa_1 = require("../wasm/kaspa"); // Import necessary WASM components
// Function to generate a new wallet, including mnemonic, private key, and Kaspa address
const generateNewWallet = async () => {
    // Generate a 24-word mnemonic using the existing function
    const mnemonic = await (0, keyGen_1.generate24WordMnemonic)();
    // Derive the private key using the mnemonic
    const privateKeyHex = await (0, keyGen_1.generatePrivateKeyFromMnemonic)(mnemonic);
    // Initialize the PrivateKey object from the derived private key
    const privateKey = new kaspa_1.PrivateKey(privateKeyHex);
    // Retrieve the network type from the environment variable
    const network = process.env.KASPA_NETWORK || kaspa_1.NetworkType.Mainnet; // Fallback to MAINNET if not set
    // Convert the private key to a Kaspa-compatible address using the WASM module
    const kaspaAddress = privateKey.toPublicKey().toAddress(network);
    // Return the mnemonic, private key, and generated Kaspa address
    return { mnemonic, privateKey: privateKey.toString(), address: kaspaAddress.toString() };
};
exports.generateNewWallet = generateNewWallet;
// Function to import a wallet using a private key and derive the corresponding Kaspa address
const importWalletFromPrivateKey = async (privateKeyHex) => {
    // Convert the provided private key to a Kaspa-compatible private key using the WASM module
    const privateKey = new kaspa_1.PrivateKey(privateKeyHex);
    // Retrieve the network type from the environment variable
    const network = process.env.KASPA_NETWORK || kaspa_1.NetworkType.Mainnet; // Fallback to MAINNET if not set
    // Generate the Kaspa address from the private key
    const kaspaAddress = privateKey.toPublicKey().toAddress(network);
    // Return the private key and derived Kaspa address
    return { privateKey: privateKey.toString(), address: kaspaAddress.toString() };
};
exports.importWalletFromPrivateKey = importWalletFromPrivateKey;
