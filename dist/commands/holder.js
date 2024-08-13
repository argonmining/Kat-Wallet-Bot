import axios from 'axios';
import fs from 'fs';
import { EmbedBuilder } from '@discordjs/builders';
export const handleHolderCommand = async (message, args) => {
    if (args.length !== 1) {
        message.channel.send('Please provide a valid wallet address.');
        return;
    }
    const address = args[0];
    const templateContent = fs.readFileSync('message_template.json', 'utf8');
    const template = JSON.parse(templateContent);
    try {
        const response = await axios.get(`${process.env.API_BASE_URL}/address/${address}/tokenlist`);
        const holderData = response.data;
        const embed = new EmbedBuilder()
            .setColor(template.color)
            .setImage(template.background_images[0].url)
            .setAuthor({ name: template.author.name, iconURL: template.author.icon_url })
            .setFooter({ text: 'x.com/NachoWyborski' })
            .setTitle(`KRC20 Balance for ${address}`);
        holderData.result.forEach((token) => {
            embed.addFields({ name: token.tick.toUpperCase(), value: token.balance, inline: true });
        });
        message.channel.send({ embeds: [embed] });
    }
    catch (error) {
        console.error('Failed to fetch holder data:', error);
        message.channel.send('Failed to fetch holder data. Please try again.');
    }
};
