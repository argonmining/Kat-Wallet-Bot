import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once('ready', () => {
  console.log(`${client.user?.tag} is online!`);
});

client.login(process.env.DISCORD_TOKEN);

client.on('messageCreate', (message) => {
    if (message.author.bot) return;
  
    const [command, ...args] = message.content.split(' ');
  
    switch (command) {
      case '!donate':
        // Call the function from `src/commands/donate.ts`
        break;
      case '!helpme':
        // Call the function from `src/commands/help.ts`
        break;
      case '!tokenbalance':
        // Call the function from `src/commands/holder.ts`
        break;
      case '!links':
        // Call the function from `src/commands/links.ts`
        break;
      case '!tokeninfo':
        // Call the function from `src/commands/status.ts`
        break;
      default:
        break;
    }
  });
  