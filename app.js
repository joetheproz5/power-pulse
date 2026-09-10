const fallback = {
  generatedAt: "2026-09-10T17:53:01+03:00",
  sourceTime: "17:53:01",
  temperature: "34.4", humidity: "95.0",
  timeline: [["00:00:02",0,1],["00:08:02",0,1],["00:08:04",0,0],["00:09:01",0,0],["00:09:03",0,1],["08:15:24",0,1],["08:15:26",1,1],["08:16:01",1,1],["08:16:03",1,0],["09:59:51",1,0],["09:59:53",0,0],["10:01:01",0,0],["10:01:03",0,1],["17:53:01",0,1]],
  logs: ["GEN turned ON: 12:00 AM Till: 12:08 AM (8M)","GEN turned OFF: 12:08 AM Till: 12:09 AM (1M)","GEN turned ON: 12:09 AM Till: 08:15 AM (8H6M)","EDL turned ON: 08:15 AM Till: 08:16 AM (1M)","EDL turned ON: 08:16 AM Till: 09:59 AM (1H43M)","GEN turned OFF: 09:59 AM Till: 10:01 AM (2M)","GEN turned ON: 10:01 AM Till: 05:53 PM (7H52M)"],
  month: { label: "September 2026", edl: 35.8, gen: 173, none: 1 }
};

const translations = {
  en: { settings:"Settings", language:"Language", notifications:"Notifications", comingSoon:"Coming soon", lebanon:"Lebanon", electricityStatus:"ELECTRICITY STATUS", powerStatus:"Power status", intro:"Clear, current information for Hart El Sett.", sourceSnapshot:"Source snapshot", localTime:"Local time · Asia/Beirut", nationalGrid:"National grid", privateGenerator:"Private generator", ambientConditions:"AMBIENT CONDITIONS", temperature:"Temperature", humidity:"Humidity", conditionsNote:"Recorded with the latest power status.", powerComingFrom:"POWER IS COMING FROM", online:"Online", offline:"Offline", running:"Running", stopped:"Stopped", supplying:"Supplying power now", notSupplying:"Not supplying power", generator:"GENERATOR", noPower:"NO POWER", currentSource:"Current source", edl:"EDL", noSupply:"No supply", eventCount:"events", generatorLabel:"Generator", noPowerLabel:"No power", trackedHours:"tracked hours", today:"TODAY / WED 10 SEP", powerTimeline:"Power timeline", eventStream:"EVENT STREAM", todaysActivity:"Today’s activity", monthToDate:"Month to date", footerTitle:"HART EL SETT · POWER STATUS MONITOR", footerRefresh:"Automatic data refresh enabled" },
  ar: { settings:"الإعدادات", language:"اللغة", notifications:"الإشعارات", comingSoon:"قريباً", lebanon:"لبنان", electricityStatus:"حالة الكهرباء", powerStatus:"حالة الكهرباء", intro:"معلومات واضحة ومحدّثة لمنطقة حرش الست.", sourceSnapshot:"آخر تحديث", localTime:"التوقيت المحلي · بيروت", nationalGrid:"كهرباء الدولة", privateGenerator:"المولد الخاص", ambientConditions:"الظروف الجوية", temperature:"الحرارة", humidity:"الرطوبة", conditionsNote:"تم تسجيلها مع آخر حالة للكهرباء.", powerComingFrom:"الكهرباء تأتي حالياً من", online:"متوفرة", offline:"غير متوفرة", running:"يعمل", stopped:"متوقف", supplying:"يوفّر الكهرباء الآن", notSupplying:"لا يوفّر الكهرباء", generator:"المولد", noPower:"لا كهرباء", currentSource:"المصدر الحالي", edl:"كهرباء الدولة", noSupply:"لا كهرباء", eventCount:"أحداث", generatorLabel:"المولد", noPowerLabel:"لا كهرباء", trackedHours:"ساعات مسجلة", today:"اليوم / الأربعاء ١٠ أيلول", powerTimeline:"مخطط الكهرباء", eventStream:"سجل الأحداث", todaysActivity:"نشاط اليوم", monthToDate:"إجمالي الشهر", footerTitle:"حرش الست · مراقبة حالة الكهرباء", footerRefresh:"تحديث البيانات تلقائياً" }
};
let activeLanguage = localStorage.getItem("power-language") || "en";
let currentData = null;
const byId = id => document.getElementById(id);
const t = key => translations[activeLanguage][key] || translations.en[key] || key;
const seconds = time => { const [h,m,s] = time.split(":").map(Number); return h * 3600 + m * 60 + s; };
const titleTime = time => time.slice(0,5);
const stateName = (edl, gen) => edl ? t("edl") : gen ? t("generatorLabel") : t("noSupply");
const arabicMonths = { January:"يناير", February:"فبراير", March:"مارس", April:"أبريل", May:"مايو", June:"يونيو", July:"يوليو", August:"أغسطس", September:"سبتمبر", October:"أكتوبر", November:"نوفمبر", December:"ديسمبر" };
const localizedMonth = label => activeLanguage === "ar" ? label.replace(/^[A-Za-z]+/, month => arabicMonths[month] || month) : label.toUpperCase();

function applyLanguage(language) {
  activeLanguage = language;
  localStorage.setItem("power-language", language);
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  document.querySelectorAll("[data-i18n]").forEach(element => { element.textContent = t(element.dataset.i18n); });
  document.querySelectorAll("[data-i18n-aria]").forEach(element => { element.setAttribute("aria-label", t(element.dataset.i18nAria)); });
  document.querySelectorAll(".language-option").forEach(button => button.classList.toggle("is-selected", button.dataset.language === language));
  if (currentData) render(currentData);
}

function setPower(data) {
  const latest = data.timeline.at(-1);
  const [, edl, gen] = latest;
  const source = edl ? t("edl") : gen ? t("generator") : t("noPower");
  byId("edl-state").textContent = edl ? t("online") : t("offline");
  byId("gen-state").textContent = gen ? t("running") : t("stopped");
  byId("edl-detail").textContent = edl ? t("supplying") : t("notSupplying");
  byId("gen-detail").textContent = gen ? t("supplying") : t("notSupplying");
  byId("edl-card").classList.toggle("is-active", Boolean(edl));
  byId("gen-card").classList.toggle("is-active", Boolean(gen));
  byId("edl-mark").textContent = edl ? "✓" : "—";
  byId("gen-mark").textContent = gen ? "✓" : "—";
  byId("edl-mark").className = `status-mark ${edl ? "bright" : "dark"}`;
  byId("gen-mark").className = `status-mark ${gen ? "bright" : "dark"}`;
  byId("active-source").className = `active-source ${edl ? "edl" : gen ? "gen" : "none"}`;
  byId("active-source-name").textContent = source;
  byId("active-source-symbol").textContent = !edl && !gen ? "—" : "✓";
  byId("temperature").textContent = `${data.temperature}°`;
  byId("humidity").innerHTML = `${data.humidity}<span class="percent">%</span>`;
  const locale = activeLanguage === "ar" ? "ar-LB" : "en-GB";
  byId("snapshot-time").textContent = new Intl.DateTimeFormat(locale, { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit", hour12:false, timeZone:"Asia/Beirut" }).format(new Date(data.generatedAt)).replace(",", " ·").toUpperCase();
}

function addSegment(track, className, start, end) {
  const node = document.createElement("span");
  const startPct = (seconds(start) / 86400) * 100;
  const width = Math.max(.18, ((seconds(end) - seconds(start)) / 86400) * 100);
  node.className = `segment ${className}`;
  node.style.left = `${startPct}%`; node.style.width = `${width}%`;
  node.title = `${titleTime(start)}–${titleTime(end)}`;
  track.append(node);
}

function renderTimeline(data) {
  ["edl-track", "gen-track", "none-track"].forEach(id => byId(id).replaceChildren());
  const rows = data.timeline;
  rows.forEach((row, index) => {
    const [time, edl, gen] = row;
    const end = rows[index + 1]?.[0] || time;
    if (edl) addSegment(byId("edl-track"), "edl-segment", time, end);
    if (gen) addSegment(byId("gen-track"), "gen-segment", time, end);
    if (!edl && !gen) addSegment(byId("none-track"), "none-segment", time, end);
  });
  const [latest, edl, gen] = rows.at(-1);
  let start = latest;
  for (let index = rows.length - 2; index >= 0; index -= 1) {
    if (rows[index][1] !== edl || rows[index][2] !== gen) break;
    start = rows[index][0];
  }
  byId("timeline-caption").textContent = `${t("currentSource")} · ${stateName(edl, gen)}`;
  byId("timeline-range").textContent = `${titleTime(start)} — ${data.sourceTime.slice(0,5)}`;
}

function classifyLog(log) { return log.startsWith("EDL") ? "edl" : log.includes("OFF") ? "none" : "gen"; }
function renderLogs(data) {
  const list = byId("event-list"); list.replaceChildren();
  data.logs.forEach((log, index) => {
    const match = log.match(/(?:ON|OFF):\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
    const time = match ? new Date(`2000-01-01 ${match[1]}`).toLocaleTimeString("en-GB", {hour:"2-digit",minute:"2-digit",hour12:false}) : "—";
    const item = document.createElement("li"); item.className = `event ${classifyLog(log)}${index === data.logs.length - 1 ? " current" : ""}`;
    item.innerHTML = `<time>${time}</time><span class="event-marker"></span><p><strong>${log.replace(/ Till:.*/, "")}</strong><small>${log.includes(" Till:") ? "Until " + log.split(" Till:")[1] : "Source event"}</small></p>`;
    list.append(item);
  });
  document.querySelector(".event-count").textContent = `${data.logs.length} ${t("eventCount")}`;
}

function renderMonth(data) {
  const values = data.month, total = values.edl + values.gen + values.none;
  byId("tracked-hours").textContent = total.toFixed(1);
  byId("month-key").innerHTML = [["gen-dot",t("generatorLabel"),values.gen],["edl-dot",t("edl"),values.edl],["none-dot",t("noPowerLabel"),values.none]].map(([dot,label,value]) => `<li><span class="key-dot ${dot}"></span><div><b>${label}</b><small>${value.toFixed(1)} h · ${(value / total * 100).toFixed(1)}%</small></div></li>`).join("");
  byId("month-label").textContent = localizedMonth(values.label);
  byId("month-note").textContent = activeLanguage === "ar" ? `يتم احتساب الأرقام من إحصاءات ${localizedMonth(values.label)}.` : `Figures are calculated from the source’s ${values.label} statistics.`;
}

function render(data) { currentData = data; setPower(data); renderTimeline(data); renderLogs(data); renderMonth(data); }
async function load() { try { const response = await fetch(`data/status.json?cache=${Date.now()}`); if (!response.ok) throw new Error("No fresh data"); return await response.json(); } catch { return fallback; } }
applyLanguage(activeLanguage);
load().then(render);
setInterval(() => load().then(render), 30000);

const settingsButton = byId("settings-button");
const settingsPanel = byId("settings-panel");
settingsButton.addEventListener("click", () => {
  const isOpen = !settingsPanel.hidden;
  settingsPanel.hidden = isOpen;
  settingsButton.setAttribute("aria-expanded", String(!isOpen));
});
document.querySelectorAll(".language-option").forEach(button => button.addEventListener("click", () => {
  applyLanguage(button.dataset.language);
  settingsPanel.hidden = true;
  settingsButton.setAttribute("aria-expanded", "false");
}));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js"));
}
