import { getTokenInfo } from '../utils/tokenInfo.js';
import { Logger } from '../utils/logger.js';
import { handleError } from '../utils/errorHandler.js';
export const handleStatusCommand = async (message, args) => {
    if (args.length !== 2) {
        await message.reply('Please provide a valid token ticker and network. Usage: !status <TICKER> <NETWORK>');
        return;
    }
    const ticker = args[0].toUpperCase();
    const networkInput = args[1].toLowerCase();
    let network;
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
        Logger.info(`Status command triggered for ticker: ${ticker} on network: ${network}`);
        const tokenInfoEmbed = await getTokenInfo(ticker, network);
        await message.reply({ embeds: [tokenInfoEmbed] });
    }
    catch (error) {
        await handleError(error, message.channel, 'handleStatusCommand');
    }
};
