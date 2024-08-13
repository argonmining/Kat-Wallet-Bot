import fs from 'fs';
import { EmbedBuilder } from '@discordjs/builders';
export const handleHelpCommand = (message) => {
    const templateContent = fs.readFileSync('message_template.json', 'utf8');
    const helpContent = fs.readFileSync('help_content.json', 'utf8');
    const template = JSON.parse(templateContent);
    const helpJson = JSON.parse(helpContent);
    const embed = new EmbedBuilder()
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
