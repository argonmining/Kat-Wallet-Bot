"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStatusCommand = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const builders_1 = require("@discordjs/builders");
const handleStatusCommand = async (message, args) => {
    if (args.length !== 1) {
        message.channel.send('Please provide a valid token ticker.');
        return;
    }
    const token = args[0].toUpperCase();
    const templateContent = fs_1.default.readFileSync('message_template.json', 'utf8');
    const template = JSON.parse(templateContent);
    try {
        const response = await axios_1.default.get(`${process.env.API_BASE_URL}/token/${token}?stat=true&holder=true`);
        const tokenData = response.data.result[0];
        const embed = new builders_1.EmbedBuilder()
            .setColor(template.color)
            .setImage(template.background_images[0].url)
            .setAuthor({ name: template.author.name, iconURL: template.author.icon_url })
            .setFooter({ text: 'x.com/NachoWyborski' })
            .setTitle(`Mint Status for ${token}`)
            .addFields({ name: 'Max Supply', value: tokenData.max, inline: true }, { name: 'Minted', value: tokenData.minted, inline: true }, { name: 'Holders', value: tokenData.holderTotal || 'N/A', inline: true });
        message.channel.send({ embeds: [embed] });
    }
    catch (error) {
        console.error('Failed to fetch token data:', error);
        message.channel.send('Failed to fetch token data. Please try again.');
    }
};
exports.handleStatusCommand = handleStatusCommand;
