class StatsTracker {
  constructor(database) {
    this.db = database;
  }

  // 메시지에서 커스텀 이모지 추출
  extractCustomEmojis(content) {
    // 커스텀 이모지 형식: <:name:id> 또는 <a:name:id> (애니메이션)
    const emojiRegex = /<a?:(\w+):(\d+)>/g;
    const emojis = [];
    let match;

    while ((match = emojiRegex.exec(content)) !== null) {
      emojis.push({
        name: match[1],
        id: match[2]
      });
    }

    return emojis;
  }

  // 메시지 추적
  trackMessage(message) {
    // 봇 메시지 무시
    if (message.author.bot) return;

    // 1. 메시지 통계 기록
    this.db.addMessageStat(message.author.id, message.channel.id);

    // 2. 이모지 추적
    // 커스텀 이모지가 없으면 빠르게 리턴 (성능 최적화)
    if (!message.content.includes('<:') && !message.content.includes('<a:')) {
      return;
    }

    const emojis = this.extractCustomEmojis(message.content);
    
    // 추출된 이모지들을 DB에 저장
    emojis.forEach(emoji => {
      // 해당 서버의 이모지인지 확인
      const guildEmoji = message.guild.emojis.cache.get(emoji.id);
      if (guildEmoji) {
        this.db.addEmojiUsage(message.author.id, emoji.id, emoji.name, 'message');
      }
    });

    if (emojis.length > 0) {
      console.log(`📝 Tracked message from ${message.author.tag}: ${emojis.length} emoji(s)`);
    }
  }

  // 리액션 이모지 추적
  trackReaction(reaction, user) {
    // 봇 리액션 무시
    if (user.bot) return;

    // 커스텀 이모지만 추적 (기본 유니코드 이모지 제외)
    if (reaction.emoji.id) {
      // 해당 서버의 이모지인지 확인
      const guildEmoji = reaction.message.guild.emojis.cache.get(reaction.emoji.id);
      if (guildEmoji) {
        this.db.addEmojiUsage(
          user.id,
          reaction.emoji.id,
          reaction.emoji.name,
          'reaction'
        );
        console.log(`👍 Tracked reaction :${reaction.emoji.name}: from ${user.tag}`);
      }
    }
  }
}

module.exports = StatsTracker;
