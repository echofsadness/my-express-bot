require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { promote, demote } = require('./commands');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('promote')
      .setDescription('Promote a Roblox user')
      .addStringOption(opt =>
        opt.setName('userid').setDescription('Roblox user ID').setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName('demote')
      .setDescription('Demote a Roblox user')
      .addStringOption(opt =>
        opt.setName('userid').setDescription('Roblox user ID').setRequired(true)
      )
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log('✅ Slash commands registered');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.options.getString('userid');

  try {
    if (interaction.commandName === 'promote') {
      const newRole = await promote(userId);
      await interaction.reply(`✅ Promoted to **${newRole.name}**`);
    } else if (interaction.commandName === 'demote') {
      const newRole = await demote(userId);
      await interaction.reply(`✅ Demoted to **${newRole.name}**`);
    }
  } catch (err) {
    console.error(err);
    await interaction.reply(`❌ Error: ${err.message}`);
  }
});

client.login(process.env.DISCORD_TOKEN);
