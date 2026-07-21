(function () {
  const SEGMENT_COUNT = 12;
  const TWO_PI = Math.PI * 2;
  const PALETTE = [
    "#2a1636",
    "#3a1a49",
    "#4a1d5d",
    "#5e226d",
    "#74297d",
    "#8f3092",
    "#ac39a7",
    "#c644b6",
    "#e455c4",
    "#f06ac8",
    "#ff7fd1",
    "#ff98db"
  ];

  const FOOD_POOL = {
    breakfast: [
      "🥟 小笼包",
      "🥠 生煎包",
      "🥞 杂粮煎饼",
      "🫓 手抓饼",
      "🥚 鸡蛋灌饼",
      "🍵 豆浆油条",
      "🥣 皮蛋瘦肉粥",
      "🍜 热干面",
      "🍜 牛肉粉",
      "🍞 花生酱吐司",
      "🥐 可颂火腿",
      "🧇 华夫饼",
      "🍳 番茄蛋面",
      "🥔 土豆饼",
      "🍠 烤红薯",
      "🍙 紫菜饭团",
      "🍚 三明治饭团",
      "🥛 牛奶麦片",
      "🥗 酸奶水果杯",
      "🥟 虾饺皇",
      "🍌 香蕉燕麦杯",
      "🥯 贝果鸡蛋",
      "🧀 芝士吐司",
      "🍠 南瓜小米粥"
    ],
    lunch: [
      "🍱 咖喱鸡饭",
      "🍛 卤肉饭",
      "🍚 鱼香肉丝饭",
      "🍜 兰州拉面",
      "🍜 重庆小面",
      "🥘 黄焖鸡",
      "🍲 麻辣烫",
      "🍢 关东煮",
      "🍔 芝士汉堡",
      "🌮 墨西哥卷",
      "🥪 金枪鱼三明治",
      "🍣 三文鱼寿司",
      "🍤 虾仁炒饭",
      "🍝 番茄意面",
      "🍕 玛格丽特披萨",
      "🍗 炸鸡饭",
      "🥩 黑椒牛柳饭",
      "🐟 酸菜鱼",
      "🧆 肉夹馍",
      "🥟 韭菜饺子",
      "🍛 咖喱牛腩",
      "🥗 鸡胸沙拉",
      "🍚 石锅拌饭",
      "🍖 烤肉拌饭",
      "🍲 冬阴功面",
      "🥮 锅贴套餐"
    ],
    dinner: [
      "🍲 番茄肥牛锅",
      "🍲 麻辣香锅",
      "🫕 寿喜锅",
      "🍜 豚骨拉面",
      "🍜 砂锅米线",
      "🍝 海鲜意面",
      "🥩 牛排土豆泥",
      "🍗 烤鸡腿饭",
      "🍖 蒜香排骨饭",
      "🥘 水煮鱼",
      "🐟 清蒸鲈鱼饭",
      "🥟 玉米虾饺",
      "🍚 扬州炒饭",
      "🍛 黄咖喱海鲜饭",
      "🥔 孜然牛肉土豆",
      "🍤 蒜蓉粉丝虾",
      "🥗 轻食沙拉碗",
      "🍣 炙烤寿司拼",
      "🍢 关东煮拼盘",
      "🍲 菌菇鸡汤面",
      "🥓 培根蘑菇意面",
      "🌯 鸡肉卷",
      "🍚 地三鲜盖饭",
      "🥘 番茄牛腩煲",
      "🍖 孜然羊肉饭"
    ]
  };

  function initFoodWheels() {
    const cards = Array.from(document.querySelectorAll(".meal-wheel-card[data-meal]"));
    cards.forEach((card) => {
      if (card.dataset.ready === "1") return;
      const mealKey = card.getAttribute("data-meal");
      if (!FOOD_POOL[mealKey]) return;
      createWheel(card, mealKey);
      card.dataset.ready = "1";
    });
  }

  function createWheel(card, mealKey) {
    const canvas = card.querySelector(".meal-wheel-canvas");
    const spinBtn = card.querySelector(".spin-btn");
    const refillBtn = card.querySelector(".refill-btn");
    const resultEl = card.querySelector(".meal-result");
    const optionsEl = card.querySelector(".meal-options");

    if (!canvas || !spinBtn || !refillBtn || !resultEl || !optionsEl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = {
      angle: 0,
      spinning: false,
      lastWinnerIndex: -1,
      options: pickRandomItems(FOOD_POOL[mealKey], SEGMENT_COUNT)
    };

    renderOptionTags(optionsEl, state.options);
    drawWheel(ctx, canvas, state);

    spinBtn.addEventListener("click", function () {
      if (state.spinning) return;
      runSpinAnimation(ctx, canvas, state, function (winner) {
        resultEl.textContent = "抽到啦：" + winner;
        spinBtn.disabled = false;
      });
      spinBtn.disabled = true;
      resultEl.textContent = "转盘转动中...";
    });

    refillBtn.addEventListener("click", function () {
      if (state.spinning) return;
      state.options = pickRandomItems(FOOD_POOL[mealKey], SEGMENT_COUNT);
      resultEl.textContent = "菜单已更新，准备开转";
      renderOptionTags(optionsEl, state.options);
      drawWheel(ctx, canvas, state);
    });
  }

  function runSpinAnimation(ctx, canvas, state, onDone) {
    state.spinning = true;
    const arc = TWO_PI / state.options.length;
    const targetIndex = randomWinnerIndex(state.options.length, state.lastWinnerIndex);
    const centerOffset = (targetIndex + 0.5) * arc;
    const baseFinal = -Math.PI / 2 - centerOffset;
    const turns = 5 + Math.floor(Math.random() * 3);
    const currentAngle = state.angle;
    const n = Math.ceil((currentAngle - baseFinal) / TWO_PI) + turns;
    const finalAngle = baseFinal + n * TWO_PI;
    const startAngle = currentAngle;
    const duration = 3400;
    const startTime = performance.now();

    function step(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      state.angle = startAngle + (finalAngle - startAngle) * eased;
      drawWheel(ctx, canvas, state);

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        state.spinning = false;
        state.angle = normalizeAngle(state.angle);
        state.lastWinnerIndex = targetIndex;
        onDone(state.options[targetIndex]);
      }
    }

    requestAnimationFrame(step);
  }

  function drawWheel(ctx, canvas, state) {
    const size = canvas.width;
    const center = size / 2;
    const radius = size * 0.46;
    const arc = TWO_PI / state.options.length;

    ctx.clearRect(0, 0, size, size);

    for (let i = 0; i < state.options.length; i += 1) {
      const start = state.angle + i * arc;
      const end = start + arc;
      const color = PALETTE[i % PALETTE.length];

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, start, end, false);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255, 208, 234, 0.18)";
      ctx.stroke();

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(start + arc / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffe8f4";
      ctx.font = "600 19px 'Segoe UI Emoji', 'PingFang SC', 'Microsoft YaHei', sans-serif";
      ctx.fillText(state.options[i], radius - 14, 0);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(center, center, radius + 2, 0, TWO_PI, false);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(255, 165, 219, 0.72)";
    ctx.stroke();

    const grad = ctx.createRadialGradient(center, center, 18, center, center, radius * 0.3);
    grad.addColorStop(0, "rgba(255, 96, 177, 0.96)");
    grad.addColorStop(1, "rgba(255, 58, 149, 0.88)");
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.12, 0, TWO_PI, false);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  function renderOptionTags(container, options) {
    container.innerHTML = "";
    options.forEach(function (item) {
      const tag = document.createElement("span");
      tag.textContent = item;
      container.appendChild(tag);
    });
  }

  function pickRandomItems(source, count) {
    const arr = source.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = randomInt(i + 1);
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr.slice(0, Math.min(count, arr.length));
  }

  function normalizeAngle(rad) {
    let a = rad % TWO_PI;
    if (a < 0) a += TWO_PI;
    return a;
  }

  function randomWinnerIndex(total, lastIndex) {
    if (total <= 1) return 0;
    let idx = randomInt(total);
    if (idx === lastIndex) idx = (idx + 1 + randomInt(total - 1)) % total;
    return idx;
  }

  function randomInt(maxExclusive) {
    if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) return 0;
    const max = Math.floor(maxExclusive);
    if (max <= 1) return 0;

    if (window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      const limit = Math.floor(0xffffffff / max) * max;
      let x = 0;
      do {
        window.crypto.getRandomValues(arr);
        x = arr[0];
      } while (x >= limit);
      return x % max;
    }

    return Math.floor(Math.random() * max);
  }

  document.addEventListener("DOMContentLoaded", initFoodWheels);
  document.addEventListener("pjax:complete", initFoodWheels);
})();
