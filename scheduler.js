const cron = require('node-cron');

class DataCleanupScheduler {
  constructor(database) {
    this.db = database;
  }

  // 스케줄러 시작 - 매일 자정 00:00 데이터 정리
  start() {
    // 매일 자정 00:00 (cron: 초 분 시 일 월 요일)
    // '0 0 0 * * *' = 매일 00:00:00
    const schedule = '0 0 0 * * *';
    
    cron.schedule(schedule, () => {
      console.log('🗑️ Running daily data cleanup (30+ days old)...');
      this.db.cleanOldData();
    });

    console.log(`✅ Data cleanup scheduler started: ${schedule} (매일 자정)`);
  }
}

module.exports = DataCleanupScheduler;
