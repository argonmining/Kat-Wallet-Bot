import { Message, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, DMChannel, MessageComponentInteraction, ChannelType, Collection } from 'discord.js';
import { generateNewWallet, importWalletFromPrivateKey, sendKaspa } from '../utils/walletFunctions.js';

const userSettings = new Map<string, { network: string; privateKey: string; address: string }>();

export const handleWalletCommand = async (message: Message) => {
    console.log(`[handleWalletCommand] Command triggered by user: ${message.author.id}`);

    if (message.channel.type !== ChannelType.DM) {
        try {
            console.log(`[handleWalletCommand] Not a DM, attempting to create a DM channel for user: ${message.author.id}`);
            const dmChannel = await message.author.createDM();
            console.log(`[handleWalletCommand] DM channel created successfully for user: ${message.author.id}`);
            await promptNetworkSelection(dmChannel, message.author.id);
        } catch (error) {
            console.error(`[handleWalletCommand] Failed to send DM to user: ${message.author.id}`, error);
            message.reply('I couldn\'t send you a DM! Please check your privacy settings.');
        }
    } else {
        console.log(`[handleWalletCommand] Already in DM, proceeding to network selection for user: ${message.author.id}`);
        await promptNetworkSelection(message.channel as DMChannel, message.author.id);
    }

    console.log(`[handleWalletCommand] Waiting for network selection to complete before presenting wallet options.`);
};

const promptNetworkSelection = async (channel: DMChannel, userId: string) => {
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

    try {
        await channel.send({
            content: 'Please select the network you want to use:',
            components: [row],
        });
        console.log(`[promptNetworkSelection] Sent network selection to user: ${userId}`);
    } catch (error) {
        console.error(`[promptNetworkSelection] Failed to send network selection to user: ${userId}`, error);
        return;
    }

    const filter = (interaction: MessageComponentInteraction) =>
        ['Mainnet', 'Testnet-10', 'Testnet-11'].includes(interaction.customId) &&
        interaction.user.id === userId;

    const collector = channel.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 });

    let hasReplied = false;

    collector.on('collect', async (interaction: MessageComponentInteraction) => {
        if (hasReplied) return;
        hasReplied = true;

        const network = interaction.customId === 'Mainnet' ? 'Mainnet' : 'Testnet';
        console.log(`[promptNetworkSelection] User ${userId} selected network: ${network}`);

        userSettings.set(userId, { network, privateKey: '', address: '' });

        try {
            await interaction.deferReply();
            await interaction.followUp(`You have selected the ${network} network.`);
            console.log(`[promptNetworkSelection] Confirmation sent for network: ${network}`);
        } catch (error) {
            console.error(`[promptNetworkSelection] Failed to send confirmation for network: ${network}`, error);
            return;
        }

        console.log(`[promptNetworkSelection] Current network stored for user ${userId}: ${userSettings.get(userId)?.network}`);

        await sendWalletOptions(channel, userId, network);
    });

    collector.on('end', () => {
        console.log(`[promptNetworkSelection] Network selection ended for user: ${userId}`);
        hasReplied = false;
    });
};

const sendWalletOptions = async (channel: DMChannel, userId: string, network: string) => {
    console.log(`[sendWalletOptions] Presenting wallet options to user: ${userId}`);
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

    try {
        await channel.send({
            content: 'I can create a new wallet for you, or you can import the private key of an existing wallet. What would you like to do?',
            components: [row],
        });
        console.log(`[sendWalletOptions] Wallet options message sent to user: ${userId}`);
    } catch (error) {
        console.error(`[sendWalletOptions] Failed to send wallet options message to user: ${userId}`, error);
        return;
    }

    const filter = (interaction: MessageComponentInteraction) =>
        ['create_wallet', 'import_wallet'].includes(interaction.customId) &&
        interaction.user.id === userId;

    const collector = channel.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async (interaction: MessageComponentInteraction) => {
        try {
            await interaction.deferReply();

            console.log(`[sendWalletOptions] User ${userId} has chosen an option.`);
            console.log(`[sendWalletOptions] Network passed to wallet function: ${network}`);

            if (interaction.customId === 'create_wallet') {
                console.log(`[sendWalletOptions] User ${userId} selected to create a new wallet`);
                await interaction.followUp('Creating a new wallet...');
                const walletInfo = await generateNewWallet(userId, network);
                userSettings.set(userId, { ...userSettings.get(userId), privateKey: walletInfo.privateKey, address: walletInfo.address });
                interaction.followUp(`Your new wallet has been created!\nAddress: ${walletInfo.address}\nMnemonic: ${walletInfo.mnemonic}`);
            } else if (interaction.customId === 'import_wallet') {
                console.log(`[sendWalletOptions] User ${userId} selected to import a wallet`);
                await interaction.followUp('Please provide your private key to import the wallet:');

                const privateKeyFilter = (response: Message) => response.author.id === userId;
                const privateKeyCollector = channel.createMessageCollector({ filter: privateKeyFilter, time: 60000 });

                privateKeyCollector.on('collect', async (response: Message) => {
                    const privateKey = response.content.trim();
                    try {
                        const walletInfo = await importWalletFromPrivateKey(privateKey, userId, network);
                        userSettings.set(userId, { ...userSettings.get(userId), privateKey: walletInfo.privateKey, address: walletInfo.address });
                        response.reply(`Wallet imported successfully!\nAddress: ${walletInfo.address}`);
                    } catch (error) {
                        console.error(`[sendWalletOptions] Failed to import wallet for user: ${userId}`, error);
                        response.reply('Failed to import wallet. Please check the private key and try again.');
                    }
                    privateKeyCollector.stop();
                });
            }

            await promptWalletActions(channel, userId);
        } catch (error) {
            console.error(`[sendWalletOptions] Failed to process wallet options for user: ${userId}`, error);
        }
    });

    collector.on('end', () => {
        console.log(`[sendWalletOptions] Wallet options interaction ended for user: ${userId}`);
    });
};

const promptWalletActions = async (channel: DMChannel, userId: string) => {
    console.log(`[promptWalletActions] Prompting user ${userId} for further wallet actions.`);
    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('send_kaspa')
                .setLabel('Send Kaspa')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('view_balance')
                .setLabel('View Balance')
                .setStyle(ButtonStyle.Secondary)
        );

    try {
        await channel.send({
            content: 'What would you like to do next?',
            components: [row],
        });
        console.log(`[promptWalletActions] Wallet actions prompt sent to user: ${userId}`);
    } catch (error) {
        console.error(`[promptWalletActions] Failed to send wallet actions prompt to user: ${userId}`, error);
        return;
    }

    const filter = (interaction: MessageComponentInteraction) =>
        ['send_kaspa', 'view_balance'].includes(interaction.customId) &&
        interaction.user.id === userId;

    const collector = channel.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async (interaction: MessageComponentInteraction) => {
        try {
            await interaction.deferReply();

            if (interaction.customId === 'send_kaspa') {
                console.log(`[promptWalletActions] User ${userId} selected to send Kaspa`);
                await interaction.followUp('Please provide the destination address and amount to send:');
                // Implement further steps to collect address and amount, then call sendKaspa()
            } else if (interaction.customId === 'view_balance') {
                console.log(`[promptWalletActions] User ${userId} selected to view balance`);
                // Implement view balance functionality
            }
        } catch (error) {
            console.error(`[promptWalletActions] Failed to process wallet actions for user: ${userId}`, error);
        }
    });

    collector.on('end', () => {
        console.log(`[promptWalletActions] Wallet actions interaction ended for user: ${userId}`);
    });
};
