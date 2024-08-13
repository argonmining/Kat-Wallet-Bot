"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleHelpCommand = void 0;
const fs_1 = __importDefault(require("fs"));
const builders_1 = require("@discordjs/builders");
const handleHelpCommand = (message) => {
    const templateContent = fs_1.default.readFileSync('message_template.json', 'utf8');
    const helpContent = fs_1.default.readFileSync('help_content.json', 'utf8');
    const template = JSON.parse(templateContent);
    const helpJson = JSON.parse(helpContent);
    const embed = new builders_1.EmbedBuilder()
        .setColor(template.color)
        .setImage(template.background_images[0].url)
        .setAuthor({ name: template.author.name, iconURL: template.author.icon_url })
        .setFooter({ text: 'x.com/NachoWyborski' })
        .setTitle('Help Menu');
    helpJson.commands.forEach((command) => {
        embed.addFields({ name: command.name, value: command.description });
    });
    message.channel.send({ embeds: [embed] });
};
exports.handleHelpCommand = handleHelpCommand;
