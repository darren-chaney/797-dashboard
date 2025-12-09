// ==============================================
//  797 Distillery Fermentation Dashboard (JS)
//  External Script Version 
//  Henry • SG + Temp Tooltips (T1)
// =============================================

// Load Google Charts
google.charts.load("current", { packages: ["corechart"] });
google.charts.setOnLoadCallback(initDashboard);

// Google Sheet info
const SHEET_ID = "1cV8POWA9l0hlAyZPB1RYLYaqa4T4pXIRzQ3e6C9qkE8";
const OG = 1.086;

const DATASETS = [
  { sheet: "Black Corn", key: "black" },
  { sheet: "Green Corn", key: "green" }
];

// =============================================
//  Time Formatting (for tooltip)
// =============================================
function formatTimeForTooltip(d) {
  return d.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Chicago"
  });
}

// =============================================
//  Initialization + Auto-refresh
// =============================================
function initDashboard() {
  document.getElementById("rangeSelect").addEventListener("change", () => {
    updateRangeLabel();
    updateDashboard();
  });

  updateRangeLabel();
  updateDashboard();

  // Refresh every 20s
  setInterval(updateDashboard, 20000);
}

function getRangeDays() {
  return parseInt(document.getElementById("rangeSelect").value || "1", 10);
}

function updateRangeLabel() {
  const days = getRangeDays();
  document.getElementById("rangeLabel").textContent =
    days === 1 ? "Today" : `Last ${days} days`;
}

// =============================================
//  Main Dashboard Update
// =============================================
function updateDashboard() {
  Promise.all(DATASETS.map(ds => loadSheet(ds.sheet)))
    .then(res => {
      let obj = {};
      DATASETS.forEach((ds, i) => obj[ds.sheet] = res[i]);
      updateTiles(obj);
      drawCharts(obj);
    });
}

// =============================================
//  Google Sheets Loader
// =============================================
function loadSheet(sheet) {
  const q = "select A,B,C where A is not null order by A";
  const url =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet)}&tq=${encodeURIComponent(q)}`;

  return fetch(url)
    .then(r => r.text())
    .then(t => JSON.parse(t.substr(47).slice(0, -2)).table);
}

// =============================================
//  Timestamp Helpers
// =============================================
function toDate(raw) {
  if (!raw) return new Date();

  if (typeof raw === "object") {
    if ("v" in raw) raw = raw.v;
    else if ("f" in raw) raw = raw.f;
  }

  if (typeof raw === "string" && raw.includes("Date(")) {
    const p = raw.replace("Date(", "").replace(")", "").split(",").map(Number);
    return new Date(p[0], p[1], p[2], p[3], p[4], p[5]);
  }

  if (typeof raw === "number") {
    const base = new Date(Date.UTC(1899, 11, 30));
    return new Date(base.getTime() + raw * 86400000);
  }

  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date() : d;
}

function parseTS(raw) {
  const d = toDate(raw);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Chicago"
  });
}

// =============================================
//  ABV Helper (used only for tile display)
// =============================================
function calcABV(sg) {
  if (!sg || sg <= 0) return null;
  return (OG - sg) * 131.25;
}

// =============================================
//  Update Tiles (Black / Green)
// =============================================
function updateTiles(data) {
  updateTile(data["Black Corn"], "black");
  updateTile(data["Green Corn"], "green");
}

function updateTile(table, key) {
  const s = id => document.getElementById(id);

  if (!table || !table.rows.length) {
    setOffline(key);
    return;
  }

  let row = null;
  for (let i = table.rows.length - 1; i >= 0; i--) {
    const c = table.rows[i].c;
    if (c && c[0] && c[1] && c[2]) { row = c; break; }
  }
  if (!row) return setOffline(key);

  const ts = row[0].v;
  const temp = Number(row[1].v);
  const sg = Number(row[2].v);

  s(`${key}Temp`).innerHTML = `${temp.toFixed(1)}<small>°F</small>`;
  s(`${key}Gravity`).innerHTML = `${sg.toFixed(3)}<small>SG</small>`;
  s(`${key}Updated`).textContent = "Last update: " + parseTS(ts);

  const abv = calcABV(sg);
  s(`${key}ABV`).innerHTML = abv ? `${abv.toFixed(2)}<small>%</small>` : `--<small>%</small>`;

  s(`${key}Status`).textContent = "Online";
  s(`${key}Status`).classList.add("online");
  s(`${key}Status`).classList.remove("offline");
}

function setOffline(key) {
  const s = id => document.getElementById(id);
  s(`${key}Status`).textContent = "Offline";
  s(`${key}Status`).classList.remove("online");
  s(`${key}Status`).classList.add("offline");
  s(`${key}Temp`).innerHTML = `--<small>°F</small>`;
  s(`${key}Gravity`).innerHTML = `--<small>SG</small>`;
  s(`${key}ABV`).innerHTML = `--<small>%</small>`;
  s(`${key}Updated`).textContent = "Last update: --";
}

// =============================================
//  Extract Series Data (Time + Temp + SG)
// =============================================
function extractSeries(table) {
  const out = [];
  if (!table || !table.rows) return out;

  table.rows.forEach(r => {
    const c = r.c;
    if (c && c[0] && c[1] && c[2]) {
      const d = toDate(c[0].v);
      const temp = Number(c[1].v);
      const sg = Number(c[2].v);

      if (!isNaN(temp) && !isNaN(sg)) {
        out.push({ time: d, temp: temp, gravity: sg });
      }
    }
  });

  return out;
}

// =============================================
//  Draw Charts (Mobile + Desktop)
// =============================================
function drawCharts(d) {
  const days = getRangeDays();
  const now = new Date();
  const cutoff = now.getTime() - days * 86400000;

  const black = extractSeries(d["Black Corn"]).filter(p => p.time.getTime() >= cutoff);
  const green = extractSeries(d["Green Corn"]).filter(p => p.time.getTime() >= cutoff);

  drawCombinedChart(black, green);          // mobile
  drawSingleChart(black, "chart_black", "#d8843e"); // desktop left
  drawSingleChart(green, "chart_green", "#00c9a7"); // desktop right
}

// =============================================
//  MOBILE COMBINED CHART
//  Tooltip: SG + Temp + Time
// =============================================
function drawCombinedChart(black, green) {
  const map = new Map();

  function add(series, key) {
    series.forEach(p => {
      const k = p.time.toISOString();
      if (!map.has(k)) {
        map.set(k, {
          time: p.time,
          blackGravity: null,
          blackTemp: null,
          greenGravity: null,
          greenTemp: null
        });
      }
      const row = map.get(k);
      if (key === "black") {
        row.blackGravity = p.gravity;
        row.blackTemp = p.temp;
      } else {
        row.greenGravity = p.gravity;
        row.greenTemp = p.temp;
      }
    });
  }

  add(black, "black");
  add(green, "green");

  const merged = Array.from(map.values()).sort((a, b) => a.time - b.time);
  if (merged.length > 200) merged.splice(0, merged.length - 200);

  const container = document.getElementById("gravity_chart");
  if (!merged.length) {
    container.innerHTML = "<div style='color:#9aa4b2; padding-top:40px;'>No data.</div>";
    return;
  }

  const data = new google.visualization.DataTable();
  data.addColumn("datetime", "Time");
  data.addColumn("number", "Black Corn");
  data.addColumn({ type: "string", role: "tooltip" });
  data.addColumn("number", "Green Corn");
  data.addColumn({ type: "string", role: "tooltip" });

  merged.forEach(p => {
    const blackTip =
      p.blackGravity != null
        ? `SG: ${p.blackGravity.toFixed(3)}\nTemp: ${p.blackTemp.toFixed(1)}°F\n${formatTimeForTooltip(p.time)}`
        : null;

    const greenTip =
      p.greenGravity != null
        ? `SG: ${p.greenGravity.toFixed(3)}\nTemp: ${p.greenTemp.toFixed(1)}°F\n${formatTimeForTooltip(p.time)}`
        : null;

    data.addRow([
      p.time,
      p.blackGravity,
      blackTip,
      p.greenGravity,
      greenTip
    ]);
  });

  // X-axis ticks (hourly)
  const ticks = [];
  let t = new Date(merged[0].time);
  t.setMinutes(0, 0, 0);
  const end = merged[merged.length - 1].time;
  while (t <= end) {
    ticks.push(new Date(t));
    t.setHours(t.getHours() + 1);
  }

  // Y-axis range
  const vals = [];
  merged.forEach(p => {
    if (p.blackGravity != null) vals.push(p.blackGravity);
    if (p.greenGravity != null) vals.push(p.greenGravity);
  });

  let maxVal = vals.length ? Math.max(...vals) : 1.02;
  let yMin = 1.000;
  let yMax = maxVal + 0.005;
  if (yMax < yMin + 0.01) yMax = yMin + 0.01;

  const options = {
    backgroundColor: "transparent",
    legend: { position: "bottom", textStyle: { color: "#cfd8e3" } },
    curveType: "function",
    hAxis: {
      textStyle: { color: "#9aa4b2" },
      gridlines: { color: "#1e2530" },
      ticks: ticks,
      format: "h a"
    },
    vAxis: {
      textStyle: { color: "#9aa4b2" },
      gridlines: { color: "#1e2530" },
      viewWindowMode: "explicit",
      viewWindow: { min: yMin, max: yMax }
    },
    chartArea: { left: 60, top: 20, right: 30, bottom: 70 },
    series: {
      0: { color: "#d8843e", width: 3 },
      1: { color: "#00c9a7", width: 3 }
    }
  };

  new google.visualization.LineChart(container).draw(data, options);
}

// =============================================
//  DESKTOP SINGLE CHART (Black or Green)
//  Tooltip: SG + Temp + Time
// =============================================
function drawSingleChart(series, containerId, color) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!series.length) {
    container.innerHTML =
      "<div style='color:#9aa4b2; padding-top:40px;'>No data.</div>";
    return;
  }

  const points = series.slice(-200);

  const data = new google.visualization.DataTable();
  data.addColumn("datetime", "Time");
  data.addColumn("number", "Gravity");
  data.addColumn({ type: "string", role: "tooltip" });

  points.forEach(p => {
    const tip =
      `SG: ${p.gravity.toFixed(3)}\nTemp: ${p.temp.toFixed(1)}°F\n${formatTimeForTooltip(p.time)}`;
    data.addRow([p.time, p.gravity, tip]);
  });

  // Hourly ticks
  const ticks = [];
  let t = new Date(points[0].time);
  t.setMinutes(0, 0, 0);
  const end = points[points.length - 1].time;
  while (t <= end) {
    ticks.push(new Date(t));
    t.setHours(t.getHours() + 1);
  }

  // Y-axis scaling
  const vals = points.map(p => p.gravity);
  let maxVal = Math.max(...vals);
  let yMin = 1.000;
  let yMax = maxVal + 0.005;
  if (yMax < yMin + 0.01) yMax = yMin + 0.01;

  const options = {
    backgroundColor: "transparent",
    legend: { position: "none" },
    curveType: "function",
    hAxis: {
      textStyle: { color: "#9aa4b2", fontSize: 10 },
      gridlines: { color: "#1e2530" },
      ticks: ticks,
      format: "h a"
    },
    vAxis: {
      textStyle: { color: "#9aa4b2", fontSize: 10 },
      gridlines: { color: "#1e2530" },
      viewWindowMode: "explicit",
      viewWindow: { min: yMin, max: yMax }
    },
    chartArea: { left: 45, top: 15, right: 10, bottom: 45 },
    series: {
      0: { color: color, width: 3 }
    }
  };

  new google.visualization.LineChart(container).draw(data, options);
}

