const { Client, GatewayIntentBits, ActivityType, SlashCommandBuilder, REST, Routes, Events } = require('discord.js');
const noblox = require('noblox.js');
require('dotenv').config();

// Create bot client
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Login to Roblox on bot ready
client.once('ready', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  // Set Discord bot status
  client.user.setPresence({
    activities: [{ name: 'the group', type: ActivityType.Watching }],
    status: 'online',
  });

  // Authenticate with Roblox
  try {
    await noblox.setCookie(process.env.ROBLOX_COOKIE);
    console.log('✅ Logged into Roblox');
  } catch (err) {
    console.error('❌ Roblox login failed:', err);
  }
});

// Slash command definitions
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

// Register slash commands
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('🛠️ Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID,'1388484726838525952'),
      { body: commands }
    );
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('❌ Error registering commands:', err);
  }
})();

// Handle slash command interaction
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

// Start bot
client.login(process.env.TOKEN);
