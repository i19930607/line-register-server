// 引入必要模組
const express = require('express');
const line = require('@line/bot-sdk');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

// LINE 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);
const app = express();
const port = process.env.PORT || 3000;
app.use(bodyParser.json());

// 使用者狀態管理
const userState = {};

// 課程清單（可替換為從 Google Sheets 動態讀取）
const courseList = {
  '週一上午': { name: '快樂禪繞畫', limit: 18, current: 18 },
  '週一下午': { name: '武當養生功', limit: 30, current: 21 },
  '週二上午': { name: '經絡拍打穴道按摩', limit: 30, current: 30 },
  '週二下午': { name: '老歌歡唱卡拉OK', limit: 30, current: 14 },
  '週三上午': { name: '書法水墨班', limit: 18, current: 15 },
  '週三下午': { name: '全能活力健身操', limit: 999, current: 0 },
  '週四上午': { name: '經絡拍打穴道按摩', limit: 30, current: 30 },
  '週四下午': { name: '廣場舞', limit: 30, current: 12 },
  '週五上午': { name: '基礎素描', limit: 22, current: 22 },
  '週五下午': { name: '排舞教學', limit: 30, current: 18 },
};

// Webhook 接收
app.post('/webhook', line.middleware(config), async (req, res) => {
  const events = req.body.events;
  for (let event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userId = event.source.userId;
      const userMessage = event.message.text.trim();

      const state = userState[userId]?.step || 'idle';
      const selectedTime = userState[userId]?.time;

      if (userMessage === '我要報名') {
        userState[userId] = { step: 'selecting' };
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '要報名什麼時段？請輸入如：週一上午、週四下午...'
        });
      } else if (state === 'selecting' && courseList[userMessage]) {
        const course = courseList[userMessage];
        userState[userId] = { step: 'confirming', time: userMessage };
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: `${userMessage} 是 ${course.name}，是否確定要報名？請回覆「確定」`
        });
      } else if (state === 'confirming' && userMessage === '確定') {
        const course = courseList[selectedTime];
        if (course.current >= course.limit) {
          userState[userId] = { step: 'selecting' };
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: `很抱歉，${selectedTime} (${course.name}) 已額滿，請選擇其他時段。`
          });
        } else {
          userState[userId].step = 'waiting_phone';
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '請輸入您的電話號碼：'
          });
        }
      } else if (state === 'confirming') {
        userState[userId] = { step: 'selecting' };
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '請重新輸入時段，如：週一上午、週二下午...'
        });
      } else if (state === 'waiting_phone') {
        const phone = userMessage;
        const course = courseList[selectedTime];
        course.current++;

        // ✅ 寫入 Google Sheet
        const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SPREADSHEET_ID}/values/報名表!A1:append?valueInputOption=USER_ENTERED`;
        await axios.post(sheetsUrl, {
          values: [[selectedTime, course.name, userId, phone, new Date().toISOString()]]
        }, {
          headers: {
            Authorization: `Bearer ${process.env.GOOGLE_API_KEY}`
          }
        }).catch(err => console.error('寫入 Google Sheets 失敗：', err.message));

        userState[userId] = { step: 'idle' };
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: `報名成功！
課程：${selectedTime} ${course.name}
電話：${phone}`
        });
      } else {
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: `你剛剛說的是：「${userMessage}」`
        });
      }
    }
  }
  res.status(200).end();
});

// 健康檢查
app.get('/', (req, res) => {
  res.send('LINE Bot Server is running.');
});

// 啟動伺服器
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
