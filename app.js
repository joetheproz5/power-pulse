const fallback={generatedAt:"2026-09-10T17:56:01+03:00",sourceTime:"17:56:01",temperature:"34.3",humidity:"95.0",timeline:[["00:00:02",0,1],["00:08:04",0,0],["00:09:03",0,1],["08:15:26",1,1],["08:16:03",1,0],["09:59:53",0,0],["10:01:03",0,1],["17:56:01",0,1]],logs:["GEN turned ON: 12:00 AM Till: 08:15 AM (8H15M)","EDL turned ON: 08:15 AM Till: 09:59 AM (1H44M)","GEN turned OFF: 09:59 AM Till: 10:01 AM (2M)","GEN turned ON: 10:01 AM Till: 05:56 PM (7H55M)"],month:{label:"September 2026",edl:35.8,gen:173,none:1}};
const SOURCE="https://info.ghawi.me/";
const REFRESH_MS=10000;
const PROXY=[
  {build:url=>`https://r.jina.ai/${url}`,headers:{"x-return-format":"html"}},
  {build:url=>`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,headers:{}},
  {build:url=>url,headers:{}}
];
const bestProxy={};
const unwrap=text=>text.replace(/^\s*<html><head><\/head><body>/i,"").replace(/<\/body><\/html>\s*$/i,"");
async function fetchText(url){
  const start=bestProxy[url]||0;
  for(let i=0;i<PROXY.length;i++){
    const entry=PROXY[(start+i)%PROXY.length];
    try{
      const response=await fetch(entry.build(url),{cache:"no-store",headers:entry.headers,signal:AbortSignal.timeout(9000)});
      if(!response.ok)throw Error(`HTTP ${response.status}`);
      const text=unwrap(await response.text());
      if(!text.trim())throw Error("empty body");
      bestProxy[url]=PROXY.indexOf(entry);
      return text;
    }catch{/* try the next proxy */}
  }
  throw Error(`unreachable: ${url}`);
}
const findIn=page=>pattern=>page.match(pattern)?.[1]?.trim();
function buildPayload(page,chart){
  const find=findIn(page);
  const logs=[...page.matchAll(/<font[^>]*>(.*?)<\/font>/gis)].map(m=>m[1].replace(/<[^>]+>/g,"").replace(/&nbsp;/g," ").trim()).filter(line=>/turned (ON|OFF)/i.test(line));
  const entries=chart.rows.map(row=>[row.c[0].v.join(":"),Number(row.c[1].v),Number(row.c[2].v)]);
  const monthLabel=find(/<dtitle>([A-Za-z]+\s+\d{4})\s+statistics<\/dtitle>/i)||"Current month";
  const pie=[...page.matchAll(/y:\s*([\d.]+),\s*name:\s*"(EDL|GEN|No Power)"/g)].reduce((all,[,value,name])=>({...all,[name]:Number(value)}),{});
  return{
    generatedAt:new Date().toISOString(),
    sourceTime:find(/Updated:\s*([\d:]+)/i)||entries.at(-1)?.[0]||"—",
    temperature:find(/Temperature:\s*([\d.]+)C/i)||"—",
    humidity:find(/Humidity:\s*([\d.]+)%/i)||"—",
    timeline:entries,logs,
    month:{label:monthLabel,edl:pie.EDL||0,gen:pie.GEN||0,none:pie["No Power"]||0}
  };
}
async function loadLive(){
  const[page,chart]=await Promise.all([fetchText(SOURCE),fetchText(`${SOURCE}chart_summary.php`)]);
  const payload=buildPayload(page,JSON.parse(chart));
  if(!payload.timeline.length||payload.sourceTime==="—")throw Error("bad payload");
  return payload;
}
async function loadSnapshot(){
  const response=await fetch(`data/status.json?cache=${Date.now()}`,{cache:"no-store"});
  if(!response.ok)throw Error(`HTTP ${response.status}`);
  return response.json();
}
async function load(){
  try{return await loadLive()}catch{
    try{return await loadSnapshot()}catch{return fallback}
  }
}
const copy={en:{settings:"Settings",language:"Language",notifications:"Notifications",comingSoon:"Coming soon",connected:"Connected",liveStatus:"LIVE STATUS",powerMonitor:"Power Monitor",lastUpdate:"Last update",supplyingNow:"SUPPLYING YOUR HOME NOW",powerRoute:"Power route",currentRoute:"Current route",nationalGrid:"National grid",privateGenerator:"Private generator",homeSupply:"Home supply",environment:"Environment",temperature:"Temperature",humidity:"Humidity",systemState:"System state",monthToDate:"Month to date",trackedHours:"tracked hours",today:"TODAY / WED 10 SEP",powerHistory:"Power history",generator:"Generator",noPower:"No power",eventLog:"EVENT LOG",todaysActivity:"Today’s activity",footerTitle:"HART EL SETT · POWER MONITOR",footerRefresh:"Live data · updates every 10 seconds",online:"Online",offline:"Offline",running:"Running",stopped:"Stopped",generatorActive:"Generator active",gridActive:"EDL active",noSupply:"No power available",gridUnavailable:"EDL is unavailable",generatorUnavailable:"Generator is unavailable",generatorNow:"Generator is supplying power now",gridNow:"EDL is supplying power now",events:"events",edl:"EDL"},ar:{settings:"الإعدادات",language:"اللغة",notifications:"الإشعارات",comingSoon:"قريباً",connected:"متصل",liveStatus:"الحالة المباشرة",powerMonitor:"مراقبة الكهرباء",lastUpdate:"آخر تحديث",supplyingNow:"الكهرباء تصل إلى المنزل الآن من",powerRoute:"مسار الكهرباء",currentRoute:"المسار الحالي",nationalGrid:"كهرباء الدولة",privateGenerator:"المولد الخاص",homeSupply:"كهرباء المنزل",environment:"البيئة",temperature:"الحرارة",humidity:"الرطوبة",systemState:"حالة النظام",monthToDate:"إجمالي الشهر",trackedHours:"ساعات مسجلة",today:"اليوم / الأربعاء ١٠ أيلول",powerHistory:"سجل الكهرباء",generator:"المولد",noPower:"لا كهرباء",eventLog:"سجل الأحداث",todaysActivity:"نشاط اليوم",footerTitle:"حرش الست · مراقبة الكهرباء",footerRefresh:"بيانات مباشرة · تحديث كل ١٠ ثوانٍ",online:"متوفرة",offline:"غير متوفرة",running:"يعمل",stopped:"متوقف",generatorActive:"المولد يعمل",gridActive:"كهرباء الدولة متوفرة",noSupply:"لا كهرباء متوفرة",gridUnavailable:"كهرباء الدولة غير متوفرة",generatorUnavailable:"المولد متوقف",generatorNow:"المولد يوفّر الكهرباء الآن",gridNow:"كهرباء الدولة توفّر الكهرباء الآن",events:"أحداث",edl:"كهرباء الدولة"}};
let language=localStorage.getItem("power-language")||"en",currentData=null;
const $=id=>document.getElementById(id),t=key=>copy[language][key]||copy.en[key]||key;
const NOTIFICATION_PREFERENCE="power-notifications-enabled",NOTIFICATION_SOURCE="power-notifications-source";
const notificationCopy={en:{on:"On",off:"Off",ready:"Turn on alerts for power-source changes.",enabled:"Alerts are on for source changes.",unsupported:"Notifications are not supported in this browser.",denied:"Notifications are blocked in browser settings.",install:"On iPhone, add this app to your Home Screen first.",enabledTitle:"Power alerts enabled",enabledBody:"You will be alerted when the power source changes.",changeTitle:"Power source changed",gridBody:"EDL is now supplying your home.",generatorBody:"Your generator is now supplying your home.",offBody:"There is currently no power supply."},ar:{on:"مفعّلة",off:"متوقفة",ready:"فعّل التنبيهات عند تغيّر مصدر الكهرباء.",enabled:"التنبيهات مفعّلة عند تغيّر المصدر.",unsupported:"التنبيهات غير مدعومة في هذا المتصفح.",denied:"تم حظر التنبيهات من إعدادات المتصفح.",install:"على iPhone، أضف التطبيق إلى الشاشة الرئيسية أولاً.",enabledTitle:"تم تفعيل تنبيهات الكهرباء",enabledBody:"سيصلك تنبيه عند تغيّر مصدر الكهرباء.",changeTitle:"تغيّر مصدر الكهرباء",gridBody:"كهرباء الدولة توفّر الكهرباء الآن.",generatorBody:"المولد يوفّر الكهرباء الآن.",offBody:"لا يوجد مصدر كهرباء حالياً."}};
const seconds=time=>{const[h,m,s]=time.split(":").map(Number);return h*3600+m*60+s};
const timeLabel=time=>time.slice(0,5);
function applyLanguage(next){language=next;localStorage.setItem("power-language",next);document.documentElement.lang=next;document.documentElement.dir=next==="ar"?"rtl":"ltr";document.querySelectorAll("[data-i18n]").forEach(el=>el.textContent=t(el.dataset.i18n));document.querySelectorAll("[data-i18n-aria]").forEach(el=>el.setAttribute("aria-label",t(el.dataset.i18nAria)));document.querySelectorAll(".language-option").forEach(el=>el.classList.toggle("is-selected",el.dataset.language===next));updateNotificationUI();if(currentData)render(currentData)}
function setState(data){const[,edl,gen]=data.timeline.at(-1),source=edl?t("edl"):gen?t("generator"):t("noPower"),edlCable=$("cable-edl"),genCable=$("cable-gen");$("edl-card").classList.toggle("is-active",Boolean(edl));$("edl-card").classList.toggle("grid-active",Boolean(edl));$("gen-card").classList.toggle("is-active",Boolean(gen));$("edl-state").textContent=edl?t("online"):t("offline");$("gen-state").textContent=gen?t("running"):t("stopped");edlCable.classList.toggle("is-active",Boolean(edl));genCable.classList.toggle("is-active",Boolean(gen));const home=$("home-module");home.classList.toggle("on-grid",Boolean(edl));home.classList.toggle("on-gen",!edl&&Boolean(gen));home.classList.toggle("off",!edl&&!gen);$("home-source").textContent=source;$("route-live").classList.toggle("is-live",Boolean(edl||gen));$("route-detail").textContent=edl?t("gridNow"):gen?t("generatorNow"):t("noSupply");$("temperature").textContent=`${data.temperature}°`;$("humidity").innerHTML=`${data.humidity}<span>%</span>`;const locale=language==="ar"?"ar-LB":"en-GB";$("snapshot-time").textContent=new Intl.DateTimeFormat(locale,{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Asia/Beirut"}).format(new Date(data.generatedAt)).replace(","," ·").toUpperCase();let start=data.timeline.at(-1)[0];for(let i=data.timeline.length-2;i>=0;i--){if(data.timeline[i][1]!==edl||data.timeline[i][2]!==gen)break;start=data.timeline[i][0]}$("route-time").textContent=`${timeLabel(start)} — ${data.sourceTime.slice(0,5)}`}
function segment(track,className,start,end){const node=document.createElement("span");node.className=`segment ${className}`;node.style.left=`${seconds(start)/864}%`;node.style.width=`${Math.max(.18,(seconds(end)-seconds(start))/864)}%`;track.append(node)}
function renderHistory(data){["edl-track","gen-track","none-track"].forEach(id=>$(id).replaceChildren());data.timeline.forEach((row,i)=>{const[time,edl,gen]=row,end=data.timeline[i+1]?.[0]||time;if(edl)segment($("edl-track"),"edl-segment",time,end);if(gen)segment($("gen-track"),"gen-segment",time,end);if(!edl&&!gen)segment($("none-track"),"none-segment",time,end)})}
function renderMonth(data){const v=data.month,total=v.edl+v.gen+v.none;$("tracked-hours").textContent=total.toFixed(1);$("month-key").innerHTML=[[t("generator"),v.gen],[t("edl"),v.edl],[t("noPower"),v.none]].map(([label,value])=>`<div class="breakdown-item"><b>${label}</b><small>${value.toFixed(1)} h · ${(value/total*100).toFixed(0)}%</small></div>`).join("")}
function typeFor(log){return log.startsWith("EDL")?"edl":log.includes("OFF")?"none":"gen"}function renderEvents(data){$("event-list").replaceChildren();data.logs.slice(-6).forEach(log=>{const match=log.match(/(?:ON|OFF):\s*(\d{1,2}:\d{2}\s*[AP]M)/i),time=match?new Date(`2000-01-01 ${match[1]}`).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false}):"—",li=document.createElement("li");li.className=`event ${typeFor(log)}`;li.innerHTML=`<time>${time}</time><p><strong>${log.replace(/ Till:.*/,"")}</strong><small>${log.includes(" Till:")?"Until "+log.split(" Till:")[1]:""}</small></p>`;$("event-list").append(li)});$("event-count").textContent=`${data.logs.length} ${t("events")}`}
function sourceKey(data){const latest=data.timeline[data.timeline.length-1]||[];return latest[1]?"grid":latest[2]?"generator":"off"}
function supportsNotifications(){return "Notification"in window&&"serviceWorker"in navigator}
function isAppleMobile(){return /iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1)}
function isStandalone(){return window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true}
function notificationsEnabled(){return supportsNotifications()&&Notification.permission==="granted"&&localStorage.getItem(NOTIFICATION_PREFERENCE)==="true"}
function sendNotificationPreference(enabled){if(!("serviceWorker"in navigator))return;navigator.serviceWorker.ready.then(reg=>reg.active?.postMessage({type:"notification-preference",enabled})).catch(()=>{})}
async function syncBackgroundChecks(enabled){if(!("serviceWorker"in navigator))return;try{const reg=await navigator.serviceWorker.ready;if(!("periodicSync"in reg))return;if(enabled){await reg.periodicSync.register("power-status-check",{minInterval:15*60*1000})}else{const tags=await reg.periodicSync.getTags();if(tags.includes("power-status-check"))await reg.periodicSync.unregister("power-status-check")}}catch{/* Background refresh is best effort and browser controlled. */}}
async function showPowerNotification(title,body){try{const reg=await navigator.serviceWorker.ready;await reg.showNotification(title,{body,icon:"icon.svg",badge:"icon.svg",tag:"hart-el-sett-power",renotify:true,data:{url:"./"}})}catch{/* Permission or browser support changed while the app was open. */}}
function updateNotificationUI(){const toggle=$("notifications-toggle"),label=$("notifications-toggle-label"),status=$("notification-status");if(!toggle||!label||!status)return;const n=notificationCopy[language];const supported=supportsNotifications(),appleInstallNeeded=supported&&isAppleMobile()&&!isStandalone(),permission=supported?Notification.permission:"denied",enabled=notificationsEnabled();toggle.setAttribute("aria-checked",String(enabled));label.textContent=enabled?n.on:n.off;toggle.disabled=!supported||permission==="denied"||appleInstallNeeded;if(!supported)status.textContent=n.unsupported;else if(appleInstallNeeded)status.textContent=n.install;else if(permission==="denied")status.textContent=n.denied;else status.textContent=enabled?n.enabled:n.ready}
async function toggleNotifications(){const n=notificationCopy[language];if(notificationsEnabled()){localStorage.removeItem(NOTIFICATION_PREFERENCE);sendNotificationPreference(false);syncBackgroundChecks(false);updateNotificationUI();return}if(!supportsNotifications()||(isAppleMobile()&&!isStandalone())){updateNotificationUI();return}if(Notification.permission==="denied"){updateNotificationUI();return}const permission=await Notification.requestPermission();if(permission!=="granted"){updateNotificationUI();return}localStorage.setItem(NOTIFICATION_PREFERENCE,"true");if(currentData)localStorage.setItem(NOTIFICATION_SOURCE,sourceKey(currentData));sendNotificationPreference(true);syncBackgroundChecks(true);updateNotificationUI();showPowerNotification(n.enabledTitle,n.enabledBody)}
function notifySourceChange(data){if(!notificationsEnabled())return;const current=sourceKey(data),previous=localStorage.getItem(NOTIFICATION_SOURCE);if(!previous){localStorage.setItem(NOTIFICATION_SOURCE,current);return}if(previous===current)return;localStorage.setItem(NOTIFICATION_SOURCE,current);const n=notificationCopy[language],body=current==="grid"?n.gridBody:current==="generator"?n.generatorBody:n.offBody;showPowerNotification(n.changeTitle,body)}
function render(data){currentData=data;setState(data);renderHistory(data);renderMonth(data);renderEvents(data);notifySourceChange(data)}
let refreshing=false;
async function refresh(){if(refreshing)return;refreshing=true;try{render(await load())}finally{refreshing=false}}
applyLanguage(language);refresh();
setInterval(refresh,REFRESH_MS);
const settings=$("settings-button"),panel=$("settings-panel");settings.addEventListener("click",()=>{const open=!panel.hidden;panel.hidden=open;settings.setAttribute("aria-expanded",String(!open))});document.querySelectorAll(".language-option").forEach(button=>button.addEventListener("click",()=>{applyLanguage(button.dataset.language);panel.hidden=true;settings.setAttribute("aria-expanded","false")}));$("notifications-toggle").addEventListener("click",toggleNotifications);updateNotificationUI();
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js").then(()=>sendNotificationPreference(notificationsEnabled())).catch(()=>{}));
