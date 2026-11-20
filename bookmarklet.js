(() => {
  "use strict";

  if (window.__skylineRunning) {
    document.getElementById("skyline-menu")?.remove();
    document.getElementById("skyline-star")?.remove();
    document.getElementById("skyline-styles")?.remove();
    window.__skylineRunning = false;
    return;
  }

  window.__skylineRunning = true;

  const DATA_URL =
    "https://cdn.jsdelivr.net/gh/NankaOfficial/SkyLine@main/bookmarklet.json";

  const $ = (tag, props = {}, parent = document.body) => {
    const el = document.createElement(tag);
    Object.assign(el, props);
    parent.appendChild(el);
    return el;
  };

  const style = $( "style", { id: "skyline-styles" });
  style.textContent = `
    #skyline-menu, #skyline-star {
      font-family: Arial, sans-serif;
      color: white;
      box-sizing: border-box;
    }

    #skyline-menu *, #skyline-star * {
      box-sizing: border-box;
    }

    #skyline-menu {
      position: fixed;
      z-index: 2147483646;
      top: 50%;
      left: 50%;
      width: 390px;
      max-width: calc(100vw - 24px);
      max-height: min(620px, calc(100vh - 24px));
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: rgba(8, 8, 8, .96);
      border: 1px solid #383838;
      border-radius: 16px;
      box-shadow: 0 15px 70px #000b;
      backdrop-filter: blur(22px);
      -webkit-backdrop-filter: blur(22px);
      transform: translate(-50%, -50%) scale(.01);
      opacity: 0;
      clip-path: circle(0% at 50% 50%);
      transition:
        transform .55s cubic-bezier(.16,1,.3,1),
        opacity .35s ease,
        clip-path .55s cubic-bezier(.16,1,.3,1);
    }

    #skyline-menu.skyline-open {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
      clip-path: circle(100% at 50% 50%);
    }

    #skyline-menu.skyline-close {
      transform: translate(-50%, -50%) scale(.01);
      opacity: 0;
      clip-path: circle(0% at 50% 50%);
      pointer-events: none;
    }

    #skyline-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 15px 17px;
      border-bottom: 1px solid #292929;
      cursor: grab;
      user-select: none;
    }

    #skyline-header:active { cursor: grabbing; }

    #skyline-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 1px;
    }

    .skyline-controls {
      display: flex;
      gap: 7px;
    }

    .skyline-control {
      width: 29px;
      height: 29px;
      border: 1px solid #444;
      border-radius: 8px;
      background: #171717;
      color: white;
      cursor: pointer;
      font-size: 15px;
    }

    .skyline-control:hover {
      background: #333;
    }

    #skyline-search {
      margin: 13px 14px 8px;
      padding: 11px 12px;
      border: 1px solid #383838;
      border-radius: 9px;
      outline: none;
      background: #141414;
      color: white;
      font-size: 13px;
    }

    #skyline-search:focus {
      border-color: #888;
    }

    #skyline-categories {
      display: flex;
      gap: 7px;
      padding: 3px 14px 12px;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .skyline-category {
      flex-shrink: 0;
      padding: 7px 11px;
      border: 1px solid #383838;
      border-radius: 20px;
      background: #151515;
      color: #bbb;
      cursor: pointer;
      font-size: 11px;
    }

    .skyline-category.active {
      background: white;
      color: black;
      border-color: white;
    }

    #skyline-items {
      padding: 0 12px 14px;
      overflow-y: auto;
      min-height: 100px;
    }

    .skyline-item {
      display: flex;
      flex-direction: column;
      gap: 5px;
      width: 100%;
      padding: 12px;
      margin-bottom: 7px;
      text-align: left;
      border: 1px solid #292929;
      border-radius: 10px;
      background: #111;
      color: white;
      cursor: pointer;
    }

    .skyline-item:hover {
      background: #202020;
      border-color: #666;
    }

    .skyline-item-name {
      font-size: 13px;
      font-weight: bold;
    }

    .skyline-item-description {
      color: #999;
      font-size: 11px;
      line-height: 1.4;
    }

    #skyline-status {
      padding: 9px 14px;
      border-top: 1px solid #292929;
      color: #888;
      font-size: 10px;
    }

    #skyline-star {
      position: fixed;
      z-index: 2147483647;
      left: 18px;
      bottom: 18px;
      width: 48px;
      height: 48px;
      display: none;
      align-items: center;
      justify-content: center;
      border: 1px solid #555;
      border-radius: 50%;
      background: #080808;
      box-shadow: 0 5px 25px #0009;
      color: white;
      font-size: 25px;
      cursor: pointer;
      user-select: none;
    }

    #skyline-star:hover {
      background: #292929;
    }

    #skyline-menu button:focus-visible,
    #skyline-star:focus-visible {
      outline: 2px solid white;
      outline-offset: 2px;
    }
  `;

  const menu = $("div", { id: "skyline-menu" });
  const header = $("div", { id: "skyline-header" }, menu);
  $("div", { id: "skyline-title", textContent: "Skyline" }, header);

  const controls = $("div", { className: "skyline-controls" }, header);

  const minimizeButton = $("button", {
    className: "skyline-control",
    textContent: "—",
    title: "Minimize"
  }, controls);

  const closeButton = $("button", {
    className: "skyline-control",
    textContent: "×",
    title: "Close"
  }, controls);

  const search = $("input", {
    id: "skyline-search",
    placeholder: "Search actions...",
    type: "text"
  }, menu);

  const categories = $("div", {
    id: "skyline-categories"
  }, menu);

  const items = $("div", {
    id: "skyline-items"
  }, menu);

  const status = $("div", {
    id: "skyline-status",
    textContent: "Loading actions..."
  }, menu);

  const star = $("button", {
    id: "skyline-star",
    textContent: "★",
    title: "Open Skyline"
  });

  function closeMenu() {
    menu.classList.remove("skyline-open");
    menu.classList.add("skyline-close");

    setTimeout(() => {
      menu.remove();
      star.remove();
      style.remove();
      window.__skylineRunning = false;
    }, 600);
  }

  function minimizeMenu() {
    menu.classList.remove("skyline-open");
    menu.classList.add("skyline-close");

    setTimeout(() => {
      menu.style.display = "none";
      star.style.display = "flex";
    }, 550);
  }

  function restoreMenu() {
    star.style.display = "none";
    menu.style.display = "flex";
    menu.classList.remove("skyline-close");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        menu.classList.add("skyline-open");
      });
    });
  }

  closeButton.addEventListener("click", closeMenu);
  minimizeButton.addEventListener("click", minimizeMenu);
  star.addEventListener("click", restoreMenu);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => menu.classList.add("skyline-open"));
  });

  // Dragging the menu
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let menuX = 0;
  let menuY = 0;

  header.addEventListener("pointerdown", event => {
    if (event.target.closest("button")) return;

    dragging = true;
    startX = event.clientX;
    startY = event.clientY;

    const rect = menu.getBoundingClientRect();
    menuX = rect.left + rect.width / 2;
    menuY = rect.top + rect.height / 2;

    menu.style.transition = "none";
    header.setPointerCapture(event.pointerId);
  });

  header.addEventListener("pointermove", event => {
    if (!dragging) return;

    const x = menuX + event.clientX - startX;
    const y = menuY + event.clientY - startY;

    menu.style.left = x + "px";
    menu.style.top = y + "px";
  });

  header.addEventListener("pointerup", () => {
    dragging = false;
    menu.style.transition = "";
  });

  // Make the minimized star draggable
  let starDragging = false;
  let starStartX = 0;
  let starStartY = 0;
  let starLeft = 18;
  let starBottom = 18;

  star.addEventListener("pointerdown", event => {
    starDragging = true;
    starStartX = event.clientX;
    starStartY = event.clientY;

    const rect = star.getBoundingClientRect();
    starLeft = rect.left;
    starBottom = window.innerHeight - rect.bottom;

    star.setPointerCapture(event.pointerId);
  });

  star.addEventListener("pointermove", event => {
    if (!starDragging) return;

    const dx = event.clientX - starStartX;
    const dy = event.clientY - starStartY;

    star.style.left = Math.max(
      0,
      Math.min(window.innerWidth - 48, starLeft + dx)
    ) + "px";

    star.style.bottom = Math.max(
      0,
      Math.min(window.innerHeight - 48, starBottom - dy)
    ) + "px";
  });

  star.addEventListener("pointerup", event => {
    if (!starDragging) return;
    starDragging = false;

    if (
      Math.abs(event.clientX - starStartX) < 5 &&
      Math.abs(event.clientY - starStartY) < 5
    ) {
      restoreMenu();
    }
  });

  let allActions = [];
  let activeCategory = "All";

  function renderCategories() {
    categories.innerHTML = "";

    const names = [
      "All",
      ...new Set(allActions.map(action => action.category || "Other"))
    ];

    names.forEach(name => {
      const button = $("button", {
        className:
          "skyline-category" + (name === activeCategory ? " active" : ""),
        textContent: name
      }, categories);

      button.addEventListener("click", () => {
        activeCategory = name;
        renderCategories();
        renderItems();
      });
    });
  }

  function renderItems() {
    items.innerHTML = "";

    const query = search.value.toLowerCase();

    const filtered = allActions.filter(action => {
      const matchesCategory =
        activeCategory === "All" ||
        (action.category || "Other") === activeCategory;

      const matchesSearch =
        (action.name || "").toLowerCase().includes(query) ||
        (action.description || "").toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });

    if (!filtered.length) {
      $("div", {
        textContent: "No actions found.",
        style: "padding:20px;text-align:center;color:#888;font-size:12px"
      }, items);
      return;
    }

    filtered.forEach(action => {
      const button = $("button", {
        className: "skyline-item"
      }, items);

      $("div", {
        className: "skyline-item-name",
        textContent: action.name || "Unnamed action"
      }, button);

      $("div", {
        className: "skyline-item-description",
        textContent: action.description || action.category || ""
      }, button);

      button.addEventListener("click", () => {
        try {
          runAction(action);
          status.textContent = "Selected: " + action.name;
        } catch (error) {
          console.error("[Skyline]", error);
          status.textContent = "Action failed: " + error.message;
        }
      });
    });
  }

  search.addEventListener("input", renderItems);

  // Action functions
  function runAction(action) {
    const id = action.action;

    switch (id) {
      case "edit-page":
        document.designMode =
          document.designMode === "on" ? "off" : "on";
        break;

      case "word-count":
        alert("Word count: " +
          (document.body.innerText.trim().match(/\S+/g) || []).length);
        break;

      case "sentence-count":
        alert("Sentence count: " +
          (document.body.innerText.match(/[.!?]+/g) || []).length);
        break;

      case "uppercase":
        transformSelection(text => text.toUpperCase());
        break;

      case "lowercase":
        transformSelection(text => text.toLowerCase());
        break;

      case "titlecase":
        transformSelection(text =>
          text.replace(/\b\w/g, letter => letter.toUpperCase())
        );
        break;

      case "find-highlight": {
        const term = prompt("Text to find:");
        if (!term) break;
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "gi");
        document.body.innerHTML = document.body.innerHTML.replace(
          regex,
          match => `<mark style="background:yellow;color:black">${match}</mark>`
        );
        break;
      }

      case "replace-text": {
        const oldText = prompt("Text to replace:");
        if (oldText === null || !oldText) break;
        const newText = prompt("Replace with:");
        if (newText === null) break;
        document.body.innerHTML = document.body.innerHTML.split(oldText).join(newText);
        break;
      }

      case "remove-formatting":
        document.querySelectorAll("*").forEach(el => {
          el.removeAttribute("style");
          el.removeAttribute("class");
        });
        break;

      case "copy-page-text":
        copyText(document.body.innerText);
        break;

      case "reading-mode":
        document.body.style.cssText =
          "max-width:850px;margin:40px auto;padding:25px;background:white;color:black;font:18px/1.8 Georgia,serif";
        break;

      case "focus-mode":
        document.querySelectorAll("body > *").forEach(el => {
          if (!el.matches("#skyline-menu,#skyline-star")) {
            el.style.opacity = ".15";
          }
        });
        break;

      case "hide-images":
        document.querySelectorAll("img,video,iframe").forEach(el => {
          el.dataset.skylineHidden = "1";
          el.style.display = "none";
        });
        break;

      case "restore-images":
        document.querySelectorAll('[data-skyline-hidden="1"]').forEach(el => {
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
        document.getElementById("skyline-no-animations")?.remove();
        $("style", {
          id: "skyline-no-animations",
          textContent: "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}"
        });
        break;

      case "page-outline":
        alert(
          [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]
            .map(el => el.tagName + ": " + el.innerText)
            .join("\n") || "No headings found."
        );
        break;

      case "heading-navigator": {
        const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")];
        const choice = prompt(
          headings.map((h, i) => `${i + 1}. ${h.innerText}`).join("\n") +
          "\n\nEnter a heading number:"
        );
        const heading = headings[Number(choice) - 1];
        heading?.scrollIntoView({ behavior: "smooth", block: "center" });
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
          .map(a => a.href).join("\n") || "No links found.");
        break;

      case "list-alt":
        alert([...document.images]
          .map(img => img.alt || "(No alt text): " + img.src)
          .join("\n") || "No images found.");
        break;

      case "inspect-element":
        document.body.style.cursor = "crosshair";
        document.addEventListener("click", inspectClick, {
          capture: true,
          once: true
        });
        break;

      case "highlight-element":
        document.body.style.cursor = "crosshair";
        document.addEventListener("click", highlightClick, {
          capture: true,
          once: true
        });
        break;

      case "copy-element-html":
        document.body.style.cursor = "crosshair";
        document.addEventListener("click", copyElementClick, {
          capture: true,
          once: true
        });
        break;

      case "meta-tags":
        alert([...document.querySelectorAll("meta")]
          .map(m => m.outerHTML).join("\n") || "No meta tags.");
        break;

      case "grayscale":
        setPageFilter("grayscale(1)");
        break;

      case "invert":
        setPageFilter("invert(1)");
        break;

      case "dim-page":
        setPageFilter("brightness(.5)");
        break;

      case "reset-effects":
        document.getElementById("skyline-page-effects")?.remove();
        document.body.style.filter = "";
        document.body.style.zoom = "";
        document.querySelectorAll("*").forEach(el => {
          if (el.dataset.skylineDimmed) {
            el.style.opacity = "";
            delete el.dataset.skylineDimmed;
          }
        });
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
        const value = prompt("Paste JSON to format:");
        if (value === null) break;
        try {
          alert(JSON.stringify(JSON.parse(value), null, 2));
        } catch {
          alert("Invalid JSON.");
        }
        break;
      }

      case "url-encode": {
        const value = prompt("Text to encode:");
        if (value !== null) alert(encodeURIComponent(value));
        break;
      }

      case "url-decode": {
        const value = prompt("Text to decode:");
        if (value !== null) {
          try { alert(decodeURIComponent(value)); }
          catch { alert("Invalid encoded text."); }
        }
        break;
      }

      case "base64-encode": {
        const value = prompt("Text to encode:");
        if (value !== null) alert(btoa(unescape(encodeURIComponent(value))));
        break;
      }

      case "base64-decode": {
        const value = prompt("Base64 to decode:");
        if (value !== null) {
          try {
            alert(decodeURIComponent(escape(atob(value))));
          } catch {
            alert("Invalid Base64.");
          }
        }
        break;
      }

      case "calculator": {
        const value = prompt("Enter a calculation:");
        if (value === null) break;
        if (!/^[0-9+\-*/().% \t]+$/.test(value)) {
          alert("Only basic math is supported.");
          break;
        }
        try {
          const result = Function('"use strict";return (' + value + ")")();
          alert("Result: " + result);
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

      case "pick-color":
        pickColor();
        break;

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
        document.body.focus();
        document.execCommand("selectAll");
        break;

      default:
        alert("This action is not implemented yet: " + id);
    }
  }

  function transformSelection(transform) {
    const selection = window.getSelection();
    if (!selection || !selection.toString()) {
      alert("Select some text first.");
      return;
    }

    const text = selection.toString();
    copyText(transform(text));
  }

  function copyText(text) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => status.textContent = "Copied to clipboard.",
        () => fallbackCopy(text)
      );
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand("copy");
      status.textContent = "Copied to clipboard.";
    } catch {
      status.textContent = "Could not copy.";
    }

    textarea.remove();
  }

  function setPageFilter(filter) {
    let effects = document.getElementById("skyline-page-effects");

    if (!effects) {
      effects = $("style", { id: "skyline-page-effects" });
    }

    effects.textContent = `html{filter:${filter}!important}`;
  }

  function changeZoom(amount) {
    const current = Number.parseFloat(document.body.style.zoom) || 1;
    document.body.style.zoom = Math.max(.3, Math.min(2, current + amount));
  }

  function toggleRuler() {
    const existing = document.getElementById("skyline-ruler");
    if (existing) {
      existing.remove();
      return;
    }

    const ruler = $("div", { id: "skyline-ruler" });
    ruler.style.cssText =
      "position:fixed;left:0;right:0;top:50%;height:1px;background:red;z-index:2147483645;pointer-events:none";
  }

  function inspectClick(event) {
    event.preventDefault();
    event.stopPropagation();
    document.body.style.cursor = "";

    const el = event.target;
    alert(
      "Element: " + el.tagName +
      "\nID: " + el.id +
      "\nClass: " + el.className +
      "\nText: " + (el.innerText || "").slice(0, 300)
    );
  }

  function highlightClick(event) {
    event.preventDefault();
    event.stopPropagation();
    document.body.style.cursor = "";
    event.target.style.outline = "3px solid red";
  }

  function copyElementClick(event) {
    event.preventDefault();
    event.stopPropagation();
    document.body.style.cursor = "";
    copyText(event.target.outerHTML);
  }

  function pickColor() {
    const input = $("input", {
      type: "color",
      style: "position:fixed;left:-100px;top:-100px"
    });

    input.addEventListener("input", () => {
      copyText(input.value);
    });

    input.click();
    setTimeout(() => input.remove(), 60000);
  }

  // Load the action list
  fetch(DATA_URL + "?v=" + Date.now(), {
    cache: "no-store"
  })
    .then(response => {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(data => {
      allActions = Array.isArray(data) ? data : data.actions;

      if (!Array.isArray(allActions)) {
        throw new Error("The JSON must contain an actions array.");
      }

      renderCategories();
      renderItems();
      status.textContent = allActions.length + " actions loaded.";
    })
    .catch(error => {
      console.error("[Skyline] Could not load bookmarklet.json:", error);
      status.textContent = "Could not load bookmarklet.json.";
      $("div", {
        textContent: "Check that bookmarklet.json is valid JSON and available on jsDelivr.",
        style: "padding:12px;color:#aaa;font-size:11px"
      }, items);
    });

  console.log("[Skyline] Loaded.");
})();
