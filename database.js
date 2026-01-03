const Database = require('better-sqlite3');
const path = require('path');

class StatsDatabase {
  constructor() {
    const dbPath = path.join(__dirname, 'stats.db');
    this.db = new Database(dbPath);
    this.init();
  }

  init() {
    // 이모지 사용 기록 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS emoji_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        emoji_id TEXT NOT NULL,
        emoji_name TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('message', 'reaction'))
      )
    `);

    // 메시지 기록 테이블
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS message_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `);

    // 인덱스 생성 (성능 최적화)
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_emoji_timestamp ON emoji_usage(timestamp);
      CREATE INDEX IF NOT EXISTS idx_emoji_user ON emoji_usage(user_id, emoji_id);
      CREATE INDEX IF NOT EXISTS idx_emoji_type ON emoji_usage(type);
      CREATE INDEX IF NOT EXISTS idx_message_timestamp ON message_stats(timestamp);
      CREATE INDEX IF NOT EXISTS idx_message_user ON message_stats(user_id);
      CREATE INDEX IF NOT EXISTS idx_message_channel ON message_stats(channel_id);
    `);

    console.log('✅ Database initialized');
  }

  // 이모지 사용 기록 추가
  addEmojiUsage(userId, emojiId, emojiName, type) {
    const stmt = this.db.prepare(`
      INSERT INTO emoji_usage (user_id, emoji_id, emoji_name, timestamp, type)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const timestamp = Date.now();
    stmt.run(userId, emojiId, emojiName, timestamp, type);
  }

  // 메시지 기록 추가
  addMessageStat(userId, channelId) {
    const stmt = this.db.prepare(`
      INSERT INTO message_stats (user_id, channel_id, timestamp)
      VALUES (?, ?, ?)
    `);
    
    const timestamp = Date.now();
    stmt.run(userId, channelId, timestamp);
  }

  // 날짜 범위 계산 헬퍼 함수
  getDateRange(startDay, endDay) {
    const now = new Date();
    
    // 종료일 (endDay=1이면 오늘 23:59:59)
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() - (endDay - 1));
    endDate.setHours(23, 59, 59, 999);
    
    // 시작일 (startDay=1이면 오늘 00:00:00)
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (startDay - 1));
    startDate.setHours(0, 0, 0, 0);
    
    return {
      start: startDate.getTime(),
      end: endDate.getTime()
    };
  }

  // 서버 전체 이모지 랭킹 (TOP 10)
  getServerEmojiRanking(startDay = 1, endDay = 1) {
    const { start, end } = this.getDateRange(startDay, endDay);
    
    const stmt = this.db.prepare(`
      SELECT 
        emoji_id,
        emoji_name,
        COUNT(*) as total,
        SUM(CASE WHEN type = 'message' THEN 1 ELSE 0 END) as message_count,
        SUM(CASE WHEN type = 'reaction' THEN 1 ELSE 0 END) as reaction_count
      FROM emoji_usage
      WHERE timestamp >= ? AND timestamp <= ?
      GROUP BY emoji_id
      ORDER BY total DESC
      LIMIT 10
    `);
    
    return stmt.all(start, end);
  }

  // 유저별 이모지 사용 통계 (TOP 10)
  getUserEmojiStats(userId, startDay = 1, endDay = 1) {
    const { start, end } = this.getDateRange(startDay, endDay);
    
    const stmt = this.db.prepare(`
      SELECT 
        emoji_id,
        emoji_name,
        COUNT(*) as total,
        SUM(CASE WHEN type = 'message' THEN 1 ELSE 0 END) as message_count,
        SUM(CASE WHEN type = 'reaction' THEN 1 ELSE 0 END) as reaction_count
      FROM emoji_usage
      WHERE user_id = ? AND timestamp >= ? AND timestamp <= ?
      GROUP BY emoji_id
      ORDER BY total DESC
      LIMIT 10
    `);
    
    return stmt.all(userId, start, end);
  }

  // 유저별 메시지 통계
  getUserMessageStats(userId, startDay = 1, endDay = 1) {
    const { start, end } = this.getDateRange(startDay, endDay);
    
    // 총 메시지 수
    const totalStmt = this.db.prepare(`
      SELECT COUNT(*) as total
      FROM message_stats
      WHERE user_id = ? AND timestamp >= ? AND timestamp <= ?
    `);
    
    const total = totalStmt.get(userId, start, end);
    
    // 채널별 메시지 수 TOP 10
    const channelStmt = this.db.prepare(`
      SELECT 
        channel_id,
        COUNT(*) as count
      FROM message_stats
      WHERE user_id = ? AND timestamp >= ? AND timestamp <= ?
      GROUP BY channel_id
      ORDER BY count DESC
      LIMIT 10
    `);
    
    const channels = channelStmt.all(userId, start, end);
    
    return {
      total: total.total,
      channels: channels
    };
  }

  // 30일 이상 지난 데이터 삭제
  cleanOldData() {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    const emojiStmt = this.db.prepare(`
      DELETE FROM emoji_usage WHERE timestamp < ?
    `);
    
    const messageStmt = this.db.prepare(`
      DELETE FROM message_stats WHERE timestamp < ?
    `);
    
    const emojiResult = emojiStmt.run(thirtyDaysAgo);
    const messageResult = messageStmt.run(thirtyDaysAgo);
    
    console.log(`🗑️ Cleaned ${emojiResult.changes} emoji records, ${messageResult.changes} message records (30+ days old)`);
  }

  close() {
    this.db.close();
  }
}

module.exports = StatsDatabase;
