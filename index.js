require("dotenv").config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");
const noblox = require("noblox.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const COOKIE = process.env.ROBLOSECURITY;
const GROUP_ID = parseInt(process.env.GROUP_ID);

// Register slash commands
const commands = [
  new SlashCommandBuilder()
    .setName("promote")
    .setDescription("Promote a Roblox user in the group")
    .addStringOption(option =>
      option.setName("username").setDescription("Roblox username").setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("demote")
    .setDescription("Demote a Roblox user in the group")
    .addStringOption(option =>
      option.setName("username").setDescription("Roblox username").setRequired(true)
    ),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    await noblox.setCookie(COOKIE);
    console.log("✅ Logged in to Roblox!");

    await rest.put(Routes.applicationGuildCommands(client.user?.id || "bot-id-placeholder", GUILD_ID), {
      body: commands,
    });

    console.log("✅ Slash commands registered.");
  } catch (err) {
    console.error("❌ Failed during setup:", err);
  }
})();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setPresence({
    activities: [
      {
        name: 'brave navy family',
        type: Discord.ActivityType.Watching,
      },
    ],
    status: 'online', 
  });
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const username = interaction.options.getString("username");
  try {
    const userId = await noblox.getIdFromUsername(username);
    let response = "";

    if (interaction.commandName === "promote") {
      const rank = await noblox.promote(GROUP_ID, userId);
      response = `✅ Promoted **${username}** to **${rank.name}**.`;
    } else if (interaction.commandName === "demote") {
      const rank = await noblox.demote(GROUP_ID, userId);
      response = `✅ Demoted **${username}** to **${rank.name}**.`;
    }

    await interaction.reply(response);
  } catch (err) {
    console.error(err);
    await interaction.reply(`❌ Error: ${err.message}`);
  }
});

client.login(DISCORD_TOKEN);
