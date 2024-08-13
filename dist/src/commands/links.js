"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleLinksCommand = void 0;
const fs_1 = __importDefault(require("fs"));
const builders_1 = require("@discordjs/builders");
const handleLinksCommand = (message) => {
    const templateContent = fs_1.default.readFileSync('message_template.json', 'utf8');
    const linksContent = fs_1.default.readFileSync('nacho_links.json', 'utf8');
    const template = JSON.parse(templateContent);
    const linksJson = JSON.parse(linksContent);
    const embed = new builders_1.EmbedBuilder()
        .setColor(template.color)
        .setImage(template.background_images[0].url)
        .setAuthor({ name: template.author.name, iconURL: template.author.icon_url })
        .setFooter({ text: 'x.com/NachoWyborski' })
        .setTitle('Official Links');
    linksJson.links.forEach((link) => {
        embed.addFields({ name: link.name, value: link.url });
    });
    message.channel.send({ embeds: [embed] });
};
exports.handleLinksCommand = handleLinksCommand;
