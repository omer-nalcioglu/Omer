/* ---------- yardımcılar ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const trn = v => String(v ?? "").toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const HOUR = 3600000, DAY = 24 * HOUR;
const sod = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const atHour = (dayOffset, h = 17, m = 0) => { const d = new Date(sod() + dayOffset * DAY); d.setHours(h, m, 0, 0); return d.getTime(); };
const hm = t => new Date(t).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
function dayLabel(t) {
  const d = Math.round((sod(t) - sod()) / DAY);
  if (d === 0) return "Bugün"; if (d === 1) return "Yarın"; if (d === -1) return "Dün";
  if (d > 1 && d < 7) return new Date(t).toLocaleDateString("tr-TR", { weekday: "long" });
  return new Date(t).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}
const when = t => `${dayLabel(t)} ${hm(t)}`;
function ago(t) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "şimdi"; if (m < 60) return `${m} dk önce`; const h = Math.round(m / 60); if (h < 24) return `${h} sa önce`; return dayLabel(t);
}
const plural = (n, w) => `${n} ${w}`;
const clock = from => { const s = Math.max(0, Math.floor((Date.now() - from) / 1000)); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(x => String(x).padStart(2, "0")).join(":"); };

/* çizgi ikonları: tek set, 24px ızgara; yazının yanında anlam taşır, tek başına değil */
const P = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  menu: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  bell: '<path d="M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 004 0"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  chev: '<path d="M9 6l6 6-6 6"/>', back: '<path d="M15 5l-7 7 7 7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14a6 6 0 013.5 6"/>',
  box: '<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  bolt: '<path d="M13 3L5 13.5h6L10 21l9-11h-6z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  play: '<path d="M7 5l12 7-12 7z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  send: '<path d="M4 12l16-8-6 16-3-7z"/>',
  flow: '<rect x="3" y="4" width="6" height="5" rx="1.5"/><rect x="15" y="4" width="6" height="5" rx="1.5"/><rect x="9" y="15" width="6" height="5" rx="1.5"/><path d="M9 6.5h6M6 9v3a3 3 0 003 3M18 9v3a3 3 0 01-3 3"/>',
  chart: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  truck: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
  type: '<path d="M4 7V5h16v2M9 19h6M12 5v14"/>',
  wifi: '<path d="M2 8.5a15 15 0 0120 0M5 12a10 10 0 0114 0M8.5 15.5a5 5 0 017 0"/><path d="M12 19h.01"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  money: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
  moon: '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
  hand: '<path d="M8 13V6a1.5 1.5 0 013 0v5M11 11V4.5a1.5 1.5 0 013 0V11M14 11V6a1.5 1.5 0 013 0v7c0 4-2.5 7-6.5 7-3 0-4.5-1.5-6-4L3 13.5a1.5 1.5 0 012.5-1.5L8 15"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
};
const ic = (n, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ""}</svg>`;

const AVC = ["#4f46e5", "#c2410c", "#0f766e", "#7c3aed", "#be185d", "#b45309", "#1d4ed8", "#15803d", "#0e7490"];
const initials = n => n.split(" ").map(w => w[0]).slice(0, 2).join("").toLocaleUpperCase("tr-TR");
const avatar = (p, cls = "") => p ? `<span class="av ${cls}" style="background:${AVC[[...p.id].reduce((a, c) => a + c.charCodeAt(0), 0) % AVC.length]}" aria-hidden="true">${esc(initials(p.name))}</span>` : "";
