"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWalletCommand = void 0;
const discord_js_1 = require("discord.js");
const walletFunctions_1 = require("../../utils/walletFunctions"); // Ensure this path is correct
// In-memory storage for user network selections
const userNetworkSelections = new Map();
const handleWalletCommand = async (message) => {
    if (message.channel.type !== discord_js_1.ChannelType.DM) {
        try {
            const dmChannel = await message.author.createDM();
            await promptNetworkSelection(dmChannel, message.author.id); // Pass user ID to track selection
        }
        catch (error) {
            console.error('Failed to send DM:', error);
            message.reply('I couldn\'t send you a DM! Please check your privacy settings.');
        }
    }
    else {
        await promptNetworkSelection(message.channel, message.author.id); // Pass user ID to track selection
    }
};
exports.handleWalletCommand = handleWalletCommand;
// Function to prompt the user to select a network
const promptNetworkSelection = async (channel, userId) => {
    const row = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId('mainnet')
        .setLabel('Mainnet')
        .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
        .setCustomId('testnet-10')
        .setLabel('Testnet-10')
        .setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder()
        .setCustomId('testnet-11')
        .setLabel('Testnet-11')
        .setStyle(discord_js_1.ButtonStyle.Secondary));
    await channel.send({
        content: 'Please select the network you want to use:',
        components: [row],
    });
    const filter = (interaction) => ['mainnet', 'testnet-10', 'testnet-11'].includes(interaction.customId) &&
        interaction.user.id === userId;
    const collector = channel.createMessageComponentCollector({ filter, componentType: discord_js_1.ComponentType.Button, time: 60000 });
    collector.on('collect', async (interaction) => {
        const network = interaction.customId;
        // Save the selected network in the Map with user ID as the key
        userNetworkSelections.set(userId, network);
        await interaction.reply(`You have selected the ${network} network.`);
        // Now proceed to ask for wallet creation or import
        await sendWalletOptions(channel, userId);
    });
    collector.on('end', collected => {
        if (collected.size === 0) {
            channel.send('You did not select a network. Please restart the wallet setup process.');
        }
    });
};
// Function to prompt the user to create or import a wallet
const sendWalletOptions = async (channel, userId) => {
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
    const filter = (interaction) => ['create_wallet', 'import_wallet'].includes(interaction.customId) &&
        interaction.user.id === userId;
    const collector = channel.createMessageComponentCollector({ filter, componentType: discord_js_1.ComponentType.Button, time: 60000 });
    collector.on('collect', async (interaction) => {
        if (interaction.customId === 'create_wallet') {
            await interaction.reply('Creating a new wallet...');
            const walletInfo = await (0, walletFunctions_1.generateNewWallet)(userId);
            interaction.followUp(`Your new wallet has been created!\nAddress: ${walletInfo.address}\nMnemonic: ${walletInfo.mnemonic}`);
        }
        else if (interaction.customId === 'import_wallet') {
            await interaction.reply('Please provide your private key to import the wallet:');
            const privateKeyFilter = (response) => response.author.id === userId;
            const privateKeyCollector = channel.createMessageCollector({ filter: privateKeyFilter, time: 60000 });
            privateKeyCollector.on('collect', async (response) => {
                const privateKey = response.content.trim();
                try {
                    const walletInfo = await (0, walletFunctions_1.importWalletFromPrivateKey)(privateKey, userId);
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
