(function () {
  const blog = window.BLOG;
  const posts = [...window.POSTS].sort((a, b) => b.date.localeCompare(a.date));
  const app = document.getElementById("app");
  const state = { tag: null, q: "" };

  // ---------- helpers ----------
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const fmtDate = (d) =>
    new Date(d + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  const readTime = (text) => Math.max(1, Math.round(text.trim().split(/\s+/).length / 220)) + " min read";

  function inline(s) {
    return esc(s)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }

  // Tiny Markdown renderer: headings, lists, quotes, paragraphs.
  function md(src) {
    const blocks = src.trim().split(/\n\s*\n/);
    return blocks
      .map((b) => {
        const lines = b.split("\n").map((l) => l.trim());
        if (/^###\s/.test(lines[0])) return `<h3>${inline(lines[0].slice(4))}</h3>`;
        if (/^##\s/.test(lines[0])) return `<h2>${inline(lines[0].slice(3))}</h2>`;
        if (lines.every((l) => /^[-*]\s/.test(l)))
          return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join("")}</ul>`;
        if (lines.every((l) => /^\d+\.\s/.test(l)))
          return `<ol>${lines.map((l) => `<li>${inline(l.replace(/^\d+\.\s/, ""))}</li>`).join("")}</ol>`;
        if (lines.every((l) => l.startsWith(">")))
          return `<blockquote>${inline(lines.map((l) => l.replace(/^>\s?/, "")).join(" "))}</blockquote>`;
        return `<p>${inline(lines.join(" "))}</p>`;
      })
      .join("\n");
  }

  const tagChip = (t, on) =>
    `<button class="tag${on ? " on" : ""}" data-tag="${esc(t)}">#${esc(t)}</button>`;

  // ---------- views ----------
  function listView() {
    const allTags = [...new Set(posts.flatMap((p) => p.tags))].sort();
    const q = state.q.toLowerCase();
    const shown = posts.filter(
      (p) =>
        (!state.tag || p.tags.includes(state.tag)) &&
        (!q || (p.title + " " + p.summary + " " + p.body).toLowerCase().includes(q))
    );

    app.innerHTML = `
      <section class="intro">
        <h1>${esc(blog.tagline)}</h1>
        <p>${posts.length} post${posts.length === 1 ? "" : "s"} by ${esc(blog.author)}</p>
      </section>
      <div class="controls">
        <input class="search" type="search" placeholder="Search posts…" value="${esc(state.q)}" aria-label="Search posts" />
        <div class="tags">
          <button class="tag${state.tag ? "" : " on"}" data-tag="">All</button>
          ${allTags.map((t) => tagChip(t, t === state.tag)).join("")}
        </div>
      </div>
      ${
        shown.length
          ? `<ul class="post-list">${shown
              .map(
                (p) => `
            <li class="post-card">
              <div class="meta"><time>${fmtDate(p.date)}</time><span>·</span><span>${readTime(p.body)}</span></div>
              <a class="title" href="#/post/${p.slug}"><h2>${esc(p.title)}</h2></a>
              <p>${esc(p.summary)}</p>
              <div class="meta">${p.tags.map((t) => tagChip(t, t === state.tag)).join("")}</div>
            </li>`
              )
              .join("")}</ul>`
          : `<p class="empty">No posts match. Try another search or tag.</p>`
      }`;

    const input = app.querySelector(".search");
    input.addEventListener("input", (e) => {
      state.q = e.target.value;
      const pos = e.target.selectionStart;
      listView();
      const again = app.querySelector(".search");
      again.focus();
      again.setSelectionRange(pos, pos);
    });
  }

  function postView(slug) {
    const i = posts.findIndex((p) => p.slug === slug);
    if (i < 0) return notFound();
    const p = posts[i];
    const newer = posts[i - 1];
    const older = posts[i + 1];
    document.title = `${p.title} · ${blog.title}`;

    app.innerHTML = `
      <a class="back" href="#/">← All posts</a>
      <article>
        <header>
          <h1>${esc(p.title)}</h1>
          <div class="meta"><time>${fmtDate(p.date)}</time><span>·</span><span>${readTime(p.body)}</span>
            ${p.tags.map((t) => `<a class="tag" href="#/tag/${encodeURIComponent(t)}">#${esc(t)}</a>`).join("")}
          </div>
        </header>
        <div class="prose">${md(p.body)}</div>
      </article>
      <nav class="post-nav">
        ${older ? `<a class="prev" href="#/post/${older.slug}"><small>← Older</small>${esc(older.title)}</a>` : ""}
        ${newer ? `<a class="next" href="#/post/${newer.slug}"><small>Newer →</small>${esc(newer.title)}</a>` : ""}
      </nav>`;
    window.scrollTo(0, 0);
  }

  function aboutView() {
    document.title = `About · ${blog.title}`;
    app.innerHTML = `
      <section class="about">
        <h1>About</h1>
        <div class="prose">${md(blog.about)}</div>
        ${
          blog.links.length
            ? `<div class="links">${blog.links
                .map((l) => `<a class="tag" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`)
                .join("")}</div>`
            : ""
        }
      </section>`;
  }

  function notFound() {
    app.innerHTML = `<p class="empty">That post doesn't exist. <a href="#/">Back to all posts</a></p>`;
  }

  // ---------- router ----------
  function route() {
    const h = location.hash.replace(/^#\/?/, "");
    document.querySelectorAll("nav a").forEach((a) =>
      a.classList.toggle("active", a.getAttribute("href") === (h === "about" ? "#/about" : "#/") && !h.startsWith("post"))
    );
    if (h.startsWith("post/")) return postView(h.slice(5));
    if (h === "about") return aboutView();
    document.title = blog.title;
    if (h.startsWith("tag/")) state.tag = decodeURIComponent(h.slice(4));
    listView();
  }

  app.addEventListener("click", (e) => {
    const btn = e.target.closest("button.tag");
    if (!btn) return;
    const t = btn.dataset.tag;
    state.tag = !t || t === state.tag ? null : t;
    if (location.hash.startsWith("#/tag/")) history.replaceState(null, "", "#/");
    listView();
  });

  // ---------- theme ----------
  const root = document.documentElement;
  try {
    const saved = localStorage.getItem("theme");
    if (saved) root.dataset.theme = saved;
  } catch (_) {}
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const dark =
      root.dataset.theme === "dark" ||
      (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (_) {}
  });

  // ---------- chrome ----------
  document.getElementById("brand").textContent = blog.title;
  document.getElementById("footer").textContent = `© ${new Date().getFullYear()} ${blog.author}`;

  window.addEventListener("hashchange", route);
  route();
})();
