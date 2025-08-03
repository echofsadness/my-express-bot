require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, Collection } = require('discord.js');

// 🔧 Express server for Render
const app = express();
app.get('/', (_, res) => res.send('🤖 Bot is running'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Express server listening on port ${PORT}`);
});

// 🤖 Discord client setup
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});
client.commands = new Collection();

// 🔄 Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`⚠️ Skipping ${file}: missing "data" or "execute"`);
  }
}

// 🎯 Handle interactions
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`❌ Error executing ${interaction.commandName}:`, error);
    await interaction.reply({ content: 'There was an error executing that command.', ephemeral: true });
  }
});

// 🔐 Login
client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});
client.login(process.env.DISCORD_TOKEN);
