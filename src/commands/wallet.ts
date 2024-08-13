import { Message, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, DMChannel, MessageComponentInteraction, ChannelType } from 'discord.js';
import { generateNewWallet, importWalletFromPrivateKey } from '../../utils/walletFunctions'; // Ensure this path is correct

// In-memory storage for user network selections
const userNetworkSelections = new Map<string, string>();

export const handleWalletCommand = async (message: Message) => {
  if (message.channel.type !== ChannelType.DM) {
    try {
      const dmChannel = await message.author.createDM();
      await promptNetworkSelection(dmChannel, message.author.id); // Pass user ID to track selection
    } catch (error) {
      console.error('Failed to send DM:', error);
      message.reply('I couldn\'t send you a DM! Please check your privacy settings.');
    }
  } else {
    await promptNetworkSelection(message.channel as DMChannel, message.author.id); // Pass user ID to track selection
  }
};

// Function to prompt the user to select a network
const promptNetworkSelection = async (channel: DMChannel, userId: string) => {
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('mainnet')
        .setLabel('Mainnet')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('testnet-10')
        .setLabel('Testnet-10')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('testnet-11')
        .setLabel('Testnet-11')
        .setStyle(ButtonStyle.Secondary)
    );

  await channel.send({
    content: 'Please select the network you want to use:',
    components: [row],
  });

  const filter = (interaction: MessageComponentInteraction) => 
    ['mainnet', 'testnet-10', 'testnet-11'].includes(interaction.customId) && 
    interaction.user.id === userId;

  const collector = channel.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 });

  collector.on('collect', async (interaction: MessageComponentInteraction) => {
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
const sendWalletOptions = async (channel: DMChannel, userId: string) => {
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('create_wallet')
        .setLabel('Create Wallet')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('import_wallet')
        .setLabel('Import Wallet')
        .setStyle(ButtonStyle.Secondary)
    );

  await channel.send({
    content: 'What would you like to do?',
    components: [row],
  });

  const filter = (interaction: MessageComponentInteraction) => 
    ['create_wallet', 'import_wallet'].includes(interaction.customId) && 
    interaction.user.id === userId;

  const collector = channel.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 });

  collector.on('collect', async (interaction: MessageComponentInteraction) => {
    if (interaction.customId === 'create_wallet') {
      await interaction.reply('Creating a new wallet...');
      const walletInfo = await generateNewWallet(userId);
      interaction.followUp(`Your new wallet has been created!\nAddress: ${walletInfo.address}\nMnemonic: ${walletInfo.mnemonic}`);
    } else if (interaction.customId === 'import_wallet') {
      await interaction.reply('Please provide your private key to import the wallet:');

      const privateKeyFilter = (response: Message) => response.author.id === userId;
      const privateKeyCollector = channel.createMessageCollector({ filter: privateKeyFilter, time: 60000 });

      privateKeyCollector.on('collect', async (response: Message) => {
        const privateKey = response.content.trim();
        try {
          const walletInfo = await importWalletFromPrivateKey(privateKey, userId);
          response.reply(`Wallet imported successfully!\nAddress: ${walletInfo.address}`);
        } catch (error) {
          response.reply('Failed to import wallet. Please check the private key and try again.');
        }
        privateKeyCollector.stop();
      });
    }
    collector.stop();
  });
};
