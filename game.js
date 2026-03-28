/**
 * ==========================================
 * Игра "Рыбалка" - Аркадная игра
 * Чистый JavaScript, HTML5 Canvas
 * ==========================================
 */

// ==========================================
// КОНСТАНТЫ ИГРЫ
// ==========================================
const GAME_CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  GAME_DURATION: 60,
  HOOK_SPEED_DOWN: 5,
  HOOK_SPEED_UP: 6,
  HOOK_WEIGHT_FACTOR: 0.3,
  FISH_SPAWN_RATE: 60,
  MAX_FISH: 8,
  WATER_SURFACE: 80,
  DEEP_WATER_START: 400,
  DEEP_WATER_END: 550,
};

// Улучшения (магазин)
const IMPROVEMENTS = [
  {
    id: "fast_hook",
    name: "Быстрый крючок",
    description: "Крючок на 30% быстрее",
    icon: "⚡",
    price: 100,
    effect: (hook) => {
      hook.baseSpeedDown = GAME_CONFIG.HOOK_SPEED_DOWN * 1.3;
      hook.baseSpeedUp = GAME_CONFIG.HOOK_SPEED_UP * 1.3;
    },
    active: false,
  },
  {
    id: "strong_line",
    name: "Прочная леска",
    description: "Рыбы меньше тормозят",
    icon: "🪢",
    price: 150,
    effect: (hook) => {
      hook.weightFactor = GAME_CONFIG.HOOK_WEIGHT_FACTOR * 0.6;
    },
    active: false,
  },
  {
    id: "magnet_fish",
    name: "Магнит для рыб",
    description: "Рыбы притягиваются к крючку",
    icon: "🧲",
    price: 200,
    effect: null,
    active: false,
  },
  {
    id: "golden_bait",
    name: "Золотая приманка",
    description: "Больше золотой рыбы",
    icon: "🌟",
    price: 250,
    effect: null,
    active: false,
  },
  {
    id: "trash_filter",
    name: "Фильтр мусора",
    description: "Мусор не цепляется",
    icon: "🚫",
    price: 180,
    effect: null,
    active: false,
  },
  {
    id: "double_points",
    name: "Двойные очки",
    description: "x2 очков за рыбу",
    icon: "💰",
    price: 300,
    effect: null,
    active: false,
  },
  {
    id: "time_extend",
    name: "Доп. время",
    description: "+15 секунд",
    icon: "⏱️",
    price: 220,
    effect: null,
    active: false,
  },
];

// Типы рыб
const FISH_TYPES = {
  SMALL: {
    name: "Мелкая",
    points: 10,
    weight: 1,
    speed: 3,
    color: "#7ec8e3",
    width: 30,
    height: 20,
    emoji: "🐟",
  },
  MEDIUM: {
    name: "Средняя",
    points: 25,
    weight: 2,
    speed: 2,
    color: "#4ecdc4",
    width: 45,
    height: 28,
    emoji: "🐠",
  },
  LARGE: {
    name: "Крупная",
    points: 50,
    weight: 4,
    speed: 1,
    color: "#ff6b6b",
    width: 65,
    height: 40,
    emoji: "🐡",
  },
  GOLD: {
    name: "Золотая",
    points: 100,
    weight: 1,
    speed: 4,
    color: "#ffd700",
    width: 35,
    height: 22,
    emoji: "🌟",
  },
};

// Мусор
const TRASH_TYPES = [
  {
    name: "Ботинок",
    points: -10,
    weight: 3,
    color: "#8b4513",
    width: 40,
    height: 25,
    emoji: "👞",
  },
  {
    name: "Банка",
    points: -10,
    weight: 2,
    color: "#c0c0c0",
    width: 30,
    height: 35,
    emoji: "🥫",
  },
  {
    name: "Бутылка",
    points: -5,
    weight: 1,
    color: "#98fb98",
    width: 20,
    height: 45,
    emoji: "🍾",
  },
];

// ==========================================
// КЛАСС ИГРЫ
// ==========================================
class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvas.width = GAME_CONFIG.CANVAS_WIDTH;
    this.canvas.height = GAME_CONFIG.CANVAS_HEIGHT;

    this.isRunning = false;
    this.isPaused = false;
    this.score = 0;
    this.coins = parseInt(localStorage.getItem("fishingCoins")) || 0;
    this.timeLeft = GAME_CONFIG.GAME_DURATION;
    this.highScore = parseInt(localStorage.getItem("fishingHighScore")) || 0;

    this.improvements =
      JSON.parse(localStorage.getItem("fishingImprovements")) ||
      IMPROVEMENTS.map((imp) => ({ ...imp, active: false }));
    this.activeImprovements = this.improvements.filter((imp) => imp.active);

    this.player = null;
    this.hook = null;
    this.fishes = [];
    this.particles = [];
    this.bottomDecorations = [];

    this.frameCount = 0;
    this.lastTime = 0;
    this.currentScreen = "start";

    this.gameLoop = this.gameLoop.bind(this);
    this.handleInput = this.handleInput.bind(this);

    this.initDOM();
    this.initBottomDecorations();
  }

  initBottomDecorations() {
    this.bottomDecorations = [];

    for (let i = 0; i < 15; i++) {
      this.bottomDecorations.push({
        type: "plant",
        x: Math.random() * this.canvas.width,
        y: GAME_CONFIG.DEEP_WATER_END - 20 - Math.random() * 40,
        height: 20 + Math.random() * 40,
        width: 3 + Math.random() * 4,
        sway: Math.random() * Math.PI * 2,
      });
    }

    for (let i = 0; i < 10; i++) {
      this.bottomDecorations.push({
        type: "rock",
        x: Math.random() * this.canvas.width,
        y: GAME_CONFIG.DEEP_WATER_END - 10 - Math.random() * 20,
        size: 10 + Math.random() * 20,
      });
    }

    for (let i = 0; i < 8; i++) {
      const depth =
        GAME_CONFIG.DEEP_WATER_START +
        Math.random() *
          (GAME_CONFIG.DEEP_WATER_END - GAME_CONFIG.DEEP_WATER_START - 100);
      this.bottomDecorations.push({
        type: "algae",
        x: Math.random() * this.canvas.width,
        y: depth,
        length: 50 + Math.random() * 80,
        sway: Math.random() * Math.PI * 2,
      });
    }
  }

  initDOM() {
    this.startScreen = document.getElementById("startScreen");
    this.gameUI = document.getElementById("gameUI");
    this.gameOverScreen = document.getElementById("gameOverScreen");
    this.shopScreen = document.getElementById("shopScreen");

    this.timerEl = document.getElementById("timer");
    this.scoreEl = document.getElementById("score");
    this.coinsEl = document.getElementById("coins");
    this.highScoreEl = document.getElementById("highScore");
    this.finalScoreEl = document.getElementById("finalScore");
    this.newRecordEl = document.getElementById("newRecord");

    this.startBtn = document.getElementById("startBtn");
    this.restartBtn = document.getElementById("restartBtn");
    this.openShopBtn = document.getElementById("openShopBtn");
    this.closeShopBtn = document.getElementById("closeShopBtn");
    this.backToMenuBtn = document.getElementById("backToMenuBtn");
    this.pauseBtn = document.getElementById("pauseBtn");
    this.startFromShopBtn = document.getElementById("startFromShopBtn");
    this.shopCoinsEl = document.getElementById("shopCoins");
    this.startCoinsEl = document.getElementById("startCoins");

    this.highScoreEl.textContent = this.highScore;
    this.updateAllCoinsDisplays();

    this.startBtn.addEventListener("click", () => this.start());
    this.restartBtn.addEventListener("click", () => this.start());

    if (this.openShopBtn) {
      this.openShopBtn.addEventListener("click", () => this.openShop());
    }

    // Обработка второй кнопки магазина на экране game over
    const openShopBtn2 = document.getElementById("openShopBtn2");
    if (openShopBtn2) {
      openShopBtn2.addEventListener("click", () => this.openShop());
    }

    if (this.closeShopBtn) {
      this.closeShopBtn.addEventListener("click", () => this.closeShop());
    }

    if (this.backToMenuBtn) {
      this.backToMenuBtn.addEventListener("click", () => this.backToMenu());
    }

    if (this.pauseBtn) {
      this.pauseBtn.addEventListener("click", () => this.togglePause());
    }

    if (this.startFromShopBtn) {
      this.startFromShopBtn.addEventListener("click", () => this.start());
    }

    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" && this.isRunning) {
        e.preventDefault();
        this.handleInput();
      }
      if (e.code === "KeyM" && !this.isRunning) {
        this.openShop();
      }
      if (e.code === "KeyP" && this.isRunning) {
        this.togglePause();
      }
    });

    this.canvas.addEventListener("click", () => {
      if (this.isRunning) this.handleInput();
    });

    this.initImprovementsList();
  }

  initImprovementsList() {
    this.improvementsList = document.getElementById("improvementsList");
    if (!this.improvementsList) return;

    this.improvementsList.innerHTML = "";

    this.improvements.forEach((improvement, index) => {
      const item = document.createElement("div");
      item.className = "shop-item";
      item.innerHTML = `
                <div class="shop-item-icon">${improvement.icon}</div>
                <div class="shop-item-info">
                    <div class="shop-item-name">${improvement.name}</div>
                    <div class="shop-item-desc">${improvement.description}</div>
                </div>
                <div class="shop-item-price">${improvement.price} монет</div>
                <button class="shop-item-btn ${improvement.active ? "bought" : ""}" 
                        data-index="${index}" ${improvement.active ? "disabled" : ""}>
                    ${improvement.active ? "Куплено" : "Купить"}
                </button>
            `;
      this.improvementsList.appendChild(item);
    });

    const buyButtons = this.improvementsList.querySelectorAll(
      ".shop-item-btn:not(.bought)",
    );
    buyButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.dataset.index);
        this.buyImprovement(index);
      });
    });
  }

  updateCoinsDisplay() {
    if (this.coinsEl) this.coinsEl.textContent = this.coins;
  }

  updateAllCoinsDisplays() {
    this.updateCoinsDisplay();
    if (this.shopCoinsEl) this.shopCoinsEl.textContent = this.coins;
    if (this.startCoinsEl) this.startCoinsEl.textContent = this.coins;
  }

  buyImprovement(index) {
    const improvement = this.improvements[index];

    if (this.coins < improvement.price) {
      this.showMessage("Недостаточно монет!");
      return;
    }

    this.coins -= improvement.price;
    improvement.active = true;
    this.activeImprovements.push(improvement);

    localStorage.setItem("fishingCoins", this.coins);
    localStorage.setItem(
      "fishingImprovements",
      JSON.stringify(this.improvements),
    );

    this.updateAllCoinsDisplays();
    this.initImprovementsList();
    this.applyImprovement(improvement);

    this.showMessage(`Куплено: ${improvement.name}!`);
  }

  applyImprovement(improvement) {
    if (improvement.id === "time_extend" && this.isRunning) {
      this.timeLeft += 15;
      this.timerEl.textContent = this.timeLeft;
    }

    if (improvement.effect && this.hook) {
      improvement.effect(this.hook);
    }
  }

  showMessage(text) {
    const messageEl = document.getElementById("shopMessage");
    if (messageEl) {
      messageEl.textContent = text;
      messageEl.style.display = "block";
      setTimeout(() => {
        messageEl.style.display = "none";
      }, 3000);
    }
  }

  openShop() {
    if (this.shopScreen) this.shopScreen.classList.add("active");
    if (this.startScreen) this.startScreen.classList.remove("active");
    if (this.gameOverScreen) this.gameOverScreen.classList.remove("active");
    this.currentScreen = "shop";
    this.updateAllCoinsDisplays();
    this.initImprovementsList();
  }

  closeShop() {
    if (this.shopScreen) this.shopScreen.classList.remove("active");
    if (this.startScreen) this.startScreen.classList.add("active");
    this.currentScreen = "start";
  }

  backToMenu() {
    if (this.gameOverScreen) this.gameOverScreen.classList.remove("active");
    if (this.startScreen) this.startScreen.classList.add("active");
    this.currentScreen = "start";
  }

  togglePause() {
    this.isPaused = !this.isPaused;
  }

  start() {
    this.score = 0;
    this.timeLeft = GAME_CONFIG.GAME_DURATION;
    this.frameCount = 0;
    this.fishes = [];
    this.particles = [];

    const timeExtend = this.improvements.find(
      (imp) => imp.id === "time_extend" && imp.active,
    );
    if (timeExtend) this.timeLeft += 15;

    this.player = new Player(this.canvas.width / 2, 60);
    this.hook = new Hook(this.player.x, this.player.y + 30);
    this.applyHookImprovements();

    if (this.scoreEl) this.scoreEl.textContent = "0";
    if (this.timerEl) this.timerEl.textContent = this.timeLeft;

    if (this.startScreen) this.startScreen.classList.remove("active");
    if (this.gameOverScreen) this.gameOverScreen.classList.remove("active");
    if (this.shopScreen) this.shopScreen.classList.remove("active");
    if (this.gameUI) this.gameUI.classList.add("active");

    this.currentScreen = "game";
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();

    this.startTimer();
    requestAnimationFrame(this.gameLoop);
  }

  applyHookImprovements() {
    this.activeImprovements.forEach((imp) => {
      if (imp.effect) imp.effect(this.hook);

      switch (imp.id) {
        case "magnet_fish":
          this.hook.hasMagnet = true;
          break;
        case "trash_filter":
          this.hook.hasTrashFilter = true;
          break;
        case "double_points":
          this.hook.doublePoints = true;
          break;
      }
    });
  }

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      if (this.isRunning && !this.isPaused) {
        this.timeLeft--;
        if (this.timerEl) {
          this.timerEl.textContent = this.timeLeft;
          this.timerEl.style.color =
            this.timeLeft <= 10 ? "#ff0000" : "#ff6b6b";
        }

        if (this.timeLeft <= 0) this.gameOver();
      }
    }, 1000);
  }

  handleInput() {
    if (!this.hook.caughtFish && !this.hook.caughtTrash) {
      this.hook.state = "descending";
    } else {
      this.hook.state = "ascending";
    }
  }

  gameOver() {
    this.isRunning = false;
    clearInterval(this.timerInterval);

    const isNewRecord = this.score > this.highScore;
    if (isNewRecord) {
      this.highScore = this.score;
      localStorage.setItem("fishingHighScore", this.highScore);
      if (this.highScoreEl) this.highScoreEl.textContent = this.highScore;
    }

    localStorage.setItem("fishingCoins", this.coins);

    if (this.finalScoreEl) this.finalScoreEl.textContent = this.score;
    if (this.newRecordEl)
      this.newRecordEl.style.display = isNewRecord ? "block" : "none";

    const finalCoinsEl = document.getElementById("finalCoins");
    if (finalCoinsEl) finalCoinsEl.textContent = this.coins;

    if (this.gameUI) this.gameUI.classList.remove("active");
    if (this.gameOverScreen) this.gameOverScreen.classList.add("active");
    this.currentScreen = "gameOver";
  }

  gameLoop(currentTime) {
    if (!this.isRunning) return;

    const deltaTime = (currentTime - this.lastTime) / 16.67;
    this.lastTime = currentTime;

    if (!this.isPaused) {
      this.update(deltaTime);
    }
    this.render();

    requestAnimationFrame(this.gameLoop);
  }

  update(deltaTime) {
    this.frameCount++;

    this.player.update(deltaTime);
    this.hook.update(deltaTime, this.canvas.height);

    if (this.hook.state === "idle" && this.hook.caughtFish) {
      let points = this.hook.caughtFish.points;
      if (this.hook.doublePoints) points *= 2;

      this.score += points;
      if (this.scoreEl) this.scoreEl.textContent = this.score;

      const coinsEarned = Math.floor(points / 10);
      if (coinsEarned > 0) {
        this.coins += coinsEarned;
        localStorage.setItem("fishingCoins", this.coins);
      }

      this.createCatchParticles(this.hook.caughtFish);
      this.hook.caughtFish = null;
    }

    if (this.hook.state === "idle" && this.hook.caughtTrash) {
      this.score += this.hook.caughtTrash.points;
      if (this.scoreEl) this.scoreEl.textContent = this.score;
      this.hook.caughtTrash = null;
    }

    if (
      this.frameCount % GAME_CONFIG.FISH_SPAWN_RATE === 0 &&
      this.fishes.length < GAME_CONFIG.MAX_FISH
    ) {
      this.spawnFish();
    }

    this.fishes.forEach((fish) => fish.update(deltaTime));
    this.fishes = this.fishes.filter(
      (fish) => fish.x > -100 && fish.x < this.canvas.width + 100,
    );

    if (this.hook.state !== "idle") {
      this.checkCollisions();
    }

    this.particles.forEach((p) => p.update(deltaTime));
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  spawnFish() {
    let rand = Math.random();
    let type;

    const goldenBait = this.improvements.find(
      (imp) => imp.id === "golden_bait" && imp.active,
    );

    if (goldenBait) {
      if (rand < 0.45) type = FISH_TYPES.SMALL;
      else if (rand < 0.75) type = FISH_TYPES.MEDIUM;
      else if (rand < 0.9) type = FISH_TYPES.LARGE;
      else type = FISH_TYPES.GOLD;
    } else {
      if (rand < 0.5) type = FISH_TYPES.SMALL;
      else if (rand < 0.8) type = FISH_TYPES.MEDIUM;
      else if (rand < 0.95) type = FISH_TYPES.LARGE;
      else type = FISH_TYPES.GOLD;
    }

    const trashChance = this.hook && this.hook.hasTrashFilter ? 0.05 : 0.15;

    if (Math.random() < trashChance) {
      const trashType =
        TRASH_TYPES[Math.floor(Math.random() * TRASH_TYPES.length)];
      this.fishes.push(
        new Fish(
          -50,
          GAME_CONFIG.WATER_SURFACE +
            50 +
            Math.random() *
              (this.canvas.height - GAME_CONFIG.WATER_SURFACE - 100),
          trashType,
          true,
        ),
      );
    } else {
      this.fishes.push(
        new Fish(
          Math.random() < 0.5 ? -50 : this.canvas.width + 50,
          GAME_CONFIG.WATER_SURFACE +
            50 +
            Math.random() *
              (this.canvas.height - GAME_CONFIG.WATER_SURFACE - 100),
          type,
          false,
        ),
      );
    }
  }

  checkCollisions() {
    for (let fish of this.fishes) {
      if (this.hook.checkCollision(fish)) {
        if (fish.isTrash && this.hook.hasTrashFilter) {
          this.fishes = this.fishes.filter((f) => f !== fish);
          continue;
        }

        if (fish.isTrash) {
          this.hook.caughtTrash = fish.type;
        } else {
          this.hook.caughtFish = fish.type;
        }

        this.fishes = this.fishes.filter((f) => f !== fish);
        this.hook.state = "ascending";
        break;
      }
    }
  }

  createCatchParticles(fishType) {
    for (let i = 0; i < 10; i++) {
      this.particles.push(
        new Particle(this.hook.x, this.hook.y, fishType.color),
      );
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawWater();
    this.drawDeepWater();
    this.renderBottomDecorations();
    this.drawBubbles();
    this.fishes.forEach((fish) => fish.render(ctx));
    this.player.render(ctx);
    this.hook.render(ctx);
    this.particles.forEach((p) => p.render(ctx));

    if (this.hook.hasMagnet && this.hook.state !== "idle") {
      this.drawMagnetEffect();
    }
  }

  drawWater() {
    const ctx = this.ctx;

    const gradient = ctx.createLinearGradient(
      0,
      GAME_CONFIG.WATER_SURFACE,
      0,
      GAME_CONFIG.DEEP_WATER_START,
    );
    gradient.addColorStop(0, "rgba(74, 144, 164, 0.8)");
    gradient.addColorStop(0.4, "rgba(45, 106, 122, 0.9)");
    gradient.addColorStop(0.8, "rgba(26, 74, 90, 1)");
    gradient.addColorStop(1, "rgba(13, 45, 58, 1)");

    ctx.fillStyle = gradient;
    ctx.fillRect(
      0,
      GAME_CONFIG.WATER_SURFACE,
      this.canvas.width,
      GAME_CONFIG.DEEP_WATER_START - GAME_CONFIG.WATER_SURFACE,
    );

    ctx.beginPath();
    ctx.moveTo(0, GAME_CONFIG.WATER_SURFACE);

    for (let x = 0; x <= this.canvas.width; x += 15) {
      const wave1 = Math.sin((x + this.frameCount * 3) * 0.015) * 4;
      const wave2 = Math.sin((x * 0.8 + this.frameCount * 2) * 0.02) * 3;
      ctx.lineTo(x, GAME_CONFIG.WATER_SURFACE + wave1 + wave2);
    }

    ctx.lineTo(this.canvas.width, GAME_CONFIG.WATER_SURFACE - 12);
    ctx.lineTo(0, GAME_CONFIG.WATER_SURFACE - 12);
    ctx.closePath();

    const surfaceGradient = ctx.createLinearGradient(
      0,
      GAME_CONFIG.WATER_SURFACE - 12,
      0,
      GAME_CONFIG.WATER_SURFACE + 15,
    );
    surfaceGradient.addColorStop(0, "rgba(135, 206, 235, 0.95)");
    surfaceGradient.addColorStop(0.5, "rgba(100, 180, 220, 0.8)");
    surfaceGradient.addColorStop(1, "rgba(74, 144, 164, 0.6)");
    ctx.fillStyle = surfaceGradient;
    ctx.fill();
  }

  drawDeepWater() {
    const ctx = this.ctx;

    const gradient = ctx.createLinearGradient(
      0,
      GAME_CONFIG.DEEP_WATER_START,
      0,
      GAME_CONFIG.DEEP_WATER_END,
    );
    gradient.addColorStop(0, "rgba(13, 45, 58, 0.8)");
    gradient.addColorStop(0.5, "rgba(8, 30, 40, 0.9)");
    gradient.addColorStop(1, "rgba(5, 20, 30, 1)");

    ctx.fillStyle = gradient;
    ctx.fillRect(
      0,
      GAME_CONFIG.DEEP_WATER_START,
      this.canvas.width,
      GAME_CONFIG.DEEP_WATER_END - GAME_CONFIG.DEEP_WATER_START,
    );
  }

  renderBottomDecorations() {
    const ctx = this.ctx;
    const time = this.frameCount * 0.02;

    this.bottomDecorations.forEach((deco) => {
      ctx.save();

      switch (deco.type) {
        case "plant":
          ctx.translate(deco.x, deco.y);
          ctx.rotate(Math.sin(time + deco.sway) * 0.1);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -deco.height);
          ctx.strokeStyle = "#2e8b57";
          ctx.lineWidth = deco.width;
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(0, -deco.height * 0.3, 8, 4, 0, 0, Math.PI * 2);
          ctx.ellipse(0, -deco.height * 0.6, 6, 3, 0.5, 0, Math.PI * 2);
          ctx.fillStyle = "#3cb371";
          ctx.fill();
          break;

        case "rock":
          ctx.beginPath();
          ctx.ellipse(
            deco.x,
            deco.y,
            deco.size,
            deco.size * 0.6,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = "#696969";
          ctx.fill();
          ctx.strokeStyle = "#505050";
          ctx.lineWidth = 2;
          ctx.stroke();
          break;

        case "algae":
          ctx.save();
          ctx.translate(deco.x, deco.y);
          ctx.rotate(Math.sin(time + deco.sway) * 0.15);
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const offset = (i - 2) * 5;
            ctx.moveTo(offset, 0);
            ctx.quadraticCurveTo(
              offset + Math.sin(time + i) * 10,
              -deco.length * 0.3,
              offset,
              -deco.length,
            );
          }
          ctx.strokeStyle = "rgba(46, 139, 87, 0.7)";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
          break;
      }

      ctx.restore();
    });

    ctx.beginPath();
    ctx.moveTo(0, GAME_CONFIG.DEEP_WATER_END);

    for (let x = 0; x <= this.canvas.width; x += 30) {
      const sandY = GAME_CONFIG.DEEP_WATER_END + Math.sin(x * 0.05 + time) * 8;
      ctx.lineTo(x, sandY);
    }

    ctx.lineTo(this.canvas.width, GAME_CONFIG.DEEP_WATER_END + 20);
    ctx.lineTo(0, GAME_CONFIG.DEEP_WATER_END + 20);
    ctx.closePath();

    const sandGradient = ctx.createLinearGradient(
      0,
      GAME_CONFIG.DEEP_WATER_END,
      0,
      GAME_CONFIG.DEEP_WATER_END + 20,
    );
    sandGradient.addColorStop(0, "#b8860b");
    sandGradient.addColorStop(1, "#8b6914");
    ctx.fillStyle = sandGradient;
    ctx.fill();
  }

  drawBubbles() {
    const ctx = this.ctx;
    const time = this.frameCount * 0.02;

    for (let i = 0; i < 10; i++) {
      const speed = 0.3 + Math.sin(i) * 0.2;
      const x = ((time * 20 * speed + i * 70) % (this.canvas.width + 150)) - 75;
      const depth = GAME_CONFIG.WATER_SURFACE + 30 + (i % 4) * 50;
      const y =
        depth +
        Math.sin(time * 0.5 + i) * 20 +
        Math.cos(time * 0.3 + i * 0.7) * 15;
      const size = 2 + Math.sin(time + i) * 1.5;

      const alpha =
        0.15 +
        0.3 *
          (1 -
            (y - GAME_CONFIG.WATER_SURFACE) /
              (GAME_CONFIG.DEEP_WATER_END - GAME_CONFIG.WATER_SURFACE));

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha + 0.1})`;
      ctx.fill();
    }
  }

  drawMagnetEffect() {
    const ctx = this.ctx;
    const pulse = Math.sin(this.frameCount * 0.1) * 0.2 + 0.8;

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(
      this.hook.x,
      this.hook.y,
      this.hook.magnetRadius * pulse,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "#87ceeb";
    ctx.fill();
    ctx.restore();
  }
}

// ==========================================
// КЛАСС ИГРОКА (ЛОДКА)
// ==========================================
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 80;
    this.height = 40;
    this.targetX = x;
  }

  update(deltaTime) {
    const diff = this.targetX - this.x;
    this.x += diff * 0.1 * deltaTime;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.beginPath();
    ctx.moveTo(-40, 0);
    ctx.quadraticCurveTo(-50, 20, -30, 30);
    ctx.lineTo(30, 30);
    ctx.quadraticCurveTo(50, 20, 40, 0);
    ctx.closePath();

    const boatGradient = ctx.createLinearGradient(0, 0, 0, 30);
    boatGradient.addColorStop(0, "#8b4513");
    boatGradient.addColorStop(1, "#5d3a1a");
    ctx.fillStyle = boatGradient;
    ctx.fill();
    ctx.strokeStyle = "#3d2510";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-38, 5);
    ctx.lineTo(38, 5);
    ctx.strokeStyle = "#a0522d";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(20, -10);
    ctx.quadraticCurveTo(40, -30, 30, -50);
    ctx.strokeStyle = "#4a4a4a";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -5, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#ffdbac";
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, -15, 10, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd700";
    ctx.fill();

    ctx.restore();
  }
}

// ==========================================
// КЛАСС КРЮЧКА
// ==========================================
class Hook {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.startY = y;
    this.state = "idle";
    this.caughtFish = null;
    this.caughtTrash = null;
    this.swayAngle = 0;

    this.baseSpeedDown = GAME_CONFIG.HOOK_SPEED_DOWN;
    this.baseSpeedUp = GAME_CONFIG.HOOK_SPEED_UP;
    this.weightFactor = GAME_CONFIG.HOOK_WEIGHT_FACTOR;

    this.hasMagnet = false;
    this.magnetRadius = 80;
    this.hasTrashFilter = false;
    this.doublePoints = false;
  }

  update(deltaTime, canvasHeight) {
    this.swayAngle += 0.1 * deltaTime;

    let speedModifier = 1;
    if (this.caughtFish) {
      speedModifier = 1 / (1 + this.caughtFish.weight * this.weightFactor);
    } else if (this.caughtTrash) {
      speedModifier = 1 / (1 + this.caughtTrash.weight * this.weightFactor);
    }

    switch (this.state) {
      case "descending":
        this.y += this.baseSpeedDown * deltaTime;
        if (this.y >= canvasHeight - 20) {
          this.state = "ascending";
        }
        break;

      case "ascending":
        const currentSpeed = this.baseSpeedUp * speedModifier * deltaTime;
        this.y -= currentSpeed;
        if (this.y <= this.startY) {
          this.y = this.startY;
          this.state = "idle";
        }
        break;
    }

    if (game.player) {
      game.player.targetX = this.x;
    }

    if (this.hasMagnet && this.state !== "idle") {
      this.applyMagnetEffect();
    }
  }

  applyMagnetEffect() {
    game.fishes.forEach((fish) => {
      if (fish.isTrash) return;

      const dx = this.x - fish.x;
      const dy = this.y - fish.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.magnetRadius) {
        const pullStrength =
          ((this.magnetRadius - distance) / this.magnetRadius) * 0.1;
        fish.x += dx * pullStrength;
        fish.y += dy * pullStrength;
      }
    });
  }

  checkCollision(fish) {
    const dx = this.x - fish.x;
    const dy = this.y - fish.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < fish.type.width / 2 + 10;
  }

  render(ctx) {
    ctx.save();

    const swayX = Math.sin(this.swayAngle) * 5;

    ctx.beginPath();
    ctx.moveTo(game.player.x + 30, game.player.y - 50);
    ctx.lineTo(this.x + swayX, this.y);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.translate(this.x + swayX, this.y);
    ctx.rotate(Math.sin(this.swayAngle) * 0.2);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 15);
    ctx.quadraticCurveTo(0, 25, 10, 20);
    ctx.quadraticCurveTo(15, 18, 10, 15);
    ctx.strokeStyle = "#c0c0c0";
    ctx.lineWidth = 3;
    ctx.stroke();

    if (this.caughtFish || this.caughtTrash) {
      const caught = this.caughtFish || this.caughtTrash;

      ctx.font = "24px Arial";
      ctx.textAlign = "center";
      ctx.fillText(caught.emoji, 0, -15);

      ctx.beginPath();
      ctx.moveTo(5, 20);
      ctx.lineTo(0, -5);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ==========================================
// КЛАСС РЫБЫ
// ==========================================
class Fish {
  constructor(x, y, type, isTrash = false) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.isTrash = isTrash;

    this.direction = x < 0 ? 1 : -1;
    this.speed = type.speed * (0.8 + Math.random() * 0.4);

    this.animOffset = Math.random() * Math.PI * 2;
    this.wobble = 0;
  }

  update(deltaTime) {
    this.x += this.speed * this.direction * deltaTime;
    this.wobble += 0.15 * deltaTime;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.direction < 0) {
      ctx.scale(-1, 1);
    }

    const wobbleY = Math.sin(this.wobble + this.animOffset) * 3;
    ctx.translate(0, wobbleY);

    ctx.font = `${this.type.width * 0.8}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.type.emoji, 0, 0);

    if (this.isTrash) {
      ctx.globalAlpha = 0.8;
    }

    ctx.restore();
  }
}

// ==========================================
// КЛАСС ЧАСТИЦ
// ==========================================
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.5) * 8 - 3;
    this.life = 1;
    this.decay = 0.02 + Math.random() * 0.02;
    this.size = 3 + Math.random() * 4;
  }

  update(deltaTime) {
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.vy += 0.2 * deltaTime;
    this.life -= this.decay * deltaTime;
  }

  render(ctx) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ==========================================
// ЗАПУСК ИГРЫ
// ==========================================
const game = new Game();
