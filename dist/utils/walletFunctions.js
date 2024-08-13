"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importWalletFromPrivateKey = exports.generateNewWallet = void 0;
const keyGen_1 = require("./keyGen");
const kaspa_1 = require("../wasm/kaspa"); // Import necessary WASM components
// Assume this map is shared between the modules (e.g., imported from another file if needed)
const userNetworkSelections = new Map();
// Function to generate a new wallet, including mnemonic, private key, and Kaspa address
const generateNewWallet = async (userId) => {
    const mnemonic = await (0, keyGen_1.generate24WordMnemonic)();
    const privateKeyHex = await (0, keyGen_1.generatePrivateKeyFromMnemonic)(mnemonic);
    const privateKey = new kaspa_1.PrivateKey(privateKeyHex);
    // Retrieve the network type for the user
    const network = userNetworkSelections.get(userId) || kaspa_1.NetworkType.Mainnet; // Fallback to MAINNET if not set
    const kaspaAddress = privateKey.toPublicKey().toAddress(network);
    return { mnemonic, privateKey: privateKey.toString(), address: kaspaAddress.toString() };
};
exports.generateNewWallet = generateNewWallet;
// Function to import a wallet using a private key and derive the corresponding Kaspa address
const importWalletFromPrivateKey = async (privateKeyHex, userId) => {
    const privateKey = new kaspa_1.PrivateKey(privateKeyHex);
    const network = userNetworkSelections.get(userId) || kaspa_1.NetworkType.Mainnet; // Fallback to MAINNET if not set
    const kaspaAddress = privateKey.toPublicKey().toAddress(network);
    return { privateKey: privateKey.toString(), address: kaspaAddress.toString() };
};
exports.importWalletFromPrivateKey = importWalletFromPrivateKey;
