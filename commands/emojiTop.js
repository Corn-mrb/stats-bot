const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const cooldowns = new Map();
const COOLDOWN_SECONDS = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emoji_top')
    .setNameLocalizations({
      ko: '이모지_랭킹'
    })
    .setDescription('서버 전체 이모지 사용 랭킹을 확인합니다')
    .setDescriptionLocalizations({
      ko: '서버 전체 이모지 사용 랭킹을 확인합니다'
    })
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

    const startDay = interaction.options.getInteger('start_day') || 1;
    const endDay = interaction.options.getInteger('end_day') || 1;

    // 시작일이 종료일보다 작으면 에러
    if (startDay < endDay) {
      await interaction.reply({
        content: '❌ 시작일은 종료일보다 크거나 같아야 합니다. (예: 시작일=7, 종료일=1)',
        ephemeral: true
      });
      return;
    }

    const ranking = database.getServerEmojiRanking(startDay, endDay);

    if (ranking.length === 0) {
      const periodText = getPeriodText(startDay, endDay);
      await interaction.reply({
        content: `${periodText} 이모지 사용 기록이 없습니다.`,
        ephemeral: true
      });
      return;
    }

    const embed = createRankingEmbed(ranking, startDay, endDay, interaction.guild.name);
    await interaction.reply({ embeds: [embed] });
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

function createRankingEmbed(ranking, startDay, endDay, guildName) {
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  
  const description = ranking.map((emoji, index) => {
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
    .setColor('#FFB84D')
    .setTitle(`📊 ${guildName} - ${periodText} 인기 이모지 TOP 10`)
    .setDescription(description)
    .setTimestamp()
    .setFooter({ text: periodText });

  return embed;
}
