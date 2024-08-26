import { Message, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';

interface Command {
  name: string;
  description: string;
  usage: string;
  details: string[];
}

interface HelpContent {
  commands: Command[];
}

export const handleHelpCommand = (message: Message) => {
  const helpContentPath = path.join(process.cwd(), 'help_content.json');
  const helpContent: HelpContent = JSON.parse(fs.readFileSync(helpContentPath, 'utf8'));

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('Nacho the 𐤊at Bot - Command Guide')
    .setDescription('Here\'s a list of available commands and their usage:')
    .setTimestamp();

  helpContent.commands.forEach((command: Command) => {
    let fieldValue = `${command.description}\n\n**Usage:** \`${command.usage}\`\n\n**Details:**\n`;
    command.details.forEach((detail: string) => {
      fieldValue += `• ${detail}\n`;
    });
    embed.addFields({ name: command.name, value: fieldValue });
  });

  embed.setFooter({ text: 'Built with ❤️ by the Nacho the 𐤊at Community', iconURL: 'https://i.imgur.com/4zYOZ5j.png' });

  message.channel.send({ embeds: [embed] });
};