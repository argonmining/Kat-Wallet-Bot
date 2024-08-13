import { generate24WordMnemonic, generatePrivateKeyFromMnemonic } from './keyGen.js';
import { PrivateKey, NetworkType } from '../../wasm/kaspa/kaspa.js';
export const generateNewWallet = async (userId, network) => {
    const mnemonic = await generate24WordMnemonic();
    const privateKeyHex = await generatePrivateKeyFromMnemonic(mnemonic);
    const privateKey = new PrivateKey(privateKeyHex);
    let networkType;
    if (network === 'Mainnet') {
        networkType = NetworkType.Mainnet;
    }
    else {
        networkType = NetworkType.Testnet;
    }
    console.log(`[generateNewWallet] User ${userId} selected network: ${network}, applying network type: ${networkType === NetworkType.Mainnet ? 'Mainnet' : 'Testnet'}`);
    const kaspaAddress = privateKey.toPublicKey().toAddress(networkType);
    return { mnemonic, privateKey: privateKey.toString(), address: kaspaAddress.toString() };
};
export const importWalletFromPrivateKey = async (privateKeyHex, userId, network) => {
    const privateKey = new PrivateKey(privateKeyHex);
    let networkType;
    if (network === 'Mainnet') {
        networkType = NetworkType.Mainnet;
    }
    else {
        networkType = NetworkType.Testnet;
    }
    console.log(`[importWalletFromPrivateKey] User ${userId} selected network: ${network}, applying network type: ${networkType === NetworkType.Mainnet ? 'Mainnet' : 'Testnet'}`);
    const kaspaAddress = privateKey.toPublicKey().toAddress(networkType);
    return { privateKey: privateKey.toString(), address: kaspaAddress.toString() };
};
