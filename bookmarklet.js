(() => {
  "use strict";

  if (window.__skylineRunning) {
    window.__skylineClose?.();
    return;
  }

  window.__skylineRunning = true;

  const DATA_URL =
    "https://cdn.jsdelivr.net/gh/NankaOfficial/SkyLine@main/bookmarklet.json";

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  let audioContext = null;
  let soundEnabled = true;

  function initAudio() {
    if (!audioContext) {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioContext = new AudioContextClass();
    }

    if (audioContext?.state === "suspended") {
      audioContext.resume();
    }
  }

  function tone(frequency, duration, volume = 0.045, type = "sine", delay = 0) {
    if (!soundEnabled || !audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const start = audioContext.currentTime + delay;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  const sounds = {
    open() {
      tone(110, .35, .05, "sine");
      tone(220, .4, .035, "triangle", .08);
      tone(440, .3, .025, "sine", .18);
    },
    close() {
      tone(440, .22, .035, "sine");
      tone(220, .28, .04, "triangle", .1);
      tone(90, .38, .05, "sine", .2);
    },
    click() {
      tone(650, .07, .025, "sine");
      tone(900, .06, .018, "sine", .035);
    },
    minimize() {
      tone(500, .16, .035, "triangle");
      tone(260, .2, .035, "sine", .1);
    },
    restore() {
      tone(260, .16, .035, "sine");
      tone(500, .2, .035, "triangle", .1);
    },
    loaded() {
      tone(440, .12, .035, "sine");
      tone(660, .15, .035, "sine", .12);
      tone(880, .25, .035, "sine", .24);
    },
    error() {
      tone(180, .25, .04, "square");
      tone(130, .3, .04, "square", .16);
    }
  };

  const style = document.createElement("style");
  style.id = "skyline-styles";

  style.textContent = `
    #skyline-backdrop {
      position:fixed;
      inset:0;
      z-index:2147483644;
      background:rgba(0,0,0,.38);
      backdrop-filter:blur(9px);
      -webkit-backdrop-filter:blur(9px);
      opacity:0;
      transition:opacity .55s ease;
    }

    #skyline-backdrop.active { opacity:1; }

    #skyline-menu {
      position:fixed;
      z-index:2147483646;
      top:50%;
      left:50%;
      width:760px;
      height:570px;
      max-width:calc(100vw - 24px);
      max-height:calc(100vh - 24px);
      display:flex;
      overflow:hidden;
      color:#fff;
      background:#090909;
      border:1px solid #353535;
      border-radius:17px;
      box-shadow:0 25px 100px #000c,0 0 50px #fff08;
      font-family:Arial,sans-serif;
      transform:translate(-50%,-50%) scale(.015);
      opacity:0;
      clip-path:circle(0% at 50% 50%);
      transition:
        transform .7s cubic-bezier(.16,1,.3,1),
        opacity .5s ease,
        clip-path .7s cubic-bezier(.16,1,.3,1);
    }

    #skyline-menu.open {
      transform:translate(-50%,-50%) scale(1);
      opacity:1;
      clip-path:circle(100% at 50% 50%);
    }

    #skyline-menu.closing {
      transform:translate(-50%,-50%) scale(.015);
      opacity:0;
      clip-path:circle(0% at 50% 50%);
      pointer-events:none;
    }

    #skyline-menu * { box-sizing:border-box; }

    #skyline-sidebar {
      width:205px;
      flex-shrink:0;
      display:flex;
      flex-direction:column;
      background:#0d0d0d;
      border-right:1px solid #292929;
    }

    #skyline-brand {
      padding:24px 20px;
      font-size:24px;
      font-weight:900;
      letter-spacing:2px;
      border-bottom:1px solid #292929;
    }

    #skyline-brand span {
      display:inline-block;
      margin-right:8px;
      color:#aaa;
    }

    #skyline-navigation {
      flex:1;
      overflow-y:auto;
      padding:14px 10px;
    }

    .skyline-nav-label {
      padding:12px 10px 7px;
      color:#666;
      font-size:9px;
      font-weight:bold;
      letter-spacing:1.5px;
      text-transform:uppercase;
    }

    .skyline-nav {
      display:flex;
      align-items:center;
      gap:11px;
      width:100%;
      padding:11px 12px;
      margin:3px 0;
      border:1px solid transparent;
      border-radius:8px;
      background:transparent;
      color:#aaa;
      text-align:left;
      font-size:12px;
      cursor:pointer;
      transition:.18s;
    }

    .skyline-nav:hover {
      color:white;
      background:#1b1b1b;
    }

    .skyline-nav.active {
      color:white;
      background:#202020;
      border-color:#444;
    }

    .skyline-nav-icon {
      width:17px;
      text-align:center;
      font-size:14px;
    }

    #skyline-sidebar-bottom {
      padding:12px;
      border-top:1px solid #292929;
    }

    #skyline-main {
      flex:1;
      min-width:0;
      display:flex;
      flex-direction:column;
      background:#090909;
    }

    #skyline-header {
      height:65px;
      flex-shrink:0;
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding:0 20px;
      border-bottom:1px solid #292929;
      cursor:grab;
      user-select:none;
    }

    #skyline-header:active { cursor:grabbing; }

    #skyline-heading {
      font-size:16px;
      font-weight:bold;
    }

    #skyline-header-controls {
      display:flex;
      gap:7px;
    }

    .skyline-window-button {
      width:31px;
      height:31px;
      color:#ddd;
      background:#171717;
      border:1px solid #373737;
      border-radius:7px;
      cursor:pointer;
    }

    .skyline-window-button:hover { background:#303030; }

    #skyline-search-wrap {
      padding:16px 19px 10px;
    }

    #skyline-search {
      width:100%;
      padding:12px 14px;
      color:white;
      background:#121212;
      border:1px solid #353535;
      border-radius:9px;
      outline:none;
      font-size:12px;
    }

    #skyline-search:focus { border-color:#888; }

    #skyline-toolbar {
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:0 20px 13px;
      color:#777;
      font-size:10px;
    }

    #skyline-items {
      flex:1;
      overflow-y:auto;
      padding:0 19px 20px;
      scrollbar-color:#444 transparent;
    }

    #skyline-grid {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
    }

    .skyline-item {
      min-width:0;
      padding:15px;
      text-align:left;
      color:white;
      background:#111;
      border:1px solid #292929;
      border-radius:10px;
      cursor:pointer;
      transition:background .16s,border-color .16s,transform .16s;
    }

    .skyline-item:hover {
      background:#1c1c1c;
      border-color:#666;
      transform:translateY(-2px);
    }

    .skyline-item:active { transform:scale(.98); }

    .skyline-item-name {
      margin-bottom:7px;
      font-size:12px;
      font-weight:bold;
    }

    .skyline-item-description {
      color:#888;
      font-size:10px;
      line-height:1.5;
    }

    .skyline-item-category {
      display:inline-block;
      margin-top:10px;
      padding:4px 7px;
      color:#aaa;
      background:#202020;
      border-radius:4px;
      font-size:9px;
    }

    #skyline-footer {
      display:flex;
      justify-content:space-between;
      padding:11px 19px;
      border-top:1px solid #292929;
      color:#777;
      font-size:10px;
    }

    #skyline-loading {
      position:absolute;
      inset:0;
      z-index:5;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      background:#080808;
      transition:opacity .35s ease;
    }

    #skyline-loading.hidden {
      opacity:0;
      pointer-events:none;
    }

    .skyline-loader {
      position:relative;
      width:100px;
      height:100px;
      margin-bottom:25px;
    }

    .skyline-loader-ring {
      position:absolute;
      inset:4px;
      border:2px solid #292929;
      border-top-color:white;
      border-radius:50%;
      animation:skyline-spin .9s linear infinite;
    }

    .skyline-loader-ring.second {
      inset:15px;
      border:1px dashed #777;
      border-bottom-color:white;
      animation:skyline-spin 2s linear infinite reverse;
    }

    .skyline-loader-star {
      position:absolute;
      inset:0;
      display:grid;
      place-items:center;
      color:white;
      font-size:36px;
      animation:skyline-pulse 1.2s ease-in-out infinite;
    }

    .skyline-particle {
      position:absolute;
      width:5px;
      height:5px;
      background:white;
      border-radius:50%;
      box-shadow:0 0 12px white;
      animation:skyline-orbit 2s linear infinite;
    }

    @keyframes skyline-spin {
      to { transform:rotate(360deg); }
    }

    @keyframes skyline-pulse {
      0%,100% { transform:scale(.8);opacity:.6; }
      50% { transform:scale(1.15);opacity:1; }
    }

    @keyframes skyline-orbit {
      from { transform:rotate(0deg) translateX(52px) rotate(0deg); }
      to { transform:rotate(360deg) translateX(52px) rotate(-360deg); }
    }

    #skyline-loading-title {
      font-size:18px;
      font-weight:900;
      letter-spacing:4px;
    }

    #skyline-loading-message {
      margin-top:10px;
      color:#777;
      font-size:11px;
    }

    #skyline-progress {
      width:190px;
      height:3px;
      margin-top:22px;
      overflow:hidden;
      background:#252525;
      border-radius:5px;
    }

    #skyline-progress-bar {
      width:0%;
      height:100%;
      background:white;
      box-shadow:0 0 12px white;
      transition:width .25s ease;
    }

    #skyline-star {
      position:fixed;
      z-index:2147483647;
      left:20px;
      bottom:20px;
      width:49px;
      height:49px;
      display:none;
      align-items:center;
      justify-content:center;
      border:1px solid #666;
      border-radius:50%;
      background:#090909;
      color:white;
      box-shadow:0 0 25px #000;
      font-size:25px;
      cursor:pointer;
      touch-action:none;
    }

    #skyline-star:hover { background:#292929; }

    #skyline-menu button:focus-visible,
    #skyline-star:focus-visible {
      outline:2px solid white;
      outline-offset:3px;
    }

    @media(max-width:600px) {
      #skyline-menu { width:calc(100vw - 16px);height:80vh; }
      #skyline-sidebar { width:145px; }
      #skyline-brand { font-size:18px;padding:20px 12px; }
      #skyline-grid { grid-template-columns:1fr; }
      #skyline-header { padding:0 12px; }
    }
  `;

  document.head.appendChild(style);

  const make = (tag, props = {}, parent) => {
    const element = document.createElement(tag);
    Object.assign(element, props);
    if (parent) parent.appendChild(element);
    return element;
  };

  const backdrop = make("div", { id: "skyline-backdrop" }, document.body);
  const menu = make("div", { id: "skyline-menu" }, document.body);

  const sidebar = make("aside", { id: "skyline-sidebar" }, menu);
  const brand = make("div", { id: "skyline-brand" }, sidebar);
  brand.innerHTML = "<span>✦</span>Skyline";

  const navigation = make("div", {
    id: "skyline-navigation"
  }, sidebar);

  const sidebarBottom = make("div", {
    id: "skyline-sidebar-bottom"
  }, sidebar);

  const main = make("main", { id: "skyline-main" }, menu);
  const header = make("header", { id: "skyline-header" }, main);

  const heading = make("div", {
    id: "skyline-heading",
    textContent: "All Tools"
  }, header);

  const controls = make("div", {
    id: "skyline-header-controls"
  }, header);

  const minimize = make("button", {
    className: "skyline-window-button",
    textContent: "—",
    title: "Minimize"
  }, controls);

  const close = make("button", {
    className: "skyline-window-button",
    textContent: "×",
    title: "Close"
  }, controls);

  const searchWrap = make("div", {
    id: "skyline-search-wrap"
  }, main);

  const search = make("input", {
    id: "skyline-search",
    placeholder: "⌕   Search tools...",
    type: "text"
  }, searchWrap);

  const toolbar = make("div", {
    id: "skyline-toolbar"
  }, main);

  const count = make("span", {
    textContent: "Loading tools..."
  }, toolbar);

  const categoryLabel = make("span", {
    textContent: "SKYLINE UTILITY"
  }, toolbar);

  const itemArea = make("div", {
    id: "skyline-items"
  }, main);

  const grid = make("div", {
    id: "skyline-grid"
  }, itemArea);

  const footer = make("div", {
    id: "skyline-footer"
  }, main);

  const status = make("span", {
    textContent: "Initializing..."
  }, footer);

  const version = make("span", {
    textContent: "SKYLINE"
  }, footer);

  const loading = make("div", {
    id: "skyline-loading"
  }, menu);

  const loader = make("div", {
    className: "skyline-loader"
  }, loading);

  make("div", { className: "skyline-loader-ring" }, loader);
  make("div", { className: "skyline-loader-ring second" }, loader);
  make("div", {
    className: "skyline-loader-star",
    textContent: "✦"
  }, loader);

  for (let i = 0; i < 6; i++) {
    const particle = make("div", {
      className: "skyline-particle"
    }, loader);
    particle.style.animationDelay = `${i * -.33}s`;
  }

  const loadingTitle = make("div", {
    id: "skyline-loading-title",
    textContent: "SKYLINE"
  }, loading);

  const loadingMessage = make("div", {
    id: "skyline-loading-message",
    textContent: "Connecting to Skyline..."
  }, loading);

  const progress = make("div", {
    id: "skyline-progress"
  }, loading);

  const progressBar = make("div", {
    id: "skyline-progress-bar"
  }, progress);

  const star = make("button", {
    id: "skyline-star",
    textContent: "✦",
    title: "Restore Skyline"
  }, document.body);

  let allActions = [];
  let activeCategory = "All";
  let closed = false;

  function setProgress(value, message) {
    progressBar.style.width = value + "%";
    if (message) loadingMessage.textContent = message;
  }

  function closeMenu() {
    if (closed) return;
    closed = true;

    sounds.close();
    menu.classList.remove("open");
    menu.classList.add("closing");
    backdrop.classList.remove("active");

    setTimeout(() => {
      backdrop.remove();
      menu.remove();
      star.remove();
      style.remove();
      window.__skylineRunning = false;
    }, 750);
  }

  window.__skylineClose = closeMenu;

  function minimizeMenu() {
    sounds.minimize();
    menu.classList.remove("open");
    menu.classList.add("closing");
    backdrop.classList.remove("active");

    setTimeout(() => {
      menu.style.display = "none";
      backdrop.style.display = "none";
      star.style.display = "flex";
    }, 700);
  }

  function restoreMenu() {
    initAudio();
    sounds.restore();

    star.style.display = "none";
    menu.style.display = "flex";
    backdrop.style.display = "block";

    requestAnimationFrame(() => {
      backdrop.classList.add("active");
      menu.classList.remove("closing");
      menu.classList.add("open");
    });
  }

  close.addEventListener("click", closeMenu);
  minimize.addEventListener("click", minimizeMenu);
  star.addEventListener("click", restoreMenu);

  document.addEventListener("pointerdown", initAudio, { once: true });

  function animateOpen() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        menu.classList.add("open");
        backdrop.classList.add("active");
        sounds.open();
      });
    });
  }

  // Dragging the window
  let dragging = false;
  let dragX = 0;
  let dragY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  header.addEventListener("pointerdown", event => {
    if (event.target.closest("button")) return;

    dragging = true;
    dragX = event.clientX;
    dragY = event.clientY;

    const rect = menu.getBoundingClientRect();
    initialLeft = rect.left + rect.width / 2;
    initialTop = rect.top + rect.height / 2;

    menu.style.transition = "none";
    header.setPointerCapture(event.pointerId);
  });

  header.addEventListener("pointermove", event => {
    if (!dragging) return;

    menu.style.left =
      initialLeft + event.clientX - dragX + "px";
    menu.style.top =
      initialTop + event.clientY - dragY + "px";
  });

  header.addEventListener("pointerup", () => {
    dragging = false;
    menu.style.transition = "";
  });

  // Draggable minimized star
  let starDragging = false;
  let starMoved = false;
  let starX = 0;
  let starY = 0;
  let starLeft = 20;
  let starBottom = 20;

  star.addEventListener("pointerdown", event => {
    starDragging = true;
    starMoved = false;
    starX = event.clientX;
    starY = event.clientY;

    const rect = star.getBoundingClientRect();
    starLeft = rect.left;
    starBottom = window.innerHeight - rect.bottom;

    star.setPointerCapture(event.pointerId);
  });

  star.addEventListener("pointermove", event => {
    if (!starDragging) return;

    const dx = event.clientX - starX;
    const dy = event.clientY - starY;

    if (Math.abs(dx) + Math.abs(dy) > 5) starMoved = true;

    star.style.left =
      Math.max(0, Math.min(innerWidth - 49, starLeft + dx)) + "px";

    star.style.bottom =
      Math.max(0, Math.min(innerHeight - 49, starBottom - dy)) + "px";
  });

  star.addEventListener("pointerup", () => {
    starDragging = false;
    if (!starMoved) restoreMenu();
  });

  const categories = [
    { name: "All", icon: "✦" },
    { name: "Editing", icon: "✎" },
    { name: "Page Tools", icon: "▤" },
    { name: "Appearance", icon: "◐" },
    { name: "Developer", icon: "⌘" },
    { name: "Utilities", icon: "⚙" }
  ];

  function renderNavigation() {
    navigation.innerHTML = "";

    const label = make("div", {
      className: "skyline-nav-label",
      textContent: "WORKSPACE"
    }, navigation);

    categories.forEach(category => {
      const button = make("button", {
        className: "skyline-nav" +
          (category.name === activeCategory ? " active" : "")
      }, navigation);

      make("span", {
        className: "skyline-nav-icon",
        textContent: category.icon
      }, button);

      make("span", {
        textContent: category.name
      }, button);

      button.addEventListener("click", () => {
        initAudio();
        sounds.click();
        activeCategory = category.name;
        heading.textContent = category.name;
        renderNavigation();
        renderItems();
      });
    });

    const settingsLabel = make("div", {
      className: "skyline-nav-label",
      textContent: "PREFERENCES"
    }, navigation);

    const soundButton = make("button", {
      className: "skyline-nav"
    }, sidebarBottom);

    soundButton.innerHTML =
      `<span class="skyline-nav-icon">${soundEnabled ? "♫" : "♪"}</span>` +
      `<span>Sounds: ${soundEnabled ? "On" : "Off"}</span>`;

    soundButton.addEventListener("click", () => {
      initAudio();
      soundEnabled = !soundEnabled;
      if (soundEnabled) sounds.click();
      renderNavigation();
    });
  }

  function renderItems() {
    grid.innerHTML = "";

    const query = search.value.trim().toLowerCase();

    const filtered = allActions.filter(action => {
      const category = action.category || "Utilities";
      const matchesCategory =
        activeCategory === "All" || category === activeCategory;

      const matchesQuery =
        (action.name || "").toLowerCase().includes(query) ||
        (action.description || "").toLowerCase().includes(query) ||
        category.toLowerCase().includes(query);

      return matchesCategory && matchesQuery;
    });

    count.textContent = `${filtered.length} TOOLS`;

    if (!filtered.length) {
      make("div", {
        textContent: "No tools found.",
        style: "padding:35px;color:#777;text-align:center;font-size:12px"
      }, grid);
      return;
    }

    filtered.forEach(action => {
      const card = make("button", {
        className: "skyline-item"
      }, grid);

      make("div", {
        className: "skyline-item-name",
        textContent: action.name || "Unnamed Tool"
      }, card);

      make("div", {
        className: "skyline-item-description",
        textContent: action.description || "Skyline utility"
      }, card);

      make("span", {
        className: "skyline-item-category",
        textContent: action.category || "Utilities"
      }, card);

      card.addEventListener("click", () => {
        initAudio();
        sounds.click();

        try {
          runAction(action);
          status.textContent = "Selected: " + action.name;
        } catch (error) {
          console.error("[Skyline]", error);
          status.textContent = "Action error: " + error.message;
          sounds.error();
        }
      });
    });
  }

  search.addEventListener("input", renderItems);

  function copyText(value) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(
        () => status.textContent = "Copied!",
        () => fallbackCopy(value)
      );
    } else {
      fallbackCopy(value);
    }
  }

  function fallbackCopy(value) {
    const input = make("textarea", {}, document.body);
    input.value = value;
    input.style.position = "fixed";
    input.style.opacity = "0";
    input.select();

    try {
      document.execCommand("copy");
      status.textContent = "Copied!";
    } catch {
      status.textContent = "Copy failed.";
    }

    input.remove();
  }

  function runAction(action) {
    const id = action.action;

    switch (id) {
      case "edit-page":
        document.designMode =
          document.designMode === "on" ? "off" : "on";
        break;

      case "word-count":
        alert("Words: " +
          (document.body.innerText.match(/\S+/g) || []).length);
        break;

      case "sentence-count":
        alert("Sentences: " +
          (document.body.innerText.match(/[.!?]+/g) || []).length);
        break;

      case "uppercase":
      case "lowercase":
      case "titlecase": {
        const selected = getSelection().toString();
        if (!selected) {
          alert("Select text first.");
          break;
        }

        const transformed = id === "uppercase"
          ? selected.toUpperCase()
          : id === "lowercase"
            ? selected.toLowerCase()
            : selected.replace(/\b\w/g, c => c.toUpperCase());

        copyText(transformed);
        break;
      }

      case "find-highlight": {
        const term = prompt("Find text:");
        if (!term) break;

        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT
        );

        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);

        nodes.forEach(node => {
          if (!node.nodeValue.toLowerCase().includes(term.toLowerCase())) return;
          if (node.parentElement.closest("script,style,#skyline-menu")) return;

          const replacement = document.createElement("span");
          replacement.innerHTML = node.nodeValue.replace(
            new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
            match => `<mark style="background:yellow;color:black">${match}</mark>`
          );

          node.parentNode.replaceChild(replacement, node);
        });
        break;
      }

      case "replace-text": {
        const oldText = prompt("Find:");
        if (!oldText) break;
        const newText = prompt("Replace with:");
        if (newText === null) break;

        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT
        );

        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);

        nodes.forEach(node => {
          if (node.parentElement.closest("script,style,#skyline-menu")) return;
          node.nodeValue = node.nodeValue.split(oldText).join(newText);
        });
        break;
      }

      case "remove-formatting":
        document.querySelectorAll("body *").forEach(el => {
          if (el.closest("#skyline-menu")) return;
          el.style.fontWeight = "normal";
          el.style.fontStyle = "normal";
          el.style.textDecoration = "none";
        });
        break;

      case "copy-page-text":
        copyText(document.body.innerText);
        break;

      case "reading-mode":
        document.body.style.cssText +=
          ";max-width:850px;margin:40px auto;padding:25px;background:white;color:black;font:18px/1.8 Georgia,serif";
        break;

      case "focus-mode":
        document.querySelectorAll("body > *").forEach(el => {
          if (!el.matches("#skyline-menu,#skyline-backdrop,#skyline-star")) {
            el.style.opacity = ".15";
          }
        });
        break;

      case "hide-images":
        document.querySelectorAll("img,video").forEach(el => {
          el.dataset.skylineHidden = "true";
          el.style.display = "none";
        });
        break;

      case "restore-images":
        document.querySelectorAll('[data-skyline-hidden="true"]').forEach(el => {
          el.style.display = "";
          delete el.dataset.skylineHidden;
        });
        break;

      case "highlight-links":
        document.querySelectorAll("a").forEach(el => {
          el.style.background = "yellow";
          el.style.color = "black";
        });
        break;

      case "new-tab-links":
        document.querySelectorAll("a").forEach(el => {
          el.target = "_blank";
          el.rel = "noopener noreferrer";
        });
        break;

      case "page-ruler":
        toggleRuler();
        break;

      case "disable-animations":
        toggleStyle("skyline-no-animation",
          "*,*::before,*::after{animation:none!important;transition:none!important}");
        break;

      case "page-outline":
        alert([...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]
          .map(el => el.tagName + ": " + el.innerText).join("\n"));
        break;

      case "heading-navigator": {
        const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")];
        const choice = prompt(headings.map((h,i) =>
          `${i + 1}. ${h.innerText}`).join("\n") + "\nEnter number:");
        headings[Number(choice) - 1]?.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
        break;
      }

      case "page-info":
        alert(
          "Title: " + document.title +
          "\nURL: " + location.href +
          "\nSize: " + document.documentElement.scrollWidth +
          " × " + document.documentElement.scrollHeight
        );
        break;

      case "count-links":
        alert("Links: " + document.querySelectorAll("a").length);
        break;

      case "count-images":
        alert("Images: " + document.images.length);
        break;

      case "list-links":
        alert([...document.querySelectorAll("a")]
          .map(a => a.href).join("\n"));
        break;

      case "list-alt":
        alert([...document.images]
          .map(img => img.alt || "(No alt text) " + img.src).join("\n"));
        break;

      case "inspect-element":
      case "highlight-element":
      case "copy-element-html":
        selectElement(id);
        break;

      case "meta-tags":
        alert([...document.querySelectorAll("meta")]
          .map(m => m.outerHTML).join("\n"));
        break;

      case "grayscale":
        setFilter("grayscale(1)");
        break;

      case "invert":
        setFilter("invert(1)");
        break;

      case "dim-page":
        setFilter("brightness(.5)");
        break;

      case "reset-effects":
        document.getElementById("skyline-page-filter")?.remove();
        document.body.style.zoom = "";
        document.body.style.filter = "";
        document.querySelectorAll('[data-skyline-hidden="true"]').forEach(el => {
          el.style.display = "";
          delete el.dataset.skylineHidden;
        });
        document.querySelectorAll("#skyline-no-animation").forEach(el => el.remove());
        break;

      case "zoom-in":
        changeZoom(.1);
        break;

      case "zoom-out":
        changeZoom(-.1);
        break;

      case "zoom-reset":
        document.body.style.zoom = "1";
        break;

      case "format-json": {
        const value = prompt("Paste JSON:");
        if (value === null) break;
        try { alert(JSON.stringify(JSON.parse(value), null, 2)); }
        catch { alert("Invalid JSON."); }
        break;
      }

      case "url-encode": {
        const value = prompt("Text:");
        if (value !== null) alert(encodeURIComponent(value));
        break;
      }

      case "url-decode": {
        const value = prompt("Encoded text:");
        if (value !== null) {
          try { alert(decodeURIComponent(value)); }
          catch { alert("Invalid URL encoding."); }
        }
        break;
      }

      case "base64-encode": {
        const value = prompt("Text:");
        if (value !== null) alert(btoa(unescape(encodeURIComponent(value))));
        break;
      }

      case "base64-decode": {
        const value = prompt("Base64:");
        if (value !== null) {
          try { alert(decodeURIComponent(escape(atob(value)))); }
          catch { alert("Invalid Base64."); }
        }
        break;
      }

      case "calculator": {
        const value = prompt("Calculation:");
        if (value === null) break;
        if (!/^[0-9+\-*/().% \t]+$/.test(value)) {
          alert("Only basic math is supported.");
          break;
        }
        try {
          alert("Result: " + Function('"use strict";return (' + value + ")")());
        } catch {
          alert("Invalid calculation.");
        }
        break;
      }

      case "quick-notes": {
        const note = prompt("Write a note:");
        if (note !== null) copyText(note);
        break;
      }

      case "pick-color": {
        const input = make("input", {
          type: "color",
          style: "position:fixed;left:-100px"
        }, document.body);

        input.addEventListener("input", () => copyText(input.value));
        input.click();
        setTimeout(() => input.remove(), 60000);
        break;
      }

      case "copy-url":
        copyText(location.href);
        break;

      case "copy-title":
        copyText(document.title);
        break;

      case "scroll-top":
        window.scrollTo({ top: 0, behavior: "smooth" });
        break;

      case "scroll-bottom":
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: "smooth"
        });
        break;

      case "print-page":
        window.print();
        break;

      case "select-all-text":
        document.execCommand("selectAll");
        break;

      default:
        alert("Unknown action: " + id);
    }
  }

  function toggleStyle(id, css) {
    const old = document.getElementById(id);
    if (old) {
      old.remove();
      return;
    }

    make("style", { id, textContent: css }, document.head);
  }

  function setFilter(filter) {
    let element = document.getElementById("skyline-page-filter");

    if (!element) {
      element = make("style", {
        id: "skyline-page-filter"
      }, document.head);
    }

    element.textContent = `html{filter:${filter}!important}`;
  }

  function changeZoom(amount) {
    const current = parseFloat(document.body.style.zoom) || 1;
    document.body.style.zoom =
      Math.max(.3, Math.min(2, current + amount));
  }

  function toggleRuler() {
    const old = document.getElementById("skyline-ruler");
    if (old) {
      old.remove();
      return;
    }

    make("div", {
      id: "skyline-ruler",
      style: "position:fixed;left:0;right:0;top:50%;height:1px;background:red;z-index:2147483645;pointer-events:none"
    }, document.body);
  }

  function selectElement(action) {
    status.textContent = "Click an element on the page.";

    const listener = event => {
      if (event.target.closest("#skyline-menu,#skyline-backdrop,#skyline-star")) return;

      event.preventDefault();
      event.stopPropagation();
      document.removeEventListener("click", listener, true);
      document.body.style.cursor = "";

      const element = event.target;

      if (action === "inspect-element") {
        alert(
          "Tag: " + element.tagName +
          "\nID: " + element.id +
          "\nClass: " + element.className +
          "\nText: " + (element.innerText || "").slice(0, 300)
        );
      }

      if (action === "highlight-element") {
        element.style.outline = "3px solid red";
      }

      if (action === "copy-element-html") {
        copyText(element.outerHTML);
      }

      status.textContent = "Ready.";
    };

    document.body.style.cursor = "crosshair";
    document.addEventListener("click", listener, true);
  }

  async function loadActions() {
    try {
      setProgress(15, "Connecting to Skyline...");
      await wait(200);

      setProgress(35, "Fetching your tools...");
      const response = await fetch(DATA_URL + "?v=" + Date.now(), {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      setProgress(65, "Reading tool database...");
      const data = await response.json();

      allActions = Array.isArray(data) ? data : data.actions;

      if (!Array.isArray(allActions)) {
        throw new Error("Invalid JSON format. Expected an actions array.");
      }

      setProgress(85, "Building Skyline...");
      renderNavigation();
      renderItems();

      await wait(250);
      setProgress(100, "Ready!");

      count.textContent = allActions.length + " TOOLS";
      status.textContent = allActions.length + " tools loaded.";

      sounds.loaded();

      await wait(350);
      loading.classList.add("hidden");

      setTimeout(() => loading.remove(), 400);
    } catch (error) {
      console.error("[Skyline] Loading error:", error);

      loadingTitle.textContent = "LOAD FAILED";
      loadingMessage.textContent = error.message;
      setProgress(100, "Unable to load tools.");

      sounds.error();

      count.textContent = "LOAD ERROR";
      status.textContent = "Could not load bookmarklet.json.";

      await wait(1500);
      loading.classList.add("hidden");
      setTimeout(() => loading.remove(), 400);
    }
  }

  animateOpen();
  loadActions();

  console.log("[Skyline] Initialized.");
})();
