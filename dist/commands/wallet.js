import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js';
import { generateNewWallet } from '../utils/generateNewWallet.js';
import { importWalletFromPrivateKey } from '../utils/importWallet.js';
import { sendKaspa } from '../utils/sendKaspa.js';
import { getBalance } from '../utils/getBalance.js';
import { userSettings } from '../utils/userSettings.js';
import { getRpcClient } from '../utils/rpcConnection.js';
import axios from 'axios';
export const handleWalletCommand = async (message) => {
    console.log(`[handleWalletCommand] Command triggered by user: ${message.author.id} in channel type: ${message.channel.type}`);
    if (message.channel.type === ChannelType.DM) {
        console.log(`[handleWalletCommand] Command received in DM, proceeding with wallet actions for user: ${message.author.id}`);
        await handleWalletActions(message.channel, message.author.id);
    }
    else {
        try {
            console.log(`[handleWalletCommand] Not a DM, attempting to create a DM channel for user: ${message.author.id}`);
            const dmChannel = await message.author.createDM();
            console.log(`[handleWalletCommand] DM channel created successfully for user: ${message.author.id}`);
            await message.reply('I\'ve sent you a DM with wallet options!');
            await handleWalletActions(dmChannel, message.author.id);
        }
        catch (error) {
            console.error(`[handleWalletCommand] Failed to send DM to user: ${message.author.id}`, error);
            await message.reply('I couldn\'t send you a DM! Please check your privacy settings.');
        }
    }
};
const handleWalletActions = async (channel, userId) => {
    console.log(`[handleWalletActions] Starting wallet actions for user: ${userId}`);
    const userSession = userSettings.get(userId);
    if (!userSession || !userSession.network) {
        console.log(`[handleWalletActions] No session or network found for user: ${userId}, starting network selection`);
        await promptNetworkSelection(channel, userId);
    }
    else {
        console.log(`[handleWalletActions] Existing session found for user: ${userId}, prompting wallet actions`);
        await promptWalletActions(channel, userId);
    }
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
    await channel.send({
        content: 'Please select the network you want to use:',
        components: [row],
    });
    const filter = (i) => ['Mainnet', 'Testnet-10', 'Testnet-11'].includes(i.customId) && i.user.id === userId;
    try {
        const interaction = await channel.awaitMessageComponent({ filter, time: 60000 });
        const userNetworkChoice = interaction.customId;
        await interaction.update({ content: `You selected ${userNetworkChoice}`, components: [] });
        // Set the user's network choice
        const existingSession = userSettings.get(userId) || {};
        userSettings.set(userId, { ...existingSession, network: userNetworkChoice });
        // Create RPC connection after network selection
        await getRpcClient(userId, userNetworkChoice);
        await promptWalletOptions(channel, userId, userNetworkChoice);
    }
    catch (error) {
        console.error(`[promptNetworkSelection] Error in network selection for user: ${userId}`, error);
        channel.send('Network selection timed out. Please try the !wallet command again.');
    }
};
const promptWalletOptions = async (channel, userId, userNetworkChoice) => {
    console.log(`[promptWalletOptions] Prompting wallet options for user: ${userId} on network: ${userNetworkChoice}`);
    const row = new ActionRowBuilder()
        .addComponents(new ButtonBuilder()
        .setCustomId('create')
        .setLabel('Create New Wallet')
        .setStyle(ButtonStyle.Primary), new ButtonBuilder()
        .setCustomId('import')
        .setLabel('Import Existing Wallet')
        .setStyle(ButtonStyle.Secondary));
    const message = await channel.send({
        content: 'Would you like to create a new wallet or import an existing one?',
        components: [row],
    });
    const filter = (i) => ['create', 'import'].includes(i.customId) && i.user.id === userId;
    try {
        const interaction = await message.awaitMessageComponent({ filter, time: 60000 });
        // Immediately acknowledge the interaction
        await interaction.deferUpdate();
        if (interaction.customId === 'create') {
            await createWallet(channel, userId, userNetworkChoice);
        }
        else {
            await importWallet(channel, userId, userNetworkChoice);
        }
        // Remove the buttons after processing
        await message.edit({ components: [] });
    }
    catch (error) {
        console.error(`[promptWalletOptions] Error in wallet option selection for user: ${userId}`, error);
        channel.send('Wallet option selection timed out. Please try the !wallet command again.');
    }
};
const createWallet = async (channel, userId, userNetworkChoice) => {
    console.log(`[createWallet] Creating wallet for user: ${userId} on network: ${userNetworkChoice}`);
    try {
        const walletInfo = await generateNewWallet(userId, userNetworkChoice);
        const mnemonicPhrase = JSON.parse(walletInfo.mnemonic).phrase;
        const message = `Your new wallet has been created!\nAddress: ${walletInfo.address}\nPrivate Key: ${walletInfo.privateKey}\nMnemonic: ${mnemonicPhrase}\n\nPlease store your mnemonic safely. It will not be shown again.`;
        await channel.send(message);
        await promptWalletActions(channel, userId);
    }
    catch (error) {
        console.error(`[createWallet] Error creating wallet for user: ${userId}`, error);
        channel.send('Failed to create wallet. Please try again later.');
    }
};
const importWallet = async (channel, userId, userNetworkChoice) => {
    console.log(`[importWallet] Importing wallet for user: ${userId} on network: ${userNetworkChoice}`);
    await channel.send('Please enter your private key:');
    try {
        const privateKeyMessage = await channel.awaitMessages({
            filter: (m) => m.author.id === userId,
            max: 1,
            time: 60000,
            errors: ['time']
        });
        const privateKey = privateKeyMessage.first()?.content;
        if (!privateKey)
            throw new Error('No private key provided');
        const walletInfo = await importWalletFromPrivateKey(privateKey, userId, userNetworkChoice);
        await channel.send(`Wallet imported successfully!\nAddress: ${walletInfo.address}`);
        await promptWalletActions(channel, userId);
    }
    catch (error) {
        console.error(`[importWallet] Error importing wallet for user: ${userId}`, error);
        channel.send('Failed to import wallet. Please make sure you entered a valid private key and try again.');
    }
};
const promptWalletActions = async (channel, userId) => {
    console.log(`[promptWalletActions] Prompting wallet actions for user: ${userId}`);
    const row = new ActionRowBuilder()
        .addComponents(new ButtonBuilder()
        .setCustomId('send')
        .setLabel('Send Kaspa')
        .setStyle(ButtonStyle.Primary), new ButtonBuilder()
        .setCustomId('balance')
        .setLabel('Check Balance')
        .setStyle(ButtonStyle.Secondary));
    await channel.send({
        content: 'What would you like to do?',
        components: [row],
    });
    const filter = (i) => ['send', 'balance'].includes(i.customId) && i.user.id === userId;
    try {
        const interaction = await channel.awaitMessageComponent({ filter, time: 60000 });
        if (interaction.customId === 'send') {
            await sendKaspaPrompt(channel, userId);
        }
        else {
            await checkBalance(interaction, userId);
        }
    }
    catch (error) {
        console.error(`[promptWalletActions] Error in wallet action selection for user: ${userId}`, error);
        channel.send('Wallet action selection timed out. Please try the !wallet command again.');
    }
};
const sendKaspaPrompt = async (channel, userId) => {
    console.log(`[sendKaspaPrompt] Prompting to send Kaspa for user: ${userId}`);
    await channel.send('Please enter the amount of Kaspa to send and the destination address in this format: "amount address"');
    try {
        const sendInfoMessage = await channel.awaitMessages({
            filter: (m) => m.author.id === userId,
            max: 1,
            time: 60000,
            errors: ['time']
        });
        const sendInfo = sendInfoMessage.first()?.content.split(' ');
        if (!sendInfo || sendInfo.length !== 2)
            throw new Error('Invalid send information');
        const amount = BigInt(parseFloat(sendInfo[0]) * 100000000); // Convert Kaspa to Sompi
        const destinationAddress = sendInfo[1];
        const userSession = userSettings.get(userId);
        if (!userSession) {
            throw new Error('User wallet not found');
        }
        const txId = await sendKaspa(userId, amount, destinationAddress, userSession.network);
        await channel.send(`Transaction sent successfully! Transaction ID: ${txId}`);
    }
    catch (error) {
        console.error(`[sendKaspaPrompt] Error sending Kaspa for user: ${userId}`, error);
        await channel.send('Failed to send Kaspa. Please check your input and try again.');
    }
    await promptWalletActions(channel, userId);
};
const checkBalance = async (interaction, userId) => {
    console.log(`[checkBalance] Checking balance for user: ${userId}`);
    try {
        const userSession = userSettings.get(userId);
        if (!userSession || !userSession.address) {
            console.log(`[checkBalance] Wallet not found for user: ${userId}`);
            await interaction.update({ content: 'Wallet not found. Please create a wallet first.', components: [] });
            return;
        }
        console.log(`[checkBalance] Fetching Kaspa balance for user: ${userId}`);
        const kaspaBalance = await getBalance(userId, userSession.network);
        console.log(`[checkBalance] Kaspa balance fetched for user: ${userId}: ${kaspaBalance}`);
        console.log(`[checkBalance] Fetching KRC20 balances for user: ${userId}`);
        const krc20Balances = await getKRC20Balances(userSession.address, userSession.network);
        console.log(`[checkBalance] KRC20 balances fetched for user: ${userId}: ${JSON.stringify(krc20Balances)}`);
        const combinedBalances = [`Kaspa: ${kaspaBalance}`].concat(krc20Balances);
        const balanceMessage = `${userSession.address} Balances:\n${combinedBalances.join('\n')}`;
        console.log(`[checkBalance] Sending balance message to user: ${userId}`);
        await interaction.update({ content: balanceMessage, components: [] });
        console.log(`[checkBalance] Balance message sent to user: ${userId}`);
        setTimeout(() => promptWalletActions(interaction.channel, userId), 2000);
    }
    catch (error) {
        console.error(`[checkBalance] Error checking balance for user: ${userId}`, error);
        await interaction.update({
            content: 'An error occurred while fetching your balances. Please try again later.',
            components: []
        });
        setTimeout(() => promptWalletActions(interaction.channel, userId), 2000);
    }
};
const getKRC20Balances = async (address, network) => {
    console.log(`[getKRC20Balances] Fetching KRC20 balances for address: ${address} on network: ${network}`);
    const apiBaseUrl = getApiBaseUrl(network);
    console.log(`[getKRC20Balances] Using API base URL: ${apiBaseUrl}`);
    try {
        const url = `${apiBaseUrl}/address/${address}/tokenlist`;
        console.log(`[getKRC20Balances] Sending request to: ${url}`);
        const response = await axios.get(url);
        console.log(`[getKRC20Balances] Response received for address: ${address}`);
        const holderData = response.data;
        console.log(`[getKRC20Balances] Holder data: ${JSON.stringify(holderData)}`);
        const balances = holderData.result.map((token) => `${token.tick.toUpperCase()}: ${token.balance} ${token.tick.toUpperCase()}`);
        console.log(`[getKRC20Balances] Processed balances: ${JSON.stringify(balances)}`);
        return balances;
    }
    catch (error) {
        console.error(`[getKRC20Balances] Failed to fetch KRC20 token balances for address: ${address}`, error);
        return ['Failed to fetch KRC20 token balances'];
    }
};
const getApiBaseUrl = (network) => {
    console.log(`[getApiBaseUrl] Getting API base URL for network: ${network}`);
    let baseUrl;
    switch (network) {
        case 'Mainnet':
            baseUrl = process.env.MAINNET_API_BASE_URL || '';
            break;
        case 'Testnet-10':
            baseUrl = process.env.TESTNET_10_API_BASE_URL || '';
            break;
        case 'Testnet-11':
            baseUrl = process.env.TESTNET_11_API_BASE_URL || '';
            break;
        default:
            throw new Error('Invalid network');
    }
    console.log(`[getApiBaseUrl] API base URL for ${network}: ${baseUrl}`);
    return baseUrl;
};
