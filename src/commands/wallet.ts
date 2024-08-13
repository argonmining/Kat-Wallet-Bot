import { ChannelType, DMChannel, Message, ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionCollector, ComponentType, MessageComponentInteraction } from 'discord.js';
import { generateNewWallet, importWalletFromPrivateKey } from '../../utils/walletFunctions';

export const handleWalletCommand = async (message: Message) => {
  if (message.channel.type !== ChannelType.DM) {
    try {
      const dmChannel = await message.author.createDM();
      dmChannel.send('Welcome to your private wallet session!');
      sendWalletOptions(dmChannel);
    } catch (error) {
      console.error('Failed to send DM:', error);
      message.reply('I couldn\'t send you a DM! Please check your privacy settings.');
    }
  } else {
    sendWalletOptions(message.channel as DMChannel);
  }
};

const sendWalletOptions = async (channel: DMChannel) => { // Explicitly typing the channel parameter
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
    ['create_wallet', 'import_wallet'].includes(interaction.customId) && interaction.user.id === channel.recipient!.id;
  
  const collector = channel.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 });

  collector.on('collect', async (interaction: MessageComponentInteraction) => { // Explicitly typing the interaction parameter
    if (interaction.customId === 'create_wallet') {
      await interaction.reply('Creating a new wallet...');
      const walletInfo = await generateNewWallet();
      interaction.followUp(`Your new wallet has been created!\nAddress: ${walletInfo.address}\nMnemonic: ${walletInfo.mnemonic}`);
    } else if (interaction.customId === 'import_wallet') {
      await interaction.reply('Please provide your private key to import the wallet:');

      const privateKeyFilter = (response: Message) => response.author.id === interaction.user.id; // Explicitly typing the response parameter
      const privateKeyCollector = channel.createMessageCollector({ filter: privateKeyFilter, time: 60000 });

      privateKeyCollector.on('collect', async (response: Message) => { // Explicitly typing the response parameter
        const privateKey = response.content.trim();
        try {
          const walletInfo = await importWalletFromPrivateKey(privateKey);
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