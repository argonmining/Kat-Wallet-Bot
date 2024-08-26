import { Message, EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { Network } from '../utils/userSettings';
import { Logger } from '../utils/logger';
import { handleError, AppError } from '../utils/errorHandler';

interface TokenBalance {
    tick: string;
    balance: string;
    dec: string;
}

function formatBalance(balance: string, decimals: number): string {
    const balanceBigInt = BigInt(balance);
    const divisor = BigInt(10 ** decimals);
    const integerPart = balanceBigInt / divisor;
    const fractionalPart = balanceBigInt % divisor;

    let formattedBalance = integerPart.toLocaleString('en-US');
    if (fractionalPart > 0) {
        const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
        const trimmedFractionalStr = fractionalStr.replace(/0+$/, '');
        if (trimmedFractionalStr.length > 0) {
            formattedBalance += '.' + trimmedFractionalStr;
        }
    }

    return formattedBalance;
}

async function fetchKRC20Balances(address: string, network: Network): Promise<TokenBalance[]> {
    const envNetworkName = network.replace('-', '_').toUpperCase();
    const apiBaseUrl = process.env[`${envNetworkName}_API_BASE_URL`];
    if (!apiBaseUrl) {
        throw new AppError('Invalid Network', `API base URL not found for network: ${network}`, 'INVALID_NETWORK');
    }

    const url = `${apiBaseUrl}/address/${address}/tokenlist`;
    try {
        const response = await axios.get(url);
        return response.data.result;
    } catch (error) {
        Logger.error(`Failed to fetch KRC20 balances: ${error}`);
        throw new AppError('Balance Retrieval Failed', 'Failed to retrieve KRC20 balances', 'BALANCE_RETRIEVAL_FAILED');
    }
}

export const handleBalanceCommand = async (message: Message, args: string[]) => {
    if (args.length !== 2) {
        await message.reply('Please provide a valid wallet address and network. Usage: !balance <WALLET_ADDRESS> <NETWORK>');
        return;
    }

    const address = args[0];
    const networkInput = args[1].toLowerCase();

    let network: Network;
    switch (networkInput) {
        case 'tn10':
            network = 'Testnet-10';
            break;
        case 'tn11':
            network = 'Testnet-11';
            break;
        case 'mainnet':
        case 'main':
            network = 'Mainnet';
            break;
        default:
            await message.reply('Invalid network. Please use TN10, TN11, or Mainnet.');
            return;
    }

    try {
        Logger.info(`Balance command triggered for address: ${address} on network: ${network}`);
        const balances = await fetchKRC20Balances(address, network);

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('KRC20 Balances')
            .setDescription(`${address}`)
            .setTimestamp();

        balances.forEach((token) => {
            const formattedBalance = formatBalance(token.balance, parseInt(token.dec));
            embed.addFields({ name: token.tick, value: formattedBalance, inline: true });
        });

        await message.reply({ embeds: [embed] });
    } catch (error) {
        await handleError(error, message.channel, 'handleBalanceCommand');
    }
};