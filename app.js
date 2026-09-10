const fallback = {
  generatedAt: "2026-09-10T17:53:01+03:00",
  sourceTime: "17:53:01",
  temperature: "34.4", humidity: "95.0",
  timeline: [["00:00:02",0,1],["00:08:02",0,1],["00:08:04",0,0],["00:09:01",0,0],["00:09:03",0,1],["08:15:24",0,1],["08:15:26",1,1],["08:16:01",1,1],["08:16:03",1,0],["09:59:51",1,0],["09:59:53",0,0],["10:01:01",0,0],["10:01:03",0,1],["17:53:01",0,1]],
  logs: ["GEN turned ON: 12:00 AM Till: 12:08 AM (8M)","GEN turned OFF: 12:08 AM Till: 12:09 AM (1M)","GEN turned ON: 12:09 AM Till: 08:15 AM (8H6M)","EDL turned ON: 08:15 AM Till: 08:16 AM (1M)","EDL turned ON: 08:16 AM Till: 09:59 AM (1H43M)","GEN turned OFF: 09:59 AM Till: 10:01 AM (2M)","GEN turned ON: 10:01 AM Till: 05:53 PM (7H52M)"],
  month: { label: "September 2026", edl: 35.8, gen: 173, none: 1 }
};

const byId = id => document.getElementById(id);
const seconds = time => { const [h,m,s] = time.split(":").map(Number); return h * 3600 + m * 60 + s; };
const titleTime = time => time.slice(0,5);
const stateName = (edl, gen) => edl ? "EDL" : gen ? "Generator" : "No supply";

function setPower(data) {
  const latest = data.timeline.at(-1);
  const [, edl, gen] = latest;
  byId("edl-state").textContent = edl ? "Online" : "Offline";
  byId("gen-state").textContent = gen ? "Running" : "Stopped";
  byId("edl-detail").textContent = edl ? "Supplying power now" : "Not supplying power";
  byId("gen-detail").textContent = gen ? "Supplying power now" : "Not supplying power";
  byId("edl-dot").className = `status-dot ${edl ? "bright" : "dark"}`;
  byId("gen-dot").className = `status-dot ${gen ? "bright" : "dark"}`;
  byId("temperature").textContent = `${data.temperature}°`;
  byId("humidity").innerHTML = `${data.humidity}<span class="percent">%</span>`;
  byId("snapshot-time").textContent = new Intl.DateTimeFormat("en-GB", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit", hour12:false, timeZone:"Asia/Beirut" }).format(new Date(data.generatedAt)).replace(",", " ·").toUpperCase();
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
  const [start, edl, gen] = rows.at(-1);
  byId("timeline-caption").textContent = `Current source · ${stateName(edl, gen)}`;
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
  document.querySelector(".event-count").textContent = `${data.logs.length} events`;
}

function renderMonth(data) {
  const values = data.month, total = values.edl + values.gen + values.none;
  const genPct = values.gen / total * 100, edlPct = values.edl / total * 100;
  byId("donut").style.background = `conic-gradient(var(--orange) 0 ${genPct}%, var(--green) ${genPct}% ${genPct + edlPct}%, var(--red) ${genPct + edlPct}% 100%)`;
  byId("tracked-hours").textContent = total.toFixed(1);
  byId("month-key").innerHTML = [["gen-dot","Generator",values.gen],["edl-dot","EDL",values.edl],["none-dot","No power",values.none]].map(([dot,label,value]) => `<li><span class="key-dot ${dot}"></span><div><b>${label}</b><small>${value.toFixed(1)} h · ${(value / total * 100).toFixed(1)}%</small></div></li>`).join("");
  document.querySelector(".month-panel .eyebrow").textContent = values.label.toUpperCase();
  document.querySelector(".month-note").textContent = `Figures are calculated from the source’s ${values.label} statistics.`;
}

function render(data) { setPower(data); renderTimeline(data); renderLogs(data); renderMonth(data); }
async function load() { try { const response = await fetch(`data/status.json?cache=${Date.now()}`); if (!response.ok) throw new Error("No fresh data"); return await response.json(); } catch { return fallback; } }
load().then(render);
setInterval(() => load().then(render), 30000);
