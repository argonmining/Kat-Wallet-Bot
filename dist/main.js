"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
const status_1 = require("./commands/status");
const links_1 = require("./commands/links");
const help_1 = require("./commands/help");
const holder_1 = require("./commands/holder");
const donate_1 = require("./commands/donate");
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const port = process.env.PORT || 8080;
dotenv_1.default.config();
const client = new discord_js_1.Client({
    intents: [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildMessages, discord_js_1.GatewayIntentBits.MessageContent],
});
client.once('ready', () => {
    console.log(`${client.user?.tag} is connected!`);
});
client.on('messageCreate', (message) => {
    if (message.author.bot)
        return;
    const [command, ...args] = message.content.split(' ');
    switch (command) {
        case '!tokeninfo':
            (0, status_1.handleStatusCommand)(message, args);
            break;
        case '!links':
            (0, links_1.handleLinksCommand)(message);
            break;
        case '!helpme':
            (0, help_1.handleHelpCommand)(message);
            break;
        case '!tokenbalance':
            (0, holder_1.handleHolderCommand)(message, args);
            break;
        case '!donate':
            (0, donate_1.handleDonateCommand)(message);
            break;
        default:
            break;
    }
});
client.login(process.env.DISCORD_TOKEN);
