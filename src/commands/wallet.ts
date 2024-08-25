import { Message, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, DMChannel, MessageComponentInteraction, ChannelType, TextBasedChannel } from 'discord.js';
import { generateNewWallet } from '../utils/generateNewWallet';
import { importWalletFromPrivateKey } from '../utils/importWallet';
import { sendKaspa } from '../utils/sendKaspa';
import { getBalance } from '../utils/getBalance';
import { userSettings, Network } from '../utils/userSettings';
import { getRpcClient } from '../utils/rpcConnection';
import axios from 'axios';
import { EmbedBuilder } from '@discordjs/builders';
import lodash from 'lodash';
const { debounce } = lodash;

let activePrompt: Promise<void> | null = null;

enum WalletState {
  IDLE,
  NETWORK_SELECTION,
  WALLET_OPTIONS,
  WALLET_ACTIONS,
  SENDING_KASPA,
  CHECKING_BALANCE,
  VIEWING_HISTORY
}

const userWalletStates = new Map<string, WalletState>();

export const handleWalletCommand = async (message: Message) => {
    console.log(`[handleWalletCommand] Command triggered by user: ${message.author.id} in channel type: ${message.channel.type}`);

    if (message.channel.type === ChannelType.DM) {
        console.log(`[handleWalletCommand] Command received in DM, proceeding with wallet actions for user: ${message.author.id}`);
        await handleWalletActions(message.channel, message.author.id);
    } else {
        try {
            console.log(`[handleWalletCommand] Not a DM, attempting to create a DM channel for user: ${message.author.id}`);
            const dmChannel = await message.author.createDM();
            console.log(`[handleWalletCommand] DM channel created successfully for user: ${message.author.id}`);
            await message.reply('I\'ve sent you a DM to start your wallet session!');
            
            await dmChannel.send('Welcome to your private Kat Wallet Session. Let\'s start by choosing which Network you\'ll be using.');
            
            // Only call handleWalletActions once
            await handleWalletActions(dmChannel, message.author.id);
        } catch (error) {
            console.error(`[handleWalletCommand] Failed to send DM to user: ${message.author.id}`, error);
            await message.reply('I couldn\'t send you a DM! Please check your privacy settings.');
        }
    }
};

const handleWalletActions = async (channel: DMChannel | TextBasedChannel, userId: string) => {
  console.log(`[handleWalletActions] Starting wallet actions for user: ${userId}`);
  let userSession = userSettings.get(userId);
  let currentState = userWalletStates.get(userId) || WalletState.IDLE;

  if (!userSession || !userSession.network) {
    currentState = WalletState.NETWORK_SELECTION;
    userWalletStates.set(userId, currentState);
    await promptNetworkSelection(channel, userId);
    userSession = userSettings.get(userId);
    
    if (!userSession || !userSession.network) {
      console.error(`[handleWalletActions] Failed to create user session for user: ${userId}`);
      await channel.send('An error occurred while setting up your wallet. Please try the !wallet command again.');
      userWalletStates.delete(userId);
      return;
    }
  }

  if (!userSession.address) {
    currentState = WalletState.WALLET_OPTIONS;
    userWalletStates.set(userId, currentState);
    await promptWalletOptions(channel, userId, userSession.network);
    userSession = userSettings.get(userId);
    
    if (!userSession || !userSession.address) {
      console.error(`[handleWalletActions] Failed to create or import wallet for user: ${userId}`);
      await channel.send('An error occurred while setting up your wallet. Please try the !wallet command again.');
      userWalletStates.delete(userId);
      return;
    }
  }

  currentState = WalletState.WALLET_ACTIONS;
  userWalletStates.set(userId, currentState);
  await promptWalletActions(channel, userId);
};

const promptNetworkSelection = async (channel: DMChannel | TextBasedChannel, userId: string) => {
    console.log(`[promptNetworkSelection] Starting network selection for user: ${userId}`);

    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('Mainnet')
                .setLabel('Mainnet')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('Testnet-10')
                .setLabel('Testnet-10')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('Testnet-11')
                .setLabel('Testnet-11')
                .setStyle(ButtonStyle.Secondary)
        );

    await channel.send({
        content: 'Please select the network you want to use:',
        components: [row],
    });

    const filter = (i: MessageComponentInteraction) => 
        ['Mainnet', 'Testnet-10', 'Testnet-11'].includes(i.customId) && i.user.id === userId;

    try {
        const interaction = await channel.awaitMessageComponent({ filter, time: 300000 }); // 5 minutes
        const userNetworkChoice = interaction.customId as Network;
        await interaction.update({ content: `You selected ${userNetworkChoice}`, components: [] });
        
        // Set the user's network choice
        const existingSession = userSettings.get(userId) || {};
        userSettings.set(userId, { 
            ...existingSession, 
            network: userNetworkChoice, 
            lastActivity: Date.now() 
        });

        // Create RPC connection after network selection
        await getRpcClient(userId, userNetworkChoice);
        
        await promptWalletOptions(channel, userId, userNetworkChoice);
    } catch (error) {
        console.error(`[promptNetworkSelection] Error in network selection for user: ${userId}`, error);
        channel.send('Network selection timed out. Please try the !wallet command again.');
    }
};

const promptWalletOptions = async (channel: DMChannel | TextBasedChannel, userId: string, userNetworkChoice: Network) => {
    console.log(`[promptWalletOptions] Prompting wallet options for user: ${userId} on network: ${userNetworkChoice}`);

    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create')
                .setLabel('Create New Wallet')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('import')
                .setLabel('Import Existing Wallet')
                .setStyle(ButtonStyle.Secondary)
        );

    const message = await channel.send({
        content: 'Would you like to create a new wallet or import an existing one?',
        components: [row],
    });

    const filter = (i: MessageComponentInteraction) => 
        ['create', 'import'].includes(i.customId) && i.user.id === userId;

    try {
        const interaction = await message.awaitMessageComponent({ filter, time: 300000 });
        await interaction.deferUpdate();

        if (interaction.customId === 'create') {
            await createWallet(channel, userId, userNetworkChoice);
        } else {
            await importWallet(channel, userId, userNetworkChoice);
        }

        await message.edit({ components: [] });
    } catch (error) {
        console.error(`[promptWalletOptions] Error in wallet option selection for user: ${userId}`, error);
        await channel.send('Wallet option selection timed out. Please try the !wallet command again.');
    }
};

const createWallet = async (channel: DMChannel | TextBasedChannel, userId: string, userNetworkChoice: Network) => {
    console.log(`[createWallet] Creating new wallet for user: ${userId} on network: ${userNetworkChoice}`);
    try {
        const walletInfo = await generateNewWallet(userId, userNetworkChoice);
        userSettings.set(userId, { 
            network: userNetworkChoice, 
            address: walletInfo.address,
            lastActivity: Date.now()
        });
        const message = `New wallet created successfully!\nAddress: ${walletInfo.address}\nPrivate Key: ${walletInfo.privateKey}\n\nIMPORTANT: Please store your private key securely. It will not be shown again.`;
        await channel.send(message);
    } catch (error) {
        console.error(`[createWallet] Error creating wallet for user: ${userId}`, error);
        await channel.send('An error occurred while creating your wallet. Please try again.');
    }
};

const importWallet = async (channel: DMChannel | TextBasedChannel, userId: string, userNetworkChoice: Network) => {
    console.log(`[importWallet] Importing wallet for user: ${userId} on network: ${userNetworkChoice}`);
    await channel.send('Please enter your private key:');
    try {
        const response = await channel.awaitMessages({
            filter: (m) => m.author.id === userId,
            max: 1,
            time: 300000,
            errors: ['time']
        });
        const privateKey = response.first()?.content;
        if (!privateKey) {
            throw new Error('No private key provided');
        }
        const walletInfo = await importWalletFromPrivateKey(privateKey, userNetworkChoice);
        userSettings.set(userId, { 
            network: userNetworkChoice, 
            address: walletInfo.address,
            lastActivity: Date.now()
        });
        await channel.send('For security reasons, please delete your message containing the private key.');
        await channel.send(`Wallet imported successfully!\nAddress: ${walletInfo.address}`);
    } catch (error) {
        console.error(`[importWallet] Error importing wallet for user: ${userId}`, error);
        await channel.send('An error occurred while importing your wallet. Please try again.');
    }
};

const promptWalletActions = async (channel: DMChannel | TextBasedChannel, userId: string) => {
  console.log(`[promptWalletActions] Prompting wallet actions for user: ${userId}`);
  const userSession = userSettings.get(userId);
  if (!userSession) {
    console.log(`[promptWalletActions] No user session found for user: ${userId}`);
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle('Wallet Actions')
    .setDescription('What would you like to do?')
    .setFooter({ text: `Network: ${userSession.network}` });

  const row1 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('send')
        .setLabel('Send Kaspa')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('balance')
        .setLabel('Check Balance')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('history')
        .setLabel('Transaction History')
        .setStyle(ButtonStyle.Secondary)
    );

  const row2 = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('help')
        .setLabel('Help')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('clear')
        .setLabel('Clear Chat')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('back')
        .setLabel('Back')
        .setStyle(ButtonStyle.Danger)
    );

  const message = await channel.send({ embeds: [embed], components: [row1, row2] });

  const filter = (i: MessageComponentInteraction) => 
    ['send', 'balance', 'history', 'help', 'clear', 'back'].includes(i.customId) && i.user.id === userId;

  try {
    const interaction = await message.awaitMessageComponent({ filter, time: 300000 });
    await interaction.deferUpdate();

    switch (interaction.customId) {
      case 'send':
        userWalletStates.set(userId, WalletState.SENDING_KASPA);
        await sendKaspaPrompt(channel, userId);
        break;
      case 'balance':
        userWalletStates.set(userId, WalletState.CHECKING_BALANCE);
        await checkBalance(channel, userId);
        break;
      case 'history':
        userWalletStates.set(userId, WalletState.VIEWING_HISTORY);
        await showTransactionHistory(channel, userId);
        break;
      case 'help':
        await showHelpMessage(channel, userId);
        break;
      case 'clear':
        await clearChatHistory(channel, userId);
        break;
      case 'back':
        userWalletStates.set(userId, WalletState.NETWORK_SELECTION);
        await promptNetworkSelection(channel, userId);
        return;
    }

    userWalletStates.set(userId, WalletState.WALLET_ACTIONS);
    await promptWalletActions(channel, userId);
  } catch (error) {
    console.error(`[promptWalletActions] Error in wallet action selection for user: ${userId}`, error);
    await message.edit({ content: 'Wallet action selection timed out. Please use the !wallet command again to restart.', components: [] });
    userWalletStates.delete(userId);
  }
};

const sendKaspaPrompt = async (channel: DMChannel | TextBasedChannel, userId: string): Promise<void> => {
  await channel.send('Please enter the amount of Kaspa to send and the destination address in this format: "amount address"');

  try {
    const response = await channel.awaitMessages({
      filter: (m) => m.author.id === userId,
      max: 1,
      time: 60000,
      errors: ['time']
    });

    const [amount, address] = response.first()?.content.split(' ') || [];

    if (!amount || !address) {
      await channel.send('Invalid format. Please try again with the correct format: "amount address"');
      return;
    }

    const userSession = userSettings.get(userId);
    if (!userSession || !userSession.network) {
      await channel.send('User session or network not found. Please try again.');
      return;
    }

    const confirmEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('Confirm Transaction')
      .setDescription('Please confirm the transaction details:')
      .addFields(
        { name: 'Amount', value: `${amount} KAS` },
        { name: 'Recipient Address', value: address }
      );

    const confirmRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('confirm')
          .setLabel('Confirm')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('cancel')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Danger)
      );

    const confirmMessage = await channel.send({ embeds: [confirmEmbed], components: [confirmRow] });

    const confirmInteraction = await confirmMessage.awaitMessageComponent({
      filter: (i) => ['confirm', 'cancel'].includes(i.customId) && i.user.id === userId,
      time: 60000
    });

    await confirmInteraction.deferUpdate();

    if (confirmInteraction.customId === 'confirm') {
      const amountInSompi = BigInt(Math.floor(parseFloat(amount) * 100000000));
      const txId = await sendKaspa(userId, amountInSompi, address, userSession.network);
      await channel.send(`Transaction sent successfully! Transaction ID: ${txId}`);
    } else {
      await channel.send('Transaction cancelled.');
    }
  } catch (error) {
    console.error(`[sendKaspaPrompt] Error in send Kaspa prompt for user: ${userId}`, error);
    await channel.send('An error occurred or you took too long to respond. Please try again.');
  }
};

const checkBalance = async (channel: DMChannel | TextBasedChannel, userId: string) => {
    console.log(`[checkBalance] Checking balance for user: ${userId}`);
    try {
        const userSession = userSettings.get(userId);
        if (!userSession || !userSession.address) {
            console.log(`[checkBalance] Wallet not found for user: ${userId}`);
            await channel.send('Wallet not found. Please create a wallet first.');
            return;
        }

        console.log(`[checkBalance] Fetching Kaspa balance for user: ${userId}`);
        const kaspaBalance = await getBalance(userId, userSession.network);
        console.log(`[checkBalance] Kaspa balance fetched for user: ${userId}: ${kaspaBalance}`);

        console.log(`[checkBalance] Fetching KRC20 balances for user: ${userId}`);
        const krc20Balances = await getKRC20Balances(userSession.address, userSession.network);
        console.log(`[checkBalance] KRC20 balances fetched for user: ${userId}: ${JSON.stringify(krc20Balances)}`);

        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('Wallet Balance')
            .setDescription(`Balance for ${userSession.address}`)
            .addFields(
                { name: 'Kaspa Balance', value: `${kaspaBalance} KAS` },
                { name: 'KRC20 Balances', value: krc20Balances.length > 0 ? krc20Balances.join('\n') : 'No KRC20 tokens found or balance retrieval restricted' }
            )
            .setFooter({ text: `Network: ${userSession.network}` });

        await channel.send({ embeds: [embed] });

        console.log(`[checkBalance] Balance message sent to user: ${userId}`);
    } catch (error) {
        console.error(`[checkBalance] Error checking balance for user: ${userId}`, error);
        await channel.send('An error occurred while checking your balance. Please try again later.');
    }
};

const getKRC20Balances = async (address: string, network: Network): Promise<string[]> => {
    console.log(`[getKRC20Balances] Fetching KRC20 balances for address: ${address} on network: ${network}`);
    const apiBaseUrl = getApiBaseUrl(network);
    console.log(`[getKRC20Balances] Using API base URL: ${apiBaseUrl}`);

    try {
        const url = `${apiBaseUrl}/address/${address}/tokenlist`;
        console.log(`[getKRC20Balances] Sending request to: ${url}`);

        const response = await axios.get(url);
        console.log(`[getKRC20Balances] Response received for address: ${address}`);

        if (response.data.message === 'unsynced') {
            console.log(`[getKRC20Balances] API reports unsynced state for address: ${address}`);
            return ["KRC20 balance unavailable (node unsynced)"];
        }

        const holderData = response.data;
        console.log(`[getKRC20Balances] Holder data: ${JSON.stringify(holderData)}`);

        const balances = holderData.result.map((token: { tick: string; balance: string }) => 
            `${token.tick.toUpperCase()}: ${token.balance} ${token.tick.toUpperCase()}`
        );

        console.log(`[getKRC20Balances] Processed balances: ${JSON.stringify(balances)}`);
        return balances;
    } catch (error) {
        console.error(`[getKRC20Balances] Failed to fetch KRC20 token balances for address: ${address}`, error);
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            return ["KRC20 balance unavailable (access forbidden)"];
        }
        return ["Failed to fetch KRC20 token balances"];
    }
};

const getApiBaseUrl = (network: Network): string => {
    console.log(`[getApiBaseUrl] Getting API base URL for network: ${network}`);
    let baseUrl: string;
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

const showTransactionHistory = async (channel: DMChannel | TextBasedChannel, userId: string) => {
    const userSession = userSettings.get(userId);
    if (!userSession || !userSession.address) {
        await channel.send('Wallet not found. Please create a wallet first.');
        return;
    }

    try {
        const history = await getTransactionHistory(userSession.address, userSession.network);
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('Transaction History')
            .setDescription(`Recent transactions for ${userSession.address}`)
            .setFooter({ text: `Network: ${userSession.network}` });

        history.slice(0, 5).forEach((tx, index) => {
            embed.addFields({ name: `Transaction ${index + 1}`, value: `ID: ${tx.id}\nAmount: ${tx.amount} KAS\nType: ${tx.type}\nTimestamp: ${tx.timestamp}` });
        });

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error(`[showTransactionHistory] Error fetching transaction history for user: ${userId}`, error);
        await channel.send('An error occurred while fetching your transaction history. Please try again later.');
    }
};

const showHelpMessage = async (channel: DMChannel | TextBasedChannel, userId: string) => {
    const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Wallet Help')
        .setDescription('Here are the available wallet commands:')
        .addFields(
            { name: 'Send Kaspa', value: 'Send Kaspa to another address' },
            { name: 'Check Balance', value: 'View your current Kaspa and KRC20 token balances' },
            { name: 'Transaction History', value: 'View your recent transactions' },
            { name: 'Back', value: 'Return to the main wallet menu' }
        )
        .setFooter({ text: 'For more help, visit our documentation or contact support.' });

    await channel.send({ embeds: [embed] });
};

const getTransactionHistory = async (address: string, network: Network): Promise<any[]> => {
    // This is a placeholder implementation
    // TODO: Implement this function using the Kaspa WASM bindings
    console.log(`[getTransactionHistory] Fetching transaction history for address: ${address} on network: ${network}`);
    return [
        { id: 'tx1', amount: '10', type: 'Received', timestamp: '2023-04-01 10:00:00' },
        { id: 'tx2', amount: '5', type: 'Sent', timestamp: '2023-04-02 15:30:00' },
        // Add more placeholder transactions as needed
    ];
};

const clearChatHistory = async (channel: DMChannel | TextBasedChannel, userId: string) => {
    console.log(`[clearChatHistory] Clearing chat history for user: ${userId}`);

    try {
        if (channel.type === ChannelType.DM) {
            const messages = await channel.messages.fetch({ limit: 100 });
            const botMessages = messages.filter(m => m.author.id === channel.client.user.id);

            for (const message of botMessages.values()) {
                await message.delete();
            }

            await channel.send('Bot messages have been cleared. For security, please manually delete any of your messages containing sensitive information.');
        } else {
            await channel.send('Chat history can only be cleared in DM channels.');
        }
    } catch (error) {
        console.error(`[clearChatHistory] Error clearing chat history for user: ${userId}`, error);
        await channel.send('An error occurred while trying to clear the chat history. Please try again later.');
    }
};