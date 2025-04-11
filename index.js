const express = require('express');
const line = require('@line/bot-sdk');
require('dotenv').config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const app = express();
const port = process.env.PORT || 3000;

// middleware for LINE
app.post('/webhook', line.middleware(config), (req, res) => {
  console.log('Webhook received!');
  res.status(200).end(); // 必須回應，不然會 timeout
});

// health check (for Render 用)
app.get('/', (req, res) => {
  res.send('LINE Bot Server is running.');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
