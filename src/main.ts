import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { handleStatusCommand } from './commands/status';
import { handleLinksCommand } from './commands/links';
import { handleHelpCommand } from './commands/help';
import { handleHolderCommand } from './commands/holder';
import { handleDonateCommand } from './commands/donate';
import { handleWalletCommand } from './commands/wallet'; // Import the new command handler
import express from 'express';

const app = express();
const port = process.env.PORT || 8080;

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages],
});

client.once('ready', () => {
  console.log(`${client.user?.tag} is connected!`);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  const [command, ...args] = message.content.split(' ');

  switch (command) {
    case '!tokeninfo':
      handleStatusCommand(message, args);
      break;
    case '!links':
      handleLinksCommand(message);
      break;
    case '!helpme':
      handleHelpCommand(message);
      break;
    case '!tokenbalance':
      handleHolderCommand(message, args);
      break;
    case '!donate':
      handleDonateCommand(message);
      break;
    case '!wallet':
      handleWalletCommand(message); // New command handler
      break;
    default:
      break;
  }
});

client.login(process.env.DISCORD_TOKEN);
