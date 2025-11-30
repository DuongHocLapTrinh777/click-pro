// Clicker Pro - keep previous game logic, only add mobile fixed UI + device info
// ---------- State & Constants ----------
let score = 0;
let clickValue = 1;
let upgradeCost = 10;
let rebirthPoint = 0;
let vipLevel = 0;
let miniGameCooldownUntil = 0; // timestamp ms until which mini game locked

const COOLDOWN_MINIGAME_SEC = 5;
const VIP_COST_BASE = 1000;
const SAVE_KEY = 'clickerProGameData';
const RESET_DAYS = 30;

// ---------- Cost formulas ----------
function getRebirthCost(n) {
  if (n === 0) return 100;
  let arr = [100];
  for (let i = 1; i <= n; i++) arr.push(arr[i - 1] + i * 100);
  return arr[n];
}
function getVipCost(n) {
  return VIP_COST_BASE * (n + 1);
}

// ---------- Persistence ----------
function saveState() {
  const save = {
    score, clickValue, upgradeCost, rebirthPoint, vipLevel,
    miniGameCooldownUntil,
    lastPlayed: Date.now()
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (e) {}
}
function loadState() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;
  try {
    const save = JSON.parse(raw);
    const now = Date.now();
    const lastPlayed = save.lastPlayed || now;
    const ms30days = RESET_DAYS * 24 * 60 * 60 * 1000;
    if (now - lastPlayed >= ms30days) {
      // reset game
      localStorage.removeItem(SAVE_KEY);
      showPopup("Game cũ đã được reset vì không chơi trong 30 ngày.", 3000);
      return;
    }
    score = save.score ?? score;
    clickValue = save.clickValue ?? clickValue;
    upgradeCost = save.upgradeCost ?? upgradeCost;
    rebirthPoint = save.rebirthPoint ?? rebirthPoint;
    vipLevel = save.vipLevel ?? vipLevel;
    miniGameCooldownUntil = save.miniGameCooldownUntil ?? 0;
  } catch (e) {}
}
function updateLastPlayed() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;
  try {
    const save = JSON.parse(raw);
    save.lastPlayed = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (e) {}
}

// ---------- UI Update ----------
function update() {
  const scoreEl = document.getElementById('score');
  const upgradeCostEl = document.getElementById('upgradeCost');
  const rebirthPointEl = document.getElementById('rebirthPoint');
  const vipLevelEl = document.getElementById('vipLevel');
  if (scoreEl) scoreEl.innerText = score;
  if (upgradeCostEl) upgradeCostEl.innerText = upgradeCost;
  if (rebirthPointEl) rebirthPointEl.innerText = rebirthPoint;
  if (vipLevelEl) vipLevelEl.innerText = vipLevel;

  // rebirth & vip button labels and enabled state
  const rebirthBtn = document.getElementById('rebirthBtn');
  const vipBtn = document.getElementById('vipBtn');
  if (rebirthBtn) {
    const rcost = getRebirthCost(rebirthPoint);
    rebirthBtn.innerHTML = `♻️ Tái Sinh (${rcost} xu)`;
    rebirthBtn.disabled = !(score >= rcost);
  }
  if (vipBtn) {
    const vcost = getVipCost(vipLevel);
    vipBtn.innerHTML = `💠 VIP+ (${vcost} xu)`;
    vipBtn.disabled = !(score >= vcost);
  }

  // mini game cooldown display & disable
  const miniBtn = document.getElementById('miniGameBtn');
  const now = Date.now();
  if (miniBtn) {
    if (now < miniGameCooldownUntil) {
      miniBtn.disabled = true;
      const left = Math.ceil((miniGameCooldownUntil - now) / 1000);
      miniBtn.innerText = `🎮 Mini Game (${left}s)`;
    } else {
      miniBtn.disabled = false;
      miniBtn.innerText = `🎮 Mini Game`;
    }
  }

  // update mobile short score if present
  const mobileShort = document.getElementById('mobileScoreShort');
  if (mobileShort) mobileShort.innerText = score;

  saveState();
  updateDeviceInfo(); // update fixed top-right device info
}

// ---------- Device info (top-right) ----------
function updateDeviceInfo() {
  const el = document.getElementById('deviceInfo');
  if (!el) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  let mode = 'Desktop';
  if (w <= 480) mode = 'Mobile';
  else if (w <= 900) mode = 'Tablet';
  el.textContent = `${mode} · ${w}×${h} · DPR:${dpr}`;
}

// ---------- Mini game cooldown ----------
function miniGameInDelay() { return Date.now() < miniGameCooldownUntil; }
function triggerMiniGameDelay() {
  miniGameCooldownUntil = Date.now() + COOLDOWN_MINIGAME_SEC * 1000;
  update();
  const interval = setInterval(() => {
    if (Date.now() >= miniGameCooldownUntil) {
      clearInterval(interval);
      update();
    } else {
      update();
    }
  }, 250);
}

// ---------- Mini-games ----------
const hiddenMiniGameStore = {
  slotMachine: {
    name: 'Máy Xèng (Slot)',
    play: function () {
      if (miniGameInDelay()) return;
      const slot = [Math.floor(Math.random() * 7) + 1, Math.floor(Math.random() * 7) + 1, Math.floor(Math.random() * 7) + 1];
      let txt = `🎰 ${slot[0]} | ${slot[1]} | ${slot[2]}<br>`;
      if (slot[0] === slot[1] && slot[1] === slot[2]) {
        let prize = 200 + 50 * vipLevel;
        score += prize;
        txt += `Bạn NỔ HŨ! +${prize} xu${vipLevel > 0 ? ' (VIP+)' : ''}`;
      } else if (slot[0] === slot[1] || slot[1] === slot[2] || slot[0] === slot[2]) {
        let prize = 55 + 5 * vipLevel;
        score += prize;
        txt += `2 giống nhau! +${prize} xu`;
      } else {
        txt += "Chúc bạn may mắn lần sau!";
      }
      showPopup(txt, 2200);
      update();
      triggerMiniGameDelay();
    }
  },
  fastClick: {
    name: 'Click Nhanh 3s',
    play: function () {
      if (miniGameInDelay()) return;
      const btnId = 'fastClickBtn';
      let count = 0;
      const msg = `<b>Click siêu nhanh trong 3 giây!</b><br><button id="${btnId}" class="func-btn" style="padding:14px 20px;margin-top:6px">CLICK!</button><br>Điểm: <span id="fastClickCount">0</span>`;
      showPopup(msg, 3500);
      function clickHandler(e) {
        if (e.target && e.target.id === btnId) {
          count++;
          const cEl = document.getElementById('fastClickCount');
          if (cEl) cEl.innerText = count;
        }
      }
      const container = document.getElementById('miniGameSection');
      container.addEventListener('click', clickHandler);
      setTimeout(() => {
        container.removeEventListener('click', clickHandler);
        const prize = count * 4 + (vipLevel > 0 ? vipLevel * 10 : 0);
        score += prize;
        showPopup(`Bạn click ${count} lần → Nhận ${prize} xu`, 2200);
        update();
        triggerMiniGameDelay();
      }, 3000);
    }
  }
};

const miniGames = {
  guessNumber: {
    name: "Đoán Số Ngẫu Nhiên",
    play: function () {
      if (miniGameInDelay()) return;
      const answer = Math.floor(Math.random() * 10) + 1;
      const guess = parseInt(prompt('Đoán số từ 1 đến 10:'), 10);
      if (guess === answer) {
        let prize = 50 + Math.floor(Math.random() * 30);
        if (vipLevel > 0) prize += 15 * vipLevel;
        score += prize;
        showPopup(`Đúng! Thưởng ${prize} xu${vipLevel > 0 ? ' (VIP+)' : ''}`, 1800);
      } else {
        showPopup(`Sai! Số đúng là ${answer}`, 1500);
      }
      update();
      triggerMiniGameDelay();
    }
  },
  slotMachine: hiddenMiniGameStore.slotMachine,
  fastClick: hiddenMiniGameStore.fastClick
};

// ---------- Mini game menu ----------
function showMiniGameMenu() {
  if (miniGameInDelay()) return;
  let html = `<b>Chọn mini game:</b><div style="margin:10px 0 0 0;display:flex;flex-direction:column;gap:8px;">`;
  Object.entries(miniGames).forEach(([key, val]) => {
    html += `<button class="func-btn minigame" style="font-size:1em;" onclick="window.playMiniGame('${key}')">${val.name}</button>`;
  });
  html += `</div>`;
  showPopup(html, 6500);
}
window.playMiniGame = function (key) {
  if (miniGameInDelay()) return;
  if (miniGames[key]) miniGames[key].play();
};

// ---------- Core handlers (kept from previous) ----------
document.addEventListener('DOMContentLoaded', () => {
  const clickEl = document.getElementById('clickBtn');
  if (clickEl) clickEl.addEventListener('click', () => {
    score += clickValue;
    update();
    saveState();
    updateLastPlayed();
  });

  const upgradeEl = document.getElementById('upgradeBtn');
  if (upgradeEl) upgradeEl.addEventListener('click', () => {
    if (score >= upgradeCost) {
      score -= upgradeCost;
      clickValue += 1 + vipLevel;
      upgradeCost = Math.floor(upgradeCost * 1.5);
      showPopup('Đã nâng cấp click!', 1200);
      update();
      saveState();
      updateLastPlayed();
    } else {
      showPopup('Không đủ xu để nâng cấp', 1000);
    }
  });

  const rebirthEl = document.getElementById('rebirthBtn');
  if (rebirthEl) rebirthEl.addEventListener('click', () => {
    const cost = getRebirthCost(rebirthPoint);
    if (score >= cost) {
      rebirthPoint += 1;
      score = 0;
      clickValue = 1 + rebirthPoint + vipLevel * 3;
      upgradeCost = 10;
      showPopup("Tái sinh thành công!", 1400);
      update();
      saveState();
      updateLastPlayed();
    } else {
      showPopup('Chưa đủ xu để tái sinh', 1000);
    }
  });

  const vipEl = document.getElementById('vipBtn');
  if (vipEl) vipEl.addEventListener('click', () => {
    const cost = getVipCost(vipLevel);
    if (score >= cost) {
      score -= cost;
      vipLevel += 1;
      clickValue += 3 * vipLevel;
      showPopup("Chúc mừng! Đã lên VIP+" + vipLevel, 1600);
      update();
      saveState();
      updateLastPlayed();
    } else {
      showPopup('Chưa đủ xu để lên VIP+', 1000);
    }
  });

  const miniBtn = document.getElementById('miniGameBtn');
  if (miniBtn) miniBtn.addEventListener('click', () => {
    showMiniGameMenu();
    updateLastPlayed();
  });

  // Mobile FAB (fixed bottom) — triggers same click logic
  const mobileFab = document.getElementById('mobileClickBtn');
  if (mobileFab) {
    mobileFab.addEventListener('click', () => {
      score += clickValue;
      update();
      saveState();
      updateLastPlayed();
      if (navigator.vibrate) navigator.vibrate(8);
    });
  }

  // keep lastPlayed fresh on interactions
  ['clickBtn', 'upgradeBtn', 'rebirthBtn', 'vipBtn', 'miniGameBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', updateLastPlayed, { passive: true });
  });
});

// ---------- Popup helper ----------
function showPopup(msg, t = 1700) {
  const mini = document.getElementById("miniGameSection");
  if (!mini) return;
  mini.innerHTML = `<div>${msg}</div>`;
  setTimeout(() => {
    if (mini.innerHTML.includes(msg)) mini.innerHTML = '';
  }, t);
}

// ---------- Init ----------
loadState();
update();
window.addEventListener('resize', updateDeviceInfo);
setInterval(() => update(), 300);
