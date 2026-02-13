const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Rate limiting
const cooldowns = new Map();
const COOLDOWN_SECONDS = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emoji_user')
    .setNameLocalizations({
      ko: '이모지_유저'
    })
    .setDescription('유저의 이모지 사용 통계를 확인합니다')
    .setDescriptionLocalizations({
      ko: '유저의 이모지 사용 통계를 확인합니다'
    })
    .addUserOption(option =>
      option
        .setName('user')
        .setNameLocalizations({ ko: '유저' })
        .setDescription('통계를 확인할 유저')
        .setDescriptionLocalizations({ ko: '통계를 확인할 유저' })
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('start_day')
        .setNameLocalizations({ ko: '시작일' })
        .setDescription('시작일 (1=오늘, 7=7일전)')
        .setDescriptionLocalizations({ ko: '시작일 (1=오늘, 7=7일전)' })
        .setMinValue(1)
        .setMaxValue(30)
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('end_day')
        .setNameLocalizations({ ko: '종료일' })
        .setDescription('종료일 (1=오늘, 7=7일전)')
        .setDescriptionLocalizations({ ko: '종료일 (1=오늘, 7=7일전)' })
        .setMinValue(1)
        .setMaxValue(30)
        .setRequired(false)
    ),

  async execute(interaction, database) {
    // Rate limiting check
    const userId = interaction.user.id;
    const now = Date.now();
    const cooldownAmount = COOLDOWN_SECONDS * 1000;

    if (cooldowns.has(userId)) {
      const expirationTime = cooldowns.get(userId) + cooldownAmount;
      
      if (now < expirationTime) {
        const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
        await interaction.reply({
          content: `⏱️ 이 명령어는 ${timeLeft}초 후에 다시 사용할 수 있습니다.`,
          ephemeral: true
        });
        return;
      }
    }

    cooldowns.set(userId, now);
    setTimeout(() => cooldowns.delete(userId), cooldownAmount);

    const targetUser = interaction.options.getUser('user');
    const startDay = interaction.options.getInteger('start_day') || 1;
    const endDay = interaction.options.getInteger('end_day') || 1;

    // 봇 유저 체크
    if (targetUser.bot) {
      await interaction.reply({
        content: '❌ 봇의 이모지 사용 통계는 추적하지 않습니다.',
        ephemeral: true
      });
      return;
    }

    // 시작일이 종료일보다 작으면 에러
    if (startDay < endDay) {
      await interaction.reply({
        content: '❌ 시작일은 종료일보다 크거나 같아야 합니다. (예: 시작일=7, 종료일=1)',
        ephemeral: true
      });
      return;
    }

    const stats = database.getUserEmojiStats(targetUser.id, startDay, endDay);

    if (stats.length === 0) {
      const periodText = getPeriodText(startDay, endDay);
      await interaction.reply({
        content: `${targetUser.username}님은 ${periodText} 커스텀 이모지를 사용하지 않았습니다.`,
        ephemeral: true
      });
      return;
    }

    const embed = createUserEmojiEmbed(targetUser, stats, startDay, endDay);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

function getPeriodText(startDay, endDay) {
  if (startDay === 1 && endDay === 1) {
    return '오늘';
  } else if (startDay === endDay) {
    return `${startDay}일 전`;
  } else {
    const days = startDay - endDay + 1;
    return `최근 ${days}일간`;
  }
}

function createUserEmojiEmbed(user, stats, startDay, endDay) {
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  
  const description = stats.map((emoji, index) => {
    const emojiDisplay = `<:${emoji.emoji_name}:${emoji.emoji_id}>`;
    return [
      `${medals[index]} ${emojiDisplay} **:${emoji.emoji_name}:** - 총 **${emoji.total}회**`,
      `   ├ 메시지: ${emoji.message_count}회`,
      `   └ 리액션: ${emoji.reaction_count}회`,
      ''
    ].join('\n');
  }).join('\n');

  const periodText = getPeriodText(startDay, endDay);

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle(`${user.username}님의 ${periodText} 이모지 사용 TOP 10`)
    .setDescription(description)
    .setThumbnail(user.displayAvatarURL())
    .setTimestamp()
    .setFooter({ text: periodText });

  return embed;
}
