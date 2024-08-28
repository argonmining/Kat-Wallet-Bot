import { getTokenInfo } from '../utils/tokenInfo.js';
import { Logger } from '../utils/logger.js';
import { handleError } from '../utils/errorHandler.js';
export const handleStatusCommand = async (message, args) => {
    if (args.length !== 1) {
        await message.reply('Please provide a valid token ticker. Usage: !status <TICKER>');
        return;
    }
    const ticker = args[0].toUpperCase();
    const network = 'Mainnet';
    try {
        Logger.info(`Status command triggered for ticker: ${ticker} on network: ${network}`);
        const tokenInfoEmbed = await getTokenInfo(ticker);
        await message.reply({ embeds: [tokenInfoEmbed] });
    }
    catch (error) {
        await handleError(error, message.channel, 'handleStatusCommand');
    }
};
