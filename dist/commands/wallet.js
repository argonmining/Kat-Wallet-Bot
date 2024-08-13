import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ChannelType } from 'discord.js';
import { generateNewWallet, importWalletFromPrivateKey } from '../utils/walletFunctions.js';
// Store user settings, including network selection
const userSettings = new Map();
export const handleWalletCommand = async (message) => {
    console.log(`[handleWalletCommand] Command triggered by user: ${message.author.id}`);
    if (message.channel.type !== ChannelType.DM) {
        try {
            console.log(`[handleWalletCommand] Not a DM, attempting to create a DM channel for user: ${message.author.id}`);
            const dmChannel = await message.author.createDM();
            console.log(`[handleWalletCommand] DM channel created successfully for user: ${message.author.id}`);
            await promptNetworkSelection(dmChannel, message.author.id);
        }
        catch (error) {
            console.error(`[handleWalletCommand] Failed to send DM to user: ${message.author.id}`, error);
            message.reply('I couldn\'t send you a DM! Please check your privacy settings.');
        }
    }
    else {
        console.log(`[handleWalletCommand] Already in DM, proceeding to network selection for user: ${message.author.id}`);
        await promptNetworkSelection(message.channel, message.author.id);
    }
    console.log(`[handleWalletCommand] Waiting for network selection to complete before presenting wallet options.`);
};
const promptNetworkSelection = async (channel, userId) => {
    console.log(`[promptNetworkSelection] Starting network selection for user: ${userId}`);
    const row = new ActionRowBuilder()
        .addComponents(new ButtonBuilder()
        .setCustomId('Mainnet')
        .setLabel('Mainnet')
        .setStyle(ButtonStyle.Primary), new ButtonBuilder()
        .setCustomId('Testnet-10')
        .setLabel('Testnet-10')
        .setStyle(ButtonStyle.Secondary), new ButtonBuilder()
        .setCustomId('Testnet-11')
        .setLabel('Testnet-11')
        .setStyle(ButtonStyle.Secondary));
    try {
        await channel.send({
            content: 'Welcome to the Wallet Functions of the NachoBot. Please select the Kaspa network you want to use:',
            components: [row],
        });
        console.log(`[promptNetworkSelection] Sent network selection to user: ${userId}`);
    }
    catch (error) {
        console.error(`[promptNetworkSelection] Failed to send network selection to user: ${userId}`, error);
        return;
    }
    const filter = (interaction) => ['Mainnet', 'Testnet-10', 'Testnet-11'].includes(interaction.customId) &&
        interaction.user.id === userId;
    const collector = channel.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 });
    let hasReplied = false;
    collector.on('collect', async (interaction) => {
        if (hasReplied)
            return; // Ensure only one interaction is processed
        hasReplied = true;
        const network = interaction.customId === 'Mainnet' ? 'Mainnet' : 'Testnet';
        console.log(`[promptNetworkSelection] User ${userId} selected network: ${network}`);
        // Store the network selection directly
        userSettings.set(userId, { network });
        try {
            await interaction.deferReply();
            await interaction.followUp(`You have selected the ${network} network.`);
            console.log(`[promptNetworkSelection] Confirmation sent for network: ${network}`);
        }
        catch (error) {
            console.error(`[promptNetworkSelection] Failed to send confirmation for network: ${network}`, error);
            return;
        }
        console.log(`[promptNetworkSelection] Current network stored for user ${userId}: ${userSettings.get(userId)?.network}`);
        // Pass the network directly to the next step
        await sendWalletOptions(channel, userId, network);
    });
    collector.on('end', (collected) => {
        console.log(`[promptNetworkSelection] Network selection ended for user: ${userId}`);
        hasReplied = false; // Reset for next interaction
    });
};
const sendWalletOptions = async (channel, userId, network) => {
    console.log(`[sendWalletOptions] Presenting wallet options to user: ${userId}`);
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
            content: 'I can create a new wallet for you, or you can import the private key of an existing wallet, What would you like to do?',
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
    let hasReplied = false;
    collector.on('collect', async (interaction) => {
        if (hasReplied)
            return; // Ensure only one interaction is processed
        hasReplied = true;
        try {
            await interaction.deferReply();
            console.log(`[sendWalletOptions] User ${userId} has chosen an option.`);
            console.log(`[sendWalletOptions] Network passed to wallet function: ${network}`);
            if (interaction.customId === 'create_wallet') {
                console.log(`[sendWalletOptions] User ${userId} selected to create a new wallet`);
                await interaction.followUp('Creating a new wallet...');
                const walletInfo = await generateNewWallet(userId, network);
                interaction.followUp(`Your new wallet has been created!\nAddress: ${walletInfo.address}\nMnemonic: ${walletInfo.mnemonic}`);
            }
            else if (interaction.customId === 'import_wallet') {
                console.log(`[sendWalletOptions] User ${userId} selected to import a wallet`);
                await interaction.followUp('Please provide your private key to import the wallet:');
                const privateKeyFilter = (response) => response.author.id === userId;
                const privateKeyCollector = channel.createMessageCollector({ filter: privateKeyFilter, time: 60000 });
                privateKeyCollector.on('collect', async (response) => {
                    const privateKey = response.content.trim();
                    try {
                        const walletInfo = await importWalletFromPrivateKey(privateKey, userId, network);
                        response.reply(`Wallet imported successfully!\nAddress: ${walletInfo.address}`);
                    }
                    catch (error) {
                        console.error(`[sendWalletOptions] Failed to import wallet for user: ${userId}`, error);
                        response.reply('Failed to import wallet. Please check the private key and try again.');
                    }
                    privateKeyCollector.stop();
                });
            }
        }
        catch (error) {
            console.error(`[sendWalletOptions] Failed to process wallet options for user: ${userId}`, error);
        }
    });
    collector.on('end', () => {
        console.log(`[sendWalletOptions] Wallet options interaction ended for user: ${userId}`);
        hasReplied = false; // Reset for next interaction
    });
};
