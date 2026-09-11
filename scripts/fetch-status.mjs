import { writeFile } from "node:fs/promises";

const source = "https://info.ghawi.me/";
const weatherUrl = "https://api.open-meteo.com/v1/forecast?latitude=33.8246993&longitude=35.5671541&current=temperature_2m,relative_humidity_2m&timezone=Asia%2FBeirut";
const [page, chart, weather] = await Promise.all([
  fetch(source, { headers: { "user-agent": "PowerPulse status updater" } }).then(r => r.text()),
  fetch(`${source}chart_summary.php`, { headers: { "user-agent": "PowerPulse status updater" } }).then(r => r.json()),
  fetch(weatherUrl).then(r => r.json())
]);
const find = pattern => page.match(pattern)?.[1]?.trim();
const logs = [...page.matchAll(/<font[^>]*>(.*?)<\/font>/gis)].map(m => m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()).filter(line => /turned (ON|OFF)/i.test(line));
const entries = chart.rows.map(row => [row.c[0].v.join(":"), Number(row.c[1].v), Number(row.c[2].v)]);
const monthLabel = find(/<dtitle>([A-Za-z]+\s+\d{4})\s+statistics<\/dtitle>/i) || "Current month";
const pie = [...page.matchAll(/y:\s*([\d.]+),\s*name:\s*"(EDL|GEN|No Power)"/g)].reduce((all, [, value, name]) => ({ ...all, [name]: Number(value) }), {});
const payload = {
  generatedAt: new Date().toISOString(), sourceTime: find(/Updated:\s*([\d:]+)/i) || entries.at(-1)?.[0] || "—",
  temperature: weather.current?.temperature_2m ?? "—", humidity: weather.current?.relative_humidity_2m ?? "—",
  timeline: entries, logs, month: { label: monthLabel, edl: pie.EDL || 0, gen: pie.GEN || 0, none: pie["No Power"] || 0 }
};
await writeFile("data/status.json", `${JSON.stringify(payload, null, 2)}\n`);
