const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, Events } = require('discord.js');
const dotenv = require('dotenv');
const puppeteer = require('puppeteer');
const noblox = require('noblox.js');

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let robloxToken = null;

// ✅ Puppeteer login
async function loginToRoblox() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  await page.goto('https://www.roblox.com/login');
  await page.type('#login-username', process.env.ROBLOX_USER);
  await page.type('#login-password', process.env.ROBLOX_PASS);
  await page.click('#login-button');

  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });

  const cookies = await page.cookies();
  const roblosecurity = cookies.find(c => c.name === '.ROBLOSECURITY');
  robloxToken = roblosecurity?.value;

  await browser.close();

  if (!robloxToken) throw new Error('❌ ไม่พบ .ROBLOSECURITY');
  console.log('✅ Logged into Roblox and got cookie.');
}

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

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
})();

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
