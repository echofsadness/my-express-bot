const { Client, GatewayIntentBits, ActivityType, SlashCommandBuilder, REST, Routes, Events } = require('discord.js');
const noblox = require('noblox.js');
require('dotenv').config();

// ตรวจสอบ cookie
const ROBLOX_COOKIE = process.env.ROBLOX_COOKIE;
if (!ROBLOX_COOKIE) {
  console.error('❌ Missing ROBLOX_COOKIE in .env file');
  process.exit(1);
}

// สร้าง client discord
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// เมื่อบอทพร้อมใช้งาน
client.once('ready', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  client.user.setPresence({
    activities: [{ name: 'the group', type: ActivityType.Watching }],
    status: 'online',
  });

  try {
    await noblox.setCookie(ROBLOX_COOKIE);
    console.log('✅ Logged into Roblox');
  } catch (err) {
    console.error('❌ Roblox login failed:', err);
  }
});

// คำสั่ง Slash command
const commands = [
  new SlashCommandBuilder()
    .setName('promote')
    .setDescription('Promote a Roblox user in the group')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('The Roblox username')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('demote')
    .setDescription('Demote a Roblox user in the group')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('The Roblox username')
        .setRequired(true)
    ),
].map(command => command.toJSON());

// ลงทะเบียนคำสั่ง
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('🛠️ Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID,'1388484726838525952'), // หรือเปลี่ยนเป็น ID application ของคุณ
      { body: commands }
    );
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('❌ Error registering commands:', err);
  }
})();

// ฟังคำสั่ง
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const username = interaction.options.getString('username');
  let userId;

  try {
    userId = await noblox.getIdFromUsername(username);
  } catch {
    return interaction.reply({ content: '❌ Invalid username', ephemeral: true });
  }

  try {
    if (interaction.commandName === 'promote') {
      const res = await noblox.promote(process.env.GROUP_ID, userId);
      interaction.reply(`✅ Promoted ${username} to ${res.newRole.name}`);
    } else if (interaction.commandName === 'demote') {
      const res = await noblox.demote(process.env.GROUP_ID, userId);
      interaction.reply(`✅ Demoted ${username} to ${res.newRole.name}`);
    }
  } catch (err) {
    console.error(err);
    interaction.reply({ content: '❌ Action failed. Make sure the bot has permission.', ephemeral: true });
  }
});

client.login(process.env.TOKEN);
