import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import dotenv from 'dotenv';
import { handleStatusCommand } from './commands/status.js';
import { handleLinksCommand } from './commands/links.js';
import { handleHelpCommand } from './commands/help.js';
import { handleHolderCommand } from './commands/holder.js';
import { handleDonateCommand } from './commands/donate.js';
import { handleWalletCommand } from './commands/wallet.js';
import express from 'express';
const app = express();
const port = process.env.PORT || 8080;
dotenv.config();
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.DirectMessageReactions,
    ],
});
client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
});
client.on('messageCreate', async (message) => {
    console.log(`Raw message received: ${message.content} from ${message.author.tag} in ${message.channel.type}`);
    if (message.author.bot) {
        console.log('[messageCreate] Message from bot, ignoring');
        return;
    }
    // Handle DM messages
    if (message.channel.type === ChannelType.DM) {
        console.log(`[messageCreate] Processing DM from user: ${message.author.id}`);
        await handleWalletCommand(message);
        return;
    }
    // Parse command and arguments
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();
    // Handle guild messages
    switch (command) {
        case 'wallet':
            console.log(`[messageCreate] Processing !wallet command from user: ${message.author.id}`);
            await handleWalletCommand(message);
            break;
        case 'status':
            await handleStatusCommand(message, args);
            break;
        case 'links':
            await handleLinksCommand(message);
            break;
        case 'help':
            await handleHelpCommand(message);
            break;
        case 'holder':
            await handleHolderCommand(message, args);
            break;
        case 'donate':
            await handleDonateCommand(message);
            break;
        default:
            console.log('[messageCreate] Message did not match any known commands');
    }
});
client.login(process.env.DISCORD_TOKEN);
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});
