
(() => {
  "use strict";

  const ID = "skyline-dump";
  const DATA_URL = "https://raw.githubusercontent.com/NankaOfficial/SkyLine/refs/heads/main/bookmarklet.json";

  document.getElementById(ID + "-root")?.remove();
  document.getElementById(ID + "-blur")?.remove();
  document.getElementById(ID + "-style")?.remove();

  let data = { bookmarklets: [] };
  let category = "All";
  let search = "";
  let minimized = false;
  let zoom = 100;
  let hiddenImages = [];
  let rulerMove = null;

  const style = document.createElement("style");
  style.id = ID + "-style";
  style.textContent = `
  #${ID}-blur {
    position:fixed;inset:0;z-index:2147483000;
    background:rgba(0,0,0,.38);
    backdrop-filter:blur(9px);
    -webkit-backdrop-filter:blur(9px);
    transition:opacity .25s;
  }

  #${ID}-root,#${ID}-root * {box-sizing:border-box}

  #${ID}-root {
    position:fixed;z-index:2147483001;
    width:min(900px,94vw);
    height:min(650px,88vh);
    top:50%;left:50%;
    transform:translate(-50%,-50%);
    display:flex;overflow:hidden;
    background:#111;color:#f5f5f5;
    border:1px solid #333;
    border-radius:22px;
    box-shadow:0 25px 100px #000b;
    font:14px Arial,sans-serif;
    animation:skyline-open .25s ease;
  }

  @keyframes skyline-open {
    from {opacity:0;transform:translate(-50%,-48%) scale(.96)}
    to {opacity:1;transform:translate(-50%,-50%) scale(1)}
  }

  #${ID}-root button,#${ID}-root input {font:inherit}

  #${ID}-root .sidebar {
    width:225px;flex-shrink:0;
    background:#0a0a0a;
    padding:20px 12px;
    display:flex;flex-direction:column;
  }

  #${ID}-root .brand {
    display:flex;align-items:center;gap:12px;
    padding:5px 10px 25px;
    cursor:move;user-select:none;
    touch-action:none;
  }

  #${ID}-root .logo {
    width:39px;height:39px;
    border-radius:12px;
    background:#f5f5f5;color:#111;
    display:grid;place-items:center;
    font-size:22px;font-weight:900;
  }

  #${ID}-root .brand strong {
    font-size:19px;letter-spacing:2px;
  }

  #${ID}-root .brand small {
    display:block;color:#888;
    font-size:10px;margin-top:4px;
  }

  #${ID}-root .nav {
    background:transparent;border:0;
    color:#999;text-align:left;
    padding:13px;border-radius:11px;
    cursor:pointer;margin-bottom:5px;
  }

  #${ID}-root .nav:hover,
  #${ID}-root .nav.active {
    background:#252525;color:white;
  }

  #${ID}-root .footer {
    margin-top:auto;padding:12px;
    color:#666;font-size:10px;
  }

  #${ID}-root .main {
    flex:1;min-width:0;
    margin:12px;
    display:flex;flex-direction:column;
    background:#1b1b1b;
    border-radius:16px;overflow:hidden;
  }

  #${ID}-root .top {
    height:58px;flex-shrink:0;
    display:flex;align-items:center;
    justify-content:space-between;
    padding:0 18px;
    border-bottom:1px solid #303030;
    cursor:move;touch-action:none;
    user-select:none;
  }

  #${ID}-root .top strong {font-size:15px}

  #${ID}-root .controls {display:flex;gap:5px}

  #${ID}-root .controls button {
    background:transparent;border:0;
    color:#aaa;font-size:21px;
    width:34px;height:34px;
    cursor:pointer;border-radius:8px;
  }

  #${ID}-root .controls button:hover {
    background:#333;color:white;
  }

  #${ID}-root .content {
    padding:22px;overflow:auto;flex:1;
  }

  #${ID}-root h2 {
    font-size:22px;margin:0 0 5px;
  }

  #${ID}-root .subtitle {
    color:#999;margin-bottom:20px;
  }

  #${ID}-root .search {
    width:100%;padding:13px;
    background:#292929;
    border:1px solid #393939;
    border-radius:12px;color:white;
    outline:none;margin-bottom:15px;
  }

  #${ID}-root .search:focus {border-color:#888}

  #${ID}-root .chips {
    display:flex;gap:7px;
    flex-wrap:wrap;margin-bottom:18px;
  }

  #${ID}-root .chip {
    padding:8px 13px;
    border-radius:30px;
    background:#292929;
    border:1px solid #393939;
    color:#aaa;cursor:pointer;
    font-size:12px;
  }

  #${ID}-root .chip.active {
    background:#eee;color:#111;
  }

  #${ID}-root .cards {
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:11px;
  }

  #${ID}-root .card {
    background:#252525;
    border:1px solid #353535;
    border-radius:14px;
    padding:14px;
    min-width:0;
  }

  #${ID}-root .cardhead {
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:8px;
  }

  #${ID}-root .card strong {font-size:13px}

  #${ID}-root .tag {
    background:#393939;
    color:#aaa;padding:5px 8px;
    border-radius:30px;font-size:10px;
    white-space:nowrap;
  }

  #${ID}-root .description {
    color:#999;font-size:12px;
    min-height:32px;margin:10px 0;
  }

  #${ID}-root .run {
    background:#eee;color:#111;
    border:0;border-radius:9px;
    padding:8px 14px;
    font-weight:bold;cursor:pointer;
  }

  #${ID}-root .run:hover {background:#ccc}

  #${ID}-root .secondary {
    background:#303030;color:white;
    border:1px solid #444;
    border-radius:10px;
    padding:10px 14px;cursor:pointer;
  }

  #${ID}-root .setting {
    background:#252525;
    border-radius:13px;
    padding:16px;margin:12px 0;
    display:flex;align-items:center;
    justify-content:space-between;gap:12px;
  }

  #${ID}-root .empty {
    color:#888;text-align:center;padding:35px;
  }

  #${ID}-root .muted {
    color:#888;font-size:11px;
    margin-top:5px;
  }

  #${ID}-star {
    position:fixed;z-index:2147483002;
    left:22px;bottom:22px;
    width:59px;height:59px;
    border-radius:50%;
    background:#111;
    color:white;
    border:1px solid #555;
    box-shadow:0 8px 35px #0009;
    display:grid;place-items:center;
    cursor:grab;touch-action:none;
    user-select:none;
    font-size:29px;
    animation:skyline-star-in .3s ease;
  }

  #${ID}-star:hover {
    background:#292929;
    border-color:white;
    transform:scale(1.07);
  }

  @keyframes skyline-star-in {
    from {opacity:0;transform:scale(.3)}
    to {opacity:1;transform:scale(1)}
  }

  @media(max-width:620px) {
    #${ID}-root .sidebar {
      width:65px;padding:12px 6px;
    }
    #${ID}-root .brand {
      justify-content:center;padding:5px;
    }
    #${ID}-root .brand div:last-child,
    #${ID}-root .nav span,
    #${ID}-root .footer {display:none}
    #${ID}-root .nav {text-align:center}
    #${ID}-root .cards {grid-template-columns:1fr}
    #${ID}-root .content {padding:14px}
  }`;

  document.head.appendChild(style);

  const blur = document.createElement("div");
  blur.id = ID + "-blur";
  document.documentElement.appendChild(blur);

  const root = document.createElement("div");
  root.id = ID + "-root";

  const sidebar = document.createElement("div");
  sidebar.className = "sidebar";

  const brand = document.createElement("div");
  brand.className = "brand";
  brand.innerHTML = `
    <div class="logo">✦</div>
    <div>
      <strong>SKYLINE</strong>
      <small>BOOKMARKLET DUMP</small>
    </div>
  `;

  sidebar.appendChild(brand);

  const main = document.createElement("div");
  main.className = "main";

  const top = document.createElement("div");
  top.className = "top";

  const heading = document.createElement("strong");
  heading.textContent = "Main";

  const controls = document.createElement("div");
  controls.className = "controls";

  function make(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function button(text, cls, action) {
    const b = make("button", cls, text);
    b.onclick = action;
    return b;
  }

  const content = make("div", "content");

  function close() {
    root.remove();
    blur.remove();
    star?.remove();
    style.remove();
  }

  let star = null;

  function minimize() {
    if (minimized) return;
    minimized = true;

    root.style.display = "none";
    blur.style.display = "none";

    star = make("button", "", "✦");
    star.id = ID + "-star";
    star.title = "Open Skyline";
    document.documentElement.appendChild(star);

    star.addEventListener("click", () => {
      if (starDragging) return;
      restore();
    });

    makeDraggableStar(star);
  }

  function restore() {
    minimized = false;
    root.style.display = "flex";
    blur.style.display = "block";
    star?.remove();
    star = null;
  }

  function control(symbol, title, action) {
    const b = button(symbol, "", action);
    b.title = title;
    controls.appendChild(b);
  }

  control("−", "Minimize", minimize);

  control("□", "Center Window", () => {
    root.style.left = "50%";
    root.style.top = "50%";
    root.style.transform = "translate(-50%,-50%)";
  });

  control("×", "Close", close);

  top.append(heading, controls);
  main.append(top, content);
  root.append(sidebar, main);
  document.documentElement.appendChild(root);

  const navs = {};

  function addNav(name, symbol) {
    const b = make("button", "nav", symbol + "   " + name);
    b.dataset.name = name;
    b.onclick = () => view(name);
    navs[name] = b;
    sidebar.appendChild(b);
  }

  addNav("Main", "⌂");
  addNav("Library", "▦");
  addNav("Settings", "⚙");

  sidebar.appendChild(
    make("div", "footer", "SKYLINE • V1.0.0")
  );

  function setStatus(text) {
    heading.textContent = text;
    setTimeout(() => {
      if (root.isConnected && !minimized) heading.textContent = "Main";
    }, 1600);
  }

  function renderMain() {
    content.replaceChildren();

    content.append(
      make("h2", "", "Your browser toolkit"),
      make("div", "subtitle", "Everything you need in one place.")
    );

    const input = make("input", "search");
    input.placeholder = "Search bookmarklets...";
    input.value = search;

    input.oninput = () => {
      search = input.value;
      const position = input.selectionStart;
      renderMain();
      const next = content.querySelector(".search");
      next.focus();
      next.setSelectionRange(position, position);
    };

    content.appendChild(input);

    const chips = make("div", "chips");
    const categories = [
      "All",
      ...new Set(data.bookmarklets.map(x => x.category))
    ];

    categories.forEach(cat => {
      chips.appendChild(button(
        cat,
        "chip" + (category === cat ? " active" : ""),
        () => {
          category = cat;
          renderMain();
        }
      ));
    });

    content.appendChild(chips);

    const cards = make("div", "cards");

    const results = data.bookmarklets.filter(item =>
      (category === "All" || item.category === category) &&
      (item.name + " " + item.description + " " + item.category)
        .toLowerCase().includes(search.toLowerCase())
    );

    results.forEach(item => {
      const card = make("div", "card");
      const head = make("div", "cardhead");

      head.append(
        make("strong", "", item.name),
        make("span", "tag", item.category)
      );

      card.append(
        head,
        make("div", "description", item.description),
        button("Run Tool", "run", () => run(item.action))
      );

      cards.appendChild(card);
    });

    if (!results.length) {
      cards.appendChild(make("div", "empty", "No tools found."));
    }

    content.appendChild(cards);
  }

  function view(name) {
    heading.textContent = name;

    Object.entries(navs).forEach(([key, el]) => {
      el.classList.toggle("active", key === name);
    });

    content.replaceChildren();

    if (name === "Main") {
      renderMain();
      return;
    }

    if (name === "Library") {
      content.append(
        make("h2", "", "Bookmarklet Library"),
        make("div", "subtitle", data.bookmarklets.length + " tools loaded.")
      );

      const counts = {};

      data.bookmarklets.forEach(item => {
        counts[item.category] = (counts[item.category] || 0) + 1;
      });

      Object.entries(counts).forEach(([name, count]) => {
        const row = make("div", "setting");
        row.append(
          make("strong", "", name),
          make("span", "", count + " tools")
        );
        content.appendChild(row);
      });

      content.appendChild(button("Reload JSON", "secondary", load));
      return;
    }

    if (name === "Settings") {
      content.append(
        make("h2", "", "Settings"),
        make("div", "subtitle", "Customize your Skyline interface.")
      );

      const row = make("div", "setting");
      const label = make("strong", "", "Interface scale");
      const slider = make("input");

      slider.type = "range";
      slider.min = "80";
      slider.max = "120";
      slider.value = "100";

      slider.oninput = () => {
        root.style.fontSize = slider.value + "%";
      };

      row.append(label, slider);
      content.appendChild(row);

      const reload = make("div", "setting");
      reload.append(
        make("strong", "", "JSON Database"),
        button("Reload", "secondary", load)
      );
      content.appendChild(reload);

      content.appendChild(
        make("div", "setting", "Skyline Bookmarklet Dump • 1.0.0")
      );
    }
  }

  function ask(text) {
    return prompt(text);
  }

  function copy(text) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(String(text))
        .then(() => setStatus("Copied!"))
        .catch(() => prompt("Copy this:", text));
    } else {
      prompt("Copy this:", text);
    }
  }

  function selectedText() {
    return String(getSelection() || "");
  }

  function replaceSelection(value) {
    const selection = getSelection();

    if (!selection || !selection.rangeCount) {
      alert("Select some text first.");
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(value));
  }

  function run(action) {
    const text = () => document.body.innerText || "";
    const selected = selectedText();

    try {
      switch (action) {
        case "edit-page":
          document.body.contentEditable =
            document.body.contentEditable === "true" ? "false" : "true";
          setStatus("Editor toggled");
          break;

        case "word-count":
          alert(
            "Words: " + (text().match(/\S+/g) || []).length +
            "\nCharacters: " + text().length
          );
          break;

        case "sentence-count":
          alert("Sentences: " + (text().match(/[.!?]+/g) || []).length);
          break;

        case "uppercase":
          if (selected) replaceSelection(selected.toUpperCase());
          else alert("Select text first.");
          break;

        case "lowercase":
          if (selected) replaceSelection(selected.toLowerCase());
          else alert("Select text first.");
          break;

        case "titlecase":
          if (selected) replaceSelection(
            selected.toLowerCase().replace(/\b\w/g, x => x.toUpperCase())
          );
          else alert("Select text first.");
          break;

        case "find-highlight": {
          const q = ask("Find text:");
          if (!q) break;

          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let node, count = 0;

          while (node = walker.nextNode()) {
            if (node.parentElement.closest("script,style,input,textarea,#" + ID + "-root")) continue;

            if (node.nodeValue.toLowerCase().includes(q.toLowerCase())) {
              const mark = document.createElement("mark");
              mark.style.background = "#ffe66d";
              mark.style.color = "#111";
              mark.textContent = node.nodeValue;
              node.parentNode.replaceChild(mark, node);
              count++;
            }
          }

          alert("Highlighted " + count + " sections.");
          break;
        }

        case "replace-text": {
          const find = ask("Find text:");
          if (!find) break;
          const replacement = ask("Replace with:") ?? "";

          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let node;

          while (node = walker.nextNode()) {
            if (!node.parentElement.closest("script,style,input,textarea,#" + ID + "-root")) {
              node.nodeValue = node.nodeValue.split(find).join(replacement);
            }
          }
          break;
        }

        case "remove-formatting":
          if (selected) replaceSelection(selected);
          else alert("Select text first.");
          break;

        case "copy-page-text":
          copy(text());
          break;

        case "reading-mode": {
          const w = window.open("", "_blank");
          if (!w) break;

          const pre = w.document.createElement("pre");
          pre.style.cssText = "white-space:pre-wrap;font:18px/1.7 Georgia;max-width:760px;margin:50px auto;padding:20px";
          pre.textContent = text();
          w.document.body.appendChild(pre);
          break;
        }

        case "focus-mode":
          document.body.classList.toggle("__skyline_focus");

          if (!document.getElementById("__skyline_focus_css")) {
            const s = document.createElement("style");
            s.id = "__skyline_focus_css";
            s.textContent = "body.__skyline_focus>*{opacity:.18!important}body.__skyline_focus main,body.__skyline_focus article,body.__skyline_focus [role=main]{opacity:1!important}";
            document.head.appendChild(s);
          }
          break;

        case "hide-images":
          hiddenImages = [...document.querySelectorAll("img")].map(img => ({
            img,
            visibility: img.style.visibility
          }));

          hiddenImages.forEach(x => x.img.style.visibility = "hidden");
          break;

        case "restore-images":
          hiddenImages.forEach(x => {
            if (x.img.isConnected) x.img.style.visibility = x.visibility;
          });
          hiddenImages = [];
          break;

        case "highlight-links":
          document.querySelectorAll("a").forEach(x => {
            x.style.outline = "2px solid #168df0";
          });
          break;

        case "new-tab-links":
          document.querySelectorAll("a[href]").forEach(x => {
            x.target = "_blank";
            x.rel = "noopener noreferrer";
          });
          break;

        case "grayscale":
          document.documentElement.style.filter =
            document.documentElement.style.filter === "grayscale(1)"
              ? "" : "grayscale(1)";
          break;

        case "invert":
          document.documentElement.style.filter =
            document.documentElement.style.filter.includes("invert")
              ? "" : "invert(1) hue-rotate(180deg)";
          break;

        case "dim-page": {
          let d = document.getElementById("__skyline_dim");
          if (d) d.remove();
          else {
            d = make("div", "");
            d.id = "__skyline_dim";
            d.style.cssText = "position:fixed;inset:0;background:#0006;z-index:2147483000;pointer-events:none";
            document.body.appendChild(d);
          }
          break;
        }

        case "reset-effects":
          document.documentElement.style.filter = "";
          document.documentElement.style.zoom = "";
          document.body.classList.remove("__skyline_focus");
          document.getElementById("__skyline_dim")?.remove();
          document.getElementById("__skyline_noanim")?.remove();
          document.getElementById("__skyline_ruler")?.remove();

          document.querySelectorAll("a").forEach(x => x.style.outline = "");
          document.querySelectorAll("img").forEach(x => x.style.visibility = "");
          break;

        case "zoom-in":
          zoom = Math.min(150, zoom + 10);
          document.documentElement.style.zoom = zoom + "%";
          break;

        case "zoom-out":
          zoom = Math.max(50, zoom - 10);
          document.documentElement.style.zoom = zoom + "%";
          break;

        case "zoom-reset":
          zoom = 100;
          document.documentElement.style.zoom = "";
          break;

        case "page-ruler": {
          let r = document.getElementById("__skyline_ruler");

          if (r) {
            r.remove();
            if (rulerMove) document.removeEventListener("mousemove", rulerMove);
            rulerMove = null;
          } else {
            r = make("div", "");
            r.id = "__skyline_ruler";
            r.style.cssText = "position:fixed;top:50%;left:0;width:100%;height:34px;background:#ffe66d55;border-block:1px solid #e6b800;z-index:2147483000;pointer-events:none";
            document.body.appendChild(r);

            rulerMove = e => {
              r.style.top = e.clientY - 17 + "px";
            };

            document.addEventListener("mousemove", rulerMove);
          }
          break;
        }

        case "disable-animations": {
          let s = document.getElementById("__skyline_noanim");

          if (s) s.remove();
          else {
            s = make("style", "");
            s.id = "__skyline_noanim";
            s.textContent = "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}";
            document.head.appendChild(s);
          }
          break;
        }

        case "page-outline":
        case "heading-navigator": {
          const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")];

          const value = ask(
            headings.map((h,i) => (i+1) + ". " + h.innerText.trim()).join("\n") +
            "\n\nEnter heading number:"
          );

          if (value && headings[+value-1]) {
            headings[+value-1].scrollIntoView({behavior:"smooth"});
          }
          break;
        }

        case "page-info":
          alert(
            "Title: " + document.title +
            "\nURL: " + location.href +
            "\nSize: " + innerWidth + " × " + innerHeight
          );
          break;

        case "count-links":
          alert("Links: " + document.links.length);
          break;

        case "count-images":
          alert("Images: " + document.images.length);
          break;

        case "list-links":
          copy([...document.links].map(x => x.href).join("\n"));
          break;

        case "list-alt":
          alert([...document.images].map(x => x.alt || "[Missing alt text]").join("\n"));
          break;

        case "inspect-element": {
          alert("Click an element on the webpage to inspect it.");

          const handler = e => {
            if (root.contains(e.target)) return;

            e.preventDefault();
            e.stopPropagation();
            document.removeEventListener("click", handler, true);

            alert(
              "Tag: " + e.target.tagName +
              "\nID: " + e.target.id +
              "\nClasses: " + e.target.className
            );
          };

          document.addEventListener("click", handler, true);
          break;
        }

        case "highlight-element": {
          const q = ask("CSS selector:");
          if (!q) break;

          try {
            document.querySelectorAll(q).forEach(x => {
              x.style.outline = "3px solid #168df0";
            });
          } catch {
            alert("Invalid CSS selector.");
          }
          break;
        }

        case "copy-element-html": {
          const q = ask("CSS selector:");
          const el = document.querySelector(q);
          if (el) copy(el.outerHTML);
          else alert("Element not found.");
          break;
        }

        case "meta-tags":
          alert([...document.querySelectorAll("meta")].map(m =>
            (m.name || m.property || "meta") + ": " + m.content
          ).join("\n").slice(0,5000));
          break;

        case "format-json": {
          const v = ask("Paste JSON:");
          if (v !== null) {
            try {
              prompt("Formatted JSON:", JSON.stringify(JSON.parse(v), null, 2));
            } catch {
              alert("Invalid JSON.");
            }
          }
          break;
        }

        case "url-encode":
          prompt("Encoded:", encodeURIComponent(selected || ask("Text:") || ""));
          break;

        case "url-decode":
          try {
            prompt("Decoded:", decodeURIComponent(ask("Encoded text:") || ""));
          } catch {
            alert("Invalid URL encoding.");
          }
          break;

        case "base64-encode":
          prompt("Base64:", btoa(unescape(encodeURIComponent(ask("Text:") || ""))));
          break;

        case "base64-decode":
          try {
            prompt("Decoded:", decodeURIComponent(escape(atob(ask("Base64:") || ""))));
          } catch {
            alert("Invalid Base64.");
          }
          break;

        case "calculator": {
          const v = ask("Enter arithmetic:");
          if (v === null) break;

          if (!/^[0-9+\-*/().%\s]+$/.test(v)) {
            alert("Only basic arithmetic is allowed.");
            break;
          }

          try {
            alert("Result: " + Function('"use strict";return (' + v + ')')());
          } catch {
            alert("Invalid expression.");
          }
          break;
        }

        case "quick-notes": {
          const w = window.open("", "_blank");
          if (!w) break;

          const area = w.document.createElement("textarea");
          area.style.cssText = "width:100%;height:95vh;font:16px Arial;padding:15px";
          w.document.body.appendChild(area);
          break;
        }

        case "pick-color": {
          alert("Click an element to inspect its text color.");

          const handler = e => {
            if (root.contains(e.target)) return;

            e.preventDefault();
            e.stopPropagation();
            document.removeEventListener("click", handler, true);

            copy(getComputedStyle(e.target).color);
          };

          document.addEventListener("click", handler, true);
          break;
        }

        case "copy-url":
          copy(location.href);
          break;

        case "copy-title":
          copy(document.title);
          break;

        case "scroll-top":
          scrollTo({top:0,behavior:"smooth"});
          break;

        case "scroll-bottom":
          scrollTo({top:document.documentElement.scrollHeight,behavior:"smooth"});
          break;

        case "print-page":
          print();
          break;

        case "select-all-text": {
          const range = document.createRange();
          range.selectNodeContents(document.body);
          const selection = getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          break;
        }

        default:
          alert("This tool is not implemented yet.");
      }
    } catch (error) {
      console.error("Skyline error:", error);
      alert("Tool error: " + error.message);
    }
  }

  // Draggable main window.
  function makeDraggable(element, handle) {
    let drag = null;

    handle.addEventListener("pointerdown", e => {
      if (e.target.closest("button")) return;

      const rect = element.getBoundingClientRect();

      drag = {
        x:e.clientX,
        y:e.clientY,
        left:rect.left,
        top:rect.top
      };

      element.style.transform = "none";
      handle.setPointerCapture(e.pointerId);
    });

    handle.addEventListener("pointermove", e => {
      if (!drag) return;

      const width = element.offsetWidth;
      const height = element.offsetHeight;

      element.style.left = Math.max(
        0, Math.min(innerWidth-width, drag.left+e.clientX-drag.x)
      ) + "px";

      element.style.top = Math.max(
        0, Math.min(innerHeight-height, drag.top+e.clientY-drag.y)
      ) + "px";
    });

    handle.addEventListener("pointerup", () => drag = null);
    handle.addEventListener("pointercancel", () => drag = null);
  }

  // Draggable minimized star button.
  let starDragging = false;

  function makeDraggableStar(element) {
    let drag = null;
    let moved = false;

    element.addEventListener("pointerdown", e => {
      drag = {
        x:e.clientX,
        y:e.clientY,
        left:element.offsetLeft,
        top:element.offsetTop
      };
      moved = false;
      starDragging = false;
      element.setPointerCapture(e.pointerId);
    });

    element.addEventListener("pointermove", e => {
      if (!drag) return;

      const dx = e.clientX-drag.x;
      const dy = e.clientY-drag.y;

      if (Math.abs(dx)+Math.abs(dy)>5) {
        moved = true;
        starDragging = true;
      }

      if (!moved) return;

      const left = Math.max(0,Math.min(innerWidth-element.offsetWidth,drag.left+dx));
      const top = Math.max(0,Math.min(innerHeight-element.offsetHeight,drag.top+dy));

      element.style.left = left+"px";
      element.style.top = top+"px";
      element.style.bottom = "auto";
    });

    element.addEventListener("pointerup", () => {
      drag = null;
      setTimeout(() => starDragging = false, 100);
    });

    element.addEventListener("pointercancel", () => {
      drag = null;
      starDragging = false;
    });
  }

  makeDraggable(root, top);

  async function load() {
    content.replaceChildren(
      make("h2", "", "Loading Skyline..."),
      make("div", "subtitle", "Loading your bookmarklet collection.")
    );

    try {
      const response = await fetch(DATA_URL, {
        cache:"no-store"
      });

      if (!response.ok) throw new Error("HTTP " + response.status);

      const json = await response.json();

      if (!Array.isArray(json.bookmarklets)) {
        throw new Error("Invalid bookmarklet JSON.");
      }

      data = json;
      view("Main");
    } catch (error) {
      console.error("Skyline JSON error:", error);

      content.replaceChildren(
        make("h2", "", "Could not load JSON"),
        make("div", "subtitle", error.message),
        button("Try Again", "secondary", load)
      );
    }
  }

  load();
})();
