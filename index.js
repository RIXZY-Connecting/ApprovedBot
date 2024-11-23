require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// สร้าง Client บอท
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// เมื่อบอทพร้อม
client.once('ready', () => {
  console.log(`บอทออนไลน์แล้ว! ชื่อ: ${client.user.tag}`);
});

// Login Discord Bot
client.login(process.env.TOKEN);

// สร้างเซิร์ฟเวอร์ HTTP
const app = express();

app.get('/', (req, res) => {
  res.send('Bot is running!');
});

// ใช้ PORT จาก Render หรือ PORT 3000 เป็นค่าเริ่มต้น
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
// Event เมื่อสมาชิกใหม่เข้ามาในเซิร์ฟเวอร์
client.on('guildMemberAdd', async (member) => {
  try {
    // สร้าง Embed แจ้งเตือน
    const embed = new EmbedBuilder()
      .setTitle('New Member Joined!')
      .setDescription(`${member.user.tag} เข้ามาในเซิร์ฟเวอร์`)
      .setColor(0x0000FF);

    // สร้างปุ่ม
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`approve_${member.id}`)
        .setLabel('Approve')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`reject_${member.id}`)
        .setLabel('Reject')
        .setStyle(ButtonStyle.Danger)
    );

    // หา Text Channel ในเซิร์ฟเวอร์ที่ต้องการส่งข้อความ (เปลี่ยน `general` เป็นชื่อ Channel ของคุณ)
    const channel = member.guild.channels.cache.get('1309911323513196674');

    if (!channel) {
      console.error('ไม่พบ Channel ชื่อ "general"');
      return;
    }

    // ส่งข้อความไปยัง Text Channel
    await channel.send({
      content: `ยินดีต้อนรับ ${member.user.tag} เข้าสู่เซิร์ฟเวอร์!`,
      embeds: [embed],
      components: [row],
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดใน guildMemberAdd:', error);
  }
});

// Event เมื่อมีการกดปุ่ม
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  try {
    // ตรวจสอบว่า interaction.guild มีอยู่จริง
    if (!interaction.guild) {
      return await interaction.reply({
        content: 'คำสั่งนี้ทำงานได้เฉพาะในเซิร์ฟเวอร์',
        ephemeral: true,
      });
    }

    // แยกข้อมูลจาก customId
    const [action, userId] = interaction.customId.split('_');
    const member = await interaction.guild.members.fetch(userId).catch(() => null);

    // ตรวจสอบว่า member มีค่า
    if (!member) {
      return await interaction.reply({
        content: 'ไม่พบสมาชิกในเซิร์ฟเวอร์',
        ephemeral: true,
      });
    }

    // หา Text Channel ในเซิร์ฟเวอร์ที่ต้องการส่งข้อความ
    const channel = interaction.guild.channels.cache.find((ch) => ch.name === 'approved-chat' && ch.isTextBased());

    if (!channel) {
      return await interaction.reply({
        content: 'ไม่พบ Channel ชื่อ "approved-chat"',
        ephemeral: true,
      });
    }

    if (action === 'approve') {
      // หา Role
      const role = interaction.guild.roles.cache.find((role) => role.name === 'Member');
      if (role) {
        await member.roles.add(role); // เพิ่มบทบาท
        await channel.send(`✅ อนุมัติ ${member.user.tag} ให้เข้าร่วมเซิร์ฟเวอร์แล้ว!`);
        await interaction.reply({ content: 'อนุมัติสำเร็จ!', ephemeral: true });
        await interaction.deleteReply();
      } else {
        await interaction.reply({ content: 'ไม่พบบทบาท Member', ephemeral: true });
        await interaction.deleteReply();
      }
    } else if (action === 'reject') {
      await member.kick('Rejected by owner'); // เตะสมาชิกออก
      await channel.send(`❌ ปฏิเสธ ${member.user.tag} และเตะออกจากเซิร์ฟเวอร์เรียบร้อยแล้ว!`);
      await interaction.reply({ content: 'ปฏิเสธสำเร็จ!', ephemeral: true });
      await interaction.deleteReply();
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'เกิดข้อผิดพลาดในการดำเนินการ', ephemeral: true });
    } else {
      await interaction.reply({ content: 'เกิดข้อผิดพลาดในการดำเนินการ', ephemeral: true });
    }
  }
});

// เข้าสู่ระบบบอท
client.login(process.env.TOKEN);
