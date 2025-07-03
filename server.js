const express = require("express");
const fs = require("fs");
const app = express();
const path = require("path");

app.use(express.json());
app.use("/public", express.static("public"));
app.use("/views", express.static("views"));
app.use("/data", express.static(path.join(__dirname, "data")));
// 🎁 抽獎 API
app.post("/draw", (req, res) => {
  const { name } = req.body;

  // 1️⃣ 讀取使用者資料
  const userPath = path.join(__dirname, "data", "users.json");
  const users = JSON.parse(fs.readFileSync(userPath, "utf-8"));
  const user = users.find(u => u.name === name);

  if (!user) return res.json({ success: false, message: "請先私訊我們登入名字" });
  if (user.tickets <= 0) return res.json({ success: false, message: "你沒有抽獎券囉！私訓我們獲得更多抽獎卷吧" });

  user.tickets -= 1;

  // 2️⃣ 讀取獎品資料
  const dataPath = path.join(__dirname, "data", "data.json");
  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  const prizeList = data.prizes.filter(p => p.quantity > 0);
  if (prizeList.length === 0) {
    return res.json({ success: false, message: "獎品已抽完" });
  }

  // 3️⃣ 建立加權獎池並抽獎
  const weightedPool = [];
  prizeList.forEach(p => {
    for (let i = 0; i < p.quantity; i++) {
      weightedPool.push(p);
    }
  });

  const prize = weightedPool[Math.floor(Math.random() * weightedPool.length)];
  prize.quantity--;

  // 4️⃣ 寫入紀錄與更新檔案
  data.records.push({ name, prize: prize.name });

  try {
    fs.writeFileSync(userPath, JSON.stringify(users, null, 2));
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    // ✅ 回傳中獎獎品與剩餘券數
res.json({ success: true, prize, remaining: user.tickets });

  } catch (err) {
    console.error("❌ 寫入失敗：", err);
    return res.json({ success: false, message: "伺服器儲存失敗，請稍後再試" });
  }

  res.json({ success: true, prize });
});


// 📜 抽獎紀錄 API
app.get("/records", (req, res) => {
  const filePath = path.join(__dirname, "data", "data.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  res.json(data.records);
});


// 📊 獎品配率 API
app.get("/prizes", (req, res) => {
  const filePath = path.join(__dirname, "data", "data.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  res.json(data.prizes);
});


// 🏠 前台頁面
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/views/draw.html"));
});

// 🔐 後台頁面
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "/views/admin.html"));
});

// 🚀 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`紅狐扭蛋機伺服器啟動於 http://localhost:${PORT}`);
});

app.post("/prizes", (req, res) => {
  const { name, quantity, image } = req.body;
  if (!name || !quantity || !image) {
    return res.status(400).json({ success: false, message: "缺少欄位" });
  }

  const filePath = path.join(__dirname, "data", "data.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  data.prizes.push({ name, quantity, image });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log("✅ 獎品已寫入：", { name, quantity, image });

  res.json({ success: true, message: "獎品已儲存" });
});
app.delete("/prizes/:name", (req, res) => {
  const prizeName = decodeURIComponent(req.params.name);
  const filePath = path.join(__dirname, "data", "data.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const index = data.prizes.findIndex(p => p.name === prizeName);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "找不到該獎品" });
  }

  data.prizes.splice(index, 1);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  res.json({ success: true, message: `已刪除獎品：${prizeName}` });
});
// 🔄 Reset API — 將獎池重設為預設樣子，會覆蓋原本 prizes
app.post("/admin/reset", (req, res) => {
  const filePath = path.join(__dirname, "data", "data.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  // 🧊 預設獎池內容（可自行修改）
  const defaultPrizes =[  
     { "name": "天圓地方桌上植物燈", "image": "https://cdn.glitch.global/7e58d7f9-0317-4506-a9c2-9149ff8fbc8d/345025.jpg?v=1751299051337", "quantity": 1 ,
      "tier": "一等獎","value": 750,"description": ""},
    { "name": "鈴鐺型植物燈", "image": "https://cdn.glitch.global/7e58d7f9-0317-4506-a9c2-9149ff8fbc8d/S__35217435.jpg?v=1751043311751", "quantity": 1 ,
      "tier": "二等獎","value": 700,"description": ""},
       { "name": "三圓型桌上植物燈", "image": "https://cdn.glitch.global/7e58d7f9-0317-4506-a9c2-9149ff8fbc8d/345025.jpg?v=1751299051337", "quantity": 1 ,
      "tier": "三等獎","value": 760,"description": ""},
    { "name": "20瓦植物補光燈", "image": "https://cdn.glitch.global/7e58d7f9-0317-4506-a9c2-9149ff8fbc8d/S__35217436.jpg?v=1751042625863", "quantity": 1,
      "tier": "四等獎","value": 600 ,"description": ""},
     { "name": "10瓦植物補光燈", "image": "https://cdn.glitch.global/7e58d7f9-0317-4506-a9c2-9149ff8fbc8d/S__35217436.jpg?v=1751042625863", "quantity": 1,
      "tier": "五等獎", "value": 400 ,"description": ""},
    
    { "name": "200元折價卷", "image": "https://cdn.glitch.global/7e58d7f9-0317-4506-a9c2-9149ff8fbc8d/200?v=1751110967286", "quantity": 20 ,"description": "可於紅狐官網滿NT$500時折抵NT$200，滿NT$1000可使用兩張，以此類推。使用期限為 7 天內。"},
    { "name": "150元折價卷", "image": "https://cdn.glitch.global/7e58d7f9-0317-4506-a9c2-9149ff8fbc8d/150?v=1751110970529", "quantity": 25 ,"description": "可於紅狐官網滿NT$500時折抵NT$150，滿NT$1000可使用兩張，以此類推。使用期限為 7 天內。"},
     
  ];

  // ✅ 覆蓋 prizes；紀錄 records 清空
  data.prizes = defaultPrizes;
  data.records = [];

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log("✅ 獎池已重設");

  res.json({ success: true, message: "獎池已重設為預設狀態！" });
});
app.post("/api/addTickets", (req, res) => {
  const { name, count } = req.body;
  if (!name || typeof count !== "number" || count <= 0) {
    return res.status(400).json({ message: "資料格式錯誤" });
  }

  const userPath = path.join(__dirname, "data", "users.json");
  let users = [];

  if (fs.existsSync(userPath)) {
    users = JSON.parse(fs.readFileSync(userPath, "utf-8"));
  }

  const user = users.find(u => u.name === name);
  if (user) {
    user.tickets += count;
  } else {
    users.push({ name, tickets: count });
  }

  try {
    fs.writeFileSync(userPath, JSON.stringify(users, null, 2));
    res.json({ message: `✅ 已為 ${name} 加值 ${count} 張抽獎券` });
  } catch (err) {
    console.error("寫入失敗：", err);
    res.status(500).json({ message: "伺服器錯誤，請稍後再試" });
  }
});



