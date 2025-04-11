const express = require('express');
const line = require('@line/bot-sdk');
require('dotenv').config();

// 建立 LINE 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// 建立 LINE 客戶端
const client = new line.Client(config);

const app = express();
const port = process.env.PORT || 3000;

// LINE Webhook middleware
app.post('/webhook', line.middleware(config), async (req, res) => {
  console.log('Webhook received!');

  // 處理所有事件
  const events = req.body.events;
  for (let event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text;
      const replyMessage = {
        type: 'text',
        text: `你說的是：「${userMessage}」`,
      };

      try {
        await client.replyMessage(event.replyToken, replyMessage);
        console.log('回覆成功');
      } catch (err) {
        console.error('回覆失敗：', err);
      }
    }
  }

  res.status(200).end();
});

// Render Health Check 用
app.get('/', (req, res) => {
  res.send('LINE Bot Server is running.');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
