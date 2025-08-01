import { initFirebase } from "./firebaseInit.js";
import {
  ref,
  onValue,
  update,
  get,
  set
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

window.db = initFirebase(); // 👈 這行是關鍵

const db = initFirebase();

// ✅ 登入邏輯（不變）
window.login = function()
 {
  const pass = document.getElementById("adminPass").value;
  if (pass === "5455") {
    document.getElementById("adminPanel").classList.remove("hidden");
    watchPrizes();   // ⏱ 改為監聽 Firebase
    loadUserList();  // ⏱ 改為從 Firebase 讀取
  } else {
    alert("密碼錯誤");
  }
}
function loadUserList() {
  const usersRef = ref(db, "data/users");
  onValue(usersRef, (snapshot) => {
    const users = snapshot.val() || {};
    const table = document.getElementById("userTable");
    table.innerHTML = "";

    Object.entries(users).forEach(([uid, user]) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${user.name}</td>
        <td>${user.tickets}</td>
        <td>
          <button onclick="addTicket('${uid}', '${user.name}')">➕ 加一張</button>
        </td>
      `;
      table.appendChild(row);
    });
  });
}

function watchPrizes() {
  const prizeRef = ref(db, "data/prizes");
  onValue(prizeRef, (snapshot) => {
    const prizes = snapshot.val();
    const list = document.getElementById("prizeList");
    list.innerHTML = "";

    let total = 0;

    const sortedPrizes = Object.entries(prizes || {})
  .sort(([, a], [, b]) => b.value - a.value);

    sortedPrizes.forEach(([key, prize]) => {
      const wrapper = document.createElement("div");
wrapper.className = "prize-wrapper";
      const card = document.createElement("div");
      card.className = "prize-card";

      card.innerHTML = `
        <img src="${prize.image}" alt="${prize.name}" class="prize-image" />
        <div class="prize-info">
          <h3>${prize.name}</h3>
          <p>剩餘：<strong>${prize.remainingCount}</strong> 抽</p>
        </div>
      `;
wrapper.appendChild(card);
      list.appendChild(card);
      total += prize.remainingCount;
    });

    const remainingSpan = document.getElementById("remainingCount");
if (remainingSpan) remainingSpan.textContent = total;
else console.warn("⚠️ #remainingCount 未找到，跳過更新");
  });
}
window.addTickets = function () {
  const name = document.getElementById("adminName").value.trim();
  const count = parseInt(document.getElementById("ticketCount").value);

  if (!name || isNaN(count) || count <= 0) {
    alert("請輸入有效的姓名與券數");
    return;
  }

  const userRef = ref(db, `data/users/${name}`);
  get(userRef).then((snapshot) => {
    const current = snapshot.exists() ? snapshot.val().tickets : 0;
    update(userRef, { name, tickets: current + count }).then(() => {
      alert(`✅ 已為 ${name} 加值 ${count} 張抽獎券`);
    });
  });
};
window.addTicket = function (uid, name) {
  const userRef = ref(db, `data/users/${uid}`);
  get(userRef).then((snapshot) => {
    const current = snapshot.exists() ? snapshot.val().tickets : 0;
    update(userRef, { name, tickets: current + 1 });
  });
};


window.resetPrizes = function() {
  if (!confirm("確定要重置獎池嗎？此操作無法復原")) return;

  const defaultPrizes = {
    "天圓地方桌上植物燈": {
        "description": "",
        "image": "https://cdn.glitch.global/7e58d7f9-0317-4506-a9c2-9149ff8fbc8d/345025.jpg?v=1751299051337",
        "name": "天圓地方桌上植物燈",
        "quantity": 1,
        "remainingCount": 1,
        "tier": "一等獎",
        "value": 750
      },
 "鈴鐺型補光燈": {
        "description": "",
        "image": "https://cdn.glitch.global/7e58d7f9-0317-4506-a9c2-9149ff8fbc8d/S__35217435.jpg?v=1751043311751",
        "name": "鈴鐺型植物燈",
        "quantity": 1,
        "remainingCount": 1,
        "tier": "二等獎",
        "value": 700
      },
"三圓型桌上植物燈": {
        "description": "",
        "image": "https://cdn.glitch.global/7e58d7f9-0317-4506-a9c2-9149ff8fbc8d/345025.jpg?v=1751299051337",
        "name": "三圓型桌上植物燈",
        "quantity": 1,
        "remainingCount": 1,
        "tier": "三等獎",
        "value": 760
      }
      ,
      "20瓦植物補光燈": {
        "description": "",
        "image": "https://cdn.glitch.global/7e58d7f9-0317-4506-a9c2-9149ff8fbc8d/S__35217436.jpg?v=1751042625863",
        "name": "20瓦植物補光燈",
        "quantity": 1,
        "remainingCount": 1,
        "tier": "四等獎",
        "value": 600
      },
     "10瓦植物補光燈": {
        "description": "",
        "image": "https://cdn.glitch.global/7e58d7f9-0317-4506-a9c2-9149ff8fbc8d/S__35217436.jpg?v=1751042625863",
        "name": "10瓦植物補光燈",
        "quantity": 1,
        "remainingCount": 1,
        "tier": "五等獎",
        "value": 400
      }
     , "200元折價卷": {
        "description": "可於紅狐官網滿NT$500時折抵NT$200，滿NT$1000可使用兩張，以此類推。使用期限為 7 天內。",
        "image": "https://cdn.glitch.global/7e58d7f9-0317-4506-a9c2-9149ff8fbc8d/200?v=1751110967286",
        "name": "200元折價卷",
        "quantity": 15,
        "remainingCount": 15
      },
      "150元折價卷": {
        "description": "可於紅狐官網滿NT$500時折抵NT$150，滿NT$1000可使用兩張，以此類推。使用期限為 7 天內。",
        "image": "https://cdn.glitch.global/7e58d7f9-0317-4506-a9c2-9149ff8fbc8d/150?v=1751110970529",
        "name": "150元折價卷",
        "quantity": 22,
        "remainingCount": 22
      }

  };

  const prizeRef = ref(db, "data/prizes");
  
  set(prizeRef, defaultPrizes).then(() => {
  
    alert("✅ 獎池已重置完畢");
  }).catch(err => {
    console.error("重置錯誤", err);
    alert("重置失敗，請稍後再試");
  });
}
window.exportCSV = async function () {
  const db = window.db;
  if (!db) {
    alert("⚠️ Firebase 尚未初始化！");
    return;
  }

  const snapshot = await window.getSnapshot(ref(db, "data/records"));
  const recordsGroup = snapshot.val();
  if (!recordsGroup) {
    alert("⚠️ 沒有抽獎紀錄可匯出！");
    return;
  }

  let csv = "使用者ID,兌換碼,獎項,時間戳\n";

  Object.entries(recordsGroup).forEach(([userId, userRecords]) => {
    Object.values(userRecords).forEach((record) => {
      const code = record.code || "";
      const prize = record.prize || "";
      const ts = record.timestamp
        ? new Date(record.timestamp).toLocaleString("zh-TW")
        : "";
      csv += `${userId},${code},${prize},${ts}\n`;
    });
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `抽獎紀錄_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};



// ✅ 輔助方法：封裝 Firebase 讀取為 Promise
window.getSnapshot = function (dbRef) {
  return new Promise((resolve) => {
    onValue(dbRef, (snap) => resolve(snap), { onlyOnce: true });
  });
};


