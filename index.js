const { Client, GatewayIntentBits, ActivityType, SlashCommandBuilder, REST, Routes, Events } = require('discord.js');
const noblox = require('noblox.js');
require('dotenv').config();
const express = require('express');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const playdl = require('play-dl');




async function play(voiceChannel, query) {
  let url = query;

  // ถ้าไม่ใช่ลิงก์ ให้ค้นหาจากชื่อ
  if (!playdl.yt_validate(query)) {
    const searchResult = await playdl.search(query, { limit: 1 });
    if (!searchResult || searchResult.length === 0) {
      throw new Error('ไม่พบวิดีโอที่ต้องการ');
    }
    url = searchResult[0].url;
  }

  const stream = await playdl.stream(url);
  const resource = createAudioResource(stream.stream, {
    inputType: stream.type
  });

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator
  });

  const player = createAudioPlayer();
  player.play(resource);
  connection.subscribe(player);

  player.on(AudioPlayerStatus.Idle, () => {
    connection.destroy();
  });

  player.on('error', err => {
    console.error('Player error:', err);
    connection.destroy();
  });
}





// ตรวจสอบ cookie
const ROBLOX_COOKIE = process.env.ROBLOX_COOKIE;
if (!ROBLOX_COOKIE) {
  console.error('❌ Missing ROBLOX_COOKIE in .env file');
  process.exit(1);
}

// สร้าง client discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
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
      return interaction.reply({ content: '❌ เข้าห้องเสียงก่อนนะ', ephemeral: true });
    }
    await interaction.reply(`🎶 กำลังเล่น: ${query}`);
    try {
      await play(voiceChannel, query);
    } catch (err) {
      console.error(err);
      await interaction.followUp({ content: '❌ เล่นเพลงไม่สำเร็จ', ephemeral: true });
    }
    
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
