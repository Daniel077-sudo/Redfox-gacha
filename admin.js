function login() {
  const pass = document.getElementById("adminPass").value;
  if (pass === "5455") {
    document.getElementById("adminPanel").classList.remove("hidden");
    refreshPrizeList(); // ✅ 登入後立即載入獎品清單
    updateRemainingCount();
    loadUserList(); // ✅ ← 加這行：登入後立即載入使用者券數清單
  } else {
    alert("密碼錯誤");
  }
}
function refreshPrizeList() {
  fetch("/prizes")
    .then(res => res.json())
    .then(prizes => {
      const list = document.getElementById("prizeList");
      list.innerHTML = "";

      prizes.forEach(p => {
        const card = document.createElement("div");
        card.className = "prize-card";

        card.innerHTML = `
          <img src="${p.image}" alt="${p.name}" class="prize-image" />
          <div class="prize-info">
            <h3>${p.name}</h3>
            <p>剩餘：<strong>${p.quantity}</strong> 抽</p>
          </div>
        `;

        list.appendChild(card);
      });
    });
}

function exportCSV() {
  fetch("/records")
    .then(res => res.json())
    .then(data => {
      const csv = data.map(r => `${r.name},${r.code},${r.prize}`).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "records.csv";
      a.click();
    });
}
function updateRemainingCount() {
  fetch("/prizes")
    .then(res => res.json())
    .then(prizes => {
      const total = prizes.reduce((sum, prize) => sum + prize.quantity, 0);
      document.getElementById("remainingCount").textContent = total;
    });
}
function resetPrizes() {
  if (!confirm("確定要重置獎池嗎？此操作無法復原")) return;

  fetch("/admin/reset", { method: "POST" })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
    })
    .catch(err => {
      console.error("重置失敗：", err);
      alert("重置失敗，請稍後再試");
    });
}
const fs = require("fs");
const path = require("path");
const express = require("express");
const app = express();
app.use(express.json());

const USERS_FILE = path.join(__dirname, "data", "users.json");

app.post("/api/addTickets", (req, res) => {
  const { name, count } = req.body;
  if (!name || typeof count !== "number" || count <= 0) {
    return res.status(400).json({ message: "資料格式錯誤" });
  }

  let users = [];
  if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  }

  const user = users.find(u => u.name === name);
  if (user) {
    user.tickets += count;
  } else {
    users.push({ name, tickets: count });
  }

  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.json({ message: `✅ 已為 ${name} 加值 ${count} 張抽獎券` });
});

app.get("/api/userTickets", (req, res) => {
  const name = req.query.name;
  const users = JSON.parse(fs.readFileSync("data/users.json", "utf-8"));
  const user = users.find(u => u.name === name);
  if (!user) return res.json({ tickets: 0 });

  res.json({ tickets: user.tickets });
});
async function fetchUsers() {
  const res = await fetch("/data/users.json"); // 你已有的 users.json
  const users = await res.json();
  const table = document.getElementById("userTable");
  table.innerHTML = "";

  users.forEach(user => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${user.name}</td>
      <td id="count-${user.name}">${user.tickets}</td>
      <td><button onclick="addTicket('${user.name}')">➕</button></td>
    `;
    table.appendChild(row);
  });
}

function addTickets() {
  const name = document.getElementById("adminName").value.trim();
  const count = parseInt(document.getElementById("ticketCount").value);

  if (!name || isNaN(count) || count <= 0) {
    alert("請輸入有效的姓名與券數");
    return;
  }

  fetch("/api/addTickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, count })
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      loadUserList(); // ✅ 成功後刷新清單
    })
    .catch(err => {
      console.error("加值失敗", err);
      alert("加值失敗，請稍後再試");
    });
}

async function loadUserList() {
  const res = await fetch("/data/users.json");
  const users = await res.json();
  const table = document.getElementById("userTable");
  table.innerHTML = "";

  users.forEach(user => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${user.name}</td>
      <td>${user.tickets}</td>
      <td><button onclick="addTicket('${user.name}')">➕ 加一張</button></td>
    `;
    table.appendChild(row);
  });
}

function addTicket(name) {
  fetch("/api/addTickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, count: 1 })
  })
    .then(res => res.json())
    .then(() => loadUserList());
}
