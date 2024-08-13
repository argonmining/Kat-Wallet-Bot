import { generate24WordMnemonic, generatePrivateKeyFromMnemonic } from './keyGen';
import { RpcClient, PrivateKey, NetworkType } from '../wasm/kaspa'; // Import necessary WASM components

// Assume this map is shared between the modules (e.g., imported from another file if needed)
const userNetworkSelections = new Map<string, string>();

// Function to generate a new wallet, including mnemonic, private key, and Kaspa address
export const generateNewWallet = async (userId: string) => {
  const mnemonic = await generate24WordMnemonic();
  const privateKeyHex = await generatePrivateKeyFromMnemonic(mnemonic);
  const privateKey = new PrivateKey(privateKeyHex);

  // Retrieve the network type for the user
  const network = userNetworkSelections.get(userId) || NetworkType.Mainnet; // Fallback to MAINNET if not set

  const kaspaAddress = privateKey.toPublicKey().toAddress(network);

  return { mnemonic, privateKey: privateKey.toString(), address: kaspaAddress.toString() };
};

// Function to import a wallet using a private key and derive the corresponding Kaspa address
export const importWalletFromPrivateKey = async (privateKeyHex: string, userId: string) => {
  const privateKey = new PrivateKey(privateKeyHex);
  const network = userNetworkSelections.get(userId) || NetworkType.Mainnet; // Fallback to MAINNET if not set
  const kaspaAddress = privateKey.toPublicKey().toAddress(network);

  return { privateKey: privateKey.toString(), address: kaspaAddress.toString() };
};
