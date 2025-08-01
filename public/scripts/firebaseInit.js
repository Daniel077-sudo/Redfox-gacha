import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ✅ Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBoZBQur2OrHD8ga4zoBaGuCC8C32BI_WQ",
  authDomain: "redfoxdata-3e788.firebaseapp.com",
  databaseURL: "https://redfoxdata-3e788-default-rtdb.firebaseio.com",
  projectId: "redfoxdata-3e788",
  storageBucket: "redfoxdata-3e788.firebasestorage.app",
  messagingSenderId: "1046051924152",
  appId: "1:1046051924152:web:0129db980152dc53442c4d",
  measurementId: "G-CK82RNDHH1"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
export function initFirebase() {
  return db;
}
console.log("✅ 前端 Firebase 已初始化");

export function updatePrizeAvailabilityUI(prizeData) {
  const availableCountEl = document.getElementById("remainingCount");
  if (!availableCountEl) {
    console.warn("⚠️ 找不到 #availableCount，跳過 UI 更新");
    return;
  }

  const totalAvailable = Object.values(prizeData || {}).reduce((sum, prize) => {
    return sum + (prize.remainingCount || 0);
  }, 0);

  availableCountEl.textContent = totalAvailable;
}

// ✅ 監聽獎品資料
onValue(ref(db, "data/prizes"), (snapshot) => {
  const prizeData = snapshot.val();

  if (!prizeData) {
    console.warn("⚠️ 沒有獎品資料！");
    return;
  }

  // ✨ 更新剩餘獎品數顯示
  updatePrizeAvailabilityUI(prizeData);

  // ✨ 快取獎品資料供主程式使用
  window.prizeCache = prizeData;

  // ✅ 通知主程式資料準備完成
  window.dispatchEvent(new Event("firebaseReady"));
});

// ✅ 移除 loading 提示
window.addEventListener("firebaseReady", () => {
  document.getElementById("loadingNotice")?.remove();
});