require('dotenv').config();
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

// Event เมื่อสมาชิกใหม่เข้ามาในเซิร์ฟเวอร์
client.on('guildMemberAdd', async (member) => {
  try {
    const owner = await member.guild.fetchOwner();

    // ตรวจสอบว่า owner มีอยู่จริง
    if (!owner) {
      console.error('ไม่พบเจ้าของเซิร์ฟเวอร์');
      return;
    }

    // สร้าง Embed
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

    // ส่งข้อความหาเจ้าของเซิร์ฟเวอร์
    await owner.send({
      embeds: [embed],
      components: [row],
    }).catch((error) => {
      console.error('ไม่สามารถส่งข้อความถึงเจ้าของเซิร์ฟเวอร์:', error);
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

    if (action === 'approve') {
      // หา Role
      const role = interaction.guild.roles.cache.find((role) => role.name === 'Member');
      if (role) {
        await member.roles.add(role); // เพิ่มบทบาท
        await interaction.reply({ content: `อนุมัติ ${member.user.tag} สำเร็จ!`, ephemeral: true });
      } else {
        await interaction.reply({ content: 'ไม่พบบทบาท Member', ephemeral: true });
      }
    } else if (action === 'reject') {
      await member.kick('Rejected by owner'); // เตะสมาชิกออก
      await interaction.reply({ content: `ปฏิเสธ ${member.user.tag} และเตะออกจากเซิร์ฟเวอร์สำเร็จ!`, ephemeral: true });
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
