(() => {
  "use strict";

  const SUPPORTED = ["es", "en"];
  const DEFAULT_LANG = "es";
  const cache = new Map();

  let currentLang = DEFAULT_LANG;
  let requestId = 0;

  const $ = (selector) => document.querySelector(selector);
  const list = (value) => (Array.isArray(value) ? value : []);

  const store = {
    get(key) {
      try { return localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch { /* sin almacenamiento */ }
    },
  };

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  const resolve = (obj, path) =>
    path.split(".").reduce((value, key) => (value == null ? value : value[key]), obj);

  const safeUrl = (value, protocols) => {
    try {
      const url = new URL(value, location.href);
      return protocols.includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  };

  const range = (start, end) => [start, end].filter(Boolean).join(" – ");

  /* Idioma */

  const detectLang = () => {
    const saved = store.get("lang");
    if (SUPPORTED.includes(saved)) return saved;
    const browser = (navigator.language || "").slice(0, 2).toLowerCase();
    return SUPPORTED.includes(browser) ? browser : DEFAULT_LANG;
  };

  const loadData = (lang) => {
    if (!cache.has(lang)) {
      const request = fetch(`data/cv.${lang}.json`).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      });
      request.catch(() => cache.delete(lang));
      cache.set(lang, request);
    }
    return cache.get(lang);
  };

  /* Tecnologías: icono y color de cada chip, definidos en data/tech.json */

  const HEX_COLOR = /^#[0-9a-f]{6}$/i;
  const ICON_NAME = /^[a-z0-9-]+$/i;
  let techPromise = null;

  const loadTech = () => {
    techPromise ??= fetch("data/tech.json")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((json) =>
        Object.fromEntries(Object.entries(json).map(([name, info]) => [name.toLowerCase(), info])))
      .catch((error) => {
        console.error("No se pudo cargar data/tech.json:", error);
        return {};
      });
    return techPromise;
  };

  let tech = {};

  const chip = (name) => {
    const item = el("li", "chip");
    const info = tech[name.toLowerCase()];
    if (info && ICON_NAME.test(info.icon || "") && HEX_COLOR.test(info.color || "")) {
      const dark = HEX_COLOR.test(info.colorDark || "") ? info.colorDark : info.color;
      item.classList.add("chip--tech");
      item.style.setProperty("--chip-color", `light-dark(${info.color}, ${dark})`);
      // Absoluta: una url() dentro de una variable CSS se resuelve respecto a la hoja de estilos
      const iconUrl = new URL(`assets/icons/${info.icon}.svg`, document.baseURI).href;
      item.style.setProperty("--chip-icon", `url("${iconUrl}")`);
      const icon = el("span", "chip__icon");
      icon.setAttribute("aria-hidden", "true");
      item.append(icon);
    }
    item.append(document.createTextNode(name));
    return item;
  };

  /* Renderizado de secciones */

  const entry =({ title, subtitle, dates, note, bullets }) => {
    const item = el("article", "entry");
    const head = el("div", "entry__head");
    head.append(el("h3", "entry__title", title));
    if (dates) head.append(el("p", "entry__dates", dates));
    item.append(head);
    if (subtitle) item.append(el("p", "entry__subtitle", subtitle));
    if (note) item.append(el("p", "entry__note", note));
    const points = list(bullets);
    if (points.length) {
      const ul = el("ul", "entry__bullets");
      points.forEach((point) => ul.append(el("li", "", point)));
      item.append(ul);
    }
    return item;
  };

  const row = (label, detail) => {
    const item = el("div", "row");
    item.append(el("p", "row__label", label));
    if (detail) item.append(el("p", "row__detail", detail));
    return item;
  };

  const renderers = {
    summary: (data) => (data.meta.summary ? [el("p", "summary", data.meta.summary)] : []),

    experience: (data) =>
      list(data.experience).map((item) =>
        entry({
          title: item.role,
          subtitle: item.company,
          dates: range(item.start, item.end),
          bullets: item.bullets,
        })),

    projects: (data) =>
      list(data.projects).map((item) => {
        const card = el("article", "entry");
        const head = el("div", "entry__head");
        const title = el("h3", "entry__title");
        const url = item.url && safeUrl(item.url, ["https:"]);
        if (url) {
          const link = el("a", "", item.name);
          link.href = url;
          link.rel = "noopener noreferrer";
          title.append(link);
        } else {
          title.textContent = item.name;
        }
        head.append(title);
        card.append(head);
        if (item.description) card.append(el("p", "entry__subtitle", item.description));
        const tags = list(item.tags);
        if (tags.length) {
          const chips = el("ul", "chips");
          tags.forEach((tag) => chips.append(chip(tag)));
          card.append(chips);
        }
        return card;
      }),

    education: (data) =>
      list(data.education).map((item) =>
        entry({
          title: item.degree,
          subtitle: item.school,
          dates: range(item.start, item.end),
          note: item.note,
        })),

    skills: (data) =>
      list(data.skills)
        .filter((group) => list(group.items).length)
        .map((group) => {
          const wrapper = el("div", "skill-group");
          wrapper.append(el("h3", "skill-group__name", group.group));
          const chips = el("ul", "chips");
          group.items.forEach((name) => chips.append(chip(name)));
          wrapper.append(chips);
          return wrapper;
        }),

    languages: (data) => list(data.languages).map((item) => row(item.name, item.level)),

    certifications: (data) =>
      list(data.certifications).map((item) =>
        row(item.name, [item.issuer, item.year].filter(Boolean).join(" · "))),

    contact: (data) => {
      const { email, github, linkedin } = data.contact || {};
      const links = [];
      const mail = email && /^[^\s@]+@[^\s@]+$/.test(email) ? `mailto:${email}` : null;
      if (mail) links.push(["Email", mail, email]);
      const gh = github && safeUrl(github, ["https:"]);
      if (gh) links.push(["GitHub", gh, gh.replace(/^https:\/\//, "")]);
      const li = linkedin && safeUrl(linkedin, ["https:"]);
      if (li) links.push(["LinkedIn", li, li.replace(/^https:\/\/(www\.)?/, "")]);
      if (!links.length) return [];

      const ul = el("ul", "contact-list");
      links.forEach(([label, href, text]) => {
        const item = el("li", "contact-list__item");
        item.append(el("span", "contact-list__label", label));
        const link = el("a", "", text);
        link.href = href;
        if (href.startsWith("https:")) link.rel = "noopener noreferrer";
        item.append(link);
        ul.append(item);
      });
      return [ul];
    },
  };

  const apply = (data, lang) => {
    const { meta, ui } = data;

    document.documentElement.lang = lang;
    document.title = `${meta.name} · ${meta.title}`;
    $('meta[name="description"]')?.setAttribute("content", meta.summary);

    document.querySelectorAll("[data-bind]").forEach((node) => {
      const value = resolve(data, node.dataset.bind);
      if (typeof value === "string") node.textContent = value;
    });

    $(".profile__photo")?.setAttribute("alt", ui.photoAlt);

    document.querySelectorAll("[data-section]").forEach((section) => {
      const key = section.dataset.section;
      const nodes = renderers[key](data);
      section.querySelector(".section__title").textContent = ui.sections[key];
      section.querySelector("[data-content]").replaceChildren(...nodes);
      section.hidden = nodes.length === 0;
    });

    const cv = $("#cv-download");
    const cvUrl = meta.cv && safeUrl(meta.cv, ["https:", location.protocol]);
    cv.hidden = !cvUrl;
    if (cvUrl) {
      cv.href = cvUrl;
      cv.textContent = ui.download;
    }

    const other = SUPPORTED.find((code) => code !== lang);
    const langButton = $("#lang-toggle");
    langButton.textContent = other.toUpperCase();
    langButton.setAttribute("aria-label", ui.switchLang);
    langButton.setAttribute("lang", other);
    $("#theme-toggle").setAttribute("aria-label", ui.toggleTheme);
    $(".toolbar").hidden = false;

    document.querySelectorAll("[data-year]").forEach((node) => {
      node.textContent = new Date().getFullYear();
    });
  };

  const setLang = async (lang, { persist = true } = {}) => {
    const id = ++requestId;
    try {
      const [data, techMap] = await Promise.all([loadData(lang), loadTech()]);
      if (id !== requestId) return;
      tech = techMap;
      currentLang = lang;
      if (persist) store.set("lang", lang);
      apply(data, lang);
    } catch (error) {
      console.error(`No se pudo cargar el idioma "${lang}":`, error);
    }
  };

  /* Tema */

  const currentTheme = () =>
    document.documentElement.dataset.theme ||
    (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

  const toggleTheme = () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    store.set("theme", next);
  };

  /* Arranque */

  $("#lang-toggle").addEventListener("click", () => {
    setLang(SUPPORTED.find((code) => code !== currentLang));
  });
  $("#theme-toggle").addEventListener("click", toggleTheme);

  setLang(detectLang(), { persist: false });
})();
