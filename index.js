import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, Events } from 'discord.js';
import dotenv from 'dotenv';
import * as noblox from 'noblox.js';
import express from 'express';

dotenv.config();

// 🔧 Discord client setup
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// 📜 Define slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('promote')
    .setDescription('Promote a Roblox user in the group')
    .addStringOption(opt => opt.setName('username').setDescription('Roblox username').setRequired(true)),

  new SlashCommandBuilder()
    .setName('demote')
    .setDescription('Demote a Roblox user in the group')
    .addStringOption(opt => opt.setName('username').setDescription('Roblox username').setRequired(true)),
].map(cmd => cmd.toJSON());

// 🚀 Register commands to Discord
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
}

// 🤖 Bot ready event
client.once('ready', async () => {
  console.log(`🤖 Logged in as ${client.user?.tag || 'Unknown'}`);
  try {
    await noblox.setCookie(process.env.ROBLOX_COOKIE);
    console.log('🔐 Noblox session started');
  } catch (err) {
    console.error('❌ Roblox login failed:', err.message);
    setTimeout(() => process.exit(1), 5000);
  }
});

// 🎮 Command handler
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
    const result = interaction.commandName === 'promote'
      ? await noblox.promote(process.env.GROUP_ID, userId)
      : await noblox.demote(process.env.GROUP_ID, userId);

    const action = interaction.commandName === 'promote' ? 'Promoted' : 'Demoted';
    return interaction.reply(`✅ ${action} **${username}** to **${result.newRole.name}**`);
  } catch (err) {
    console.error('❌ Command execution failed:', err);
    return interaction.reply({ content: '❌ ดำเนินการไม่ได้ อาจเกิดจากสิทธิ์ไม่เพียงพอหรือระบบล่ม', ephemeral: true });
  }
});

// 🌐 Uptime server (for Render or Replit pinging)
const app = express();
const PORT = process.env.PORT || 10000;
app.get('/', (_, res) => res.send('Bot is running'));
app.listen(PORT, () => console.log(`🌐 Web server listening on port ${PORT}`));

// 🚀 Entry point
(async () => {
  console.log('🧪 Logging in with token:', process.env.TOKEN?.slice(0, 10), '...');
  await registerCommands();
  client.login(process.env.TOKEN);
  
})();
client.login(process.env.TOKEN).then(() => {
  console.log('✅ Login success');
}).catch(err => {
  console.error('❌ Login failed:', err);
});
// 🧯 Error handling
client.on('error', console.error);
client.on('shardError', console.error);
process.on('unhandledRejection', console.error);
