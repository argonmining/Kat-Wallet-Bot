"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const client = new discord_js_1.Client({
    intents: [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildMessages, discord_js_1.GatewayIntentBits.MessageContent],
});
client.once('ready', () => {
    console.log(`${client.user?.tag} is online!`);
});
client.login(process.env.DISCORD_TOKEN);
client.on('messageCreate', (message) => {
    if (message.author.bot)
        return;
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
