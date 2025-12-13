let AGE_ZOOM_MONTHS = 24; // default view
// === CONFIG ===
// Published CSV URL
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSNyLVIgK_UeIZdZQJaGF3IgiqZ68aCG0tydTzszngpgYhu4-HlLXNHotuGPJOA63CKSs-RkZgGtRpt/pub?output=csv";

// === TOOLTIP HANDLING ===
const tooltip = document.getElementById("tooltip");

function showTooltip(html, event) {
  tooltip.innerHTML = html;
  const { clientX, clientY } = event.touches ? event.touches[0] : event;
  tooltip.style.left = clientX + 12 + "px";
  tooltip.style.top = clientY + 12 + "px";
  tooltip.style.opacity = 1;
  tooltip.style.transform = "translateY(0)";
}

function moveTooltip(event) {
  if (tooltip.style.opacity === "0") return;
  const { clientX, clientY } = event.touches ? event.touches[0] : event;
  tooltip.style.left = clientX + 12 + "px";
  tooltip.style.top = clientY + 12 + "px";
}

function hideTooltip() {
  tooltip.style.opacity = 0;
  tooltip.style.transform = "translateY(4px)";
}
// === HEADER NORMALIZATION (DO NOT REMOVE) ===
function normalizeRow(row) {
  const fixed = {};
  for (const key in row) {
    fixed[key.trim().replace(/\.$/, "")] = row[key];
  }
  return fixed;
}
// === DATA LOAD & TRANSFORM ===
d3.csv(SHEET_CSV_URL).then((raw) => {
  const today = new Date();

  const barrels = raw
    .map((row) => {
      row = normalizeRow(row);
      const barrelNo = (row["Barrel No"] || "").trim();
      if (!barrelNo) return null;

      const fillDateStr = (row["Fill Date"] || "").trim();
      const spirit = (row["Spirit Type"] || "").trim();
      const mashBill = (row["Mash Bill"] || "").trim();
      const entryProof = parseFloat(row["Entry Proof"]) || null;
      const gallons = parseFloat(row["Gallons"]) || 0;
      const lotId = (row["Lot ID"] || "").trim();
      const barrelType = (row["Barrel Type"] || "").trim();
      const rcg = (row["RC-G"] || "").trim();
      const notes = (row["Notes"] || "").trim();
      const docLink = (row["Barrel Doc Link"] || "").trim();

      // OPG
      let opg = parseFloat(row["OPG"]);
      if (isNaN(opg) && gallons && entryProof) {
        opg = (gallons * entryProof) / 100;
      }

      // Fill date + age (Safari-safe)
      let fillDate = null;
      let ageDays = null;
      let ageYears = null;

      if (fillDateStr) {
        let d = null;
        const m = fillDateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) {
          d = new Date(
            parseInt(m[3], 10),
            parseInt(m[1], 10) - 1,
            parseInt(m[2], 10)
          );
        } else {
          d = new Date(fillDateStr);
        }
        if (d && !isNaN(d)) {
          fillDate = new Date(
            d.getFullYear(),
            d.getMonth(),
            d.getDate()
        );
        ageDays = (today - fillDate) / (1000 * 60 * 60 * 24);
        ageYears = ageDays / 365.25;
        }
      }

      return {
        barrelNo,
        fillDate,
        fillDateStr,
        spirit: spirit || "Unknown",
        mashBill,
        entryProof,
        gallons,
        lotId,
        barrelType,
        rcg,
        opg: opg || 0,
        notes,
        docLink,
        ageDays,
        ageYears,
      };
    })
    .filter(Boolean);
  window.__BARRELS__ = barrels;
  renderStats(barrels);
  renderAgeChart(barrels);
  renderSpiritChart(barrels);
}).catch((err) => {
  console.error("Error loading barrel CSV:", err);
});

// === STATS ===
function renderStats(barrels) {
  const totalBarrels = barrels.length;
  const totalOPG = barrels.reduce((sum, b) => sum + b.opg, 0);

  const barrelsWithAge = barrels.filter((b) => b.ageYears != null);
  const avgAge =
    barrelsWithAge.reduce((s, b) => s + b.ageYears, 0) /
    (barrelsWithAge.length || 1);

  const oldest = barrelsWithAge.reduce((a, b) =>
    !a || b.fillDate < a.fillDate ? b : a
  , null);

  const spiritSummary = d3.rollups(
    barrels,
    (v) => v.length,
    (b) => b.spirit
  )
    .map(([s, c]) => `${s}: ${c}`)
    .join(" · ");

  document.getElementById("stat-total-barrels").textContent = totalBarrels;
  document.getElementById("stat-total-barrels-sub").textContent = spiritSummary;

  document.getElementById("stat-total-opg").textContent =
    totalOPG.toFixed(2);
  document.getElementById("stat-total-opg-sub").textContent =
    "Across all active barrels";

  document.getElementById("stat-avg-age").textContent =
    avgAge ? avgAge.toFixed(2) + " yrs" : "–";

  document.getElementById("stat-oldest-barrel").textContent =
    oldest ? oldest.ageYears.toFixed(2) + " yrs" : "–";

  document.getElementById("stat-oldest-barrel-sub").textContent =
    oldest
      ? `Barrel ${oldest.barrelNo} · Filled ${oldest.fillDateStr}`
      : "";
}

// === AGE CHART ===
function renderAgeChart(barrels) {
  const container = document.getElementById("age-chart");
  container.innerHTML = "";

  const margin = { top: 20, right: 20, bottom: 40, left: 60 };
  const width = container.clientWidth || 800;
  const height = 280; // tightened height

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // --- Filter valid data ---
  const data = barrels.filter(b => b.fillDate && b.ageYears != null);
  if (!data.length) return;

  // === X RANGE (ZOOM WINDOW) ===
  const maxDate = d3.max(data, d => d.fillDate);

  let minDate;
  if (AGE_ZOOM_MONTHS === "ALL") {
    minDate = d3.min(data, d => d.fillDate);
  } else {
    minDate = new Date(maxDate);
    minDate.setMonth(minDate.getMonth() - AGE_ZOOM_MONTHS);
  }
  // --- Visual padding so dots don't hug edges ---
  const padDays = 20;

  const x = d3
    .scaleTime()
    .domain([
      d3.timeDay.offset(minDate, -padDays),
      d3.timeDay.offset(maxDate, padDays)
    ])
    .range([0, width - margin.left - margin.right]);

  // === ONLY DATA IN VIEW AFFECTS Y SCALE ===
  const visibleData = data.filter(
    d => d.fillDate >= minDate && d.fillDate <= maxDate
  );

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(visibleData, d => d.ageYears) * 1.1])
    .range([height - margin.top - margin.bottom, 0]);

  const color = d3.scaleOrdinal(d3.schemeTableau10);

  // === AXES ===
  g.append("g")
    .attr("transform", `translate(0,${y.range()[0]})`)
    .call(d3.axisBottom(x).ticks(6));

  g.append("g")
  .call(
    d3.axisLeft(y)
      .ticks(6)
      .tickFormat(d => {
        const months = Math.round(d * 12);
        return months >= 12
          ? `${(months / 12).toFixed(1)} yr`
          : `${months} mo`;
      })
  );
  // === GROUP BARRELS BY DAY (FOR JITTER) ===
  const byDay = d3.group(data, d => d.fillDate.getTime());

  // === DOTS ===
  g.selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => {
      const group = byDay.get(d.fillDate.getTime());
      const idx = group.findIndex(b => b.barrelNo === d.barrelNo);
      return x(d.fillDate) + (idx - (group.length - 1) / 2) * 12;
    })
    .attr("cy", d => y(d.ageYears))
    .attr("r", 3)
    .attr("fill", d => color(d.spirit))
    .attr("stroke", "#020617")
    .attr("stroke-width", 1)
    .on("mouseenter touchstart", (e, d) => {
      showTooltip(
        `<strong>Barrel ${d.barrelNo}</strong><br>
         ${d.spirit}<br>
         Age: ${d.ageYears.toFixed(2)} yrs<br>
         OPG: ${d.opg.toFixed(2)}<br>
         ${d.barrelType || ""}<br>
         ${
           d.docLink
             ? `<a href="${d.docLink}" target="_blank">Open Doc</a>`
             : ""
         }`,
        e
      );
    })
    .on("mousemove touchmove", moveTooltip)
    .on("mouseleave touchend", hideTooltip)
    .on("click", (_, d) => {
      if (d.docLink) window.open(d.docLink, "_blank");
    });
}
// === SPIRIT CHART ===
function renderSpiritChart(barrels) {
  const container = document.getElementById("spirit-chart");
  container.innerHTML = "";

  const grouped = d3.rollups(
    barrels,
    (v) => d3.sum(v, (b) => b.opg),
    (b) => b.spirit
  );

  if (!grouped.length) return;

  const width = container.clientWidth || 800;
  const height = 320;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3
    .scaleBand()
    .domain(grouped.map((d) => d[0]))
    .range([60, width - 20])
    .padding(0.3);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(grouped, (d) => d[1]) * 1.1])
    .range([height - 60, 20]);

  svg
    .append("g")
    .attr("transform", `translate(0,${height - 60})`)
    .call(d3.axisBottom(x));

  svg.append("g").attr("transform", `translate(60,0)`).call(d3.axisLeft(y));

  svg
    .selectAll("rect")
    .data(grouped)
    .join("rect")
    .attr("x", (d) => x(d[0]))
    .attr("y", (d) => y(d[1]))
    .attr("width", x.bandwidth())
    .attr("height", (d) => height - 60 - y(d[1]))
    .attr("fill", (d) => d3.schemeTableau10[x.domain().indexOf(d[0])]);
}
// This handles the zooming in UI
function setAgeZoom(months) {
  AGE_ZOOM_MONTHS = months;
  renderAgeChart(window.__BARRELS__);
}

