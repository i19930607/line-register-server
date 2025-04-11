// LINE 課程報名機器人：穩定版
require('dotenv').config();
const express = require('express');
const { middleware, Client } = require('@line/bot-sdk');

const app = express();
const port = process.env.PORT || 3000;

// 記錄使用者狀態
const userStates = {}; // userId -> { step: string, data: {} }

// LINE config
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);

// Middleware
app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    const results = await Promise.all(events.map(handleEvent));
    res.status(200).json(results);
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).end();
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('LINE Bot Server is running.');
});

// 啟動 Server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// 處理訊息事件
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const userId = event.source.userId;
  const msg = event.message.text.trim();
  const state = userStates[userId] || { step: null, data: {} };

  // 狀態機邏輯
  if (msg === '我要報名') {
    userStates[userId] = { step: 'selectTime', data: {} };
    return reply(event.replyToken, '要報名什麼時段？（例如：週一上午）');
  }

  if (state.step === 'selectTime') {
    const classMap = {
      '週一上午': '快樂禪繞畫',
      '週一下午': '武當養生功',
      '週二上午': '按摩班（已額滿）',
      '週二下午': '卡拉OK',
      '週三上午': '書法水墨班',
      '週三下午': '全能健身操（現場報名）',
      '週四上午': '按摩班（已額滿）',
      '週四下午': '廣場舞',
      '週五上午': '基礎素描（已額滿）',
      '週五下午': '排舞教學'
    };

    if (!(msg in classMap)) {
      return reply(event.replyToken, '找不到這個時段，請重新輸入（例如：週一上午）');
    }

    const className = classMap[msg];
    if (className.includes('已額滿') || className.includes('現場報名')) {
      userStates[userId] = { step: null, data: {} };
      return reply(event.replyToken, `「${className}」無法線上報名，請重新輸入「我要報名」開始。`);
    }

    userStates[userId] = {
      step: 'confirmTime',
      data: { time: msg, className }
    };
    return reply(event.replyToken, `您選擇的時段是「${msg}：${className}」，是否確定報名？請回覆「確定」或「取消」`);
  }

  if (state.step === 'confirmTime') {
    if (msg === '確定') {
      userStates[userId].step = 'inputPhone';
      return reply(event.replyToken, '請輸入您的聯絡電話（例如：0912XXXXXX）');
    } else {
      userStates[userId] = { step: 'selectTime', data: {} };
      return reply(event.replyToken, '請重新輸入您要報名的時段（例如：週一上午）');
    }
  }

  if (state.step === 'inputPhone') {
    if (!/^09\d{8}$/.test(msg)) {
      return reply(event.replyToken, '電話格式錯誤，請重新輸入（例如：0912345678）');
    }
    const { time, className } = state.data;
    userStates[userId] = { step: null, data: {} };
    return reply(event.replyToken, `已完成報名：${time} - ${className}\n電話：${msg}\n我們會盡快與您聯絡！`);
  }

  // 預設回覆
  return reply(event.replyToken, `你剛剛說的是：「${msg}」`);
}

// 回覆工具函式
function reply(token, msg) {
  return client.replyMessage(token, { type: 'text', text: msg });
}
