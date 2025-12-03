/* ------------------------------
   Hololive Tier Maker - script.js (診断機能付き)
   ------------------------------ */

document.addEventListener("DOMContentLoaded", () => {
  const MAX_INDEX = 63;
  const ORIGINAL_IMAGES = [];
  
  // ---------------------------------------------------------
  // ⚠️ 診断: ここで画像の場所を指定しています
  // GitHubのファイル一覧で「images」フォルダがあるならこのままでOK
  // 画像がindex.htmlの隣にあるなら "images/" を消してください
  // ---------------------------------------------------------
  const IMAGE_DIR = "images/"; 

  for (let i = 0; i <= MAX_INDEX; i++) {
    const fileName = String(i); 
    ORIGINAL_IMAGES.push(`${IMAGE_DIR}${fileName}.png`);
  }

  // --- (ここから下は変更なしですが、診断機能を追加しています) ---

  const TIER_INITIAL_LIMITS = { S: 1, A: 2, B: 3, C: 4, D: 5 };
  const INITIAL_CATEGORIES = { JP: true, ID: true, EN: true, DEV_IS: true };

  const IMAGE_RANGES = {
    JP: [[0, 29], [63, 63]],
    ID: [[30, 38]],
    EN: [[39, 53]],
    DEV_IS: [[54, 62]]
  };

  const THEME_CANDIDATES = [
    "一緒に朝まで語り明かしたいホロメン Tier", "才能の塊だと思うホロメン Tier"
    // ... (省略) ...
  ];

  let images = [...ORIGINAL_IMAGES];
  let intervalId = null;
  let currentImageSrc = null;
  const RANDOM_DURATION = 4000;
  let stopTimeoutId = null;
  let isRunning = false;
  let draggedImageUrl = null;
  let currentTierLimits = {...TIER_INITIAL_LIMITS}; 
  let currentCategories = {...INITIAL_CATEGORIES};

  const startScreen = document.getElementById("start-screen");
  const mainScreen = document.getElementById("main-screen");
  const startBtn = document.getElementById("start-btn");
  const themeInput = document.getElementById("theme-input");
  const themeDisplay = document.getElementById("theme-display");
  const randomImage = document.getElementById("random-image");
  const dragOverlay = document.getElementById("drag-overlay");
  const overlay = document.getElementById("overlay");
  const completionActions = document.getElementById("completion-actions");
  const randomArea = document.getElementById("random-area");
  const viewBtn = document.getElementById("view-btn");
  const saveBtn = document.getElementById("save-btn");
  const tweetBtn = document.getElementById("tweet-btn");
  const mainRestartBtn = document.getElementById("main-restart-btn");
  const updateThemeBtn = document.getElementById("update-theme-btn");
  const tierCaptureArea = document.getElementById("tier-capture-area");
  const settingsBtn = document.getElementById("settings-btn");
  const settingsOverlay = document.getElementById("settings-overlay");
  const saveSettingsBtn = document.getElementById("save-settings-btn");
  const cancelSettingsBtn = document.getElementById("cancel-settings-btn");
  const categorySelection = document.getElementById("image-category-selection"); 
  const tierLimitControls = document.getElementById("tier-limit-controls"); 

  // 🚨 診断機能: 画像読み込みエラーを検知してアラートを出す
  randomImage.onerror = function() {
      // 最初の1回だけアラートを出す
      if (this.dataset.hasError) return;
      this.dataset.hasError = "true";
      alert(`【エラー診断】\n画像が見つかりません。\n\n探している場所: ${this.src}\n\nGitHubのファイル一覧にこのパスが存在するか確認してください。\n(大文字小文字も区別されます)`);
      clearInterval(intervalId); // ループ停止
  };

  // ... (以下、元のロジック) ...

  function syncSettingsToUI() {
      categorySelection.querySelectorAll('input[name="category"]').forEach(checkbox => {
          checkbox.checked = currentCategories[checkbox.value] || false;
      });
      tierLimitControls.querySelectorAll('input[type="number"]').forEach(input => {
          input.value = currentTierLimits[input.dataset.tier] || 0;
      });
  }

  function readSettingsFromUI() {
      const newLimits = {};
      const newCategories = {};
      let totalLimit = 0;
      tierLimitControls.querySelectorAll('input[type="number"]').forEach(input => {
          const value = Math.max(0, parseInt(input.value) || 0);
          const tier = input.dataset.tier;
          newLimits[tier] = value;
          totalLimit += value;
      });
      newLimits.total = totalLimit;
      categorySelection.querySelectorAll('input[name="category"]').forEach(checkbox => {
          newCategories[checkbox.value] = checkbox.checked;
      });
      return { limits: newLimits, categories: newCategories };
  }

  function setRandomThemePlaceholder() {
    // 簡易版
    if(THEME_CANDIDATES.length > 0) {
        const randomTheme = THEME_CANDIDATES[Math.floor(Math.random() * THEME_CANDIDATES.length)];
        themeInput.placeholder = `例：${randomTheme}`;
    }
  }
  setRandomThemePlaceholder();

  updateThemeBtn.addEventListener("click", () => {
    themeInput.value = "";
    setRandomThemePlaceholder();
  });

  settingsBtn.addEventListener("click", () => {
      syncSettingsToUI(); 
      settingsOverlay.classList.remove("hidden-overlay");
      settingsOverlay.style.display = "flex";
  });

  saveSettingsBtn.addEventListener("click", () => {
      const { limits, categories } = readSettingsFromUI();
      const imagePool = getSelectedImagePool(categories);
      const imageCount = imagePool.length;

      if (imageCount === 0) {
          alert("選択された画像カテゴリに対応する画像がありません。選択を変更してください。");
          return;
      }
      if (imageCount < limits.total) {
          alert(`画像数がTier枠の合計数（${limits.total}枠）を下回っています（${imageCount}枚）。Tier枠数を減らして再試行してください。`);
          return;
      }
      currentTierLimits = limits;
      currentCategories = categories;
      settingsOverlay.style.display = "none";
      settingsOverlay.classList.add("hidden-overlay");
  });

  cancelSettingsBtn.addEventListener("click", () => {
      settingsOverlay.style.display = "none";
      settingsOverlay.classList.add("hidden-overlay");
  });

  function getSelectedImagePool(categories) {
    const categoriesToUse = categories || currentCategories;
    let selectedImages = [];
    const isAnySelected = Object.values(categoriesToUse).some(v => v);

    if (isAnySelected) {
      Object.keys(categoriesToUse).forEach(category => {
          if (categoriesToUse[category]) {
              const ranges = IMAGE_RANGES[category];
              ranges.forEach(range => {
                for (let i = range[0]; i <= range[1]; i++) {
                  const fileName = String(i); 
                  selectedImages.push(`${IMAGE_DIR}${fileName}.png`);
                }
              });
          }
      });
      return [...new Set(selectedImages)];
    } else {
      return ORIGINAL_IMAGES; 
    }
  }

  function createPlaceholders() {
    const tierRows = document.querySelectorAll(".tier-row");
    tierRows.forEach(row => {
      const slot = row.querySelector(".slot");
      const tier = row.dataset.tier;
      const max = currentTierLimits[tier] || 0; 
      
      slot.innerHTML = "";
      for (let i = 0; i < max; i++) {
        const ph = document.createElement("div");
        ph.className = "placeholder empty";
        ph.dataset.filled = "false";
        ph.addEventListener("dragover", e => { 
            e.preventDefault(); 
            ph.classList.add("drag-over"); 
        });
        ph.addEventListener("dragleave", e => { 
            ph.classList.remove("drag-over"); 
        });
        ph.addEventListener("drop", e => {
          e.preventDefault();
          ph.classList.remove("drag-over");
          if (draggedImageUrl) {
              placeIntoPlaceholder(ph, draggedImageUrl);
          }
        });
        slot.appendChild(ph);
      }
    });
  }

  startBtn.addEventListener("click", () => {
    let theme = themeInput.value.trim();
    if (!theme) {
      const placeholderText = themeInput.placeholder;
      theme = placeholderText.replace("例：", "").trim();
    }
    themeDisplay.textContent = `${theme}`; 

    images = getSelectedImagePool(currentCategories);
    const imageCount = images.length;
    const totalTierLimit = currentTierLimits.total;

    if (imageCount === 0 || imageCount < totalTierLimit) {
        alert(`現在の設定では、画像数（${imageCount}枚）がTier枠（${totalTierLimit}枠）に足りません。設定ボタンから画像カテゴリまたは枠数を変更してください。`);
        settingsBtn.click();
        return; 
    }

    startScreen.classList.add("hidden");
    mainScreen.classList.remove("hidden");
    startBtn.style.display = "none";

    createPlaceholders();
    randomArea.classList.remove("hidden"); 
    startRandomCycle();
  });

  function startRandomCycle() {
    if (isRunning) return;
    if (images.length === 0) {
      randomImage.src = "";
      randomArea.classList.add("hidden"); 
      return;
    }

    isRunning = true;
    dragOverlay.draggable = false; 

    intervalId = setInterval(() => {
      const idx = Math.floor(Math.random() * images.length);
      currentImageSrc = images[idx];
      randomImage.src = currentImageSrc;
    }, 50);

    stopTimeoutId = setTimeout(() => {
      stopRandomCycle();
    }, RANDOM_DURATION);
  }

  function stopRandomCycle() {
    if (!isRunning) return;
    isRunning = false;
    clearInterval(intervalId);
    intervalId = null;
    clearTimeout(stopTimeoutId);
    stopTimeoutId = null;

    dragOverlay.draggable = true;
    dragOverlay.classList.add('draggable-active');
    dragOverlay.addEventListener("dragstart", dragStartHandler);
  }

  function dragStartHandler(e) {
    if (!currentImageSrc) {
      e.preventDefault();
      return;
    }
    draggedImageUrl = currentImageSrc;
    e.dataTransfer.setData("text/plain", currentImageSrc);
    try {
      e.dataTransfer.setDragImage(randomImage, 40, 40); 
    } catch (err) { /* ignore */ }
  }
  
  function placeIntoPlaceholder(ph, src) {
    if (ph.dataset.filled === "true") return;
    
    const newImg = document.createElement("img");
    newImg.src = src;
    newImg.draggable = false; 
    ph.innerHTML = "";
    ph.appendChild(newImg);
    ph.dataset.filled = "true";
    ph.classList.remove("empty");

    removeImageFromPool(src);

    draggedImageUrl = null;
    dragOverlay.removeEventListener("dragstart", dragStartHandler);
    dragOverlay.draggable = false;
    dragOverlay.classList.remove('draggable-active');

    if (!checkAllFilled()) {
      setTimeout(() => {
        startRandomCycle();
      }, 300);
    } else {
      showCompletePopup();
    }
  }

  function removeImageFromPool(src) {
    images = images.filter(s => s !== src);
    if (images.length === 0) {
      clearInterval(intervalId);
      clearTimeout(stopTimeoutId);
      isRunning = false;
      
      dragOverlay.draggable = false;
      dragOverlay.removeEventListener("dragstart", dragStartHandler);
      randomImage.src = "";
      randomArea.classList.add("hidden"); 
    } else {
      currentImageSrc = null;
    }
  }

  function checkAllFilled() {
    const placeholders = document.querySelectorAll(".tier-row .placeholder"); 
    for (const ph of placeholders) {
      if (ph.dataset.filled !== "true") return false;
    }
    return true;
  }

  function showCompletePopup() {
    overlay.classList.remove("hidden-overlay");
    overlay.style.display = "flex";
    completionActions.classList.add("hidden"); 
  }

  viewBtn.addEventListener("click", () => {
    overlay.style.display = "none";
    overlay.classList.add("hidden-overlay");
    completionActions.classList.remove("hidden");
  });

  mainRestartBtn.addEventListener("click", () => {
    resetApp();
  });

  saveBtn.addEventListener("click", () => {
    if (typeof html2canvas === 'undefined') {
      alert("画像保存機能が読み込まれていません。");
      return;
    }
    
    const wasRandomAreaHidden = randomArea.classList.contains("hidden");
    randomArea.classList.add("hidden");
    completionActions.classList.add("hidden");
    
    html2canvas(tierCaptureArea, { 
      scale: 2 
    }).then(canvas => {
      const imageURL = canvas.toDataURL("image/png");
      const a = document.createElement('a');
      a.href = imageURL;
      a.download = 'Tier表_' + new Date().toISOString().slice(0, 10) + '.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      if (!wasRandomAreaHidden) randomArea.classList.remove("hidden");
      completionActions.classList.remove("hidden");
    }).catch(error => {
        console.error("html2canvas error:", error);
        alert("画像の保存に失敗しました。");
        if (!wasRandomAreaHidden) randomArea.classList.remove("hidden");
        completionActions.classList.remove("hidden");
    });
  });

  tweetBtn.addEventListener("click", () => {
    const theme = themeInput.value.trim() || themeInput.placeholder.replace("例：", "").trim();
    const text = encodeURIComponent(`今回のTier表が完成しました！\n【お題】${theme}\n#ランダムTierメーカー #Tier表`);
    const tweetUrl = `https://twitter.com/intent/tweet?text=${text}`;
    window.open(tweetUrl, '_blank');
  });

  function resetApp() {
    clearInterval(intervalId);
    clearTimeout(stopTimeoutId);
    intervalId = null;
    stopTimeoutId = null;
    isRunning = false;

    images = [...ORIGINAL_IMAGES]; 
    currentTierLimits = {...TIER_INITIAL_LIMITS};
    currentCategories = {...INITIAL_CATEGORIES};
    currentImageSrc = null;
    draggedImageUrl = null;

    randomImage.src = "";
    dragOverlay.draggable = false;
    dragOverlay.removeEventListener("dragstart", dragStartHandler);
    dragOverlay.classList.remove('draggable-active');

    startScreen.classList.remove("hidden");
    mainScreen.classList.add("hidden");
    startBtn.style.display = "";
    themeInput.value = "";
    themeDisplay.textContent = "Tier表"; 
    setRandomThemePlaceholder();

    overlay.style.display = "none";
    completionActions.classList.add("hidden");
    settingsOverlay.style.display = "none";
    randomArea.classList.remove("hidden");

    syncSettingsToUI();
  }

  resetApp(); 

  window.addEventListener("beforeunload", () => {
    clearInterval(intervalId);
    clearTimeout(stopTimeoutId);
  });
});