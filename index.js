import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, Events } from 'discord.js';
import dotenv from 'dotenv';
import { chromium } from 'playwright';

const puppeteer = require('puppeteer');
const browser = await puppeteer.launch({ headless: true });
dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let robloxToken = null;

// ใช้ Playwright ล็อกอินและดึง .ROBLOSECURITY
async function loginToRoblox() {
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
  await page.waitForURL('**/home', { timeout: 10000 });

  const cookies = await context.cookies();
  const roblosecurity = cookies.find(c => c.name === '.ROBLOSECURITY');
  robloxToken = roblosecurity?.value;

  await browser.close();
  if (!robloxToken) throw new Error('ไม่พบ .ROBLOSECURITY');

  console.log('✅ Logged into Roblox and got cookie.');
}


const { install } = require('playwright/install');

(async () => {
  try {
    await install(); // Ensure browser installed
  } catch (err) {
    console.error('❌ Playwright browser install failed:', err);
  }
})();

const commands = [
  new SlashCommandBuilder()
    .setName('promote')
    .setDescription('Promote user in the group')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Roblox username')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('demote')
    .setDescription('Demote user in the group')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Roblox username')
        .setRequired(true)),
].map(cmd => cmd.toJSON());

// ลงทะเบียน Slash commands
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
})();

const noblox = require('noblox.js');

client.once('ready', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  try {
    await loginToRoblox();
    await noblox.setCookie(robloxToken);
    console.log('🔓 Logged into Noblox.js');
  } catch (err) {
    console.error('❌ Roblox login failed:', err.message);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const username = interaction.options.getString('username');
  let userId;
  try {
    userId = await noblox.getIdFromUsername(username);
  } catch {
    return interaction.reply({ content: '❌ ไม่พบ username นี้', ephemeral: true });
  }

  try {
    let result;
    if (interaction.commandName === 'promote') {
      result = await noblox.promote(process.env.GROUP_ID, userId);
      return interaction.reply(`✅ Promoted ${username} → ${result.newRole.name}`);
    } else if (interaction.commandName === 'demote') {
      result = await noblox.demote(process.env.GROUP_ID, userId);
      return interaction.reply(`✅ Demoted ${username} → ${result.newRole.name}`);
    }
  } catch (err) {
    console.error(err);
    return interaction.reply({ content: '❌ ไม่สามารถดำเนินการได้ อาจเป็นเพราะสิทธิ์ไม่พอ', ephemeral: true });
  }
});

client.login(process.env.TOKEN);
