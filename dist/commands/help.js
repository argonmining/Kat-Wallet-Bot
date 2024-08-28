import { EmbedBuilder } from 'discord.js';
export const handleHelpCommand = (message) => {
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Kat Wallet Bot - Command Guide')
        .setDescription('Here are the available commands:')
        .addFields({ name: '!status <TICKER> <NETWORK>', value: 'Get token info for a specific ticker and network.' }, { name: '!balance <WALLET_ADDRESS> <NETWORK>', value: 'Check KRC20 token balances for a wallet.' }, { name: '!links', value: 'Get official Kaspa community links.' }, { name: '!donate', value: 'View donation information for the bot.' }, { name: '!helpmenu', value: 'Display this help menu.' })
        .addFields({ name: '\u200B', value: 'Network options: TN10, TN11, or Mainnet' })
        .setFooter({
        text: 'Built with ❤️ by the Nacho the 𐤊at Community',
        iconURL: 'https://i.imgur.com/4zYOZ5j.png'
    })
        .setTimestamp();
    message.channel.send({ embeds: [embed] });
};
