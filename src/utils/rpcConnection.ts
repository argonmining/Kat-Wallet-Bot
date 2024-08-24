import { RpcClient, Encoding, Resolver } from "../../wasm/kaspa/kaspa";
import { Network } from './userSettings';
import dotenv from 'dotenv';

dotenv.config();

const rpcClients: Map<string, RpcClient> = new Map();
const rpcConnections: Map<string, boolean> = new Map();

const createRpcClient = (network: Network): RpcClient => {
    return new RpcClient({
        resolver: new Resolver({
            urls: ["https://us-east.nachowyborski.xyz", "https://us-west.nachowyborski.xyz", "https://de.nachowyborksi.xyz", "https://turkey.nachowyborski.xyz", "https://brazil.nachowyborski.xyz", "https://italy.nachowyborski.xyz"]
        }),
        encoding: Encoding.Borsh,
        networkId: getNetworkId(network),
    });
};

const getNetworkId = (network: Network): string => {
    switch (network) {
        case 'Mainnet':
            return 'mainnet';
        case 'Testnet-10':
            return 'testnet-10';
        case 'Testnet-11':
            return 'testnet-11';
        default:
            throw new Error(`Invalid network: ${network}`);
    }
};

export const getRpcClient = async (userId: string, network: Network): Promise<RpcClient> => {
    const clientKey = `${userId}-${network}`;
    console.log(`[getRpcClient] clientKey: ${clientKey}`);
    
    if (!rpcClients.has(clientKey)) {
        console.log(`[getRpcClient] Creating new RPC client for ${clientKey}`);
        rpcClients.set(clientKey, createRpcClient(network));
    }

    if (!rpcConnections.get(clientKey)) {
        console.log(`[getRpcClient] Connecting RPC client for ${clientKey}`);
        await connectRpc(clientKey);
    }

    console.log(`[getRpcClient] Returning RPC client for ${clientKey}`);
    return rpcClients.get(clientKey)!;
};

const connectRpc = async (clientKey: string): Promise<void> => {
    const rpc = rpcClients.get(clientKey);
    if (!rpc) {
        throw new Error('RPC client not initialized');
    }

    try {
        console.log(`[connectRpc] Attempting to connect RPC client for ${clientKey}`);
        await rpc.connect();
        console.log(`[connectRpc] RPC client connected for ${clientKey}`);
        
        const serverInfo = await rpc.getServerInfo();
        console.log(`[connectRpc] Retrieved server info for ${clientKey}:`, serverInfo);
        
        if (!serverInfo.isSynced || !serverInfo.hasUtxoIndex) {
            throw new Error('Provided node is either not synchronized or lacks the UTXO index.');
        }

        rpcConnections.set(clientKey, true);
        console.log(`[connectRpc] RPC connection established for ${clientKey}`);
    } catch (error) {
        console.error(`[connectRpc] RPC connection error for ${clientKey}:`, error);
        rpcConnections.set(clientKey, false);
        throw error;
    }
};

export const ensureRpcConnection = async (userId: string, network: Network): Promise<void> => {
    const clientKey = `${userId}-${network}`;
    if (!rpcConnections.get(clientKey)) {
        await connectRpc(clientKey);
    }
};

export const disconnectRpc = async (userId: string, network: Network): Promise<void> => {
    const clientKey = `${userId}-${network}`;
    const rpc = rpcClients.get(clientKey);
    if (rpc && rpcConnections.get(clientKey)) {
        await rpc.disconnect();
        rpcConnections.set(clientKey, false);
        console.log(`RPC connection closed for ${clientKey}`);
    }
};