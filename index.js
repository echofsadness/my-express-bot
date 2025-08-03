const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');
require('dotenv').config(); // ถ้าใช้ .env

// 🔧 สร้าง Express server
const app = express();
app.get('/', (_, res) => res.send('🤖 Bot is running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Express server listening on port ${PORT}`);
});

// 🤖 สร้าง Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.commands = new Collection();

// โหลดคำสั่งจากโฟลเดอร์ commands
const commandFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('.js') && file !== 'index.js');
for (const file of commandFiles) {
  const command = require(`./${file}`);
  client.commands.set(command.data.name, command);
}

// event: ready
client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// event: interactionCreate
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: '❌ There was an error executing that command.', ephemeral: true });
  }
});

// 🔐 login
client.login(process.env.DISCORD_TOKEN);
