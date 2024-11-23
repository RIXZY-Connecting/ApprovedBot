// index.js
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config(); // สำหรับใช้ตัวแปรจากไฟล์ .env

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
  if (message.content.toLowerCase() === 'hello') {
    message.reply('Hello! How can I help you today?');
  }
});

client.login(process.env.TOKEN); // ใช้ token จากไฟล์ .env
  