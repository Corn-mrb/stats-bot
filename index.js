require('dotenv').config();

const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const StatsDatabase = require('./database');
const StatsTracker = require('./tracker');
const DataCleanupScheduler = require('./scheduler');
const emojiUserCommand = require('./commands/emojiUser');
const messageStatsCommand = require('./commands/messageStats');
const emojiTopCommand = require('./commands/emojiTop');

// 환경변수
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN is required');
  process.exit(1);
}

// 클라이언트 생성
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ]
});

// 데이터베이스 및 트래커 초기화
const database = new StatsDatabase();
const tracker = new StatsTracker(database);
let scheduler;

// 슬래시 커맨드 등록
client.commands = new Collection();
client.commands.set(emojiUserCommand.data.name, emojiUserCommand);
client.commands.set(messageStatsCommand.data.name, messageStatsCommand);
client.commands.set(emojiTopCommand.data.name, emojiTopCommand);

// 봇 준비 완료
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`📊 통계 봇이 시작되었습니다`);
  
  // 슬래시 커맨드 등록
  if (CLIENT_ID) {
    await registerCommands();
  }

  // 데이터 정리 스케줄러 시작
  scheduler = new DataCleanupScheduler(database);
  scheduler.start();
});

// 메시지 이벤트 - 메시지 및 이모지 추적
client.on('messageCreate', (message) => {
  tracker.trackMessage(message);
});

// 리액션 추가 이벤트 - 이모지 추적
client.on('messageReactionAdd', async (reaction, user) => {
  // Partial 처리 (캐시되지 않은 메시지)
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Error fetching reaction:', error);
      return;
    }
  }

  tracker.trackReaction(reaction, user);
});

// 슬래시 커맨드 인터랙션
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, database);
  } catch (error) {
    console.error('Error executing command:', error);
    
    const reply = {
      content: '❌ 명령어 실행 중 오류가 발생했습니다.',
      ephemeral: true
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// 슬래시 커맨드 등록 함수
async function registerCommands() {
  const commands = [
    emojiUserCommand.data.toJSON(),
    messageStatsCommand.data.toJSON(),
    emojiTopCommand.data.toJSON()
  ];
  
  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    console.log('🔄 Registering slash commands...');
    
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );

    console.log('✅ Slash commands registered');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
}

// 종료 시 DB 정리
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  database.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down...');
  database.close();
  process.exit(0);
});

// 봇 로그인
client.login(TOKEN);
