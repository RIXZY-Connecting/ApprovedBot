require('dotenv').config();
const express = require('express');
const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits 
} = require('discord.js');

// Constants
const CHANNELS = {
  WELCOME: '1309731725957664828',
  APPROVED: '1309911323513196674'
};

const ROLE_NAME = 'Member';
const ADMIN_ROLE = 'Admin';

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Express server setup
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is running!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Helper Functions
const createWelcomeEmbed = (member, isApprovalEmbed = false) => {
  const embed = new EmbedBuilder()
    .setTitle(isApprovalEmbed ? '👋 รอการอนุมัติสมาชิกใหม่' : '🎉 ยินดีต้อนรับสมาชิกใหม่!')
    .setDescription(
      isApprovalEmbed 
        ? `สมาชิกใหม่ ${member.user.tag} กำลังรอการอนุมัติ\nกรุณาตรวจสอบและดำเนินการ`
        : `ยินดีต้อนรับ ${member} เข้าสู่เซิร์ฟเวอร์\nกรุณารอการอนุมัติจากทีมงาน`
    )
    .setColor(isApprovalEmbed ? 0xFFA500 : 0x2B82FF)
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(
      { name: 'สมาชิกคนที่', value: `#${member.guild.memberCount}`, inline: true },
      { name: 'เข้าร่วมเมื่อ', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true }
    )
    .setTimestamp();

  if (isApprovalEmbed) {
    embed.addFields({ 
      name: 'การดำเนินการ', 
      value: 'กดปุ่มด้านล่างเพื่ออนุมัติหรือปฏิเสธสมาชิก', 
      inline: false 
    });
  }

  return embed;
};

const createActionRow = (memberId) => {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`approve_${memberId}`)
      .setLabel('✅ อนุมัติ')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`reject_${memberId}`)
      .setLabel('❌ ปฏิเสธ')
      .setStyle(ButtonStyle.Danger)
  );
};

const hasAdminPermission = (member) => {
  return member.permissions.has(PermissionFlagsBits.Administrator) || 
         member.roles.cache.some(role => role.name === ADMIN_ROLE);
};

const handleChannelError = async (interaction, channelName) => {
  console.error(`Channel ${channelName} not found`);
  return await interaction.reply({
    content: `❌ ไม่พบห้อง ${channelName}`,
    ephemeral: true
  });
};

// Event Handlers
client.once('ready', () => {
  console.log(`✅ ${client.user.tag} พร้อมใช้งานแล้ว!`);
});

client.on('guildMemberAdd', async (member) => {
  try {
    // ส่งข้อความต้อนรับในห้อง welcome (ไม่มีปุ่ม)
    const welcomeChannel = member.guild.channels.cache.get(CHANNELS.WELCOME);
    if (welcomeChannel) {
      const welcomeEmbed = createWelcomeEmbed(member, false);
      await welcomeChannel.send({
        content: `👋 ยินดีต้อนรับ ${member}`,
        embeds: [welcomeEmbed]
      });
    } else {
      console.error('ไม่พบห้อง welcome');
    }

    // ส่งข้อความแจ้งเตือนในห้อง approved (มีปุ่มสำหรับ Admin)
    const approvedChannel = member.guild.channels.cache.get(CHANNELS.APPROVED);
    if (approvedChannel) {
      const approvalEmbed = createWelcomeEmbed(member, true);
      const row = createActionRow(member.id);
      
      await approvedChannel.send({
        embeds: [approvalEmbed],
        components: [row]
      });
    } else {
      console.error('ไม่พบห้อง approved-chat');
    }

  } catch (error) {
    console.error('เกิดข้อผิดพลาดใน guildMemberAdd:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  try {
    if (!interaction.guild) {
      return await interaction.reply({
        content: '❌ คำสั่งนี้ใช้ได้เฉพาะในเซิร์ฟเวอร์เท่านั้น',
        ephemeral: true
      });
    }

    // ตรวจสอบสิทธิ์ Admin
    if (!hasAdminPermission(interaction.member)) {
      return await interaction.reply({
        content: '❌ คุณไม่มีสิทธิ์ใช้คำสั่งนี้ (ต้องการสิทธิ์ Admin)',
        ephemeral: true
      });
    }

    const [action, userId] = interaction.customId.split('_');
    const member = await interaction.guild.members.fetch(userId).catch(() => null);

    if (!member) {
      return await interaction.reply({
        content: '❌ ไม่พบสมาชิกในเซิร์ฟเวอร์',
        ephemeral: true
      });
    }

    const approvedChannel = interaction.guild.channels.cache.get(CHANNELS.APPROVED);
    if (!approvedChannel) {
      return handleChannelError(interaction, 'approved-chat');
    }

    // Handle member approval
    if (action === 'approve') {
      const role = interaction.guild.roles.cache.find(r => r.name === ROLE_NAME);
      
      if (!role) {
        return await interaction.reply({
          content: `❌ ไม่พบยศ ${ROLE_NAME}`,
          ephemeral: true
        });
      }

      await member.roles.add(role);
      
      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ อนุมัติสมาชิกสำเร็จ')
        .setDescription(`${member.user.tag} ได้รับการอนุมัติโดย ${interaction.user.tag}`)
        .setTimestamp();

      await approvedChannel.send({ embeds: [successEmbed] });
      
      // DM the approved member
      try {
        await member.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x00FF00)
              .setTitle('🎉 ยินดีด้วย!')
              .setDescription('คุณได้รับการอนุมัติเข้าเซิร์ฟเวอร์แล้ว\nขอให้สนุกกับการใช้งานนะคะ')
              .setTimestamp()
          ]
        });
      } catch (err) {
        console.log('ไม่สามารถส่ง DM ถึงสมาชิกได้');
      }

    // Handle member rejection
    } else if (action === 'reject') {
      const rejectEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ ปฏิเสธสมาชิก')
        .setDescription(`${member.user.tag} ถูกปฏิเสธโดย ${interaction.user.tag}`)
        .setTimestamp();

      await approvedChannel.send({ embeds: [rejectEmbed] });
      
      try {
        await member.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle('❌ ขออภัย')
              .setDescription('คุณถูกปฏิเสธการเข้าร่วมเซิร์ฟเวอร์\nกรุณาติดต่อทีมงานหากมีข้อสงสัย')
              .setTimestamp()
          ]
        });
        await member.kick('Rejected by moderator');
      } catch (err) {
        console.log('ไม่สามารถส่ง DM หรือเตะสมาชิกออกได้');
      }
    }

    // Disable buttons after action
    const message = interaction.message;
    const disabledRow = new ActionRowBuilder().addComponents(
      ButtonBuilder.from(message.components[0].components[0]).setDisabled(true),
      ButtonBuilder.from(message.components[0].components[1]).setDisabled(true)
    );

    await interaction.message.edit({ components: [disabledRow] });
    
    await interaction.reply({
      content: `✅ ดำเนินการ${action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}สมาชิกเรียบร้อยแล้ว`,
      ephemeral: true
    });

  } catch (error) {
    console.error('Error handling interaction:', error);
    await interaction.reply({
      content: '❌ เกิดข้อผิดพลาดในการดำเนินการ',
      ephemeral: true
    }).catch(() => {});
  }
});

// Start the bot
client.login(process.env.TOKEN);