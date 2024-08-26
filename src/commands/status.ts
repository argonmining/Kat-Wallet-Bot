import { Message } from 'discord.js';
import { getTokenInfo } from '../utils/tokenInfo';
import { Network } from '../utils/userSettings';
import { Logger } from '../utils/logger';
import { handleError, AppError } from '../utils/errorHandler';

export const handleStatusCommand = async (message: Message, args: string[]) => {
	if (args.length !== 2) {
		await message.reply('Please provide a valid token ticker and network. Usage: !status <TICKER> <NETWORK>');
		return;
	}

	const ticker = args[0].toUpperCase();
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
		Logger.info(`Status command triggered for ticker: ${ticker} on network: ${network}`);
		const tokenInfoEmbed = await getTokenInfo(ticker, network);
		await message.reply({ embeds: [tokenInfoEmbed] });
	} catch (error) {
		await handleError(error, message.channel, 'handleStatusCommand');
	}
};