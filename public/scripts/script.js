window.addEventListener("firebaseReady", () => {
  fetchPrizeDataDirectly(); // ✅ 一初始化就執行
});
import { initFirebase } from "./firebaseInit.js";
window.db = initFirebase(); // 👈 關鍵一步：建立全域 db

let hasRenderedPrizeList = false;
// utils.js 或 script.js 頂部
function normalizePrizes(prizes) {
  return Object.entries(prizes || {}).map(([key, value]) => ({
    name: key,
    ...value,
    value: Number(value.value || 0) // 確保是 Number
    
  }));
}


import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

function updateTicketCounter(name) {
  const db = window.db;
   if (!db) {
    console.warn("⚠️ Firebase 尚未初始化");
    return;
  }

 const targetRef = ref(db, `data/users/${name}/tickets`);
  console.log("🕵️ 嘗試讀取路徑：", targetRef.toString());

  get(targetRef)
    .then(snapshot => {
      const remaining = snapshot.val();
      userTicketMap[name] = remaining; // ✅ 加這行！
      const counter = document.getElementById("ticketCounter");
      const drawBtn = document.getElementById("drawBtn");

      counter.textContent = `🎫 剩餘抽獎券：${remaining}`;
  

      if (remaining <= 0) {
        counter.classList.add("no-ticket");
      } else {
        counter.classList.remove("no-ticket");
      }
    })
    .catch(err => {
      console.warn("❌ 無法載入票券數：", err);
    });
}
document.getElementById("username").addEventListener("blur", () => {
  const name = document.getElementById("username").value.trim();
  if (name) updateTicketCounter(name);
});

let userTicketMap = {}; // { name: ticketCount }，你可以在前端手動設定或後端送過來

function fetchPrizeDataDirectly() {
  const db = window.db;
  const path = "data/prizes";

  if (!db) {
    console.warn("⚠️ Firebase 尚未初始化，跳過資料讀取");
    return;
  }

  try {
    const prizeRef = ref(db, path); // ← 這行才需要 try/catch
    get(prizeRef)
      .then(snapshot => {
        const prizeObj = snapshot.val();
        window.prizeCache = prizeObj || {};
        const prizeArray = normalizePrizes(prizeObj);
        renderPrizeList(prizeArray);
      })
      .catch(err => {
        console.error("❌ 無法從 Firebase 取得獎品資料", err);
        const prizeArray = normalizePrizes({});
        window.prizeCache = {};
        renderPrizeList(prizeArray);
      });
  } catch (e) {
    console.error("🔥 建立 ref 時失敗：", e);
    window.prizeCache = {};
    renderPrizeList(normalizePrizes({}));
  }
}

document.getElementById("toggleRate").addEventListener("click", () => {
  const section = document.getElementById("rateSection");
  section.classList.toggle("hidden");

  if (!section.classList.contains("hidden")) {
    const prizeObj = window.prizeCache;
    const prizeArray = normalizePrizes(window.prizeCache);;

    renderPrizeList(prizeArray);

    setTimeout(() => {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }
});


function renderPrizeList(prizes) {
  const table = document.getElementById("rateTable");
  table.innerHTML = "";

  // prizes 可能是陣列（API 傳來）或物件（Firebase 傳來）
  const prizeArray = Array.isArray(prizes)
    ? prizes
    : Object.values(prizes); // 轉成陣列以便統一操作
prizeArray.sort((a, b) => b.value - a.value); // 🔥 依價值排序

  const totalRemaining = prizeArray.reduce((sum, p) => sum + p.remainingCount, 0);
  document.getElementById("remainingCount").textContent = totalRemaining;

  prizeArray.forEach((p) => {
    const isSoldOut = p.remainingCount <= 0;
    const hasTier = p.tier;

    const item = document.createElement("div");
    item.className = "prize-entry";
    if (hasTier) item.classList.add("rare");
    if (isSoldOut) item.classList.add("soldout");

    item.innerHTML = `
      <img src="${p.image}" alt="${p.name}" class="prize-img" />
      <div class="prize-text">
        <span class="prize-name" onclick="showDescription('${p.name}')">
          ${p.name}
        </span>
        <span class="prize-left">
          ${isSoldOut ? "❌ 已抽完" : `剩餘：${p.remainingCount}`}
        </span>
        ${hasTier ? `
          <span class="rare-badge tier">
            ${p.tier} 💎<br>
            <span class="value">價值：${p.value || "--"} 元</span>
          </span>` : ""}
      </div>
    `;
    table.appendChild(item);
  });
}
document.getElementById("drawBtn").addEventListener("click", () => {
  // ✅ 檢查按鈕是否被禁用（沒券）
   const name = document.getElementById("username").value.trim();
  console.log("使用者姓名：", name);
  console.log("Ticket count (前端想像值):", userTicketMap[name]); // 如果你有前端快取的話

  if (document.getElementById("drawBtn").disabled) {
    alert("⚠️ 你目前沒有抽獎券囉，請先加值！");
    return;
  }

  if (!name) {
    alert("⚠️ 請先填寫【姓名】才可抽獎！");
    return;
  }

  shakeMachine();
  animateCapsulesShakeX();

  fetch("http://localhost:3000/draw", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name })
})

    .then((res) => res.json())
    .then((data) => {
  if (data.success) {
    updateTicketCounter(name);
    if (data.prize.tier) {
      showFlashEffect();
      launchParticles();
    }

    // ✅ 即時更新券數（比等 1.2 秒快）
    document.getElementById("ticketCounter").textContent = `🎫 剩餘抽獎券：${data.remaining}`;
    document.getElementById("drawBtn").disabled = data.remaining <= 0;
    document.getElementById("drawBtn").classList.toggle("disabled", data.remaining <= 0);

    const counter = document.getElementById("ticketCounter");
    if (data.remaining <= 0) {
      counter.classList.add("no-ticket");
    } else {
      counter.classList.remove("no-ticket");
    }

    const capsule = document.getElementById("capsule");
    capsule.classList.add("show", "glow");
    capsule.classList.remove("hidden");

    setTimeout(() => {
      document.getElementById("prizeImage").src = data.prize.image;
      document.getElementById("prizeName").textContent = data.prize.name;
      document.getElementById("resultPopup").classList.remove("hidden");

      capsule.classList.remove("show");
      capsule.classList.add("hidden");
    }, 1200);
    updateTicketCounter(name); // ← 再次從 Firebase 拉票券數
    fetchPrizeDataDirectly(); // ← 重新渲染獎品列表

  } else {
    alert(data.message);
  }
})

    .catch((err) => {
      console.error("抽獎錯誤：", err);
      alert("抽獎失敗，請稍後再試");
    });
});

window.addEventListener("DOMContentLoaded", () => {
  createCapsuleHillLayout();
  // 新增：自動抓姓名，顯示券數
  const name = document.getElementById("username").value.trim();
  if (name) updateTicketCounter(name);
});

window.closePopup = function () {
  document.getElementById("resultPopup").classList.add("hidden");
};

function createCapsuleHillLayout() {
  const hill = document.querySelector(".capsule-hill");
  const layers = [
    { count: 6, y: 80 },
    { count: 7, y: 120 },
    { count: 8, y: 160 },
  ];
  const spacing = 38;

  layers.forEach((layer) => {
    const totalWidth = spacing * (layer.count - 1);
    for (let i = 0; i < layer.count; i++) {
      const ball = document.createElement("div");
      ball.className = "capsule-ball";
      const x = hill.clientWidth / 2 - totalWidth / 2 + i * spacing;
      ball.style.left = `${x}px`;
      ball.style.top = `${layer.y}px`;
      ball.style.animationDelay = `${Math.random() * 2}s`;
      hill.appendChild(ball);
    }
  });
}

function shakeMachine() {
  const wrapper = document.querySelector(".machine-wrapper");
  wrapper.classList.add("shake");
  setTimeout(() => wrapper.classList.remove("shake"), 500);
}

function animateCapsulesShakeX() {
  document.querySelectorAll(".capsule-ball").forEach((ball) => {
    ball.classList.add("shake-x");
    setTimeout(() => ball.classList.remove("shake-x"), 400);
  });
}


function capturePrizePopup() {
  const popup = document.getElementById("resultPopup");
  html2canvas(popup, {
    backgroundColor: "#ffffff",
    useCORS: true,
  }).then((canvas) => {
    canvas.toBlob((blob) => {
      const file = new File([blob], "prize.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          title: "紅狐扭蛋機",
          text: "我剛剛在紅狐扭蛋機中獎啦！快來抽抽看～",
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }
    });
  });
}
function showFlashEffect() {
  const flash = document.getElementById("flashOverlay");
  flash.classList.remove("hidden");
  flash.classList.add("show");

  setTimeout(() => {
    flash.classList.remove("show");
    flash.classList.add("hidden");
  }, 1000);
}
function launchParticles() {
  confetti({
    particleCount: 60,
    spread: 100,
    origin: { y: 0.5 },
    colors: ["#ffd700", "#fff4c2", "#ffec8b"],
    scalar: 1.2,
    ticks: 200,
  });
}
window.showDescription = function (prizeName) {
  const prizeObj = window.prizeCache || {};
  const prizeArray = normalizePrizes(window.prizeCache);
  const prize = prizeArray.find(p => p.name === prizeName);
  if (!prize) return;

  document.getElementById("descTitle").textContent = prize.name;
  document.getElementById("descContent").textContent = prize.description || "尚未提供使用說明。";
  document.getElementById("descPopup").classList.remove("hidden");
}

window.closeDescPopup = function () {
  document.getElementById("descPopup").classList.add("hidden");
};

document.getElementById("infoBtn").addEventListener("click", () => {
  document.getElementById("infoPopup").classList.remove("hidden");
});

window.closeInfoPopup = function () {
  document.getElementById("infoPopup").classList.add("hidden");
};


window.queryUserRecord = async function () {
  const name = prompt("請輸入姓名以查詢紀錄");
  if (!name) return;

  const db = window.db; 
  const recordsRef = ref(db, "data/records");

  try {
    const snapshot = await get(recordsRef);
    const recordsObj = snapshot.val();
    if (!recordsObj) {
      alert("目前沒有任何抽獎紀錄");
      return;
    }

   // 抓取對應使用者 ID（例如 '1'）底下的所有紀錄
    const userRecordGroup = recordsObj[name];

    if (!userRecordGroup) {
      alert(`查無【${name}】的紀錄`);
      return;
    }
const userRecords = Object.values(userRecordGroup).sort((a, b) => b.timestamp - a.timestamp);

    const list = userRecords
      .map(r => `🎁 ${r.prize}（代碼：${r.code}）`)
      .join("\n");

    alert(`【${name}】的抽獎紀錄：\n\n${list}`);
  } catch (err) {
    console.error("❌ 讀取紀錄失敗：", err);
    alert("讀取失敗，請稍後再試");
  }
};