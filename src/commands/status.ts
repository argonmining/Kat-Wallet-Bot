import { Message } from 'discord.js';
import axios from 'axios';
import fs from 'fs';
import { EmbedBuilder } from '@discordjs/builders';

export const handleStatusCommand = async (message: Message, args: string[]) => {
  if (args.length !== 1) {
    message.channel.send('Please provide a valid token ticker.');
    return;
  }

  const token = args[0].toUpperCase();
  const templateContent = fs.readFileSync('message_template.json', 'utf8');
  const template = JSON.parse(templateContent);

  try {
    const response = await axios.get(`${process.env.API_BASE_URL}/token/${token}?stat=true&holder=true`);
    const tokenData = response.data.result[0];

    const embed = new EmbedBuilder()
      .setColor(template.color)
      .setImage(template.background_images[0].url)
      .setAuthor({ name: template.author.name, iconURL: template.author.icon_url })
      .setFooter({ text: 'x.com/NachoWyborski' })
      .setTitle(`Mint Status for ${token}`)
      .addFields(
        { name: 'Max Supply', value: tokenData.max, inline: true },
        { name: 'Minted', value: tokenData.minted, inline: true },
        { name: 'Holders', value: tokenData.holderTotal || 'N/A', inline: true }
      );

    message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Failed to fetch token data:', error);
    message.channel.send('Failed to fetch token data. Please try again.');
  }
};
