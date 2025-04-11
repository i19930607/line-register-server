// index.js
const express = require('express');
const line = require('@line/bot-sdk');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);
const userStates = {}; // 儲存每位使用者的報名狀態

app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userId = event.source.userId;
        const msg = event.message.text.trim();

        if (!userStates[userId]) {
          userStates[userId] = { step: 0 };
        }

        const state = userStates[userId];

        if (msg === '我要報名') {
          state.step = 1;
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '要報名什麼時段？例如：週一上午'
          });
        } else if (state.step === 1) {
          state.timeSlot = msg;
          state.step = 2;
          // 範例課程名稱可根據 msg 對應
          const course = getCourseByTimeSlot(msg);
          if (!course) {
            state.step = 0;
            return client.replyMessage(event.replyToken, {
              type: 'text',
              text: '找不到這個時段的課程，請重新輸入'
            });
          }
          state.course = course;
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: `該時段課程為「${course}」，是否確定報名？請回覆「確定」`
          });
        } else if (state.step === 2) {
          if (msg === '確定') {
            // 假設檢查是否額滿（此處省略，直接通過）
            state.step = 3;
            await client.replyMessage(event.replyToken, {
              type: 'text',
              text: '請輸入您的電話：'
            });
          } else {
            state.step = 1;
            await client.replyMessage(event.replyToken, {
              type: 'text',
              text: '請重新輸入時段，例如：週一上午'
            });
          }
        } else if (state.step === 3) {
          state.phone = msg;
          state.step = 0;
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: `報名成功！您已報名「${state.course}」，電話為 ${state.phone}。`
          });
        } else {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: `你剛剛說的是：「${msg}」`
          });
        }
      }
    }
    res.status(200).end();
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).end();
  }
});

function getCourseByTimeSlot(timeSlot) {
  const courseMap = {
    '週一上午': '快樂禪繞畫',
    '週一下午': '武當養生功',
    '週二上午': '經絡拍打穴道按摩',
    '週二下午': '卡拉OK',
    '週三上午': '書法水墨班',
    '週三下午': '全能活力健身操',
    '週四上午': '經絡拍打穴道按摩',
    '週四下午': '廣場舞',
    '週五上午': '基礎素描',
    '週五下午': '排舞教學',
  };
  return courseMap[timeSlot] || null;
}

app.get('/', (req, res) => {
  res.send('LINE Bot Server is running.');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
