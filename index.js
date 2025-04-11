// 儲存用戶狀態與暫存資料
const userStates = {}; // e.g., { userId: { step: 'wait_time', time: '', phone: '' } }

// 回傳課程清單（可改用從 Google Sheets API 撈資料）
const courseList = {
  "週一上午": { name: "快樂禪繞畫", max: 18 },
  "週一下午": { name: "武當養生功", max: 30 },
  "週二下午": { name: "老歌歡唱卡拉OK", max: 30 },
  "週三上午": { name: "書法水墨班", max: 18 },
  "週四下午": { name: "廣場舞", max: 30 },
  "週五下午": { name: "排舞教學", max: 30 },
};

app.post("/webhook", line.middleware(config), async (req, res) => {
  const events = req.body.events;
  for (const event of events) {
    if (event.type === "message" && event.message.type === "text") {
      const userId = event.source.userId;
      const text = event.message.text.trim();
      const state = userStates[userId] || { step: "idle" };

      if (text === "我要報名") {
        userStates[userId] = { step: "wait_time" };
        reply(event.replyToken, "要報名什麼時段？（例如：週一上午）");
        continue;
      }

      if (state.step === "wait_time") {
        if (courseList[text]) {
          userStates[userId] = { step: "confirm", time: text };
          reply(event.replyToken, `${text} 是 ${courseList[text].name}，是否確定報名？（請回覆：確定）`);
        } else {
          reply(event.replyToken, "查無此時段，請重新輸入（例如：週一上午）");
        }
        continue;
      }

      if (state.step === "confirm") {
        if (text === "確定") {
          // 此處應加入：從 Sheets 檢查是否額滿
          userStates[userId].step = "wait_phone";
          reply(event.replyToken, "請輸入電話號碼");
        } else {
          userStates[userId] = { step: "wait_time" };
          reply(event.replyToken, "請重新輸入要報名的時段（例如：週一上午）");
        }
        continue;
      }

      if (state.step === "wait_phone") {
        const phone = text;
        const time = userStates[userId].time;
        // 這裡應加入 Google Sheets API 寫入邏輯
        userStates[userId] = { step: "idle" };
        reply(event.replyToken, `報名成功！${time} ${courseList[time].name}，電話：${phone}`);
        continue;
      }

      reply(event.replyToken, `你剛剛說的是：「${text}」`);
    }
  }
  res.status(200).end();
});

function reply(token, text) {
  client.replyMessage(token, {
    type: "text",
    text,
  });
}
