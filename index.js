import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, Events } from 'discord.js';
import dotenv from 'dotenv';
import { chromium } from 'playwright';
import * as noblox from 'noblox.js';

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let robloxToken = null;

// 🔐 Login to Roblox with Playwright to get .ROBLOSECURITY
async function loginToRoblox() {
  console.log('🌐 Logging into Roblox...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://www.roblox.com/login');

  await page.fill('#login-username', process.env.ROBLOX_USER);
  await page.fill('#login-password', process.env.ROBLOX_PASS);
  await page.click('#login-button');

  try {
    await page.waitForURL('**/home', { timeout: 10000 });
  } catch {
    await browser.close();
    throw new Error('❌ Login failed: Could not reach Roblox home page');
  }

  const cookies = await context.cookies();
  const roblosecurity = cookies.find(c => c.name === '.ROBLOSECURITY');
  if (!roblosecurity) {
    await browser.close();
    throw new Error('❌ Login failed: .ROBLOSECURITY cookie not found');
  }

  robloxToken = roblosecurity.value;
  await browser.close();
  console.log('✅ Logged into Roblox and retrieved cookie.');
}

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
    await loginToRoblox();
    await noblox.setCookie(robloxToken);
    console.log('🔐 Noblox session started');
  } catch (err) {
    console.error('❌ Roblox login failed:', err.message);
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

// 🚀 Start bot
client.login(process.env.TOKEN);
