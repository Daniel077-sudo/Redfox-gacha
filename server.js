process.on("uncaughtException", err => {
  console.error("❗未捕捉例外：", err);
});

const fs = require('fs');
// 🔧 Firebase 初始化-
const admin = require("firebase-admin");
const serviceAccount = require("./firebaseKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://redfoxdata-3e788-default-rtdb.firebaseio.com"
});
const db = admin.database();

const express = require("express");
const path = require("path");
const app = express();

const cors = require("cors");
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());
app.use("/public", express.static("public"));
app.use("/views", express.static("views"));
app.use("/data", express.static(path.join(__dirname, "data")));


const crypto = require("crypto"); // 👈 用來生成 unique code

// server.js 開頭附近
function isValidPrizeData(data) {
  return data && typeof data === "object" && Object.keys(data).length > 0;
}
app.post("/draw", async (req, res) => {
  try{
  const { name } = req.body;


  const userRef = db.ref(`data/users/${name}`);
  const userSnap = await userRef.once("value");
  const user = userSnap.val();


  if (!user) return res.json({ success: false, message: "請先私訊我們登入名字" });
  if (user.tickets <= 0) return res.json({ success: false, message: "你沒有抽獎券囉！" });

 

  const prizesRef = db.ref("data/prizes");
  const prizeSnap = await prizesRef.once("value");
  const prizeData = prizeSnap.val();

if (!prizeData) {
  console.error('🔥 prizeData is undefined! Check Firebase data.');
  return res.status(500).json({ error: 'Prize data is missing' });
}

    if (!isValidPrizeData(prizeData)) {
      console.error("❌ prizeData 無效：", prizeData);
      return res.json({ success: false, message: "獎池資料無法讀取，請稍後再試。" });
    }
   console.log("🔥 prizeData:", prizeData);
   
  const prizeList = Object.entries(prizeData)
    .map(([id, p]) => ({ 
      id, 
      remainingCount: p.remainingCount ?? p.quantity, // ✅ 若沒設定，就從 quantity 拿來用
      ...p 
    }))
    .filter(p => p.remainingCount > 0);

console.log("🔍 現有獎池：", prizeList);
if (prizeList.length === 0) {
  console.warn("⚠️ 所有獎品已抽完或 remainingCount 為 0");
  return res.json({ success: false, message: "獎品已抽完" });
}

  if (prizeList.length === 0) {
    return res.json({ success: false, message: "獎品已抽完" });
  }
 // 🔧 扣除一張抽獎券
  await userRef.update({ tickets: user.tickets - 1 });

  // 🔧 加權抽獎池
  const pool = [];
prizeList.forEach(p => {
  for (let i = 0; i < p.remainingCount; i++) {
    pool.push(p);
  }
});


 

  const prize = pool[Math.floor(Math.random() * pool.length)];

  // 🔧 更新該獎品數量
await db.ref(`data/prizes/${prize.id}`).update({
  remainingCount: prize.remainingCount - 1
});



  // 🔧 產生唯一代碼（4位英數）
  const code = crypto.randomBytes(3).toString("hex").toUpperCase();

// 📦 記錄抽獎結果到 Firebase
await db.ref(`data/records/${name}`).push({
  name,
  prize: prize.name,
  code,
  timestamp: Date.now()
});



  // ✅ 回傳前端完整資訊
  res.json({
    success: true,
    prize: {
      name: prize.name,
      image: prize.image || null,
      tier: prize.tier || null,
      value: prize.value || null
    },
    code,
    remaining: user.tickets - 1,

     // 🆕 加入更新後的該獎品資料
  updatedPrize: {
    id: prize.id,
    remainingCount: prize.remainingCount - 1
  }
  });

}catch (err) {
  console.error("🔥 抽獎時失敗：", err);
  await userRef.update({ tickets: user.tickets }); // 🚨 補票（可選）
  return res.status(500).json({ error: "抽獎失敗，請稍後再試" });
}
});


// 📊 獎品配率 API
app.get("/prizes", async (req, res) => {
  const prizesSnap = await db.ref("data/prizes").once("value");
  const prizes = prizesSnap.val() || {};
  const list = Object.entries(prizes).map(([id, p]) => ({
    id,
    ...p
  }));
  res.json(list);
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
app.post("/admin/reset", async (req, res) => {
  // 🧊 預設獎池內容（可自行修改）
  const defaultPrizesArray = [
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
     
  ]; // 你原本的獎池清單
  
  // 把陣列轉成物件（用 name 當作 key，或你可以用 uuid）
  const defaultPrizesObj = {};
  defaultPrizesArray.forEach((item, index) => {
    const id = `prize_${index + 1}`; // 或用 item.name 做 key
    item.remainingCount = item.quantity; // ✅補這行初始化抽獎可用數量
    defaultPrizesObj[id] = item;
  });

  try {
    // ✅ 重設 Firebase 中的獎池與紀錄
    await db.ref("data/prizes").set(defaultPrizesObj);
    await db.ref("data/records").remove(); // 清空紀錄

    console.log("✅ Firebase 獎池已重設");
    res.json({ success: true, message: "Firebase 獎池已重設！" });
  } catch (err) {
    console.error("❌ Firebase 重設失敗：", err);
    res.status(500).json({ success: false, message: "重設失敗，請稍後再試。" });
  }
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
