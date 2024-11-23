require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

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

// จับ Event เมื่อมีสมาชิกใหม่เข้ามา
client.on('guildMemberAdd', async (member) => {
  const owner = await member.guild.fetchOwner(); // หาเจ้าของเซิร์ฟเวอร์

  // ส่งข้อความหาเจ้าของ
  const embed = new EmbedBuilder()
    .setTitle('New Member Joined!')
    .setDescription(`${member.user.tag} เข้ามาในเซิร์ฟเวอร์`)
    .setColor(0x0000FF);  // ใช้รหัสสี 0x0000FF แทน 'BLUE'

  await owner.send({
    embeds: [embed],
    components: [
      {
        type: 1, // ActionRow
        components: [
          {
            type: 2, // ปุ่ม Approve
            label: 'Approve',
            style: 1,
            customId: `approve_${member.id}`,
          },
          {
            type: 2, // ปุ่ม Reject
            label: 'Reject',
            style: 4,
            customId: `reject_${member.id}`,
          },
        ],
      },
    ],
  });
});

// จับ Event เมื่อมีการกดปุ่ม
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const [action, userId] = interaction.customId.split('_');
  const member = await interaction.guild.members.fetch(userId);

  if (action === 'approve') {
    // เพิ่มบทบาทให้สมาชิก
    const role = interaction.guild.roles.cache.find((role) => role.name === 'Member');
    if (role) {
      await member.roles.add(role);
      await interaction.reply({ content: `อนุมัติ ${member.user.tag} แล้ว!`, ephemeral: true });
    } else {
      await interaction.reply({ content: 'ไม่พบบทบาท Member', ephemeral: true });
    }
  } else if (action === 'reject') {
    // เตะสมาชิกออก
    await member.kick('Rejected by owner');
    await interaction.reply({ content: `ปฏิเสธ ${member.user.tag} และเตะออกแล้ว!`, ephemeral: true });
  }
});

// เข้าสู่ระบบบอท
client.login(process.env.TOKEN);
