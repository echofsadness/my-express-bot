const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/xp', (req, res) => {
  // handle API logic
  res.json({ message: 'XP updated' });
});

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});

// สร้างบอท Discord
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once('ready', () => {
  console.log(`Discord bot logged in as ${client.user.tag}`);
});


client.login(process.env.DISCORD_TOKEN);
