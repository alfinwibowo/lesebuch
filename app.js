"use strict";
/* Lesebuch: short German stories by level. Stories from Global Storybooks (CC BY 4.0). Progress lives in localStorage. */
const KEY = "lesebuch.v1";
const LEVELS = [
  { n: 1, cefr: "≈ A1", note: "ein, zwei Sätze pro Seite" },
  { n: 2, cefr: "≈ A1", note: "kurze Geschichten" },
  { n: 3, cefr: "≈ A2", note: "längere Geschichten" },
  { n: 4, cefr: "≈ A2", note: "mehrere Sätze pro Seite" },
  { n: 5, cefr: "≈ B1", note: "lange Geschichten" }
];
const $ = id => document.getElementById(id);
let STORIES = [], S = load(), audio = null, playingBtn = null;
let KIDX = null; const KTEXT = {};
const KLEVELS = [
  { n: 1, name: "Leichter", note: "kurze Sätze, häufige Wörter" },
  { n: 2, name: "Mittel", note: "etwas längere Sätze" },
  { n: 3, name: "Schwerer", note: "längere Sätze, mehr Fachwörter" }
];

function load() {
  let s = null; try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
  return Object.assign({ level: 1, read: {}, showEn: false, klevel: 1, kread: {} }, s || {});
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
let tt; function toast(m) { const t = $("toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 2200); }

const ICON_PLAY = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>';
const ICON_PAUSE = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor"/></svg>';
const ICON_CHECK = '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_CHEV = '<svg class="chev" width="9" height="15" viewBox="0 0 9 15" aria-hidden="true"><path d="M1.5 1.5l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_BACK = '<svg width="11" height="18" viewBox="0 0 11 18" aria-hidden="true"><path d="M9.5 1.5L2 9l7.5 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* German text with every word linked to dict.cc */
function linkWords(text) {
  return esc(text).replace(/[A-Za-zÄÖÜäöüß]+(?:-[A-Za-zÄÖÜäöüß]+)*/g,
    w => `<a href="https://www.dict.cc/?s=${encodeURIComponent(w)}" target="_blank" rel="noopener">${w}</a>`);
}
function words(st) { return st.pages.reduce((n, p) => n + p.de.split(/\s+/).filter(Boolean).length, 0); }

/* ---------- home ---------- */
function renderStart() {
  stopAudio();
  document.title = "Lesebuch";
  const gRead = Object.keys(S.read).length, kRead = Object.keys(S.kread).length;
  $("app").innerHTML = `
  <header class="home-head start">
    <h1>Lesebuch</h1>
    <p>Was möchtest du heute lesen?</p>
  </header>
  <nav class="choices">
    <a class="choice" href="#g">
      <span class="ct">Geschichten</span>
      <span class="cd">${STORIES.length} Bildergeschichten in 5 Stufen, mit Englisch und Audio</span>
      <span class="cm">${gRead} gelesen</span>
    </a>
    <a class="choice" href="#k">
      <span class="ct">Klexikon</span>
      <span class="cd">3.528 kurze Sachtexte in 3 Stufen, nur auf Deutsch</span>
      <span class="cm">${kRead} gelesen</span>
    </a>
  </nav>
  <p class="foot">Geschichten: <a href="https://globalstorybooks.net" target="_blank" rel="noopener">Global Storybooks</a> (CC BY 4.0). Sachtexte: <a href="https://klexikon.zum.de" target="_blank" rel="noopener">Klexikon</a> (CC BY-SA 4.0). Wörter antippen öffnet <a href="https://www.dict.cc" target="_blank" rel="noopener">dict.cc</a>.</p>`;
}

function renderHome() {
  stopAudio();
  document.title = "Geschichten · Lesebuch";
  const list = STORIES.filter(s => s.level === S.level);
  const lv = LEVELS[S.level - 1];
  const readCount = list.filter(s => S.read[s.id]).length;
  $("app").innerHTML = `
  <div class="bar"><a class="back" href="#">${ICON_BACK} Start</a></div>
  <header class="home-head">
    <h1>Geschichten</h1>
    <p>${STORIES.length} kurze Geschichten auf Deutsch</p>
  </header>
  <div class="levels" role="group" aria-label="Stufe wählen">
    ${LEVELS.map(l => `<button data-level="${l.n}" aria-pressed="${l.n === S.level}"><span class="n">${l.n}</span><span class="c">${l.cefr}</span></button>`).join("")}
  </div>
  <p class="level-note"><span><b>Stufe ${lv.n}</b> · ${lv.note}</span><span>${readCount} von ${list.length} gelesen</span></p>
  <ul class="stories">
    ${list.map(s => `<li><button class="row" data-story="${s.id}">
      <img class="thumb" src="${esc(s.cover)}" alt="" loading="lazy">
      <span class="txt">
        <p class="t">${esc(s.title)}</p>
        <p class="e">${esc(s.titleEn)}</p>
        <p class="m"><span>${s.pages.length} Seiten · ${words(s)} Wörter</span>${S.read[s.id] ? `<span class="done">${ICON_CHECK} Gelesen</span>` : ""}</p>
      </span>${ICON_CHEV}</button></li>`).join("")}
  </ul>
  <p class="foot">Geschichten von <a href="https://globalstorybooks.net" target="_blank" rel="noopener">Global Storybooks</a> und dem African Storybook, lizenziert unter <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. Wörter antippen öffnet <a href="https://www.dict.cc" target="_blank" rel="noopener">dict.cc</a>.</p>`;
  document.querySelectorAll("[data-level]").forEach(b => b.onclick = () => { S.level = +b.dataset.level; save(); renderHome(); });
  document.querySelectorAll("[data-story]").forEach(b => b.onclick = () => { location.hash = "s" + b.dataset.story; });
  window.scrollTo(0, 0);
}

/* ---------- reader ---------- */
function renderStory(id) {
  stopAudio();
  const s = STORIES.find(x => x.id === id); if (!s) { location.hash = "g"; return; }
  document.title = s.title + " · Lesebuch";
  const c = s.credits || {};
  const credits = [c.author && "Text: " + c.author, c.illus && "Bilder: " + c.illus, c.trans && "Übersetzung: " + c.trans, c.reader && "Sprecherin: " + c.reader].filter(Boolean).map(esc).join(" · ");
  const isRead = !!S.read[id];
  const same = STORIES.filter(x => x.level === s.level);
  const next = same.slice(same.indexOf(s) + 1).find(x => !S.read[x.id]) || same.find(x => x.id !== id && !S.read[x.id]);
  $("app").innerHTML = `
  <div class="bar">
    <button class="back" id="back">${ICON_BACK} Stufe ${s.level}</button>
    <label class="toggle"><span>Englisch</span><input type="checkbox" id="enToggle" ${S.showEn ? "checked" : ""}><span class="switch" aria-hidden="true"></span></label>
  </div>
  <section class="cover">
    <img src="${esc(s.cover)}" alt="">
    <h1>${esc(s.title)}</h1>
    <p class="en" ${S.showEn ? "" : "hidden"}>${esc(s.titleEn)}</p>
    <p class="credits">${credits}</p>
  </section>
  ${s.pages.map((p, i) => `
  <section class="page">
    ${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy">` : ""}
    <div class="ptext">
      <div class="body">
        <p class="de">${linkWords(p.de)}</p>
        <p class="en" ${S.showEn ? "" : "hidden"}>${esc(p.en)}</p>
      </div>
      ${p.a ? `<button class="play" data-audio="${esc(p.a)}" aria-label="Seite ${i + 1} anhören">${ICON_PLAY}</button>` : ""}
    </div>
    <p class="pno">Seite ${i + 1} von ${s.pages.length}</p>
  </section>`).join("")}
  <section class="end">
    <button class="cta ${isRead ? "ghost" : ""}" id="markRead">${isRead ? "Als ungelesen markieren" : "Fertig gelesen"}</button>
    ${next ? `<button class="cta ghost" id="nextStory">Nächste Geschichte: ${esc(next.title)}</button>` : ""}
    <p class="hint">Tippe auf ein Wort, um es in dict.cc nachzuschlagen.</p>
  </section>`;
  window.scrollTo(0, 0);
  $("back").onclick = () => { location.hash = "g"; };
  $("enToggle").onchange = e => { S.showEn = e.target.checked; save(); document.querySelectorAll(".en").forEach(el => el.hidden = !S.showEn); };
  $("markRead").onclick = () => {
    if (S.read[id]) { delete S.read[id]; toast("Als ungelesen markiert"); } else { S.read[id] = Date.now(); toast("Gelesen. Gut gemacht!"); }
    save(); const y = window.scrollY; renderStory(id); window.scrollTo(0, y);
  };
  if (next) $("nextStory").onclick = () => { location.hash = "s" + next.id; };
  document.querySelectorAll(".play").forEach(b => b.onclick = () => toggleAudio(b));
  document.querySelectorAll(".de a").forEach(a => a.addEventListener("click", () => { a.classList.add("hit"); setTimeout(() => a.classList.remove("hit"), 600); }));
}

/* ---------- audio (recordings by native speakers, streamed) ---------- */
function stopAudio() {
  if (audio) { audio.pause(); audio = null; }
  if (playingBtn) { playingBtn.classList.remove("on"); playingBtn.innerHTML = ICON_PLAY; playingBtn = null; }
}
function toggleAudio(btn) {
  if (playingBtn === btn) { stopAudio(); return; }
  stopAudio();
  audio = new Audio(btn.dataset.audio); playingBtn = btn;
  btn.classList.add("on"); btn.innerHTML = ICON_PAUSE;
  audio.onended = stopAudio;
  audio.onerror = () => { stopAudio(); toast(navigator.onLine ? "Audio konnte nicht geladen werden" : "Audio braucht eine Internetverbindung"); };
  audio.play().catch(() => {});
}

/* ---------- Klexikon ---------- */
async function loadKIndex() {
  if (!KIDX) { const r = await fetch("data/klexikon/index.json"); KIDX = await r.json(); }
  return KIDX;
}
async function loadKLevel(lv) {
  if (!KTEXT[lv]) { const r = await fetch("data/klexikon/l" + lv + ".json"); KTEXT[lv] = await r.json(); }
  return KTEXT[lv];
}
function minutes(w) { return Math.max(1, Math.round(w / 120)); }
async function renderKList() {
  stopAudio(); stopSpeech();
  document.title = "Klexikon · Lesebuch";
  $("app").innerHTML = `<div class="bar"><a class="back" href="#">${ICON_BACK} Start</a></div><p class="loading">Artikel werden geladen …</p>`;
  const idx = await loadKIndex();
  const lv = KLEVELS[S.klevel - 1];
  const rows = [];
  idx.forEach((a, i) => { if (a[1] === S.klevel) rows.push([a, i]); });
  const readCount = rows.filter(([a]) => S.kread[a[0]]).length;
  $("app").innerHTML = `
  <div class="bar"><a class="back" href="#">${ICON_BACK} Start</a></div>
  <header class="home-head">
    <h1>Klexikon</h1>
    <p>Kurze Sachtexte auf Deutsch, für Kinder geschrieben</p>
  </header>
  <div class="levels three" role="group" aria-label="Stufe wählen">
    ${KLEVELS.map(l => `<button data-klevel="${l.n}" aria-pressed="${l.n === S.klevel}"><span class="n">${l.n}</span><span class="c">${l.name}</span></button>`).join("")}
  </div>
  <p class="level-note"><span><b>Stufe ${lv.n}</b> · ${lv.note}</span><span>${readCount} von ${rows.length} gelesen</span></p>
  <ul class="stories klist">
    ${rows.map(([a, i]) => `<li><a class="row" href="#a${i}">
      <span class="txt">
        <p class="t">${esc(a[0])}</p>
        <p class="m"><span>${a[3] ? esc(a[3]) + " · " : ""}${a[2]} Wörter · ${minutes(a[2])} Min.</span>${S.kread[a[0]] ? `<span class="done">${ICON_CHECK} Gelesen</span>` : ""}</p>
      </span>${ICON_CHEV}</a></li>`).join("")}
  </ul>
  <p class="foot">Texte aus dem <a href="https://klexikon.zum.de" target="_blank" rel="noopener">Klexikon</a>, lizenziert unter <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>. Die Stufen hat Lesebuch automatisch berechnet.</p>`;
  document.querySelectorAll("[data-klevel]").forEach(b => b.onclick = () => { S.klevel = +b.dataset.klevel; save(); renderKList(); });
}
async function renderArticle(i) {
  stopAudio(); stopSpeech();
  const idx = await loadKIndex(); const a = idx[i];
  if (!a) { location.hash = "k"; return; }
  $("app").innerHTML = `<div class="bar"><a class="back" href="#k">${ICON_BACK} Stufe ${a[1]}</a></div><p class="loading">Artikel wird geladen …</p>`;
  const blocks = (await loadKLevel(a[1]))[a[0]] || [];
  document.title = a[0] + " · Lesebuch";
  const isRead = !!S.kread[a[0]];
  let next = -1;
  for (let j = i + 1; j < idx.length; j++) if (idx[j][1] === a[1] && !S.kread[idx[j][0]]) { next = j; break; }
  let n = 0;
  $("app").innerHTML = `
  <div class="bar"><a class="back" href="#k">${ICON_BACK} Stufe ${a[1]}</a></div>
  <article class="article">
    <h1>${esc(a[0])}</h1>
    <p class="credits">${a[3] ? esc(a[3]) + " · " : ""}${a[2]} Wörter · etwa ${minutes(a[2])} Min.</p>
    ${blocks.map(b => b.h ? `<h2>${esc(b.h)}</h2>` : `<div class="ptext"><div class="body"><p class="de">${linkWords(b.p)}</p></div><button class="play" data-say="${n++}" aria-label="Absatz anhören">${ICON_PLAY}</button></div>`).join("")}
  </article>
  <section class="end">
    <button class="cta ${isRead ? "ghost" : ""}" id="markRead">${isRead ? "Als ungelesen markieren" : "Fertig gelesen"}</button>
    ${next >= 0 ? `<a class="cta ghost" href="#a${next}">Nächster Artikel: ${esc(idx[next][0])}</a>` : ""}
    <p class="hint">Quelle: <a href="https://klexikon.zum.de/wiki/${encodeURIComponent(a[0].replace(/ /g, "_"))}" target="_blank" rel="noopener">Klexikon, „${esc(a[0])}“</a>, CC BY-SA 4.0</p>
  </section>`;
  window.scrollTo(0, 0);
  const paras = blocks.filter(b => b.p).map(b => b.p);
  document.querySelectorAll("[data-say]").forEach(b => b.onclick = () => toggleSpeech(b, paras[+b.dataset.say]));
  $("markRead").onclick = () => {
    if (S.kread[a[0]]) { delete S.kread[a[0]]; toast("Als ungelesen markiert"); } else { S.kread[a[0]] = Date.now(); toast("Gelesen. Gut gemacht!"); }
    save(); const y = window.scrollY; renderArticle(i).then(() => window.scrollTo(0, y));
  };
  document.querySelectorAll(".de a").forEach(x => x.addEventListener("click", () => { x.classList.add("hit"); setTimeout(() => x.classList.remove("hit"), 600); }));
}

/* device voice for Klexikon (it has no recordings) */
let speakBtn = null, germanVoice = null;
function pickVoice() {
  try { const vs = speechSynthesis.getVoices().filter(v => /^de/i.test(v.lang)); germanVoice = vs.find(v => /premium|enhanced|erweitert/i.test(v.name)) || vs[0] || null; } catch (e) {}
}
if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function stopSpeech() {
  try { speechSynthesis.cancel(); } catch (e) {}
  if (speakBtn) { speakBtn.classList.remove("on"); speakBtn.innerHTML = ICON_PLAY; speakBtn = null; }
}
function toggleSpeech(btn, text) {
  if (speakBtn === btn) { stopSpeech(); return; }
  stopSpeech();
  if (!("speechSynthesis" in window)) { toast("Vorlesen ist hier nicht verfügbar"); return; }
  const u = new SpeechSynthesisUtterance(text); u.lang = "de-DE"; u.rate = 0.95; if (germanVoice) u.voice = germanVoice;
  u.onend = u.onerror = () => { if (speakBtn === btn) stopSpeech(); };
  speakBtn = btn; btn.classList.add("on"); btn.innerHTML = ICON_PAUSE;
  speechSynthesis.speak(u);
}

/* ---------- routing ---------- */
function route() {
  const h = location.hash;
  let m;
  if ((m = h.match(/^#s(\d{4})$/))) renderStory(m[1]);
  else if (h === "#g") renderHome();
  else if (h === "#k") renderKList();
  else if ((m = h.match(/^#a(\d+)$/))) renderArticle(+m[1]);
  else renderStart();
}
window.addEventListener("hashchange", route);

(async function boot() {
  try {
    const r = await fetch("data/stories.json"); STORIES = await r.json();
    route();
  } catch (e) {
    $("app").innerHTML = `<p class="loading">Die Geschichten konnten nicht geladen werden. Prüfe die Internetverbindung und öffne die App erneut.</p>`;
  }
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
