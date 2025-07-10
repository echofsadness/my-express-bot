import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, Events } from 'discord.js';
import dotenv from 'dotenv';
import { chromium } from 'playwright';
import noblox from 'noblox.js';

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let robloxToken = null;

// ฟังก์ชันล็อกอิน Roblox ด้วย Playwright และดึง cookie .ROBLOSECURITY
async function loginToRoblox() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://www.roblox.com/login');

  // กรอกข้อมูลจาก .env
  await page.fill('#login-username', process.env.ROBLOX_USER);
  await page.fill('#login-password', process.env.ROBLOX_PASS);
  await page.click('#login-button');

  // รอให้โหลดหน้า home (หรือหน้าเปลี่ยน URL)
  await page.waitForURL('**/home', { timeout: 15000 });

  // ดึง cookie .ROBLOSECURITY
  const cookies = await context.cookies();
  const roblosecurity = cookies.find(c => c.name === '.ROBLOSECURITY');
  robloxToken = roblosecurity?.value;

  await browser.close();

  if (!robloxToken) throw new Error('ไม่พบ .ROBLOSECURITY หลังล็อกอิน');

  console.log('✅ Logged into Roblox and got .ROBLOSECURITY cookie.');
}

// สร้าง Slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('promote')
    .setDescription('Promote user in the Roblox group')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Roblox username')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('demote')
    .setDescription('Demote user in the Roblox group')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Roblox username')
        .setRequired(true)
    ),
].map(cmd => cmd.toJSON());

// ลงทะเบียน Slash commands กับ Discord API
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Registered Slash commands.');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();

// เมื่อบอทพร้อม ให้ล็อกอิน Roblox ผ่าน Playwright แล้วตั้ง Noblox.js cookie
client.once(Events.ClientReady, async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  try {
    await loginToRoblox();
    await noblox.setCookie(robloxToken);
    console.log('🔓 Logged into Roblox via Noblox.js');
  } catch (error) {
    console.error('❌ Roblox login failed:', error.message);
  }
});

// รับ event interaction
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const username = interaction.options.getString('username');
  let userId;
  try {
    userId = await noblox.getIdFromUsername(username);
  } catch {
    return interaction.reply({ content: `❌ ไม่พบ username: ${username}`, ephemeral: true });
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
  } catch (error) {
    console.error(error);
    return interaction.reply({ content: '❌ ไม่สามารถดำเนินการได้ อาจเป็นเพราะสิทธิ์ไม่เพียงพอ', ephemeral: true });
  }
});

client.login(process.env.TOKEN);
