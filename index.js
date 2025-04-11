// index.js
const express = require('express');
const line = require('@line/bot-sdk');
const { google } = require('googleapis');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

// Google Sheets 認證
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

let userState = {}; // 儲存使用者狀態

// LINE Webhook 路由
app.post('/webhook', line.middleware(config), async (req, res) => {
  const events = req.body.events;
  const client = new line.Client(config);

  for (let event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userId = event.source.userId;
      const userText = event.message.text.trim();

      if (userText === '我要報名') {
        userState[userId] = { step: 'ASK_SESSION' };
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '要報名什麼時段？（如：週一上午）'
        });
      } else if (userState[userId]?.step === 'ASK_SESSION') {
        const courseMap = {
          '週一上午': '快樂禪繞畫',
          '週一下午': '武當養生功',
          '週二上午': '經絡拍打穴道按摩',
          '週二下午': '老歌歡唱卡拉OK',
          '週三上午': '書法水墨班',
          '週三下午': '全能健身操', // 現場報名不處理
          '週四上午': '經絡拍打穴道按摩',
          '週四下午': '廣場舞',
          '週五上午': '基礎素描',
          '週五下午': '排舞教學'
        };

        const selectedCourse = courseMap[userText];
        if (!selectedCourse) {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '找不到對應課程，請重新輸入要報名的時段。'
          });
          return;
        }

        userState[userId] = {
          step: 'CONFIRM',
          course: selectedCourse,
          session: userText
        };

        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: `${userText} 是 ${selectedCourse}，是否確定報名？請回覆「確定」`
        });
      } else if (userState[userId]?.step === 'CONFIRM') {
        if (userText === '確定') {
          userState[userId].step = 'ASK_PHONE';
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '請輸入您的電話：'
          });
        } else {
          userState[userId].step = 'ASK_SESSION';
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '請重新輸入要報名的時段（如：週一上午）'
          });
        }
      } else if (userState[userId]?.step === 'ASK_PHONE') {
        const phone = userText;
        const { session, course } = userState[userId];

        try {
          const sheets = google.sheets({ version: 'v4', auth });
          const spreadsheetId = process.env.SPREADSHEET_ID;

          // 寫入報名資料
          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: '報名表!A:D',
            valueInputOption: 'RAW',
            requestBody: {
              values: [[session, course, phone, new Date().toLocaleString()]]
            }
          });

          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '報名成功！我們會盡快聯絡您。'
          });

          delete userState[userId];
        } catch (error) {
          console.error('寫入 Google Sheets 失敗：', error);
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '報名失敗，請稍後再試或聯絡我們。'
          });
        }
      }
    }
  }
  res.status(200).end();
});

// 健康檢查
app.get('/', (req, res) => {
  res.send('LINE Bot Server is running.');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
