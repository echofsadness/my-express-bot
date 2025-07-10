const { Client, GatewayIntentBits, ActivityType, SlashCommandBuilder, REST, Routes, Events } = require('discord.js');
const noblox = require('noblox.js');
require('dotenv').config();
const express = require('express');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');
const ytdl = require("ytdl-core-discord");


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
    console.log('Cookie from env:', ROBLOX_COOKIE?.slice(0, 30)); // ตัดมาแค่ 30 ตัว
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
  new SlashCommandBuilder()
  .setName('play')
  .setDescription('เล่นเพลงจากชื่อหรือ YouTube ลิงก์')
  .addStringOption(option =>
    option.setName('query')
      .setDescription('ชื่อเพลงหรือ YouTube URL')
      .setRequired(true)
  ),
].map(command => command.toJSON());

// ลงทะเบียนคำสั่ง
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('🛠️ Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID), // ใช้แค่ CLIENT_ID ลง global commands
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


  const command = interaction.commandName;

  if (command === 'play') {
    const query = interaction.options.getString('query');
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({ content: '❌ คุณต้องอยู่ในห้องเสียงก่อนถึงจะเล่นเพลงได้!', ephemeral: true });
    }

    await interaction.deferReply();

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      const search = await play.search(query, { limit: 1 });
      const streamInfo = await play.stream(search[0].url);
      const resource = createAudioResource(streamInfo.stream, {
        inputType: streamInfo.type,
      });

      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Pause,
        },
      });

      player.play(resource);
      connection.subscribe(player);

      interaction.editReply(`🎶 กำลังเล่น: **${search[0].title}**`);

      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
      });

    } catch (err) {
      console.error(err);
      interaction.editReply('❌ ไม่สามารถเล่นเพลงได้');
    }

    return;
  }



  

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



// เริ่มบอท
client.login(process.env.TOKEN);

// สร้าง Express app สำหรับ health check
const app = express();

app.get('/', (req, res) => res.send('Bot is running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
