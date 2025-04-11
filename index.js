const express = require('express');
const line = require('@line/bot-sdk');
require('dotenv').config();

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// 初始化 LINE client
const client = new line.Client(config);

// 建立 Express 應用
const app = express();
const port = process.env.PORT || 3000;

// 接收 LINE Webhook 請求
app.post('/webhook', line.middleware(config), (req, res) => {
  console.log('✅ Webhook received!');
  
  Promise
    .all(req.body.events.map(handleEvent)) // 處理所有事件
    .then(() => res.status(200).end())     // 回覆 200，避免 timeout
    .catch((err) => {
      console.error('❌ Error in webhook handling:', err);
      res.status(500).end();
    });
});

// 健康檢查用
app.get('/', (req, res) => {
  res.send('LINE Bot Server is running.');
});

// 處理事件：目前只處理文字訊息
function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const replyText = `你剛剛說的是：「${event.message.text}」`;

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyText,
  });
}

// 啟動伺服器
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
