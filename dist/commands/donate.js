"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDonateCommand = void 0;
const fs_1 = __importDefault(require("fs"));
const builders_1 = require("@discordjs/builders");
const handleDonateCommand = (message) => {
    const templateContent = fs_1.default.readFileSync('message_template.json', 'utf8');
    const template = JSON.parse(templateContent);
    const embed = new builders_1.EmbedBuilder()
        .setColor(template.color)
        .setImage(template.background_images[0].url)
        .setAuthor({ name: template.author.name, iconURL: template.author.icon_url })
        .setFooter({ text: 'x.com/NachoWyborski' })
        .addFields({ name: 'Donation Address', value: 'kaspa:qrt3lf6jejjdzwtnvlr3z35w7j6q66gt49a7grdwsq98nmlg5uz97whuf8qfr' })
        .setDescription('[Check Kaspa Donation Wallet Balance](https://kas.fyi/address/kaspa:qrt3lf6jejjdzwtnvlr3z35w7j6q66gt49a7grdwsq98nmlg5uz97whuf8qfr)');
    message.channel.send({ embeds: [embed] });
};
exports.handleDonateCommand = handleDonateCommand;
