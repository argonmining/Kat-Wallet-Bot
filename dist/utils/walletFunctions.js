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
exports.importWalletFromPrivateKey = exports.generateNewWallet = void 0;
const keyGen_1 = require("./keyGen"); // Assuming these are functions from your existing utils
const bip32_1 = require("bip32");
const ecc = __importStar(require("tiny-secp256k1"));
const bip32 = (0, bip32_1.BIP32Factory)(ecc);
const generateNewWallet = async () => {
    const mnemonic = await (0, keyGen_1.generate24WordMnemonic)();
    const privateKey = await (0, keyGen_1.generatePrivateKeyFromMnemonic)(mnemonic);
    const address = deriveAddressFromPrivateKey(privateKey); // Placeholder for actual derivation logic
    return { mnemonic, privateKey, address };
};
exports.generateNewWallet = generateNewWallet;
const importWalletFromPrivateKey = async (privateKey) => {
    const address = deriveAddressFromPrivateKey(privateKey); // Placeholder for actual derivation logic
    return { privateKey, address };
};
exports.importWalletFromPrivateKey = importWalletFromPrivateKey;
const deriveAddressFromPrivateKey = (privateKey) => {
    const node = bip32.fromPrivateKey(Buffer.from(privateKey, 'hex'), Buffer.alloc(32)); // Example implementation
    const publicKey = node.publicKey.toString('hex');
    // Derive address logic here
    return `address_for_${publicKey}`;
};
