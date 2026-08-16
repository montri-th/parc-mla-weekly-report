const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const fmt = new Intl.NumberFormat("th-TH");
const dateFmt = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const venueTypeNames = { "mall": "ศูนย์การค้า", "community mall": "คอมมูนิตี้มอลล์", "night market": "ตลาดกลางคืน", "home goods": "ศูนย์ของแต่งบ้าน", "development": "โครงการที่กำลังพัฒนา" };
const personNames = { Bell: "เบล", Ying: "หญิง" };
const reviewGroupNames = { parc: "PARC Bangna", tenant: "ร้านของเรา", competitor: "คู่แข่ง" };
const themeRules = [
  ["ที่จอดรถและทางเข้า", /park|จอด|arrival/i],
  ["อาหาร", /food|อาหาร|dining/i],
  ["สัตว์เลี้ยงและสวน", /pet|สัตว์/i],
  ["การใช้เวลาในช่วงกลางวัน", /daytime|self-directed|workspace|co-working/i],
  ["อาคารและความสะอาด", /restroom|facility|hygiene|ห้องน้ำ/i]
];
const ownerReplyReviewUids = new Set([
  "RV-0011", "RV-0013", "RV-0014", "RV-0016", "RV-0017", "RV-0018", "RV-0019", "RV-0020",
  "RV-0041", "RV-0044", "RV-0166", "RV-0185", "RV-0187", "RV-0190", "RV-0194"
]);
const publicReviewBlocklist = new Set(["RV-0091", "RV-0093", "RV-0139", "RV-0170"]);
const actionPlanData = window.MLA_ACTION_PLANS || { tenantAliases: {}, tenantPlans: {}, urgentPlans: {} };
const tenantReviewAuditUrl = "https://drive.google.com/file/d/1h-QsX_vpB16G7egxH9NuBKWY2UB1NKkK/view";
const anomalyAlgorithmVersion = "relative-bucket-candidate-v1";
const monthlyReviewClaudePrompt = `ทำงานต่อจาก MLA_AI_HANDOFF 2026-08-02 แบบ read-only ต่อ Google Sheets และเขียนผลเป็นไฟล์ใหม่ในโฟลเดอร์ 31_FROM_CLAUDE เท่านั้น

เป้าหมาย: สร้างข้อมูลสำหรับกราฟ “จำนวนรีวิวใหม่รายเดือน 12 เดือนล่าสุด” ของ P00, C01, C02, C03, C04, C05, C06, C07, C08, C09, C10, C11 ช่วง 2025-09-01 ถึง 2026-08-02 โดยใช้เวลาที่ลูกค้าโพสต์รีวิวต้นทางเท่านั้น

สำคัญ:
- ฟิลด์ review_date ใน MLA คือกำหนดวันที่คนต้องกลับมาตรวจงาน ไม่ใช่วันที่รีวิว ห้ามใช้
- ห้ามใช้ event_date, observed_at หรือ ingested_at แทนวันที่ต้นทาง
- ห้ามใช้ชุด sort=Most relevant นับจำนวนรายเดือน
- ห้ามใช้ยอดรีวิวสะสมหารอายุโครงการเป็น monthly history
- ห้ามใส่ 0 ให้เดือนที่ข้อมูลไม่ครบ

สำหรับแต่ละสถานที่ ให้ใช้ sort=Newest และเก็บต่อเนื่องจนเจอรีวิวที่เก่ากว่า 2025-09-01 หากเข้าถึงไม่ครบให้หยุดและระบุ partial อย่างตรงไปตรงมา

ส่ง 4 ไฟล์:
1. REVIEW-EVENTS-MONTHLY-12M-20260802.csv — หนึ่งแถวต่อรีวิว: event_id/dedupe_key, entity_id, entity_name, source_platform, source_uri, collection_sort, observed_at, source_time_raw, source_date_estimate, source_date_min, source_date_max, date_precision, timestamp_semantics(created/edited/unknown), rating, has_text, owner_reply_flag, sample_rank, window_complete, capture_cap, star_only_visible, data_quality_note
2. MONTHLY-REVIEW-COUNTS-12M-20260802.csv — entity_id, entity_name, month, count_low, count_base, count_high, metric_name, complete, coverage_note; เดือนที่ relative date คร่อมเส้นแบ่งเดือนให้ทำ low/base/high และเดือน ส.ค. 2026 ระบุ partial_month
3. REVIEW-COUNT-SNAPSHOTS-HISTORY-20260802.csv — entity_id, entity_name, snapshot_at, rating, total_review_count, source_uri, method, confidence; แยกจาก review events โดยเด็ดขาด
4. DATA-GAPS-MONTHLY-REVIEWS-20260802.md — บอกทีละ entity ว่าเก็บถึงเดือนไหน จำนวนแถวเท่าไร ได้ทั้งรีวิวมีข้อความและให้ดาวอย่างเดียวหรือไม่ มี cap หรือข้อมูลขาดตรงไหน และเดือนไหนขึ้นกราฟไม่ได้

กติกาเพิ่ม:
- Edited … ago คือเวลาแก้ ไม่ใช่เวลาโพสต์เดิม ให้ exclude ถ้าไม่รู้ creation time
- คำตอบเจ้าของไม่ใช่ customer review
- เก็บ source_time_raw ไว้ ห้ามแต่งวันที่ exact จาก relative label
- ถ้าหน้าสาธารณะแสดงเฉพาะรีวิวมีข้อความ ให้ใช้ชื่อ metric ว่า captured_text_reviews ไม่ใช่ all_reviews
- ชุดที่ซ้ำกันต้อง dedupe ก่อนนับ
- สรุปท้าย DATA-GAPS ว่า entity/month ใด “ใช้ขึ้นกราฟได้” และใด “ห้ามขึ้นกราฟ”
- ส่งลิงก์ทั้ง 4 ไฟล์กลับมา`;
let model;
let reviewFilter = "all";
let monthlyAnomalies = [];
let selectedMapVenueId = "P00";
let competitorMapController = null;

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
}[char]));

function googleSearchUrl(query, aiMode = false) {
  return `https://www.google.com/search?${aiMode ? "udm=50&" : ""}q=${encodeURIComponent(query)}`;
}

function actionDiscoveryLinks(searchQuery, aiPrompt, labels = {}) {
  return `<div class="action-discovery-links">
    <a class="context-cta search" href="${escapeHtml(googleSearchUrl(searchQuery))}" target="_blank" rel="noreferrer" title="จะค้นหา: ${escapeHtml(searchQuery)}">
      <span class="context-icon" aria-hidden="true">${icon("search")}</span>
      <span><strong>${escapeHtml(labels.search || "ค้นข้อมูลปัจจุบัน")}</strong><small>เปิด Google Search ในแท็บใหม่</small></span>
    </a>
    <a class="context-cta ai" href="${escapeHtml(googleSearchUrl(aiPrompt, true))}" target="_blank" rel="noreferrer" title="คำถามสำหรับ AI Mode: ${escapeHtml(aiPrompt)}">
      <span class="context-icon" aria-hidden="true">${icon("sparkle")}</span>
      <span><strong>${escapeHtml(labels.ai || "ช่วยคิดทางเลือกให้รอบด้าน")}</strong><small>เปิด Google AI Mode ในแท็บใหม่</small></span>
    </a>
  </div>`;
}

function sourceDestination(item) {
  const rawUrl = String(item?.sourceUrl || "").trim();
  if (!/^https:\/\//i.test(rawUrl)) {
    return { available: false, href: "", label: "ยังไม่มีลิงก์ต้นทาง", note: "ต้องเติม URL ก่อนเปิดใช้งาน" };
  }

  const isGoogleMaps = /^https:\/\/(?:www\.)?google\.[^/]+\/maps/i.test(rawUrl)
    || /^https:\/\/maps\.google\./i.test(rawUrl);
  if (isGoogleMaps) {
    const decimalCid = rawUrl.match(/[?&]cid=(\d+)/i)?.[1];
    const cidMatches = [...rawUrl.matchAll(/!1s0x[0-9a-f]+:0x([0-9a-f]+)/ig)];
    const hexCid = cidMatches[cidMatches.length - 1]?.[1];
    let cid = decimalCid || "";
    if (!cid && hexCid) {
      try { cid = BigInt(`0x${hexCid}`).toString(); } catch (error) { cid = ""; }
    }
    const href = cid
      ? `https://www.google.com/maps?cid=${cid}&hl=th`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.entity || "")}`;
    return {
      available: true,
      href,
      label: "เปิดสถานที่นี้ใน Google Maps",
      note: "ชุดข้อมูลยังไม่มีลิงก์ตรงไปยังรีวิวข้อนี้"
    };
  }

  if (/^https:\/\/drive\.google\.com\//i.test(rawUrl)) {
    return { available: true, href: rawUrl, label: "เปิดทะเบียนหลักฐานใน Drive", note: "อ่านที่มาและข้อจำกัดในไฟล์" };
  }

  return { available: true, href: rawUrl, label: "เปิดหลักฐานต้นทาง", note: "เปิดในแท็บใหม่" };
}

const icon = (name) => {
  const paths = {
    search: '<circle cx="11" cy="11" r="6"></circle><path d="m16 16 4 4"></path>',
    sparkle: '<path d="M12 2c.7 4.2 2.8 6.3 7 7-4.2.7-6.3 2.8-7 7-.7-4.2-2.8-6.3-7-7 4.2-.7 6.3-2.8 7-7Z"></path><path d="M19 15c.3 1.8 1.2 2.7 3 3-1.8.3-2.7 1.2-3 3-.3-1.8-1.2-2.7-3-3 1.8-.3 2.7-1.2 3-3Z"></path>',
    arrow: '<path d="M5 12h14"></path><path d="m14 7 5 5-5 5"></path>',
    source: '<path d="M14 3h7v7"></path><path d="m21 3-9 9"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path>',
    fit: '<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"></path><circle cx="12" cy="12" r="2.5"></circle>',
    cube: '<path d="m12 2 8 4.5v9L12 20l-8-4.5v-9L12 2Z"></path><path d="m4 6.5 8 4.5 8-4.5M12 11v9"></path>',
    parc: '<path d="M12 21V10"></path><path d="M12 14c-5 0-8-3-8-8 5 0 8 3 8 8Z"></path><path d="M12 17c4 0 7-2.5 7-7-4 0-7 2.5-7 7Z"></path>',
    tenant: '<path d="M4 10h16l-2-6H6l-2 6Z"></path><path d="M5 10v10h14V10"></path><path d="M9 20v-6h6v6"></path>',
    competitor: '<path d="M3 21h18"></path><path d="M5 21V8h6v13"></path><path d="M13 21V3h6v18"></path>'
  };
  return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.arrow}</svg>`;
};

function setTheme(theme) {
  const modes = {
    system: { label: "โหมดสีตามระบบ", next: "dark" },
    dark: { label: "โหมดมืด", next: "light" },
    light: { label: "โหมดสว่าง", next: "system" }
  };
  const selected = modes[theme] ? theme : "system";
  document.documentElement.dataset.theme = selected;
  localStorage.setItem("parc-report-theme", selected);
  competitorMapController?.setTheme(selected);
  const button = $("#themeToggle");
  if (button) {
    button.setAttribute("aria-label", `${modes[selected].label} · กดเพื่อเปลี่ยนเป็น ${modes[modes[selected].next].label}`);
    button.title = `${modes[selected].label} · กดเพื่อเปลี่ยน`;
  }
}

function cycleTheme() {
  const next = { system: "dark", dark: "light", light: "system" }[document.documentElement.dataset.theme] || "system";
  setTheme(next);
}

function contextDiscovery(item) {
  const isDirectCheck = ["Pet Parc", "PARC Bangna · ที่จอดรถ", "EVEANDBOY"].includes(item.entity);
  const mode = isDirectCheck ? "search" : "ai";
  const labels = {
    "PARC Bangna": "หาเส้นทางกิน–หวาน–กาแฟที่เดินต่อได้",
    "Pet Parc": "เช็กข้อมูลสนามและสุขอนามัยล่าสุด",
    "PARC Bangna · ที่จอดรถ": "ดูเสียงล่าสุดเรื่องที่จอดรถ",
    "FOUND Academy": "ต่อยอดเวลาครอบครัวให้ทุกคนได้เลือก",
    "PET ALL": "ออกแบบบริการสัตว์ที่สร้างความมั่นใจ",
    "Mamma Mia!": "ถอดวิธีบริการที่ดีให้ทีมอื่นลองตาม",
    "EVEANDBOY": "เช็กเวลาเปิดจริงล่าสุด",
    "Megabangna": "หาไอเดียทริปที่จบงานได้คล่องกว่า",
    "Dadfa Lasalle": "เทียบวิธีใช้สวนให้คนอยากแวะต่อ",
    "Central Bangna": "แปลงสิ่งที่คู่แข่งทำดีเป็นงาน 7 วัน",
    "Little Walk Bang Na": "เทียบความสะดวกแบบนาทีต่อนาที"
  };
  const label = labels[item.entity] || (item.group === "competitor" ? "เทียบจุดแข็งนี้กับ PARC" : "ค้นบริบทล่าสุดก่อนลงมือ");
  const aiIntent = {
    "PARC Bangna": "ออกแบบเส้นทางกิน-หวาน-กาแฟที่เดินต่อได้จริง",
    "FOUND Academy": "ออกแบบเวลาครอบครัวที่เด็กสนุกและผู้ปกครองได้เลือกสิ่งที่อยากทำเอง",
    "PET ALL": "ออกแบบมาตรฐานบริการสัตว์เลี้ยงที่สร้างความมั่นใจและต่อไปยังร้านอื่นได้",
    "Mamma Mia!": "ถอดวิธีดูแลที่ลูกค้าชอบ ให้ทีมอื่นทดลองใช้ได้โดยไม่ทำให้แข็งเป็นสคริปต์",
    "Megabangna": "เปรียบเทียบความครบในที่เดียวกับทริปสั้นที่คล่องตัวกว่า",
    "Dadfa Lasalle": "เปรียบเทียบวิธีใช้พื้นที่สีเขียวให้เชื่อมกับการแวะร้าน",
    "Central Bangna": "เปลี่ยนบทเรียนเรื่องการปรับปรุงที่มองเห็นได้เป็นงานที่ PARC ทำเสร็จใน 7 วัน",
    "Little Walk Bang Na": "ออกแบบการวัดความสะดวกตั้งแต่ทางเข้าถึงการทำธุระครบ 2 ร้านเป็นนาที"
  };
  const query = mode === "search"
    ? `${item.entity.replace(" · ที่จอดรถ", "")} ${item.entity.includes("ที่จอดรถ") ? "ที่จอดรถ รีวิวล่าสุด" : item.entity === "EVEANDBOY" ? "เวลาเปิดปิด PARC Bangna ล่าสุด" : "สนามสุนัข สุขอนามัย รีวิวล่าสุด"}`
    : `ช่วยฉันวิเคราะห์เพื่อให้ลูกค้า PARC Bangna ได้ประโยชน์ โดย${aiIntent[item.entity] || `เปรียบเทียบสิ่งที่รีวิวพูดถึง ${item.entity} กับ PARC Bangna`} แยก 1) สิ่งที่รู้ 2) สิ่งที่ยังไม่รู้ 3) การทดลองเล็กที่เชื่อมอย่างน้อย 2 ร้านใน PARC และ 4) วิธีวัดผล จากรีวิวสาธารณะนี้: ${item.quote}`;
  const url = mode === "ai"
    ? `https://www.google.com/search?udm=50&q=${encodeURIComponent(query)}`
    : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  return { mode, label, query, url, hint: mode === "ai" ? "ถามต่อใน Google AI Mode" : "ค้นข้อมูลล่าสุดใน Google" };
}

function parseDate(value) {
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

const iso = (date) => date.toISOString().slice(0, 10);
const shift = (date, days) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};
const between = (value, start, end) => value >= iso(start) && value <= iso(end);

function relativeDateRange(observedAt, rawLabel, suppliedBounds) {
  const label = String(rawLabel || "").trim();
  if (/^Edited\s+/i.test(label)) return null;
  if (suppliedBounds?.start && suppliedBounds?.end) {
    return {
      start: suppliedBounds.start,
      end: suppliedBounds.end,
      precision: suppliedBounds.precision || "relative"
    };
  }
  const observed = parseDate(observedAt);
  let match;

  if ((match = label.match(/^(\d+) hours? ago$/i))) {
    const day = iso(observed);
    return { start: day, end: day, precision: "day" };
  }

  const dayValue = /^an? day ago$/i.test(label)
    ? 1
    : (match = label.match(/^(\d+) days? ago$/i)) ? Number(match[1]) : null;
  if (dayValue != null) {
    const day = iso(shift(observed, -dayValue));
    return { start: day, end: day, precision: "day" };
  }

  const weekValue = /^an? week ago$/i.test(label)
    ? 1
    : (match = label.match(/^(\d+) weeks? ago$/i)) ? Number(match[1]) : null;
  if (weekValue != null) {
    const latest = shift(observed, -7 * weekValue);
    return { start: iso(shift(latest, -6)), end: iso(latest), precision: "week" };
  }

  const monthValue = /^an? month ago$/i.test(label)
    ? 1
    : (match = label.match(/^(\d+) months? ago$/i)) ? Number(match[1]) : null;
  if (monthValue != null) {
    const latest = new Date(observed);
    latest.setUTCMonth(latest.getUTCMonth() - monthValue);
    const earliest = new Date(latest);
    earliest.setUTCMonth(earliest.getUTCMonth() - 1);
    return { start: iso(shift(earliest, 1)), end: iso(latest), precision: "month" };
  }

  const yearValue = /^an? year ago$/i.test(label)
    ? 1
    : (match = label.match(/^(\d+) years? ago$/i)) ? Number(match[1]) : null;
  if (yearValue != null) {
    const latest = new Date(observed);
    latest.setUTCFullYear(latest.getUTCFullYear() - yearValue);
    const earliest = new Date(latest);
    earliest.setUTCFullYear(earliest.getUTCFullYear() - 1);
    return { start: iso(shift(earliest, 1)), end: iso(latest), precision: "year" };
  }
  return null;
}

async function loadData() {
  document.body.classList.add("loading");
  const saved = window.MLA_SNAPSHOT ? JSON.parse(JSON.stringify(window.MLA_SNAPSHOT)) : null;

  try {
    const response = await fetch("/.netlify/functions/data", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    model = await response.json();
  } catch (error) {
    try {
      const response = await fetch("./data/snapshot.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      model = await response.json();
    } catch (snapshotError) {
      if (!saved) throw snapshotError;
      model = saved;
    }
    model.meta.source = "browser-snapshot";
    model.meta.feedError = error.message;
  }

  if (saved) {
    const requiredArrays = [
      "daily", "entities", "reviewBuckets", "reviewHighlights", "tenantThemes",
      "tenants", "themes", "urgent", "velocityContext", "venues"
    ];
    requiredArrays.forEach((key) => {
      if (!Array.isArray(model[key])) model[key] = saved[key] || [];
    });
    if (!model.statusSummary || typeof model.statusSummary !== "object") model.statusSummary = saved.statusSummary;
    model.meta = { ...saved.meta, ...model.meta };
    model.meta.reviewDateCoverage = model.meta.reviewDateCoverage || saved.meta.reviewDateCoverage;
  }

  // A confirmed GBP match owns the public display name. Keep source aliases in
  // actionPlanData so older review rows and Sheet feeds still join correctly.
  model.tenants = (model.tenants || []).map((tenant) => {
    const sourceName = String(tenant.name || "");
    const canonicalName = actionPlanData.tenantCanonicalNames?.[sourceName] || sourceName;
    return canonicalName === sourceName
      ? tenant
      : { ...tenant, name: canonicalName, registryAlias: sourceName, nameSource: "GBP" };
  });

  model.sourceObservations = model.sourceObservations || window.MLA_SOURCE_OBSERVATIONS || [];
  model.tenantReviewItems = (window.MLA_TENANT_REVIEW_ITEMS || []).filter((item) =>
    !ownerReplyReviewUids.has(item.reviewUid) && !publicReviewBlocklist.has(item.reviewUid)
  );
  model.actionPlans = actionPlanData;
  model.competitorMap = Array.isArray(model.competitorMap?.locations)
    ? model.competitorMap
    : (window.MLA_COMPETITOR_MAP || { meta: {}, locations: [] });
  model.placeMedia = Array.isArray(model.placeMedia?.entries)
    ? model.placeMedia
    : (window.MLA_PLACE_MEDIA || { meta: {}, entries: [] });
  if (!model.monthlyReviewCounts?.months?.length) {
    model.monthlyReviewCounts = window.MLA_MONTHLY_REVIEW_COUNTS || null;
  }
  const detailCopy = window.MLA_REVIEW_DETAIL_COPY || {};
  const auditedReviewByKey = Object.fromEntries((saved?.reviewHighlights || [])
    .filter((item) => item.reviewUid)
    .map((item) => [`${item.entity}\u0000${item.quote}`, {
      reviewUid: item.reviewUid,
      sourceRowId: item.sourceRowId,
      rating: item.rating,
      dateLabel: item.dateLabel,
      sourceUrl: item.sourceUrl
    }]));
  model.reviewHighlights = (model.reviewHighlights || []).map((item) => {
    const audit = auditedReviewByKey[`${item.entity}\u0000${item.quote}`] || {};
    return { ...item, ...audit, ...(detailCopy[item.entity] || {}) };
  });
  monthlyAnomalies = buildMonthlyAnomalyModel();

  $("#asOf").value = model.meta.dataAsOf;
  $("#asOf").max = model.meta.dataAsOf;
  const sourceDates = (model.reviewBuckets || [])
    .map((item) => relativeDateRange(item.observedAt, item.label, model.meta.reviewDateBounds?.[item.label])?.start)
    .filter(Boolean)
    .sort();
  if (sourceDates.length) $("#asOf").min = sourceDates[0];

  hydrateStatic();
  render();
  document.body.classList.remove("loading");
}

function currentStatus() {
  if (model.statusSummary) return model.statusSummary;
  return (model.entities || []).reduce((acc, row) => {
    ["total", "nonDuplicate", "verified", "pending", "curated", "candidate"].forEach((key) => {
      acc[key] += Number(row[key] || 0);
    });
    return acc;
  }, { total: 0, nonDuplicate: 0, verified: 0, pending: 0, curated: 0, candidate: 0 });
}

function hydrateStatic() {
  const live = model.meta.source === "google-sheets";
  const state = $("#liveState");
  const status = currentStatus();
  const dateCoverage = model.meta.reviewDateCoverage || {};

  state.className = `live-state ${live ? "live" : "fallback"}`;
  state.lastElementChild.textContent = live ? "เชื่อมกับ Google Sheets แล้ว" : "ใช้ข้อมูลล่าสุดที่บันทึกไว้";
  $("#sourceLabel").textContent = live ? "Google Sheets · อัปเดตอัตโนมัติ" : "ข้อมูลที่บันทึกไว้ในระบบ";
  $("#updatedLabel").textContent = dateFmt.format(parseDate(model.meta.dataAsOf));
  $("#coverageLabel").textContent = `ผ่านการตรวจสำหรับใช้ภายใน ${fmt.format(status.curated)}/${fmt.format(status.total)} · รอตรวจ ${fmt.format(status.pending)}`;
  $("#reviewTimeLabel").textContent = `${fmt.format(dateCoverage.usableForVelocity || 0)} รีวิว · ${fmt.format(dateCoverage.tenantCount || 0)} ร้าน`;
  $("#daypartLabel").textContent = model.meta.daypartLabel;
  $("#workbenchLink").href = model.meta.workbenchUrl;
  $("#reportLink").href = model.meta.reportUrl;

  renderThemes();
  renderUrgent();
  renderReviewHighlights();
  renderVelocityContext();
  renderMonthlyReviewChart();

  const publicReviewCount = (model.tenantReviewItems || []).length;
  const tenantWithPublicReviews = (model.tenants || [])
    .filter((tenant) => tenantReviews(tenant.name).length > 0).length;
  const tenantAwaitingCapture = Math.max((model.tenants || []).length - tenantWithPublicReviews, 0);
  $("#tenantCoverage").textContent = `${fmt.format(model.tenants.length)} ร้านมีคะแนน Google และยอดรีวิว · หน้าเว็บเปิดอ่านเสียงลูกค้าได้ ${fmt.format(publicReviewCount)} รายการจาก ${fmt.format(tenantWithPublicReviews)} ร้าน · อีก ${fmt.format(tenantAwaitingCapture)} ร้านรอเก็บข้อความรอบแรก`;
  renderTenantThemes();
  renderTenants();
  renderVenueFilter();
  renderVenues();
  renderCompetitorMap();
  renderEntities();
}

function reviewWindowMetrics(anchor) {
  const currentStart = shift(anchor, -27);
  const previousStart = shift(anchor, -55);
  const previousEnd = shift(anchor, -28);
  const rows = (model.reviewBuckets || []).map((bucket) => ({
    ...bucket,
    dateRange: relativeDateRange(bucket.observedAt, bucket.label, model.meta.reviewDateBounds?.[bucket.label])
  })).filter((bucket) => bucket.dateRange);
  supplementalReviewItems().forEach((item) => rows.push({
    count: 1,
    dateRange: { start: item.sourceDateMin, end: item.sourceDateMax }
  }));

  const countRange = (start, end) => {
    const windowStart = iso(start);
    const windowEnd = iso(end);
    return rows.reduce((result, row) => {
      const count = Number(row.count || 0);
      const overlaps = row.dateRange.start <= windowEnd && row.dateRange.end >= windowStart;
      const contained = row.dateRange.start >= windowStart && row.dateRange.end <= windowEnd;
      if (overlaps) result.possible += count;
      if (contained) result.certain += count;
      if (overlaps && !contained) result.ambiguous += count;
      return result;
    }, { certain: 0, possible: 0, ambiguous: 0 });
  };

  return {
    current: { start: currentStart, end: anchor, ...countRange(currentStart, anchor) },
    previous: { start: previousStart, end: previousEnd, ...countRange(previousStart, previousEnd) }
  };
}

function rangeLabel(metric) {
  return metric.certain === metric.possible
    ? fmt.format(metric.certain)
    : `${fmt.format(metric.certain)}–${fmt.format(metric.possible)}`;
}

function render() {
  const anchor = parseDate($("#asOf").value || model.meta.dataAsOf);
  const { current, previous } = reviewWindowMetrics(anchor);
  const deltaLow = current.certain - previous.possible;
  const deltaHigh = current.possible - previous.certain;
  const coverage = model.meta.reviewDateCoverage || {};

  $("#windowLabel").textContent = `${dateFmt.format(current.start)}–${dateFmt.format(current.end)} เทียบ ${dateFmt.format(previous.start)}–${dateFmt.format(previous.end)}`;
  $("#comparisonNote").textContent = "นับจากเวลาที่รีวิวปรากฏบน Google ไม่ใช่วันที่เราเอาข้อมูลเข้าระบบ";

  const directionText = deltaLow > 0
    ? `มากขึ้นอย่างน้อย ${fmt.format(deltaLow)} รายการ`
    : deltaHigh < 0
      ? `น้อยลงอย่างน้อย ${fmt.format(Math.abs(deltaHigh))} รายการ`
      : "ยังฟันทิศทางไม่ได้";
  $("#metricSummary").textContent = `รีวิวที่เราอ่านได้ใน 28 วันล่าสุดมี ${rangeLabel(current)} รายการ เทียบกับ ${rangeLabel(previous)} รายการในช่วงก่อนหน้า — ${directionText} ตัวเลขนี้บอกว่ามีเสียงใหม่ให้ตามมากแค่ไหน ไม่ได้บอกว่าบริการดีขึ้นหรือแย่ลง`;

  const cards = [
    ["28 วันล่าสุด", rangeLabel(current), current.ambiguous ? `${fmt.format(current.ambiguous)} รายการยังระบุช่วงไม่ได้` : "อยู่ในช่วงนี้แน่นอน"],
    ["28 วันก่อน", rangeLabel(previous), previous.ambiguous ? `${fmt.format(previous.ambiguous)} รายการอาจอยู่ในช่วงนี้` : "อยู่ในช่วงนี้แน่นอน"],
    ["สิ่งที่เห็น", directionText, "ใช้เลือกคิวอ่านและตรวจต่อ ไม่ใช้ตัดสินคุณภาพบริการ"],
    ["จัดช่วงเวลาได้", `${fmt.format(coverage.usableForVelocity || 0)}/${fmt.format(coverage.captured || 0)}`, "ไม่นับคำตอบเจ้าของร้านและเวลาที่เป็นวันแก้ไข"],
  ];

  $("#kpiGrid").innerHTML = cards.map(([label, value, note]) =>
    `<article class="kpi"><span class="label">${escapeHtml(label)}</span><strong class="value">${escapeHtml(value)}</strong><span class="data-note">${escapeHtml(note)}</span></article>`
  ).join("");

  renderPeriodInsight(current, previous, deltaLow, deltaHigh);
  renderReviewComparison(current, previous);
}

function reviewItemsInWindow(start, end, certainOnly = true) {
  const startIso = iso(start);
  const endIso = iso(end);
  return (model.tenantReviewItems || []).filter((item) => {
    if (item.edited || !item.sourceDateMin || !item.sourceDateMax) return false;
    return certainOnly
      ? item.sourceDateMin >= startIso && item.sourceDateMax <= endIso
      : item.sourceDateMin <= endIso && item.sourceDateMax >= startIso;
  });
}

function renderPeriodInsight(current, previous, deltaLow, deltaHigh) {
  const currentRows = reviewItemsInWindow(current.start, current.end);
  const lowRows = currentRows.filter((item) => Number(item.rating) <= 3);
  const tenantCount = new Set(currentRows.map((item) => item.tenant)).size;
  const lead = deltaLow > 0
    ? `ช่วงล่าสุดมีเสียงใหม่มากขึ้นอย่างน้อย ${fmt.format(deltaLow)} รายการ`
    : deltaHigh < 0
      ? `ช่วงล่าสุดมีเสียงใหม่น้อยลงอย่างน้อย ${fmt.format(Math.abs(deltaHigh))} รายการ`
      : "สองช่วงนี้ยังใกล้กันเกินกว่าจะบอกทิศทาง";
  $("#periodInsight").innerHTML = `<div>
      <p class="eyebrow">สิ่งที่ควรรู้</p>
      <h3>${escapeHtml(lead)}</h3>
      <p>รีวิวล่าสุดมาจาก ${fmt.format(tenantCount)} ร้าน และมี ${fmt.format(lowRows.length)} รีวิวที่ให้ 1–3 ดาว ควรให้ Tenant Relations อ่านก่อน แล้วส่งเฉพาะเรื่องที่ตรวจสอบได้ให้ผู้จัดการร้านหรือ Ops ลงมือ</p>
    </div>
    <div class="period-insight-actions">
      <button type="button" class="primary-action" data-period-low-stars>${icon("arrow")}<span>เปิด ${fmt.format(lowRows.length)} รีวิวที่ควรอ่านก่อน</span></button>
      <a href="#feedbackLoop">ดูว่าแต่ละฝ่ายรับฟัง ลงมือ และกลับมาบอกผลอย่างไร</a>
    </div>`;
}

function renderReviewComparison(current, previous) {
  const max = Math.max(current.possible, previous.possible, 1);
  const rows = [
    { key: "current", label: "28 วันล่าสุด", range: `${dateFmt.format(current.start)}–${dateFmt.format(current.end)}`, ...current },
    { key: "previous", label: "28 วันก่อน", range: `${dateFmt.format(previous.start)}–${dateFmt.format(previous.end)}`, ...previous }
  ];

  $("#reviewCompareBars").innerHTML = rows.map((row) =>
    `<div class="period-row ${row.key}">
      <div><strong>${row.label}</strong><span>${row.range}</span></div>
      <div class="period-track" aria-label="แน่นอน ${fmt.format(row.certain)} รายการ มากสุด ${fmt.format(row.possible)} รายการ"><i class="possible" style="width:${row.possible / max * 100}%"></i><i class="certain" style="width:${row.certain / max * 100}%"></i></div>
      <b>${rangeLabel(row)}</b>
    </div>`
  ).join("");

  const coverage = model.meta.reviewDateCoverage || {};
  $("#reviewDateQuality").innerHTML = `<strong>อ่านกราฟนี้อย่างไร:</strong> สีเข้มคือรีวิวที่อยู่ในช่วงนั้นแน่นอน สีอ่อนคือรีวิวที่ Google บอกเวลาไว้กว้างจนยังระบุช่วงไม่ได้ เราตัดคำตอบจากเจ้าของร้าน ${fmt.format(coverage.rejectedOwnerReplies || 0)} รายการ และรายการที่แสดงเวลาแก้ไข ${fmt.format(coverage.editedExcluded || 0)} รายการออก <details><summary>ทำไมช่วงก่อนหน้าจึงเป็นตัวเลข 3–48</summary><p>บางรีวิวขึ้นว่า “1 เดือนก่อน” ซึ่งอาจอยู่ได้หลายวันและคร่อมเส้นแบ่งสองช่วง เราจึงบอกทั้งจำนวนที่แน่นอนและจำนวนมากที่สุดที่อาจเป็นไปได้ แทนการแต่งวันให้แม่นกว่าต้นทาง</p></details>`;
}

function renderReviewHighlights() {
  const rows = (model.reviewHighlights || [])
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => reviewFilter === "all" || item.group === reviewFilter);
  $("#reviewHighlightGrid").innerHTML = rows.map(({ item, index }) => {
    const source = sourceDestination(item);
    const discovery = contextDiscovery(item);
    return `<article class="review-card ${escapeHtml(item.tone || "neutral")}">
      <div class="review-card-head">
        <span class="review-group-lockup"><span class="review-visual-icon" aria-hidden="true">${icon(item.group)}</span><span class="group-tag">${escapeHtml(reviewGroupNames[item.group] || item.group)}</span></span>
        <span class="source-tag">${escapeHtml(item.sourceType)}</span>
      </div>
      <h3>${escapeHtml(item.entity)}</h3>
      <blockquote>“${escapeHtml(item.quote)}”</blockquote>
      <p class="review-date">${escapeHtml(item.dateLabel)}</p>
      <div class="review-action">
        <span>ทีมที่ควรรับเรื่อง · ${escapeHtml(item.owner)}</span>
        <strong>โอกาสที่ควรทดลอง</strong>
        <p>${escapeHtml(item.action)}</p>
      </div>
      <div class="review-card-links">
        <button type="button" class="text-button primary-action" data-review-detail="${index}"><span>ดูวิธีทดลองให้เกิดผล</span>${icon("arrow")}</button>
        <a class="context-cta ${escapeHtml(discovery.mode)}" href="${escapeHtml(discovery.url)}" target="_blank" rel="noreferrer" title="จะค้นหา: ${escapeHtml(discovery.query)}">
          <span class="context-icon" aria-hidden="true">${icon(discovery.mode === "ai" ? "sparkle" : "search")}</span>
          <span><strong>${escapeHtml(discovery.label)}</strong><small>${escapeHtml(discovery.hint)} · เปิดแท็บใหม่</small></span>
        </a>
        ${source.available
          ? `<a class="source-link" href="${escapeHtml(source.href)}" target="_blank" rel="noreferrer">${icon("source")}<span><strong>${escapeHtml(source.label)}</strong><small>${escapeHtml(source.note)}</small></span></a>`
          : `<span class="source-link unavailable" aria-disabled="true">${icon("source")}<span><strong>${escapeHtml(source.label)}</strong><small>${escapeHtml(source.note)}</small></span></span>`}
      </div>
    </article>`;
  }).join("");
}

function renderVelocityContext() {
  $("#velocityContextGrid").innerHTML = (model.velocityContext || []).map((item) => {
    const totalMatch = String(item.method || "").match(/([\d,]+)\s*รีวิว/);
    const total = totalMatch ? totalMatch[1] : fmt.format(item.value);
    const estimate = item.unit === "รีวิว/เดือน"
      ? "ยอดสะสมทั้งหมด ไม่ใช่จำนวนที่เพิ่มในเดือนล่าสุด"
      : "เพิ่งมีตัวเลขครั้งเดียว จึงยังบอกการเปลี่ยนแปลงไม่ได้";
    const ageMatch = String(item.method || "").match(/อายุประมาณ\s*([\d,]+)\s*เดือน/);
    const basis = item.unit === "รีวิว/เดือน"
      ? `เปิดมาราว ${ageMatch ? ageMatch[1] : "—"} เดือน · ใช้ดูขนาดบทสนทนาเท่านั้น`
      : "เก็บเมื่อ 2 ส.ค. 2569";
    return (
    `<article class="velocity-card">
      <span>${escapeHtml(item.entity)}</span>
      <div><strong>${escapeHtml(total)}</strong><b>รีวิวสะสม</b></div>
      <p>${escapeHtml(estimate)}</p>
      <small>${escapeHtml(basis)}</small>
    </article>`
    );
  }).join("");
}

function median(values) {
  const rows = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!rows.length) return null;
  const middle = Math.floor(rows.length / 2);
  return rows.length % 2 ? rows[middle] : (rows[middle - 1] + rows[middle]) / 2;
}

function robustModifiedZ(value, values) {
  const center = median(values);
  const mad = median(values.map((item) => Math.abs(item - center)));
  if (!Number.isFinite(center) || !Number.isFinite(mad)) return 0;
  if (mad === 0) return value > center ? Number.POSITIVE_INFINITY : 0;
  return 0.6745 * (value - center) / mad;
}

function buildMonthlyAnomalyModel() {
  const payload = model?.monthlyReviewCounts;
  if (!payload?.months?.length || !payload?.parc?.counts?.length) return [];
  const seriesRows = [payload.parc, ...(payload.competitors || [])];
  const results = [];

  seriesRows.forEach((series) => {
    const counts = (series.counts || []).map((value) => {
      const number = Number(value);
      return value === null || value === undefined || value === "" || !Number.isFinite(number) ? null : number;
    });
    const incomplete = new Set(series.incompleteIndexes || []);
    const completeAt = (index) => index >= 0
      && index < counts.length
      && Number.isFinite(counts[index])
      && !incomplete.has(index)
      && !payload.months[index]?.partial;
    const usable = counts.filter((_, index) => completeAt(index));

    for (let index = 1; index < counts.length - 1; index += 1) {
      if (![index - 1, index, index + 1].every(completeAt)) continue;
      const value = counts[index];
      const left = counts[index - 1];
      const right = counts[index + 1];
      const localBaseline = median([left, right]);
      const delta = value - localBaseline;
      const ratio = localBaseline > 0 ? value / localBaseline : Number.POSITIVE_INFINITY;
      const score = robustModifiedZ(value, usable);
      if (ratio >= 1.8 && delta >= Math.max(10, localBaseline * 0.25) && score >= 2.5) {
        results.push({
          id: `${series.id}-isolated-${payload.months[index].key}`,
          entityId: series.id,
          entityName: series.name,
          type: "isolated-spike",
          index,
          bucketKey: payload.months[index].key,
          bucketLabel: payload.months[index].label,
          value,
          neighborValues: [left, right],
          baseline: localBaseline,
          delta,
          ratio,
          score,
          status: "candidate",
          algorithmVersion: anomalyAlgorithmVersion
        });
      }
    }

    const levelCandidates = [];
    for (let split = 3; split <= counts.length - 3; split += 1) {
      const indexes = [split - 3, split - 2, split - 1, split, split + 1, split + 2];
      if (!indexes.every(completeAt)) continue;
      const beforeValues = counts.slice(split - 3, split);
      const afterValues = counts.slice(split, split + 3);
      const beforeMedian = median(beforeValues);
      const afterMedian = median(afterValues);
      const delta = afterMedian - beforeMedian;
      const ratio = beforeMedian > 0 ? afterMedian / beforeMedian : Number.POSITIVE_INFINITY;
      const highThreshold = Math.max(beforeMedian * 2, beforeMedian + 10);
      const sustained = afterValues.filter((value) => value >= highThreshold).length >= 2;
      if (ratio >= 2 && delta >= 10 && sustained) {
        levelCandidates.push({
          id: `${series.id}-level-${payload.months[split].key}`,
          entityId: series.id,
          entityName: series.name,
          type: "level-shift",
          index: split,
          bucketKey: payload.months[split].key,
          bucketLabel: payload.months[split].label,
          value: counts[split],
          beforeValues,
          afterValues,
          baseline: beforeMedian,
          afterMedian,
          delta,
          ratio,
          status: "candidate",
          algorithmVersion: anomalyAlgorithmVersion
        });
      }
    }
    if (levelCandidates.length) {
      // Prefer the clearest sustained change in absolute volume. A zero median can
      // otherwise create an infinite ratio one bucket too early.
      levelCandidates.sort((a, b) => (b.delta - a.delta) || (b.ratio - a.ratio));
      results.push(levelCandidates[0]);
    }
  });

  return results.sort((a, b) => {
    const typeOrder = { "isolated-spike": 0, "level-shift": 1 };
    return (typeOrder[a.type] - typeOrder[b.type]) || (b.ratio - a.ratio);
  });
}

function monthlyAnomalyFor(entityId, index) {
  return monthlyAnomalies.find((item) => item.entityId === entityId && item.index === index);
}

function monthlySeries(entityId) {
  const payload = model.monthlyReviewCounts;
  return [payload?.parc, ...(payload?.competitors || [])].find((item) => item?.id === entityId) || null;
}

function placeMediaRecord(entityId, name) {
  const normalized = String(name || "").trim().toLocaleLowerCase("en");
  return (model.placeMedia?.entries || []).find((item) =>
    (entityId && item.entityId === entityId)
    || (normalized && String(item.name || "").trim().toLocaleLowerCase("en") === normalized)
  ) || null;
}

function placeMediaCardHtml(entityId, name) {
  const media = placeMediaRecord(entityId, name);
  const series = entityId ? monthlySeries(entityId) : null;
  if (!media && !series) return "";

  const imageUrl = /^https:\/\//i.test(String(media?.imageUrl || "")) ? media.imageUrl : "";
  const fallbackUrl = /^(?:\.\/assets\/place-media\/|https:\/\/)/i.test(String(media?.fallbackUrl || ""))
    ? media.fallbackUrl
    : "";
  const sourceUrl = /^https:\/\//i.test(String(media?.sourcePageUrl || "")) ? media.sourcePageUrl : "";
  const alt = media?.alt || `ภาพของ ${name} จากช่องทางสาธารณะของสถานที่`;
  const sourceLabel = media?.sourceLabel || media?.publisher || "แหล่งภาพทางการ";
  const counts = (series?.counts || []).map((value) =>
    Number.isFinite(Number(value)) && value !== null && value !== "" ? Number(value) : null
  );
  const max = Math.max(...counts.filter(Number.isFinite), 1);
  const chart = counts.length
    ? `<div class="place-media-chart"><div><strong>จังหวะรีวิว 12 ช่วงย้อนหลัง</strong><span>ใช้ดูขึ้น–ลง ไม่ใช่ยอดรายเดือน</span></div><div class="place-media-spark" role="img" aria-label="${escapeHtml(name)} จังหวะรีวิว 12 ช่วงย้อนหลัง">${counts.map((value, index) => `<i class="${value == null ? "missing" : ""}" style="--spark-height:${value == null ? 8 : Math.max(8, value / max * 100)}%" title="${escapeHtml(model.monthlyReviewCounts?.months?.[index]?.label || `ช่วง ${index + 1}`)} · ${value == null ? "ยังไม่มีข้อมูล" : `${fmt.format(value)} รีวิว`}"></i>`).join("")}</div></div>`
    : "";
  const firstImageUrl = imageUrl || fallbackUrl;
  const visual = `<span class="place-media-image${firstImageUrl ? "" : " is-fallback"}">
      ${firstImageUrl ? `<img src="${escapeHtml(firstImageUrl)}"${imageUrl && fallbackUrl ? ` data-fallback-src="${escapeHtml(fallbackUrl)}"` : ""} alt="${escapeHtml(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ""}
      <span class="place-media-fallback" aria-hidden="true">${icon(entityId === "P00" ? "parc" : "competitor")}<b>${escapeHtml(name)}</b></span>
    </span>`;

  return `<section class="place-media-card" aria-label="ภาพและจังหวะรีวิวของ ${escapeHtml(name)}">
    ${sourceUrl ? `<a class="place-media-source" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">${visual}<span>ภาพจาก ${escapeHtml(sourceLabel)} ↗</span></a>` : visual}
    ${chart}
  </section>`;
}

function renderMonthlyAnomalySummary() {
  const container = $("#monthlyAnomalySummary");
  if (!container) return;
  if (!monthlyAnomalies.length) {
    container.innerHTML = `<div class="anomaly-summary-empty"><span>${icon("search")}</span><p><strong>ยังไม่มีช่วงไหนที่ขยับแรงพอให้แยกออกมาตรวจ</strong><br>กราฟยังมีเรื่องให้ดูต่อ เพียงยังไม่มีช่วงที่ต่างจากรอบข้างชัดพอจะยกเป็นคิวพิเศษ</p></div>`;
    return;
  }
  const rows = monthlyAnomalies.slice(0, 3);
  container.innerHTML = `<div class="anomaly-summary-head"><div><p class="eyebrow">ช่วงที่ควรหยุดดู</p><h3>${fmt.format(rows.length)} ช่วงที่จำนวนรีวิวขยับต่างจากรอบข้าง</h3></div><p>ตัวเลขที่กระโดดขึ้นหรือเปลี่ยนต่อเนื่องช่วยชี้ว่าเราควรถามอะไรต่อ แต่ยังไม่บอกว่าเกิดจากแคมเปญ เหตุการณ์ หรือคุณภาพบริการ</p></div>
    <div class="anomaly-card-grid">${rows.map((item) => {
      const statement = item.type === "isolated-spike"
        ? `ช่วงนี้มี ${fmt.format(item.value)} รีวิว ขณะที่ช่วงก่อนและหลังมี ${fmt.format(item.neighborValues[0])} และ ${fmt.format(item.neighborValues[1])}`
        : `สามช่วงก่อนมีราว ${fmt.format(item.baseline)} รีวิวต่อช่วง จากนั้นขยับเป็นราว ${fmt.format(item.afterMedian)} รีวิวต่อช่วงและเกิดต่อเนื่อง`;
      const owner = item.entityId === "P00"
        ? "ทีมเริ่มอ่าน · แบรนด์ / CRM + ปฏิบัติการ / CX"
        : "ทีมเริ่มอ่าน · กลยุทธ์ + แบรนด์";
      return `<button type="button" class="anomaly-card" data-anomaly-jump="${escapeHtml(item.id)}">
        <span class="anomaly-mark" aria-hidden="true">!</span>
        <span><small>${escapeHtml(item.entityName)} · ${escapeHtml(item.bucketLabel)}</small><strong>${escapeHtml(statement)}</strong><span class="anomaly-owner">${escapeHtml(owner)}</span><em>เปิดกราฟ ดูหลักฐาน และเลือกคำถามถัดไป ${icon("arrow")}</em></span>
      </button>`;
    }).join("")}</div>`;
}

function monthlySource(entityId, entityName) {
  const observation = (model.sourceObservations || []).find((item) =>
    item.entityId === entityId && /^https:\/\/(?:www\.)?google\.[^/]+\/maps/i.test(String(item.sourceUrl || ""))
  );
  return sourceDestination(observation || {
    entity: entityName,
    sourceUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entityName)}`
  });
}

function anomalyStageLinks(anomaly, stage) {
  const constraints = "ข้อมูลนี้มาจาก Google Maps แพลตฟอร์มเดียว ยังไม่พิสูจน์เหตุและผล หลายรีวิวบน Google ไม่ใช่หลายแหล่งอิสระ การใช้เวลากลางวันด้วยตัวเองยังเป็นสมมติฐาน และห้ามตีความตัวเลขลูกค้าที่ใช้หลายร้าน 57.2% ว่าเป็นการแวะร้านที่สองต่อหนึ่งครั้งที่มา";
  const stageData = {
    root: {
      title: "1 · คิดไว้หลายเหตุผลก่อน",
      copy: "อาจมาจากคนมาใช้บริการมากขึ้น งานอีเวนต์ โปรโมชั่น การเปลี่ยนบริการ ฤดูกาล หรือวิธีเก็บข้อมูล จดไว้ก่อนว่าอะไรจะช่วยยืนยันหรือหักล้างแต่ละเหตุผล",
      search: `${anomaly.entityName} events promotion opening reviews`,
      ai: `ช่วยเสนอเหตุผลที่เป็นไปได้หลายด้านสำหรับจุดที่จำนวนรีวิวของ ${anomaly.entityName} ช่วง ${anomaly.bucketLabel} ต่างจากช่วงข้างเคียง แยกหลักฐานที่สนับสนุนและหักล้าง พร้อมสิ่งที่จะทำให้เลิกเชื่อแต่ละเหตุผล ${constraints}`,
      labels: { search: "ดูข่าวหรือแคมเปญในช่วงนั้น", ai: "ช่วยแตกเหตุผลที่เป็นไปได้" }
    },
    probe: {
      title: "2 · หาคำตอบที่ตรวจได้ใน 7 วัน",
      copy: "แยกให้ชัดว่าอะไรค้นได้จากข้อมูลสาธารณะ อะไรต้องถามทีม และอะไรต้องดูหน้างาน โดยไม่แต่งคำตอบจากกราฟ",
      search: `${anomaly.entityName} ${anomaly.bucketLabel} event news review`,
      ai: `ช่วยทำแผนตรวจ 7 วันสำหรับ ${anomaly.entityName} แยกหลักฐานสาธารณะ เอกสารภายใน สิ่งที่ต้องดูหน้างาน และคำถามที่ต้องถาม พร้อมผู้รับผิดชอบและเงื่อนไขหยุด ${constraints}`,
      labels: { search: "ค้นหลักฐานที่ตรวจย้อนกลับได้", ai: "ช่วยทำแผนตรวจ 7 วัน" }
    },
    solution: {
      title: "3 · ถ้าเห็นโอกาส ค่อยลองเล็ก ๆ ที่ PARC",
      copy: "เลือกเฉพาะสิ่งที่น่าจะช่วยลูกค้า ลองกับอย่างน้อย 2 ร้าน แล้วดูทั้งประโยชน์ที่ลูกค้าได้รับ ความร่วมมือของร้าน และผลข้างเคียงก่อนขยาย",
      search: `shopping center customer feedback loop two tenant pilot case study`,
      ai: `เสนอการทดลองเล็ก 2–3 แบบที่ PARC Bangna เรียนรู้จากข้อสังเกตของ ${anomaly.entityName} โดยเชื่อมร้านอย่างน้อย 2 ร้าน พร้อมผู้รับผิดชอบ ประโยชน์ต่อลูกค้า ตัวชี้วัดนำ ข้อควรระวัง และเงื่อนไขหยุด ${constraints}`,
      labels: { search: "หาตัวอย่างกิจกรรมที่คล้ายกัน", ai: "ช่วยออกแบบการลองกับ 2 ร้าน" }
    }
  }[stage];
  return `<section class="anomaly-stage"><div><h3>${escapeHtml(stageData.title)}</h3><p>${escapeHtml(stageData.copy)}</p></div>${actionDiscoveryLinks(stageData.search, stageData.ai, stageData.labels)}</section>`;
}

function openMonthlyBucketDetail(entityId, index) {
  const payload = model.monthlyReviewCounts;
  const series = monthlySeries(entityId);
  const month = payload?.months?.[Number(index)];
  if (!series || !month) return;
  const value = series.counts?.[Number(index)];
  const incomplete = (series.incompleteIndexes || []).includes(Number(index)) || month.partial;
  const anomaly = monthlyAnomalyFor(entityId, Number(index));
  const source = monthlySource(entityId, series.name);
  const comparisonSeries = entityId === payload.parc.id
    ? (payload.competitors || []).find((item) => item.id === $("#monthlyCompetitor").value)
    : payload.parc;
  const comparisonValue = comparisonSeries?.counts?.[Number(index)];
  const displayCount = (count, prefix = "") => Number.isFinite(Number(count)) && count !== null && count !== ""
    ? `${prefix}${fmt.format(Number(count))}`
    : "ยังไม่มีข้อมูล";
  const finding = anomaly?.type === "isolated-spike"
    ? `ช่วงนี้มี ${fmt.format(anomaly.value)} รีวิว ขณะที่ช่วงก่อนและหลังมี ${fmt.format(anomaly.neighborValues[0])} และ ${fmt.format(anomaly.neighborValues[1])} จำนวนต่างกันชัดเจน จึงควรถามว่าอะไรเปลี่ยนไป`
    : anomaly?.type === "level-shift"
      ? `สามช่วงก่อนหน้ามีราว ${fmt.format(anomaly.baseline)} รีวิวต่อช่วง จากนั้นสามช่วงถัดมาขยับเป็นราว ${fmt.format(anomaly.afterMedian)} รีวิวต่อช่วง จึงควรตรวจว่าเกิดอะไรขึ้นและข้อมูลเก็บได้ครบแค่ไหน`
      : `ช่วงนี้ ${series.name} มี ${displayCount(value, incomplete ? "อย่างน้อย " : "")} รีวิว ส่วน ${comparisonSeries?.name || "อีกชุด"} มี ${displayCount(comparisonValue)} รีวิว ใช้เทียบจังหวะรีวิวได้ แต่ห้ามใช้ตัดสินว่าใครดีกว่า เพราะแต่ละแห่งมีอายุและฐานผู้รีวิวไม่เท่ากัน`;
  const genericAnomaly = anomaly || {
    entityName: series.name,
    bucketLabel: month.label,
    type: "context",
    value,
    algorithmVersion: anomalyAlgorithmVersion
  };
  openEvidenceDialog({
    kicker: `${anomaly ? "ช่วงที่ควรหยุดดู" : "รายละเอียดแท่งกราฟ"} · ${month.label}`,
    title: series.name,
    body: `<div class="anomaly-finding ${anomaly ? "flagged" : ""}"><span aria-hidden="true">${anomaly ? "!" : "i"}</span><div><p class="eyebrow">ตัวเลขบอกอะไร</p><h3>${escapeHtml(finding)}</h3></div></div>
      <div class="detail-grid">
        <section><span>หลักฐานที่มี</span><p>จำนวนรวมจากรีวิวที่ Google Maps แสดงเมื่อเรียงใหม่สุด เก็บเมื่อ ${dateFmt.format(parseDate(payload.observedAt))}</p></section>
        <section><span>สิ่งที่ยังไม่มี</span><p>ยังไม่มีรหัสและข้อความรีวิวรายชิ้นผูกกับแท่งนี้ จึงเปิดดูได้ถึงหน้าสถานที่ แต่ยังชี้ไม่ได้ว่ารีวิวใดสร้างยอด</p></section>
        <section class="wide"><span>ข้อควรระวัง</span><p>${incomplete ? "ช่วงนี้ข้อมูลไม่ครบ จึงเป็นค่าต่ำสุดและห้ามใช้ตรวจความผิดปกติ " : ""}นี่เป็นช่วงอายุรีวิว ไม่ใช่เดือนปฏิทิน และยังไม่พิสูจน์สาเหตุ</p></section>
      </div>
      <div class="anomaly-stage-list">${anomalyStageLinks(genericAnomaly, "root")}${anomalyStageLinks(genericAnomaly, "probe")}${anomalyStageLinks(genericAnomaly, "solution")}</div>
      ${source.available ? `<a class="source-cta" href="${escapeHtml(source.href)}" target="_blank" rel="noreferrer">${icon("source")}<span><strong>${escapeHtml(source.label)}</strong><small>${escapeHtml(source.note)}</small></span></a>` : ""}`
  });
}

function renderMonthlyReviewChart() {
  const payload = model.monthlyReviewCounts;
  const select = $("#monthlyCompetitor");
  const chart = $("#monthlyReviewChart");

  if (!payload?.months?.length || !payload?.parc?.counts?.length || !payload?.competitors?.length) {
    select.innerHTML = `<option>รอข้อมูลรีวิวต้นทางครบ 12 เดือน</option>`;
    select.disabled = true;
    chart.innerHTML = `<div class="chart-empty">
      <span class="empty-icon" aria-hidden="true">${icon("calendar")}</span>
      <div><strong>ยังไม่มีตัวเลขครบ 12 เดือน</strong>
      <p>ตอนนี้เรามียอดรวมบางวันกับตัวอย่างรีวิวบางส่วน ถ้าวาดกราฟเลยจะดูเหมือนเป็นจำนวนรีวิวจริงทั้งที่ไม่ใช่ เมื่อเติมวันที่รีวิวต้นทางครบ กราฟนี้จะเปิดให้เลือกคู่แข่งและเทียบกับ PARC โดยอัตโนมัติ</p>
      <small>จะนับจากวันที่รีวิวถูกโพสต์ ไม่ใช้วันที่นำเข้า MLA และไม่เอารีวิว tenant มารวมเป็นรีวิวของ PARC</small>
      <button type="button" class="copy-data-cta" data-copy-monthly-prompt>${icon("sparkle")}<span><strong>เตรียมคำสั่งให้ Claude เก็บข้อมูลที่ขาด</strong><small>คัดลอกคำสั่งพร้อมกติกากันนับวันที่ผิด</small></span></button>
      <span class="copy-status" data-copy-status aria-live="polite"></span></div>
    </div>`;
    return;
  }

  select.disabled = false;
  const selectedId = select.value;
  select.innerHTML = payload.competitors.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("");
  if (payload.competitors.some((item) => item.id === selectedId)) select.value = selectedId;
  const competitor = payload.competitors.find((item) => item.id === select.value) || payload.competitors[0];
  select.value = competitor.id;
  const normalizeCount = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const parcCounts = payload.parc.counts.map(normalizeCount);
  const competitorCounts = competitor.counts.map(normalizeCount);
  const max = Math.max(...parcCounts.filter(Number.isFinite), ...competitorCounts.filter(Number.isFinite), 1);
  const qualityText = (item) => item?.quality
    ? `ใช้ทำกราฟ ${fmt.format(item.quality.used)} รีวิว · ตัด ${fmt.format(item.quality.editedExcluded)} รายการที่แสดงเวลาแก้ไขและ ${fmt.format(item.quality.yearBoundaryExcluded)} รายการตรงขอบ 1 ปีออก${item.quality.complete === false ? " · มีหนึ่งช่วงที่ข้อมูลยังไม่ครบ" : ""}`
    : "ยังไม่มีรายละเอียดว่าข้อมูลครบแค่ไหน";
  const bars = payload.months.map((month, index) => {
    const parcValue = parcCounts[index] ?? null;
    const competitorValue = competitorCounts[index] ?? null;
    const parcIncomplete = (payload.parc.incompleteIndexes || []).includes(index);
    const competitorIncomplete = (competitor.incompleteIndexes || []).includes(index);
    const parcLabel = parcIncomplete && Number.isFinite(parcValue) ? `≥${parcValue}` : (parcValue ?? "—");
    const competitorLabel = competitorIncomplete && Number.isFinite(competitorValue) ? `≥${competitorValue}` : (competitorValue ?? "—");
    const parcHeight = Number.isFinite(parcValue) && parcValue > 0 ? Math.max(2, parcValue / max * 100) : 0;
    const competitorHeight = Number.isFinite(competitorValue) && competitorValue > 0 ? Math.max(2, competitorValue / max * 100) : 0;
    const parcAnomaly = monthlyAnomalyFor(payload.parc.id, index);
    const competitorAnomaly = monthlyAnomalyFor(competitor.id, index);
    return `<div class="month-group" role="group" aria-label="${escapeHtml(month.label)} PARC ${parcIncomplete ? "อย่างน้อย " : ""}${parcValue ?? "ไม่มีข้อมูล"} รีวิว ${escapeHtml(competitor.name)} ${competitorIncomplete ? "อย่างน้อย " : ""}${competitorValue ?? "ไม่มีข้อมูล"} รีวิว">
      <div class="month-pair">
        <button type="button" class="monthly-bar parc${parcIncomplete ? " incomplete" : ""}${parcAnomaly ? " is-anomaly" : ""}" data-monthly-series="${escapeHtml(payload.parc.id)}" data-month-index="${index}" aria-label="เปิดรายละเอียด PARC Bangna ${escapeHtml(month.label)} ${parcIncomplete ? "อย่างน้อย " : ""}${parcValue ?? "ไม่มีข้อมูล"} รีวิว${parcAnomaly ? " จุดที่ควรตรวจ" : ""}" style="height:${parcHeight}%"><b>${parcLabel}</b>${parcAnomaly ? '<span class="bar-alert" aria-hidden="true">!</span>' : ""}</button>
        <button type="button" class="monthly-bar competitor${competitorIncomplete ? " incomplete" : ""}${competitorAnomaly ? " is-anomaly" : ""}" data-monthly-series="${escapeHtml(competitor.id)}" data-month-index="${index}" aria-label="เปิดรายละเอียด ${escapeHtml(competitor.name)} ${escapeHtml(month.label)} ${competitorIncomplete ? "อย่างน้อย " : ""}${competitorValue ?? "ไม่มีข้อมูล"} รีวิว${competitorAnomaly ? " จุดที่ควรตรวจ" : ""}" style="height:${competitorHeight}%"><b>${competitorLabel}</b>${competitorAnomaly ? '<span class="bar-alert" aria-hidden="true">!</span>' : ""}</button>
      </div>
      <span class="month-label">${escapeHtml(month.label)}${month.partial ? "*" : ""}</span>
    </div>`;
  }).join("");
  chart.innerHTML = `<div class="monthly-legend"><span><i class="swatch current"></i>PARC Bangna</span><span><i class="swatch previous"></i>${escapeHtml(competitor.name)}</span></div>
    <div class="monthly-quality"><span><strong>PARC</strong>${escapeHtml(qualityText(payload.parc))}</span><span><strong>${escapeHtml(competitor.name)}</strong>${escapeHtml(qualityText(competitor))}</span></div>
    <p class="monthly-scroll-hint">เลื่อนซ้าย–ขวาเพื่อดูครบทุกเดือน</p>
    <div class="monthly-chart-scroll"><div class="monthly-bars" style="--month-count:${payload.months.length}">${bars}</div></div>
    <p class="micro caveat">${escapeHtml(payload.note || "แบ่งรีวิวตามคำบอกเวลาที่ Google แสดง")}${payload.months.some((month) => month.partial) ? " · * ช่วงล่าสุดยังไม่ครบ" : ""}${competitor.quality?.coverageNote ? ` · ${escapeHtml(competitor.quality.coverageNote)}` : ""}</p>`;
  renderMonthlyAnomalySummary();
}

function renderThemes() {
  const max = Math.max(...model.themes.map((item) => item.count), 1);
  $("#themeBars").innerHTML = model.themes.map((item) =>
    `<button type="button" class="theme-row theme-drilldown" data-theme-detail="${escapeHtml(item.name)}" aria-label="เปิดข้อสังเกตต้นทางเรื่อง ${escapeHtml(item.name)} ${fmt.format(item.count)} รายการ"><span>${escapeHtml(item.name)}</span><span class="track"><span class="fill ${escapeHtml(item.tone)}" style="width:${item.count / max * 100}%"></span></span><strong>${fmt.format(item.count)}</strong></button>`
  ).join("");
}

function observationTheme(item) {
  const haystack = [item.mission, item.rawSignal].filter(Boolean).join(" ");
  return themeRules.find(([, rule]) => rule.test(haystack))?.[0] || "เรื่องอื่น ๆ";
}

function observationMatchesTheme(item, themeName) {
  return observationTheme(item) === themeName;
}

function publicObservationView(item) {
  const canonicalVenueName = /^C\d+$/i.test(String(item.entityId || ""))
    ? (model.venues || []).find((venue) => venue.id === item.entityId)?.name
    : "";
  const publicItem = canonicalVenueName ? { ...item, entity: canonicalVenueName } : item;
  const sensitive = {
    "SIG-20260802-P00-TICKS": {
      rawSignal: "มีเสียงหนึ่งรายการที่ทำให้ทีมต้องตรวจสุขภาพและความปลอดภัยของสนามหญ้า",
      interpretation: "อยู่ในคิวตรวจเร่งด่วน ต้องตรวจพื้นที่และบันทึกผลก่อนสื่อสารต่อ โดยไม่เปิดเผยรายละเอียดที่อาจระบุตัวบุคคล",
      urgentId: "RQ-20260802-P00-TICKS-001"
    },
    "SIG-20260802-C07-PARKING": {
      rawSignal: "มีเสียงเกี่ยวกับการจัดการข้อมูลส่วนบุคคลในบริบทระบบจอดรถ ซึ่งต้องแยกตรวจจากปัญหาการจราจรทั่วไป",
      interpretation: "อยู่ในคิวตรวจข้อเท็จจริงและขั้นตอนภายใน ไม่เผยแพร่ข้อกล่าวหาหรือข้อมูลบุคคลระหว่างตรวจ",
      urgentId: "RQ-20260802-C07-PDPA-001"
    }
  }[item.id];
  return sensitive ? { ...publicItem, ...sensitive, publicRedacted: true } : publicItem;
}

function openEvidenceDialog({ kicker, title, body }) {
  const dialog = $("#evidenceDialog");
  $("#evidenceDialogKicker").textContent = kicker;
  $("#evidenceDialogTitle").textContent = title;
  $("#evidenceDialogBody").innerHTML = body;
  dialog.scrollTop = 0;
  if (!dialog.open) {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }
}

function openReviewDetail(index) {
  const item = (model.reviewHighlights || [])[Number(index)];
  if (!item) return;
  const source = sourceDestination(item);
  const discovery = contextDiscovery(item);
  const defaultGuardrail = "เสียงนี้มาจากแพลตฟอร์มเดียว จึงใช้ตั้งคำถามและออกแบบการทดลองได้ แต่ยังใช้แทนลูกค้าทั้งหมดไม่ได้";
  const auditLine = item.reviewUid
    ? `<p class="review-audit"><span>${Number.isFinite(Number(item.rating)) ? `${escapeHtml(item.rating)}★ · ` : ""}${escapeHtml(item.reviewUid)}</span><span>${escapeHtml(item.sourceRowId || "")}</span></p>`
    : "";
  openEvidenceDialog({
    kicker: `${reviewGroupNames[item.group] || item.group} · ${item.sourceType}`,
    title: item.entity,
    body: `<blockquote class="dialog-quote">“${escapeHtml(item.quote)}”</blockquote>
      <p class="review-date">${escapeHtml(item.dateLabel)}</p>
      ${auditLine}
      <div class="detail-grid">
        <section><span>รีวิวอาจกำลังบอกอะไร</span><p>${escapeHtml(item.insight || item.action)}</p></section>
        <section><span>อย่าเพิ่งสรุปว่า</span><p>${escapeHtml(item.guardrail || defaultGuardrail)}</p></section>
        <section><span>ลองทำวันนี้ · ${escapeHtml(item.owner)}</span><p>${escapeHtml(item.nextStep || item.action)}</p></section>
        <section><span>เช็กว่าได้ผลไหม</span><p>${escapeHtml(item.successCheck || "กำหนดจำนวนคน ช่วงเวลา และสิ่งที่จะวัดก่อนเริ่ม แล้วเก็บผลแยกจากความเห็นของทีม")}</p></section>
      </div>
      <aside class="discovery-panel">
        <span class="discovery-art" aria-hidden="true">${icon(discovery.mode === "ai" ? "sparkle" : "search")}</span>
        <div><p class="eyebrow">ค้นต่อเพื่อช่วยตัดสินใจ</p><h3>${escapeHtml(discovery.label)}</h3><p>${escapeHtml(discovery.hint)} ด้วยคำถามที่เตรียมจากรีวิวสาธารณะนี้ แล้วกลับมาปิดการทดลองในรายงานเดิม</p></div>
        <a class="context-cta ${escapeHtml(discovery.mode)}" href="${escapeHtml(discovery.url)}" target="_blank" rel="noreferrer" title="จะค้นหา: ${escapeHtml(discovery.query)}"><span>${icon(discovery.mode === "ai" ? "sparkle" : "search")}</span><span><strong>${escapeHtml(discovery.label)}</strong><small>${escapeHtml(discovery.hint)} · เปิดแท็บใหม่</small></span></a>
        <details class="query-preview"><summary>ดูคำถามที่จะส่งก่อนเปิด Google</summary><p>${escapeHtml(discovery.query)}</p></details>
      </aside>
      ${source.available
        ? `<a class="source-cta" href="${escapeHtml(source.href)}" target="_blank" rel="noreferrer">${icon("source")}<span><strong>${escapeHtml(source.label)}</strong><small>${escapeHtml(source.note)}</small></span></a>`
        : `<span class="source-cta unavailable" aria-disabled="true">${icon("source")}<span><strong>${escapeHtml(source.label)}</strong><small>${escapeHtml(source.note)}</small></span></span>`}`
  });
}

function openThemeDetail(themeName) {
  const rows = (model.sourceObservations || [])
    .filter((item) => observationMatchesTheme(item, themeName))
    .map(publicObservationView);
  const voiceCount = rows.filter((item) => item.evidenceClass === "voice").length;
  const contextCount = rows.length - voiceCount;
  const body = `<p class="dialog-lead">หัวข้อนี้มีเสียงลูกค้า ${fmt.format(voiceCount)} รายการ${contextCount ? ` และหลักฐานประกอบ ${fmt.format(contextCount)} รายการ` : ""} ใช้เลือกเรื่องที่ทีมควรถามและตรวจต่อ ไม่ใช่จำนวนลูกค้าหรือสัดส่วนของปัญหาทั้งหมด</p>
    <div class="role-handoff"><span><strong>ทีม CX</strong> อ่านว่าสิ่งใดกระทบลูกค้า</span><span><strong>ทีมหน้างาน / ร้านค้า</strong> เติมข้อเท็จจริงที่ยังขาด</span><span><strong>เจ้าของเรื่อง</strong> ทดลองเล็ก วัดผล และบอกกลับว่าเปลี่ยนอะไร</span></div>
    <div class="observation-list">${rows.map((item) => entityObservationCard(item, false)).join("") || `<p class="empty-state">ยังไม่มีข้อสังเกตที่ผูกกับหัวข้อนี้ให้เปิดดู</p>`}</div>`;
  openEvidenceDialog({
    kicker: `ข้อสังเกตต้นทางที่เปิดดูได้ ${fmt.format(rows.length)} รายการ`,
    title: themeName,
    body
  });
}

const entityMetricLabels = {
  total: "ข้อสังเกตทั้งหมด",
  nonDuplicate: "ข้อสังเกตที่ไม่ซ้ำ",
  curated: "ข้อสังเกตที่ผ่านการตรวจสำหรับใช้ภายใน"
};

function entityObservationSelection(entity, metricKey) {
  const allRows = (model.sourceObservations || []).filter((item) =>
    entity.id === "XV"
      ? item.entityId == null || item.group === "cross_venue"
      : item.entityId === entity.id
  );

  if (metricKey === "nonDuplicate") {
    return { rows: allRows.filter((item) => !item.duplicateOf), exact: true };
  }

  if (metricKey === "curated" && Number(entity.curated) !== Number(entity.total)) {
    return {
      rows: allRows,
      exact: false,
      note: "ทะเบียนที่หน้าเว็บอ่านได้ยังไม่มีสถานะผ่านการตรวจในระดับรายข้อ จึงเปิดให้ดูหลักฐานที่ผูกกับสถานที่ทั้งหมดก่อน โดยไม่อ้างว่าทุกรายการอยู่ในยอดที่เลือก"
    };
  }

  return { rows: allRows, exact: true };
}

function observationEvidenceLabel(item) {
  return {
    voice: "เสียงลูกค้า",
    claim: "ข้อมูลที่สถานที่เผยแพร่",
    result: "ข่าวหรือเหตุการณ์ที่มีบันทึก"
  }[item.evidenceClass] || "หลักฐานประกอบ";
}

function observationPlainText(value) {
  const replacements = [
    [/\bGBP direct\b/gi, "หน้าสถานที่บน Google Maps"],
    [/\bGBP\b/g, "Google Maps"],
    [/\bwayfinding\b/gi, "ป้ายและการหาทาง"],
    [/\bnavigation\b/gi, "การหาทาง"],
    [/\bpeak\b/gi, "ช่วงคนหนาแน่น"],
    [/\bescalator\b/gi, "บันไดเลื่อน"],
    [/\bbaseline\b/gi, "ภาพเดิม"],
    [/\bmain entrance\b/gi, "ทางเข้าหลัก"],
    [/\bweekend parking\b/gi, "ที่จอดรถช่วงสุดสัปดาห์"],
    [/\bVisitor update\b/gi, "รีวิวล่าสุด"],
    [/\brestroom waiting\/capacity\b/gi, "การรอและความจุห้องน้ำ"],
    [/\bvariety\/value\b/gi, "ความหลากหลายและความคุ้มค่า"],
    [/\bfamily-friendly events\b/gi, "กิจกรรมสำหรับครอบครัว"],
    [/\bstaff\/security helpful\b/gi, "พนักงานและ รปภ. ให้ความช่วยเหลือ"],
    [/\baccess\/parking\b/gi, "การเดินทางและที่จอดรถ"],
    [/\bfood court\b/gi, "ศูนย์อาหาร"],
    [/\bfood\/utility uplift\b/gi, "อาหารและบริการที่ดีขึ้น"],
    [/\btopic\b/gi, "หัวข้อ"],
    [/\btag\b/gi, "หัวข้อเด่น"],
    [/\bhighlighted\/relevance-ranked\b/gi, "ที่ Google จัดไว้ในกลุ่มเกี่ยวข้อง"],
    [/\bparking ramps\b/gi, "ทางลาดอาคารจอดรถ"],
    [/\bprevalence\b/gi, "ความชุกของปัญหา"],
    [/\bfriction\b/gi, "ความติดขัด"],
    [/\bone-stop\b/gi, "ทำธุระได้ครบในที่เดียว"],
    [/\bsupermarket\/home-improvement utility\b/gi, "ซูเปอร์มาร์เก็ตและร้านของใช้ในบ้าน"],
    [/\bExecutive Sponsor\b/gi, "ผู้สนับสนุนโครงการ"],
    [/\bpattern\b/gi, "รูปแบบ"],
    [/\bjourney\b/gi, "เส้นทางการใช้งาน"],
    [/\bdata-quality screen\b/gi, "การตรวจคุณภาพข้อมูล"],
    [/\bobservations\b/gi, "ข้อสังเกต"],
    [/\btenants\b/gi, "ร้าน"],
    [/\bself-directed daytime\b/gi, "การใช้เวลาช่วงกลางวันที่ลูกค้าเลือกเอง"],
    [/\bco-working\b/gi, "พื้นที่ทำงานร่วม"],
    [/\bworkspace\b/gi, "พื้นที่นั่งทำงาน"],
    [/\bwork space\b/gi, "พื้นที่นั่งทำงาน"],
    [/\bwellness\b/gi, "สุขภาพ"],
    [/\borganic\b/gi, "ออร์แกนิก"],
    [/\blocal\b/gi, "ท้องถิ่น"],
    [/\bYellow Line\b/gi, "รถไฟฟ้าสายสีเหลือง"]
  ];
  return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), String(value || ""));
}

function observationMissionText(value) {
  const replacements = [
    [/\bArrival\b/gi, "การมาถึง"], [/\bparking\b/gi, "ที่จอดรถ"],
    [/\bcomfort\b/gi, "ความสบาย"], [/\btrust\b/gi, "ความไว้ใจ"],
    [/\bsafety\b/gi, "ความปลอดภัย"], [/\bdining\b/gi, "อาหาร"],
    [/\bshopping\b/gi, "ช้อปปิ้ง"], [/\bfamily\b/gi, "ครอบครัว"],
    [/\bevents?\b/gi, "กิจกรรม"], [/\bfood\b/gi, "อาหาร"],
    [/\bculture\b/gi, "วัฒนธรรม"], [/\blearning\b/gi, "การเรียนรู้"],
    [/\brestrooms?\b/gi, "ห้องน้ำ"], [/\bcrowding\b/gi, "ความหนาแน่น"],
    [/\breputation\b/gi, "ความเชื่อมั่น"], [/\brest\b/gi, "การพัก"],
    [/\batmosphere\b/gi, "บรรยากาศ"], [/\bweekend visit\b/gi, "การมาในวันหยุด"]
  ];
  const plain = replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), observationPlainText(value));
  return plain.replace(/\s*[;/]\s*/g, " · ");
}

function observationTeamQuestion(item) {
  if (item.publicRedacted) {
    return "ใครต้องตรวจข้อเท็จจริงวันนี้ ต้องเก็บหลักฐานอะไร และจะรายงานผลโดยไม่เปิดเผยข้อมูลที่อ่อนไหวอย่างไร";
  }
  if (item.group === "cross_venue") {
    return "แต่ละสถานที่ใช้ระบบและมีเงื่อนไขเหมือนกันจริงหรือไม่ จุดไหนเป็นปัญหาที่ PARC ต้องตรวจเอง และจะทดลองแก้แบบเล็กก่อนขยายอย่างไร";
  }
  if (item.group === "parc") {
    return "ลูกค้าพบประสบการณ์นี้ที่จุดไหนและช่วงเวลาใด ใครแก้ได้เร็วที่สุด และเราจะบอกผลกลับให้ลูกค้าหรือร้านค้าที่เกี่ยวข้องรับรู้อย่างไร";
  }
  return "อะไรทำให้ลูกค้ารับรู้เรื่องนี้ เราต้องหาหลักฐานอะไรเพิ่ม และ PARC จะทดลองนำบทเรียนมาใช้โดยไม่ด่วนสรุปหรือเลียนแบบคู่แข่งตรง ๆ อย่างไร";
}

function entityObservationCard(item, showDuplicate) {
  const source = item.publicRedacted ? { available: false } : sourceDestination(item);
  const entityName = item.entity === "Cross-venue" ? "ข้ามหลายสถานที่" : item.entity;
  const date = item.sourceEventAt
    ? `หลักฐานลงวันที่ ${dateFmt.format(parseDate(item.sourceEventAt))}`
    : item.observedAt
      ? `เก็บเมื่อ ${dateFmt.format(parseDate(item.observedAt))}`
      : "ยังไม่ระบุวันที่หลักฐาน";
  const duplicateLabel = showDuplicate && item.duplicateOf ? " · เนื้อหาซ้ำกับข้อก่อนหน้า" : "";
  const auditParts = item.publicRedacted
    ? []
    : [item.id, item.sourceId, item.evidenceLevel, item.coverage].filter(Boolean);

  return `<article class="observation-card entity-observation-card">
    <div class="observation-meta"><span>${escapeHtml(entityName)} · ${escapeHtml(observationEvidenceLabel(item))}${escapeHtml(duplicateLabel)}</span><span>${escapeHtml(date)}</span></div>
    <h3>พบอะไร</h3><p>${escapeHtml(observationPlainText(item.rawSignal))}</p>
    <h3>คำถามที่ทีมควรตอบ</h3><p>${escapeHtml(observationTeamQuestion(item))}</p>
    <details class="observation-audit"><summary>ดูบันทึกวิเคราะห์และรหัสสำหรับตรวจย้อนหลัง</summary><p>${escapeHtml(item.interpretation)}</p>${auditParts.length ? `<small>${escapeHtml(auditParts.join(" · "))}</small>` : ""}</details>
    <div class="observation-links"><span>${escapeHtml(item.mission ? `เรื่องที่ต้องตาม · ${observationMissionText(item.mission)}` : "ยังไม่ระบุเรื่องที่ต้องตาม")}</span>${item.publicRedacted
      ? `<button type="button" class="text-button" data-urgent-detail="${escapeHtml(item.urgentId)}">เปิดแผนตรวจที่ปกปิดรายละเอียด ${icon("arrow")}</button>`
      : source.available
        ? `<span class="source-destination"><a href="${escapeHtml(source.href)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)} ↗</a><small>${escapeHtml(source.note)}</small></span>`
        : `<span class="source-destination unavailable" aria-disabled="true"><strong>${escapeHtml(source.label)}</strong><small>${escapeHtml(source.note)}</small></span>`}</div>
  </article>`;
}

function openEntityDetail(entityId) {
  const entity = (model.entities || []).find((item) => item.id === entityId);
  if (!entity) return;
  const metricKey = $("#entityMetric").value;
  const metricLabel = entityMetricLabels[metricKey] || entityMetricLabels.total;
  const metricValue = Number(entity[metricKey] || 0);
  const selection = entityObservationSelection(entity, metricKey);
  const rows = selection.rows.map(publicObservationView);
  const voiceCount = rows.filter((item) => item.evidenceClass === "voice").length;
  const contextCount = rows.length - voiceCount;
  const availableCount = rows.length;
  const complete = selection.exact && availableCount === metricValue;
  const availabilityCopy = complete
    ? `เปิดอ่านได้ครบ ${fmt.format(availableCount)} ข้อจากทะเบียนหลักฐานชุดเดียวกับยอดบนกราฟ`
    : `${selection.note || `ยอดบนกราฟมี ${fmt.format(metricValue)} ข้อ แต่หน้าเว็บเปิดหลักฐานรายข้อได้ ${fmt.format(availableCount)} ข้อในขณะนี้`} ใช้ยอดบนกราฟดูภาพรวม และเปิดทะเบียนเพื่อดูส่วนที่ยังไม่ผูกกับหน้าเว็บ`;
  const visibleRows = rows.slice(0, Math.max(availableCount, 0));
  const digest = visibleRows.slice(0, 3).map((item) => item.rawSignal).join(" | ").slice(0, 700);
  const isCrossVenue = entity.id === "XV";
  const searchQuery = isCrossVenue
    ? "community mall Bangkok parking wayfinding customer reviews latest"
    : `${entity.name} รีวิวล่าสุด Google Maps`;
  const aiPrompt = `ช่วยทีม PARC Bangna วิเคราะห์ข้อสังเกตของ ${entity.name} เพื่อหาสิ่งที่ต้องตรวจเพิ่มและทางทดลองที่เป็นประโยชน์ต่อลูกค้า แยก 1) สิ่งที่หลักฐานบอกจริง 2) สมมติฐานสาเหตุอย่างน้อย 3 ด้าน 3) คำถามหน้างาน 4) การทดลองเล็กที่เชื่อมอย่างน้อย 2 ร้านใน PARC และ 5) วิธีบอกผลกลับเพื่อปิด feedback loop ห้ามใช้รีวิวจากแพลตฟอร์มเดียวแทนลูกค้าทั้งหมด และห้ามสรุปเหตุและผลจากจำนวนข้อสังเกต หลักฐานตั้งต้น: ${digest || "ยังไม่มีรายละเอียดรายข้อที่เปิดได้"}`;
  const workbenchUrl = /^https:\/\//i.test(String(model.meta?.workbenchUrl || "")) ? model.meta.workbenchUrl : "";

  openEvidenceDialog({
    kicker: `${metricLabel} · ${fmt.format(metricValue)} ข้อ`,
    title: entity.name,
    body: `${placeMediaCardHtml(entity.id, entity.name)}<p class="dialog-lead">กดอ่านแต่ละข้อเพื่อแยกสิ่งที่พบออกจากสิ่งที่ยังต้องพิสูจน์ ตัวเลขนี้ช่วยจัดคิวตรวจ ไม่ใช่จำนวนลูกค้าและไม่ใช่สัดส่วนของปัญหาทั้งหมด</p>
      <div class="tenant-snapshot-grid entity-snapshot-grid">
        <div><span>${escapeHtml(metricLabel)}</span><strong>${fmt.format(metricValue)}</strong></div>
        <div><span>ข้อที่มาจากเสียงลูกค้า</span><strong>${fmt.format(voiceCount)}</strong></div>
        <div><span>ข้อจากหลักฐานอื่น</span><strong>${fmt.format(contextCount)}</strong></div>
      </div>
      <p class="data-availability-note${complete ? " complete" : ""}">${escapeHtml(availabilityCopy)}</p>
      <div class="observation-list">${visibleRows.map((item) => entityObservationCard(item, metricKey === "total")).join("") || `<p class="empty-state">ยังไม่มีหลักฐานรายข้อที่เปิดจากหน้าเว็บได้สำหรับตัวเลือกนี้</p>`}</div>
      <section class="tenant-action-panel entity-action-panel">
        <div class="action-panel-head"><div><p class="eyebrow">ต่อจากการอ่านหลักฐาน</p><h3>ค้นให้ชัดก่อนเลือกสิ่งที่จะลงมือทำ</h3><p>เริ่มจากตรวจข้อมูลล่าสุด แล้วค่อยใช้ AI ช่วยแตกสมมติฐาน คำถามหน้างาน และการทดลองที่ทีมวัดผลและบอกผลกลับได้</p></div></div>
        ${actionDiscoveryLinks(searchQuery, aiPrompt, { search: "ค้นข้อมูลล่าสุดของสถานที่นี้", ai: "ช่วยคิดสาเหตุและทางทดลอง" })}
      </section>
      ${workbenchUrl ? `<div class="dialog-footer-actions"><a class="source-cta secondary" href="${escapeHtml(workbenchUrl)}" target="_blank" rel="noreferrer">${icon("source")}<span><strong>เปิดทะเบียนข้อมูลทั้งหมด</strong><small>ตรวจยอด สถานะ และหลักฐานที่ยังไม่ผูกกับหน้าเว็บ</small></span></a></div>` : ""}`
  });
}

function tenantDataName(displayName) {
  return actionPlanData.tenantAliases?.[displayName] || displayName;
}

function tenantKnownNames(displayName, registryAlias) {
  const priorRegistryNames = Object.entries(actionPlanData.tenantCanonicalNames || {})
    .filter(([, canonicalName]) => canonicalName === displayName)
    .map(([priorName]) => priorName);
  return [...new Set([
    displayName,
    tenantDataName(displayName),
    registryAlias,
    ...priorRegistryNames
  ].filter(Boolean))];
}

function tenantReviews(displayName) {
  const knownNames = new Set(tenantKnownNames(displayName));
  return (model.tenantReviewItems || []).filter((item) =>
    knownNames.has(item.tenant) || knownNames.has(item.registryAlias)
  );
}

function supplementalReviewItems() {
  return (model.tenantReviewItems || []).filter((item) =>
    item.captureBatch === "kinroll-20260803" && !item.edited && item.sourceDateMin && item.sourceDateMax
  );
}

function tenantPlan(displayName) {
  const key = tenantDataName(displayName);
  return actionPlanData.tenantPlans?.[key] || actionPlanData.tenantPlans?.[displayName] || null;
}

function reviewDateText(item) {
  if (!item?.sourceDateMin || !item?.sourceDateMax) return "ต้นทางไม่ได้ระบุช่วงวันที่";
  const start = dateFmt.format(parseDate(item.sourceDateMin));
  const end = dateFmt.format(parseDate(item.sourceDateMax));
  return item.sourceDateMin === item.sourceDateMax ? start : `${start}–${end}`;
}

function openPeriodReviewQueue() {
  const anchor = parseDate($("#asOf").value || model.meta.dataAsOf);
  const start = shift(anchor, -27);
  const rows = reviewItemsInWindow(start, anchor).filter((item) => Number(item.rating) <= 3);
  const cards = rows.map((item) => `<article class="observation-card queue-review-card">
      <div class="observation-meta"><span>${escapeHtml(item.tenant)} · ${escapeHtml(item.rating)}★</span><span>${escapeHtml(reviewDateText(item))}</span></div>
      <blockquote>“${escapeHtml(item.text)}”</blockquote>
      <div class="observation-links"><span>${escapeHtml(item.reviewUid)} · ใช้เป็นคิวตรวจ ไม่ใช่ข้อสรุป</span><button type="button" class="text-button" data-tenant-detail="${escapeHtml(item.tenant)}">ดูข้อมูลร้านและแผนตรวจ ${icon("arrow")}</button></div>
    </article>`).join("");
  openEvidenceDialog({
    kicker: `Tenant Relations · รีวิว 1–3 ดาวใน 28 วันล่าสุด ${fmt.format(rows.length)} รายการ`,
    title: "เสียงที่ควรอ่านก่อนส่งต่อให้ทีมลงมือ",
    body: `<p class="dialog-lead">อ่านเพื่อแยกว่าเรื่องไหนเป็นเหตุเฉพาะครั้ง เรื่องไหนควรถามร้านเพิ่ม และเรื่องไหนต้องให้ Ops ตรวจหน้างาน เป้าหมายคือช่วยลูกค้าโดยไม่ด่วนตัดสินร้านหรือพนักงานจากรีวิวเดียว</p>
      <div class="role-handoff"><span><strong>Tenant Relations</strong> อ่านและถามบริบท</span><span><strong>ผู้จัดการร้าน</strong> ยืนยันข้อเท็จจริง</span><span><strong>Ops / CX</strong> ทดลองและวัดผล</span></div>
      <div class="observation-list">${cards || '<p class="empty-state">ช่วงนี้ยังไม่มีรีวิว 1–3 ดาวที่จัดวันที่ได้แน่นอน</p>'}</div>`
  });
}

function openTenantDetail(displayName) {
  const snapshot = (model.tenants || []).find((item) => item.name === displayName)
    || (model.tenants || []).find((item) => tenantDataName(item.name) === tenantDataName(displayName));
  if (!snapshot) return;
  const rows = tenantReviews(snapshot.name);
  const isCaptureGap = rows.length === 0 && Number(snapshot.reviews || 0) > 0;
  const captureTarget = Math.min(Math.max(Number(snapshot.reviews || 0), 1), 10);
  const plan = tenantPlan(snapshot.name);
  const evidenceRows = plan?.evidenceReviewUids?.length
    ? plan.evidenceReviewUids.map((uid) => rows.find((item) => item.reviewUid === uid)).filter(Boolean)
    : rows.filter((item) => !item.edited).slice(0, 2);
  const sourceItem = evidenceRows[0] || rows[0] || {
    entity: snapshot.name,
    sourceUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${snapshot.name} PARC Bangna`)}`
  };
  const source = sourceDestination({ ...sourceItem, entity: snapshot.name });
  const ownerRoles = plan?.ownerRoles || ["Tenant Relations", "ผู้จัดการร้าน"];
  const actionNow = plan?.actionNow || (rows.length
    ? "อ่านเสียงล่าสุดกับผู้จัดการร้าน เลือกหนึ่งสิ่งที่ควรรักษาและหนึ่งจุดที่ควรตรวจ แล้วทดลองร่วมกับร้านที่สองซึ่งช่วยภารกิจเดียวกัน"
    : `ให้ Tenant Relations เปิดหน้าร้านที่ยืนยันแล้ว เก็บรีวิวล่าสุดที่มีข้อความเท่าที่ Google แสดง สูงสุด ${fmt.format(captureTarget)} รายการ พร้อมคะแนน คำบอกเวลาต้นทาง และลิงก์หลักฐาน แล้วค่อยเลือกเรื่องที่ควรถามร้าน`);
  const successCheck = plan?.successCheck || (rows.length
    ? "มีข้อเท็จจริงจากร้านและลูกค้าอย่างน้อยสองมุม กำหนดคนรับผิดชอบ วันตรวจ และผลที่ลูกค้าควรได้รับก่อนเริ่ม"
    : `ได้ข้อความรีวิวครบเท่าที่ Google แสดงในรอบนี้ สูงสุด ${fmt.format(captureTarget)} รายการ ใช้ชื่อและ Place ID เดียวกัน พร้อมวันที่เก็บและข้อจำกัดของตัวอย่างครบ`);
  const guardrail = plan?.guardrail || (rows.length
    ? "รีวิวชุดนี้เป็นตัวอย่างล่าสุดและมีจำนวนจำกัด ใช้ชี้เรื่องที่ควรฟังต่อ ไม่ใช้คำนวณสัดส่วนหรือจัดอันดับคุณภาพร้าน"
    : `ยอดสะสม ${fmt.format(snapshot.reviews || 0)} รายการไม่ได้แปลว่า MLA อ่านรีวิวครบทั้งหมด และตัวอย่างรอบแรกห้ามใช้แทนลูกค้าทั้งหมด`);
  const searchQuery = plan?.searchQuery || `${snapshot.name} PARC Bangna reviews opening hours`;
  const aiPrompt = plan?.aiPrompt || `ช่วยวิเคราะห์เสียงลูกค้าของ ${snapshot.name} ที่ PARC Bangna โดยแยกสิ่งที่รู้ สิ่งที่ยังไม่รู้ คำถามที่ควรถามร้าน การทดลองเล็กที่เชื่อมอย่างน้อย 2 ร้าน วิธีวัดประโยชน์ที่ลูกค้าได้รับ และขอบเขตที่ต้องรักษา ห้ามสรุปจากตัวอย่างรีวิวแทนลูกค้าทั้งหมด`;
  const reviewHtml = evidenceRows.map((item) => `<article class="tenant-evidence-card">
      <div><strong>${escapeHtml(item.rating)}★</strong><span>${escapeHtml(reviewDateText(item))}</span></div>
      <blockquote>“${escapeHtml(item.text)}”</blockquote>
      <small>${escapeHtml(item.reviewUid)} · ${escapeHtml(item.sourceRowId)} · ลิงก์เป็นหน้าสถานที่ ไม่ใช่รีวิวรายชิ้น</small>
    </article>`).join("");

  openEvidenceDialog({
    kicker: `ร้านของเรา · ข้อมูล ณ ${dateFmt.format(parseDate(model.meta.dataAsOf))}`,
    title: snapshot.name,
    body: `${placeMediaCardHtml(null, snapshot.name)}<div class="tenant-snapshot-grid">
        <div><span>คะแนนบน Google Maps</span><strong>${snapshot.rating ?? "—"}</strong></div>
        <div><span>รีวิวทั้งหมด</span><strong>${snapshot.reviews == null ? "—" : fmt.format(snapshot.reviews)}</strong></div>
        <div><span>เสียงลูกค้าที่อ่านได้</span><strong>${fmt.format(rows.length)}</strong></div>
        <div><span>ชื่อร้านบน Google Maps</span><strong>${snapshot.matchStatus === "confirmed" ? "ยืนยันแล้ว" : "ยังต้องยืนยัน"}</strong></div>
      </div>
      <section class="tenant-action-panel">
        <div class="action-panel-head"><div><p class="eyebrow">${escapeHtml(plan?.status || (rows.length ? "เริ่มจากเสียงที่มี" : "รอเก็บเสียงรอบแรก"))}</p><h3>${escapeHtml(plan?.label || (rows.length ? "เลือกเรื่องที่ควรรักษาและเรื่องที่ควรตรวจ" : "ยอดรีวิวมีแล้ว แต่ข้อความยังไม่เข้าทะเบียน MLA"))}</h3></div><div class="owner-pills">${ownerRoles.map((role) => `<span>${escapeHtml(role)}</span>`).join("")}</div></div>
        <div class="detail-grid">
          <section><span>ทำอะไรต่อ</span><p>${escapeHtml(actionNow)}</p></section>
          <section><span>ดูว่าได้ผลไหม</span><p>${escapeHtml(successCheck)}</p></section>
          <section class="wide"><span>อย่าเพิ่งสรุปว่า</span><p>${escapeHtml(guardrail)}</p></section>
        </div>
        ${actionDiscoveryLinks(searchQuery, aiPrompt, { search: rows.length ? "เช็กข้อมูลร้านล่าสุด" : "เปิดดูรีวิวล่าสุดบน Google", ai: rows.length ? "ช่วยหาสาเหตุและทางทดลอง" : "ช่วยวางแผนเก็บเสียงรอบแรก" })}
      </section>
      <section class="tenant-review-detail">
        <div class="panel-head"><div><p class="eyebrow">เสียงที่ผูกกับรายละเอียดนี้</p><h3>${reviewHtml ? `${fmt.format(evidenceRows.length)} รีวิวที่เปิดอ่านได้` : "MLA ยังไม่ได้เก็บข้อความรีวิวของร้านนี้"}</h3></div></div>
        ${reviewHtml || `<p class="empty-state">Google แสดงรีวิวสะสม ${fmt.format(snapshot.reviews || 0)} รายการ ณ ${dateFmt.format(parseDate(model.meta.dataAsOf))} แต่ชุดข้อมูลปัจจุบันยังไม่มีข้อความรีวิวของร้านนี้ จึงยังวิเคราะห์คำชม ข้อติดขัด หรือแนวโน้มไม่ได้</p>`}
      </section>
      <div class="dialog-footer-actions">
        ${source.available ? `<a class="source-cta" href="${escapeHtml(source.href)}" target="_blank" rel="noreferrer">${icon("source")}<span><strong>${escapeHtml(source.label)}</strong><small>${escapeHtml(source.note)}</small></span></a>` : ""}
        <a class="source-cta secondary" href="${tenantReviewAuditUrl}" target="_blank" rel="noreferrer">${icon("source")}<span><strong>เปิดทะเบียนรีวิวชุดหลัก</strong><small>${isCaptureGap ? "ตรวจว่าร้านใดยังรอเก็บข้อความ" : "ใช้ตรวจรหัสแถวและข้อจำกัดของชุดข้อมูล"}</small></span></a>
      </div>`
  });
}

function openUrgentDetail(id) {
  const item = (model.urgent || []).find((row) => row.id === id);
  const plan = actionPlanData.urgentPlans?.[id];
  if (!item || !plan) return;
  const observation = (model.sourceObservations || []).find((row) => row.id === plan.evidenceId);
  const source = sourceDestination(observation || {});
  openEvidenceDialog({
    kicker: "งานเร่งด่วน · เปิดเฉพาะแผนตรวจที่ไม่เปิดเผยบุคคล",
    title: item.title,
    body: `<p class="dialog-lead">${escapeHtml(item.rule)} จุดประสงค์คือหาข้อเท็จจริงและลดความเสี่ยง ไม่ใช่เผยแพร่ข้อกล่าวหา</p>
      <section class="tenant-action-panel urgent-action-panel">
        <div class="action-panel-head"><div><p class="eyebrow">ผู้รับผิดชอบ</p><h3>${escapeHtml(plan.ownerRoles.join(" · "))}</h3></div><span class="pill danger">${escapeHtml(item.status)}</span></div>
        <div class="detail-grid">
          <section><span>ตรวจอะไรตอนนี้</span><p>${escapeHtml(plan.actionNow)}</p></section>
          <section><span>ถือว่าปิดงานเมื่อ</span><p>${escapeHtml(plan.successCheck)}</p></section>
          <section class="wide"><span>ขอบเขตที่ต้องรักษา</span><p>${escapeHtml(plan.guardrail)}</p></section>
        </div>
        ${actionDiscoveryLinks(plan.searchQuery, plan.aiPrompt, { search: "ค้นแนวทางจากหน่วยงานที่เกี่ยวข้อง", ai: "ช่วยร่างคำถามสำหรับทีมผู้เชี่ยวชาญ" })}
      </section>
      <div class="dialog-footer-actions">
        ${source.available ? `<a class="source-cta" href="${escapeHtml(source.href)}" target="_blank" rel="noreferrer">${icon("source")}<span><strong>${escapeHtml(source.label)}</strong><small>${escapeHtml(source.note)}</small></span></a>` : ""}
        <a class="source-cta secondary" href="${escapeHtml(model.meta.workbenchUrl)}" target="_blank" rel="noreferrer">${icon("arrow")}<span><strong>บันทึกผลตรวจใน MLA</strong><small>ปิดวงจรด้วยผลที่ตรวจได้ ไม่ใช่แค่สถานะงาน</small></span></a>
      </div>`
  });
}

function renderUrgent() {
  $("#urgentGrid").innerHTML = model.urgent.map((item) =>
    `<article class="urgent-card"><p class="eyebrow">งานที่ต้องตรวจ</p><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.rule)}</p><div class="urgent-meta"><span>ผู้รับผิดชอบ · ${escapeHtml(personNames[item.owner] || item.owner)}</span><span>ตรวจภายใน · ${dateFmt.format(parseDate(item.due))}</span><span>${escapeHtml(item.status)}</span></div><button type="button" class="urgent-detail-button" data-urgent-detail="${escapeHtml(item.id)}">เปิดแผนตรวจ ${icon("arrow")}</button></article>`
  ).join("");
}

function renderTenantThemes() {
  const max = Math.max(...model.tenantThemes.map((item) => item.count), 1);
  $("#tenantThemeGrid").innerHTML = model.tenantThemes.map((item) =>
    `<article class="tenant-theme-card"><div><span>${escapeHtml(item.name)}</span><strong>${fmt.format(item.count)}</strong></div><div class="track"><div class="fill ${escapeHtml(item.tone)}" style="width:${item.count / max * 100}%"></div></div><p>พบใน ${fmt.format(item.tenantCount)} ร้าน</p></article>`
  ).join("");
}

function renderTenants() {
  const query = $("#tenantSearch").value.trim().toLocaleLowerCase("th");
  const rows = [...model.tenants]
    .filter((row) => {
      const searchableNames = tenantKnownNames(row.name, row.registryAlias)
        .join(" ")
        .toLocaleLowerCase("th");
      return !query || searchableNames.includes(query);
    })
    .sort((a, b) => (b.reviews ?? -1) - (a.reviews ?? -1));

  $("#tenantRows").innerHTML = rows.map((row) => {
    const publicReviewCount = tenantReviews(row.name).length;
    const reviewCell = publicReviewCount
      ? fmt.format(publicReviewCount)
      : '<span class="tenant-review-gap">รอเก็บข้อความ</span>';
    return `<tr class="tenant-row" data-tenant-row="${escapeHtml(row.name)}"><td><button type="button" class="tenant-name-button" data-tenant-detail="${escapeHtml(row.name)}"><span>${escapeHtml(row.name)}</span>${icon("arrow")}</button></td><td>${row.rating ?? "—"}</td><td>${row.reviews == null ? "—" : fmt.format(row.reviews)}</td><td>${reviewCell}</td><td>${row.matchStatus === "confirmed" ? "Google Maps · ยืนยันแล้ว" : "ยังไม่พบหน้าร้านที่ยืนยันได้"}</td></tr>`;
  }).join("");
}

function mapVenueDetails(location) {
  const venue = (model.venues || []).find((item) => item.id === location.id) || {};
  const entity = (model.entities || []).find((item) => item.id === location.id) || null;
  const monthly = model.monthlyReviewCounts || {};
  const monthlyAvailable = monthly.parc?.id === location.id
    || (monthly.competitors || []).some((item) => item.id === location.id);
  return { venue, entity, monthlyAvailable };
}

function mapStatusText(location) {
  if (location.placeLifecycle === "project-site") return "พิกัดนี้เป็นหมุดสาธารณะของพื้นที่โครงการ ไม่ได้หมายความว่าศูนย์เปิดดำเนินการแล้ว";
  if (location.mapStatus === "verified-pin") return "ตำแหน่งจากหมุด Google Maps ที่เก็บไว้";
  if (location.mapStatus === "reference-viewport") return "ตำแหน่งจากลิงก์แผนที่อ้างอิง · ควรยืนยันหมุดอีกครั้ง";
  return "ยังไม่มีพิกัดที่ยืนยันได้ จึงไม่วางหมุดบนแผนที่";
}

function mapMarkerCode(location) {
  return location.id === "P00" ? "P" : location.id.replace(/^C/, "");
}

function mapReadoutHtml(location) {
  const { venue, entity, monthlyAvailable } = mapVenueDetails(location);
  const isParc = location.id === "P00";
  const type = venueTypeNames[venue.type] || venue.type || (isParc ? "คอมมูนิตี้มอลล์" : "สถานที่เปรียบเทียบ");
  const rating = venue.rating == null ? "—" : `${venue.rating}★`;
  const reviews = venue.reviews == null ? "—" : fmt.format(venue.reviews);
  const closing = venue.closing || "—";
  const observations = entity ? fmt.format(entity.total || 0) : "—";
  const mapUrl = /^https:\/\//i.test(String(location.mapUrl || "")) ? location.mapUrl : "";
  const searchUrl = googleSearchUrl(`${location.name} ที่ตั้ง ข้อมูลล่าสุด`);
  const mapCta = mapUrl
    ? `<a class="competitor-map-cta secondary" href="${escapeHtml(mapUrl)}" target="_blank" rel="noreferrer">${icon("source")}<span>เปิด Google Maps เพื่อดูข้อมูลล่าสุด</span></a>`
    : `<a class="competitor-map-cta secondary" href="${escapeHtml(searchUrl)}" target="_blank" rel="noreferrer">${icon("search")}<span>ค้นข้อมูลสถานที่ล่าสุด</span></a>`;
  const detailCta = entity
    ? `<button type="button" class="competitor-map-cta primary" data-map-entity-detail="${escapeHtml(location.id)}">${icon("arrow")}<span>ดูว่าเกิดอะไรขึ้น และทีมควรถามอะไรต่อ</span></button>`
    : "";
  const monthlyCta = monthlyAvailable
    ? `<button type="button" class="competitor-map-cta text" data-map-monthly="${escapeHtml(location.id)}">ดูว่าจังหวะรีวิวเปลี่ยนช่วงไหน ${icon("arrow")}</button>`
    : "";

  return `${placeMediaCardHtml(location.id, venue.name || location.name)}<div class="competitor-map-readout-head">
      <span class="competitor-map-code ${isParc ? "parc" : ""}">${escapeHtml(mapMarkerCode(location))}</span>
      <div><p class="eyebrow">${isParc ? "จุดอ้างอิงของเรา" : "คู่แข่งที่กำลังดู"}</p><h3>${escapeHtml(venue.name || location.name)}</h3><p>${escapeHtml(type)}</p></div>
    </div>
    <div class="competitor-map-stats">
      <div><span>คะแนน Google</span><strong>${escapeHtml(rating)}</strong></div>
      <div><span>รีวิวทั้งหมด</span><strong>${escapeHtml(reviews)}</strong></div>
      <div><span>ปิดเวลา</span><strong>${escapeHtml(closing)}</strong></div>
      <div><span>เรื่องที่ควรตาม</span><strong>${escapeHtml(observations)}</strong></div>
    </div>
    <p class="competitor-map-status status-${escapeHtml(location.mapStatus)}">${escapeHtml(mapStatusText(location))}</p>
    <div class="competitor-map-actions">${detailCta}${mapCta}${monthlyCta}</div>`;
}

function selectMapVenue(locationId, { focusMap = true } = {}) {
  const locations = model.competitorMap?.locations || [];
  const location = locations.find((item) => item.id === locationId);
  if (!location) return;
  selectedMapVenueId = location.id;
  $$(`[data-map-location]`).forEach((button) => {
    const selected = button.dataset.mapLocation === location.id;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  competitorMapController?.setSelected(location.id);
  if (focusMap && location.mapStatus === "verified-pin") {
    competitorMapController?.focus(location.id);
  }
  const readout = $("#competitorMapReadout");
  if (readout) readout.innerHTML = mapReadoutHtml(location);
}

function renderCompetitorMap() {
  const mapData = model.competitorMap || { meta: {}, locations: [] };
  const locations = (mapData.locations || []).filter((item) =>
    (model.venues || []).some((venue) => venue.id === item.id)
  );
  const hasCoordinates = (item) => item.lat !== null && item.lat !== "" && item.lng !== null && item.lng !== ""
    && Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng));
  const plotted = locations.filter((item) => item.mapStatus === "verified-pin" && hasCoordinates(item));
  const unplaced = locations.filter((item) => item.mapStatus !== "verified-pin" || !hasCoordinates(item));
  const canvas = $("#competitorMapCanvas");
  if (!canvas) return;
  competitorMapController?.remove();
  competitorMapController = null;
  if (!plotted.length) {
    canvas.innerHTML = `<p class="empty-state">ยังไม่มีพิกัดที่ผ่านการตรวจสำหรับทำแผนที่</p>`;
    $("#competitorMapReadout").innerHTML = "";
    $("#competitorMapIndex").innerHTML = "";
    $("#competitorMapUnplaced").innerHTML = "";
    return;
  }

  canvas.innerHTML = `<div class="competitor-maplibre-surface" id="competitorMapSurface" role="region" aria-label="แผนที่ถนนจริงและสถานที่ที่ยืนยันพิกัดแล้ว"></div>
    <div class="competitor-map-status-overlay" data-map-status role="status">
      <span class="competitor-map-loading-mark" aria-hidden="true"></span>
      <strong>กำลังโหลดถนนและย่านจริง</strong>
      <small>ระหว่างนี้เลือกสถานที่จากรายการด้านล่างได้</small>
    </div>
    <div class="competitor-map-toolbar" aria-label="เครื่องมือแผนที่">
      <button type="button" class="competitor-map-tool" data-map-fit aria-label="ดูสถานที่ทั้งหมด" title="ดูสถานที่ทั้งหมด">${icon("fit")}</button>
      <button type="button" class="competitor-map-tool" data-map-3d aria-label="เปิดมุมมองเอียง" title="มุมมองเอียง" aria-pressed="false">${icon("cube")}</button>
    </div>`;

  $("#competitorMapIndex").innerHTML = plotted.map((location) =>
    `<button type="button" class="competitor-map-index-button" data-map-location="${escapeHtml(location.id)}" aria-pressed="false"><i>${escapeHtml(mapMarkerCode(location))}</i><span>${escapeHtml(location.shortName || location.name)}</span></button>`
  ).join("");

  $("#competitorMapUnplaced").innerHTML = unplaced.map((location) =>
    `<button type="button" class="competitor-map-unplaced-button" data-map-location="${escapeHtml(location.id)}" aria-pressed="false"><span>${location.mapStatus === "reference-viewport" ? "มีเพียงจุดอ้างอิง · ยังไม่วางหมุด" : "ยังไม่มีพิกัดที่ยืนยันได้"}</span><strong>${escapeHtml(location.name)}</strong>${icon("arrow")}</button>`
  ).join("");
  const pendingLegend = $("#competitorMapPendingLegend");
  if (pendingLegend) pendingLegend.hidden = unplaced.length === 0;

  const initial = locations.some((item) => item.id === selectedMapVenueId)
    ? selectedMapVenueId
    : (locations.find((item) => item.id === "P00")?.id || locations[0].id);
  const statusOverlay = canvas.querySelector("[data-map-status]");
  const updateMapStatus = (status, detail = "") => {
    canvas.dataset.mapState = status;
    if (!statusOverlay) return;
    statusOverlay.hidden = status === "ready";
    const title = statusOverlay.querySelector("strong");
    const note = statusOverlay.querySelector("small");
    if (status === "error") {
      title.textContent = "แผนที่โหลดไม่สำเร็จ";
      note.textContent = "เลือกสถานที่จากรายการด้านล่างได้ ข้อมูลและปุ่มเปิด Google Maps ยังใช้งานได้";
    } else if (status === "warning") {
      title.textContent = "แผนที่ยังใช้ได้ แต่บางส่วนโหลดไม่ครบ";
      note.textContent = detail || "ใช้รายการด้านล่างตรวจชื่อและเปิดแหล่งข้อมูลได้";
    } else {
      title.textContent = "กำลังโหลดถนนและย่านจริง";
      note.textContent = detail || "ระหว่างนี้เลือกสถานที่จากรายการด้านล่างได้";
    }
  };

  const engine = window.PARC_MAP_ENGINE;
  if (engine?.create) {
    competitorMapController = engine.create({
      container: $("#competitorMapSurface"),
      locations: plotted,
      selectedId: plotted.some((item) => item.id === initial) ? initial : "P00",
      theme: document.documentElement.dataset.theme || "system",
      onSelect: (id) => selectMapVenue(id, { focusMap: false }),
      onStatus: updateMapStatus,
      onModeChange: (active) => {
        const button = canvas.querySelector("[data-map-3d]");
        if (!button) return;
        button.setAttribute("aria-pressed", String(active));
        button.setAttribute("aria-label", active ? "กลับเป็นมุมมองตรง" : "เปิดมุมมองเอียง");
        button.title = active ? "กลับเป็นมุมมองตรง" : "มุมมองเอียง";
      }
    });
  } else {
    updateMapStatus("error", "ไม่พบส่วนแสดงแผนที่");
  }
  selectMapVenue(initial, { focusMap: false });
}

function openMapMonthlyComparison(entityId) {
  const monthly = model.monthlyReviewCounts || {};
  if (entityId !== monthly.parc?.id) {
    const competitor = (monthly.competitors || []).find((item) => item.id === entityId);
    if (!competitor) return;
    $("#monthlyCompetitor").value = entityId;
    renderMonthlyReviewChart();
  }
  $("#monthlyReviewHistory").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderEntities() {
  const key = $("#entityMetric").value;
  const rows = [...model.entities].sort((a, b) => b[key] - a[key]);
  const max = Math.max(...rows.map((row) => row[key]), 1);

  $("#entityTable").innerHTML = rows.slice(0, 10).map((row) =>
    `<button type="button" class="entity-row entity-drilldown" data-entity-detail="${escapeHtml(row.id)}" aria-label="เปิดรายละเอียด ${escapeHtml(row.name)} ${escapeHtml(entityMetricLabels[key] || entityMetricLabels.total)} ${fmt.format(row[key])} ข้อ"><span class="entity-name">${escapeHtml(row.name)}</span><span class="entity-bar" aria-hidden="true"><i style="width:${row[key] / max * 100}%"></i></span><strong><span>${fmt.format(row[key])}</span>${icon("arrow")}</strong></button>`
  ).join("");
}

function renderVenueFilter() {
  const select = $("#venueType");
  const types = [...new Set(model.venues.map((venue) => venue.type))].sort();
  select.innerHTML = `<option value="all">ทุกประเภท</option>${types.map((type) =>
    `<option value="${escapeHtml(type)}">${escapeHtml(venueTypeNames[type] || type)}</option>`
  ).join("")}`;
}

function renderVenues() {
  const type = $("#venueType").value;
  const rows = model.venues.filter((row) => type === "all" || row.type === type);
  $("#venueRows").innerHTML = rows.map((row) =>
    `<tr><td>${escapeHtml(row.name)}</td><td>${escapeHtml(venueTypeNames[row.type] || row.type)}</td><td class="status-${escapeHtml(row.status)}">${row.rating ?? "—"}</td><td>${row.reviews == null ? "—" : fmt.format(row.reviews)}</td><td>${row.closing ?? "—"}</td></tr>`
  ).join("");
}

function jumpToMonthlyAnomaly(id) {
  const anomaly = monthlyAnomalies.find((item) => item.id === id);
  if (!anomaly) return;
  const select = $("#monthlyCompetitor");
  if (anomaly.entityId !== model.monthlyReviewCounts?.parc?.id
      && (model.monthlyReviewCounts?.competitors || []).some((item) => item.id === anomaly.entityId)) {
    select.value = anomaly.entityId;
    renderMonthlyReviewChart();
  }
  const target = $(`[data-monthly-series="${anomaly.entityId}"][data-month-index="${anomaly.index}"]`);
  $("#monthlyReviewHistory").scrollIntoView({ behavior: "smooth", block: "start" });
  if (target) target.focus({ preventScroll: true });
  openMonthlyBucketDetail(anomaly.entityId, anomaly.index);
}

$("#asOf").addEventListener("change", render);
$("#refreshBtn").addEventListener("click", loadData);
$("#themeToggle").addEventListener("click", cycleTheme);
$("#entityMetric").addEventListener("change", renderEntities);
$("#entityTable").addEventListener("click", (event) => {
  const button = event.target.closest("[data-entity-detail]");
  if (button) openEntityDetail(button.dataset.entityDetail);
});
$("#competitorMap").addEventListener("click", (event) => {
  if (event.target.closest("[data-map-fit]")) {
    competitorMapController?.fitAll();
    return;
  }
  if (event.target.closest("[data-map-3d]")) {
    if (competitorMapController) competitorMapController.set3D(!competitorMapController.is3D());
    return;
  }
  const locationButton = event.target.closest("[data-map-location]");
  if (locationButton) {
    selectMapVenue(locationButton.dataset.mapLocation);
    return;
  }
  const detailButton = event.target.closest("[data-map-entity-detail]");
  if (detailButton) {
    openEntityDetail(detailButton.dataset.mapEntityDetail);
    return;
  }
  const monthlyButton = event.target.closest("[data-map-monthly]");
  if (monthlyButton) openMapMonthlyComparison(monthlyButton.dataset.mapMonthly);
});
$("#venueType").addEventListener("change", renderVenues);
$("#tenantSearch").addEventListener("input", renderTenants);
$("#monthlyCompetitor").addEventListener("change", renderMonthlyReviewChart);
$$("[data-review-filter]").forEach((button) => button.addEventListener("click", () => {
  reviewFilter = button.dataset.reviewFilter;
  $$("[data-review-filter]").forEach((item) => item.classList.toggle("active", item === button));
  renderReviewHighlights();
}));
$("#reviewHighlightGrid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-review-detail]");
  if (button) openReviewDetail(button.dataset.reviewDetail);
});
$("#periodInsight").addEventListener("click", (event) => {
  if (event.target.closest("[data-period-low-stars]")) openPeriodReviewQueue();
});
$("#urgentGrid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-urgent-detail]");
  if (button) openUrgentDetail(button.dataset.urgentDetail);
});
$("#tenantRows").addEventListener("click", (event) => {
  const button = event.target.closest("[data-tenant-detail]");
  if (button) {
    openTenantDetail(button.dataset.tenantDetail);
    return;
  }
  const row = event.target.closest("[data-tenant-row]");
  if (row) openTenantDetail(row.dataset.tenantRow);
});
$("#monthlyAnomalySummary").addEventListener("click", (event) => {
  const button = event.target.closest("[data-anomaly-jump]");
  if (button) jumpToMonthlyAnomaly(button.dataset.anomalyJump);
});
$("#monthlyReviewChart").addEventListener("click", async (event) => {
  const bar = event.target.closest("[data-monthly-series][data-month-index]");
  if (bar) {
    openMonthlyBucketDetail(bar.dataset.monthlySeries, Number(bar.dataset.monthIndex));
    return;
  }
  const button = event.target.closest("[data-copy-monthly-prompt]");
  if (!button) return;
  const status = $("[data-copy-status]");
  try {
    await navigator.clipboard.writeText(monthlyReviewClaudePrompt);
    button.classList.add("copied");
    button.querySelector("strong").textContent = "คัดลอกแล้ว — ส่งให้ Claude ได้เลย";
    if (status) status.textContent = "คำสั่งนี้ขอข้อมูลรีวิวต้นทางรายแถว และไม่อนุญาตให้ใช้วันที่นำเข้า MLA แทน";
  } catch (error) {
    if (status) status.textContent = "เบราว์เซอร์ไม่อนุญาตให้คัดลอกอัตโนมัติ ดูคำสั่งฉบับเต็มท้ายรายงานส่งมอบ";
  }
});
$("#themeBars").addEventListener("click", (event) => {
  const button = event.target.closest("[data-theme-detail]");
  if (button) openThemeDetail(button.dataset.themeDetail);
});
$("#evidenceDialogClose").addEventListener("click", () => $("#evidenceDialog").close());
$("#evidenceDialogBody").addEventListener("click", (event) => {
  const button = event.target.closest("[data-tenant-detail]");
  if (button) {
    openTenantDetail(button.dataset.tenantDetail);
    return;
  }
  const urgentButton = event.target.closest("[data-urgent-detail]");
  if (urgentButton) openUrgentDetail(urgentButton.dataset.urgentDetail);
});
$("#evidenceDialog").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});
document.addEventListener("error", (event) => {
  if (event.target.matches?.(".place-media-image img")) {
    const image = event.target;
    const fallback = image.dataset.fallbackSrc;
    if (fallback && image.dataset.fallbackAttempted !== "true") {
      image.dataset.fallbackAttempted = "true";
      image.removeAttribute("referrerpolicy");
      image.src = fallback;
      return;
    }
    image.closest(".place-media-image")?.classList.add("is-fallback");
  }
}, true);

setTheme(document.documentElement.dataset.theme || "system");
window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
  if (document.documentElement.dataset.theme === "system") competitorMapController?.setTheme("system");
});
loadData();
