"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWalletCommand = void 0;
const discord_js_1 = require("discord.js");
const walletFunctions_1 = require("../../utils/walletFunctions");
const handleWalletCommand = async (message) => {
    if (message.channel.type !== discord_js_1.ChannelType.DM) {
        try {
            const dmChannel = await message.author.createDM();
            dmChannel.send('Welcome to your private wallet session! Please choose an option below:');
            sendWalletOptions(dmChannel);
        }
        catch (error) {
            console.error('Failed to send DM:', error);
            message.reply('I couldn\'t send you a DM! Please check your privacy settings.');
        }
    }
    else {
        sendWalletOptions(message.channel);
    }
};
exports.handleWalletCommand = handleWalletCommand;
const sendWalletOptions = async (channel) => {
    const row = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId('create_wallet')
        .setLabel('Create Wallet')
        .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
        .setCustomId('import_wallet')
        .setLabel('Import Wallet')
        .setStyle(discord_js_1.ButtonStyle.Secondary));
    await channel.send({
        content: 'What would you like to do?',
        components: [row],
    });
    const filter = (interaction) => ['create_wallet', 'import_wallet'].includes(interaction.customId) && interaction.user.id === channel.recipient.id;
    const collector = channel.createMessageComponentCollector({ filter, componentType: discord_js_1.ComponentType.Button, time: 60000 });
    collector.on('collect', async (interaction) => {
        if (interaction.customId === 'create_wallet') {
            await interaction.reply('Creating a new wallet...');
            const walletInfo = await (0, walletFunctions_1.generateNewWallet)();
            interaction.followUp(`Your new wallet has been created!\nAddress: ${walletInfo.address}\nMnemonic: ${walletInfo.mnemonic}`);
        }
        else if (interaction.customId === 'import_wallet') {
            await interaction.reply('Please provide your private key to import the wallet:');
            const privateKeyFilter = (response) => response.author.id === interaction.user.id; // Explicitly typing the response parameter
            const privateKeyCollector = channel.createMessageCollector({ filter: privateKeyFilter, time: 60000 });
            privateKeyCollector.on('collect', async (response) => {
                const privateKey = response.content.trim();
                try {
                    const walletInfo = await (0, walletFunctions_1.importWalletFromPrivateKey)(privateKey);
                    response.reply(`Wallet imported successfully!\nAddress: ${walletInfo.address}`);
                }
                catch (error) {
                    response.reply('Failed to import wallet. Please check the private key and try again.');
                }
                privateKeyCollector.stop();
            });
        }
        collector.stop();
    });
};
