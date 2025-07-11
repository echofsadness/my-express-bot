import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, Events } from 'discord.js';
import dotenv from 'dotenv';
import * as noblox from 'noblox.js';
import express from 'express';

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// 🛠️ Slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('promote')
    .setDescription('Promote a Roblox user in the group')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Roblox username')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('demote')
    .setDescription('Demote a Roblox user in the group')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Roblox username')
        .setRequired(true))
].map(command => command.toJSON());

// 📡 Register commands
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
})();

// 🤖 Bot ready
client.once('ready', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  try {
    await noblox.setCookie(process.env.ROBLOX_COOKIE);
    console.log('🔐 Noblox session started');
  } catch (err) {
    console.error('❌ Roblox login failed:', err.message);
    setTimeout(() => process.exit(1), 5000); // ให้ container รีสตาร์ท
  }
});

// 🎮 Handle commands
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const username = interaction.options.getString('username');
  let userId;

  try {
    userId = await noblox.getIdFromUsername(username);
  } catch {
    return interaction.reply({ content: '❌ ไม่พบชื่อผู้ใช้ Roblox นี้', ephemeral: true });
  }

  try {
    let result;
    if (interaction.commandName === 'promote') {
      result = await noblox.promote(process.env.GROUP_ID, userId);
      return interaction.reply(`✅ Promoted **${username}** to **${result.newRole.name}**`);
    } else if (interaction.commandName === 'demote') {
      result = await noblox.demote(process.env.GROUP_ID, userId);
      return interaction.reply(`✅ Demoted **${username}** to **${result.newRole.name}**`);
    }
  } catch (err) {
    console.error(err);
    return interaction.reply({ content: '❌ ดำเนินการไม่ได้ อาจเกิดจากสิทธิ์ไม่เพียงพอหรือระบบล่ม', ephemeral: true });
  }
});

// 🌐 Minimal Express web server (for uptime services or Render)
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (_, res) => {
  res.send('Bot is running');
});

app.listen(PORT, () => {
  console.log(`🌐 Web server listening on port ${PORT}`);
});

console.log("🧪 Logging in with token:", process.env.TOKEN?.slice(0, 10), '...');
client.login(process.env.TOKEN);
client.on('error', console.error);
client.on('shardError', console.error);
process.on('unhandledRejection', console.error);

