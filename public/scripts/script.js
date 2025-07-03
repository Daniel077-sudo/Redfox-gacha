let hasRenderedPrizeList = false;

function updateTicketCounter(name) {
  fetch(`/api/userTickets?name=${encodeURIComponent(name)}`)
    .then(res => res.json())
    .then(data => {
      const remaining = data.tickets;
      const counter = document.getElementById("ticketCounter");
      const drawBtn = document.getElementById("drawBtn");

      counter.textContent = `🎫 剩餘抽獎券：${remaining}`;
      drawBtn.disabled = remaining <= 0;
      drawBtn.classList.toggle("disabled", remaining <= 0);

      // ✅ 額外提示：券數為 0 時變紅色閃爍
      if (remaining <= 0) {
        counter.classList.add("no-ticket");
      } else {
        counter.classList.remove("no-ticket");
      }
    });
}

document.getElementById("username").addEventListener("blur", () => {
  const name = document.getElementById("username").value.trim();
  if (name) updateTicketCounter(name);
});

let userTicketMap = {}; // { name: ticketCount }，你可以在前端手動設定或後端送過來

document.getElementById("toggleRate").addEventListener("click", () => {
  const section = document.getElementById("rateSection");
  section.classList.toggle("hidden");

  if (!section.classList.contains("hidden")) {
    renderPrizeList();
    setTimeout(() => {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }
});

function renderPrizeList() {
  fetch("/prizes")
    .then(res => res.json())
    .then(prizes => {
      const table = document.getElementById("rateTable");
      table.innerHTML = "";

      prizes.forEach(p => {
        // after prizes.forEach(...) 加上：
const totalRemaining = prizes.reduce((sum, p) => sum + p.quantity, 0);
document.getElementById("availableCount").textContent = totalRemaining;

        const isSoldOut = p.quantity <= 0;
        const hasTier = p.tier;

        const item = document.createElement("div");
        item.className = "prize-entry";
        if (hasTier) item.classList.add("rare");
        if (isSoldOut) item.classList.add("soldout");

        // 👇 建立內容區塊（點名稱可查看說明）
        item.innerHTML = `
          <img src="${p.image}" alt="${p.name}" class="prize-img" />
          <div class="prize-text">
            <span class="prize-name" onclick="showDescription('${p.name}')">
              ${p.name}
            </span>
            <span class="prize-left">
              ${isSoldOut ? "❌ 已抽完" : `剩餘：${p.quantity}`}
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
    });
}


document.getElementById("drawBtn").addEventListener("click", () => {
  // ✅ 檢查按鈕是否被禁用（沒券）
  if (document.getElementById("drawBtn").disabled) {
    alert("⚠️ 你目前沒有抽獎券囉，請先加值！");
    return;
  }

  const name = document.getElementById("username").value.trim();
  if (!name) {
    alert("⚠️ 請先填寫【姓名】才可抽獎！");
    return;
  }

  shakeMachine();
  animateCapsulesShakeX();

  fetch("/draw", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
    .then((res) => res.json())
    .then((data) => {
  if (data.success) {
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

function closePopup() {
  document.getElementById("resultPopup").classList.add("hidden");
}

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
function showDescription(prizeName) {
  fetch("/prizes")
    .then(res => res.json())
    .then(prizes => {
      const prize = prizes.find(p => p.name === prizeName);
      if (!prize) return;

      document.getElementById("descTitle").textContent = prize.name;
      document.getElementById("descContent").textContent = prize.description || "尚未提供使用說明。";
      document.getElementById("descPopup").classList.remove("hidden");
    });
}

function closeDescPopup() {
  document.getElementById("descPopup").classList.add("hidden");
}
document.getElementById("infoBtn").addEventListener("click", () => {
  document.getElementById("infoPopup").classList.remove("hidden");
});

function closeInfoPopup() {
  document.getElementById("infoPopup").classList.add("hidden");
}

function queryUserRecord() {
  const name = prompt("請輸入姓名以查詢紀錄");
  if (!name) return;

  fetch("/records")
    .then(res => res.json())
    .then(records => {
      const userRecords = records.filter(r => r.name === name);
      if (userRecords.length === 0) {
        alert("查無紀錄");
        return;
      }

      const list = userRecords.map(r => `🎁 ${r.prize}（代碼：${r.code}）`).join("\n");
      alert(`【${name}】的抽獎紀錄：\n\n${list}`);
    });
}