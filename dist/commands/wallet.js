import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ChannelType } from 'discord.js';
import { generateNewWallet, importWalletFromPrivateKey } from '../utils/walletFunctions.js'; // Ensure this path is correct
// In-memory storage for user network selections
const userNetworkSelections = new Map();
export const handleWalletCommand = async (message) => {
    console.log(`[handleWalletCommand] Command triggered by user: ${message.author.id}`);
    if (message.channel.type !== ChannelType.DM) {
        try {
            console.log(`[handleWalletCommand] Not a DM, attempting to create a DM channel for user: ${message.author.id}`);
            const dmChannel = await message.author.createDM();
            console.log(`[handleWalletCommand] DM channel created successfully for user: ${message.author.id}`);
            await promptNetworkSelection(dmChannel, message.author.id); // This should run first
        }
        catch (error) {
            console.error(`[handleWalletCommand] Failed to send DM to user: ${message.author.id}`, error);
            message.reply('I couldn\'t send you a DM! Please check your privacy settings.');
        }
    }
    else {
        console.log(`[handleWalletCommand] Already in DM, proceeding to network selection for user: ${message.author.id}`);
        await promptNetworkSelection(message.channel, message.author.id); // This should run first
    }
    console.log(`[handleWalletCommand] Finished network selection, now presenting wallet options.`);
};
// Function to prompt the user to select a network
const promptNetworkSelection = async (channel, userId) => {
    console.log(`[promptNetworkSelection] Starting network selection for user: ${userId}`);
    const row = new ActionRowBuilder()
        .addComponents(new ButtonBuilder()
        .setCustomId('mainnet')
        .setLabel('Mainnet')
        .setStyle(ButtonStyle.Primary), new ButtonBuilder()
        .setCustomId('testnet-10')
        .setLabel('Testnet-10')
        .setStyle(ButtonStyle.Secondary), new ButtonBuilder()
        .setCustomId('testnet-11')
        .setLabel('Testnet-11')
        .setStyle(ButtonStyle.Secondary));
    try {
        await channel.send({
            content: 'Please select the network you want to use:',
            components: [row],
        });
        console.log(`[promptNetworkSelection] Sent network selection to user: ${userId}`);
    }
    catch (error) {
        console.error(`[promptNetworkSelection] Failed to send network selection to user: ${userId}`, error);
        return; // If sending fails, exit early.
    }
    const filter = (interaction) => ['mainnet', 'testnet-10', 'testnet-11'].includes(interaction.customId) &&
        interaction.user.id === userId;
    const collector = channel.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 });
    collector.on('collect', async (interaction) => {
        const network = interaction.customId;
        console.log(`[promptNetworkSelection] User ${userId} selected network: ${network}`);
        userNetworkSelections.set(userId, network);
        try {
            await interaction.reply(`You have selected the ${network} network.`);
            console.log(`[promptNetworkSelection] Confirmation sent for network: ${network}`);
        }
        catch (error) {
            console.error(`[promptNetworkSelection] Failed to send confirmation for network: ${network}`, error);
        }
        // Proceed only after network selection
        await sendWalletOptions(channel, userId);
    });
    collector.on('end', (collected) => {
        if (collected.size === 0) {
            console.log(`[promptNetworkSelection] No network selected by user: ${userId}`);
            channel.send('You did not select a network. Please restart the wallet setup process.');
        }
        else {
            console.log(`[promptNetworkSelection] Network selection ended for user: ${userId}`);
        }
    });
};
// Function to prompt the user to create or import a wallet
const sendWalletOptions = async (channel, userId) => {
    console.log(`[sendWalletOptions] Commented Out - should not be called.`);
    const row = new ActionRowBuilder()
        .addComponents(new ButtonBuilder()
        .setCustomId('create_wallet')
        .setLabel('Create Wallet')
        .setStyle(ButtonStyle.Primary), new ButtonBuilder()
        .setCustomId('import_wallet')
        .setLabel('Import Wallet')
        .setStyle(ButtonStyle.Secondary));
    try {
        await channel.send({
            content: 'What would you like to do?',
            components: [row],
        });
        console.log(`[sendWalletOptions] Wallet options message sent to user: ${userId}`);
    }
    catch (error) {
        console.error(`[sendWalletOptions] Failed to send wallet options message to user: ${userId}`, error);
        return;
    }
    const filter = (interaction) => ['create_wallet', 'import_wallet'].includes(interaction.customId) &&
        interaction.user.id === userId;
    const collector = channel.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 });
    collector.on('collect', async (interaction) => {
        if (interaction.customId === 'create_wallet') {
            console.log(`[sendWalletOptions] User ${userId} selected to create a new wallet`);
            await interaction.reply('Creating a new wallet...');
            const walletInfo = await generateNewWallet(userId);
            interaction.followUp(`Your new wallet has been created!\nAddress: ${walletInfo.address}\nMnemonic: ${walletInfo.mnemonic}`);
        }
        else if (interaction.customId === 'import_wallet') {
            console.log(`[sendWalletOptions] User ${userId} selected to import a wallet`);
            await interaction.reply('Please provide your private key to import the wallet:');
            const privateKeyFilter = (response) => response.author.id === userId;
            const privateKeyCollector = channel.createMessageCollector({ filter: privateKeyFilter, time: 60000 });
            privateKeyCollector.on('collect', async (response) => {
                const privateKey = response.content.trim();
                try {
                    const walletInfo = await importWalletFromPrivateKey(privateKey, userId);
                    response.reply(`Wallet imported successfully!\nAddress: ${walletInfo.address}`);
                }
                catch (error) {
                    console.error(`[sendWalletOptions] Failed to import wallet for user: ${userId}`, error);
                    response.reply('Failed to import wallet. Please check the private key and try again.');
                }
                privateKeyCollector.stop();
            });
        }
        collector.stop();
    });
};
