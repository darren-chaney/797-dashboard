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

// === DATA LOAD & TRANSFORM ===
d3.csv(SHEET_CSV_URL).then((raw) => {
  const today = new Date();

  const barrels = raw
    .map((row) => {
      // *** HEADERS FIXED TO MATCH YOUR SHEET EXACTLY ***
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

      const opgRaw = row["OPG"];
      let opg = parseFloat(opgRaw);
      if (isNaN(opg) && gallons && entryProof) {
        opg = (gallons * entryProof) / 100.0;
      }

      const notes = (row["Notes"] || "").trim();
      const docLink = (row["Barrel Doc Link"] || "").trim();

      let fillDate = null;
      let ageDays = null;
      let ageYears = null;

      if (fillDateStr) {
      let d = null;

      // Explicit MM/DD/YYYY parsing (Safari-safe)
      const m = fillDateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m) {
      const month = parseInt(m[1], 10) - 1;
      const day = parseInt(m[2], 10);
      const year = parseInt(m[3], 10);
      d = new Date(year, month, day);
      } else {
      // fallback
      d = new Date(fillDateStr);
      }

      if (d && !isNaN(d)) {
      fillDate = d;
      ageDays = (today - d) / (1000 * 60 * 60 * 24);
      ageYears = ageDays / 365.25;
      }
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
    .filter((d) => d !== null);

  renderStats(barrels);
  renderAgeChart(barrels);
  renderSpiritChart(barrels);
}).catch((err) => {
  console.error("Error loading barrel CSV:", err);
});

// === STATS ===
function renderStats(barrels) {
  const totalBarrels = barrels.length;
  const totalOPG = barrels.reduce((sum, b) => sum + (b.opg || 0), 0);

  const barrelsWithAge = barrels.filter((b) => b.ageYears != null);
  const avgAgeYears =
    barrelsWithAge.length > 0
      ? barrelsWithAge.reduce((s, b) => s + b.ageYears, 0) /
        barrelsWithAge.length
      : null;

  const oldest = barrelsWithAge.reduce((acc, b) => {
    if (!acc) return b;
    return b.fillDate < acc.fillDate ? b : acc;
  }, null);

  // Spirit mix
  const spiritCounts = d3.rollups(
    barrels,
    (v) => v.length,
    (b) => b.spirit
  );
  const spiritSummary = spiritCounts
    .map(([spirit, count]) => `${spirit}: ${count}`)
    .join(" · ");

  // Update DOM
  const fmtInt = d3.format(",d");
  const fmtOPG = d3.format(",.2f");
  const fmtAge = d3.format(".2f");

  document.getElementById("stat-total-barrels").textContent =
    totalBarrels ? fmtInt(totalBarrels) : "0";
  document.getElementById("stat-total-barrels-sub").textContent =
    spiritSummary || "";

  document.getElementById("stat-total-opg").textContent =
    totalOPG ? fmtOPG(totalOPG) : "0.00";
  document.getElementById("stat-total-opg-sub").textContent =
    totalBarrels ? "Across all active barrels" : "";

  if (avgAgeYears != null) {
    document.getElementById("stat-avg-age").textContent =
      fmtAge(avgAgeYears) + " yrs";
    document.getElementById("stat-avg-age-sub").textContent =
      "Average barrel age";
  } else {
    document.getElementById("stat-avg-age").textContent = "–";
    document.getElementById("stat-avg-age-sub").textContent = "";
  }

  if (oldest) {
    const ageStr =
      oldest.ageYears != null ? fmtAge(oldest.ageYears) + " yrs" : "–";
    document.getElementById("stat-oldest-barrel").textContent = ageStr;
    document.getElementById("stat-oldest-barrel-sub").textContent =
      `Barrel ${oldest.barrelNo}` +
      (oldest.fillDateStr ? ` · Filled ${oldest.fillDateStr}` : "");
  } else {
    document.getElementById("stat-oldest-barrel").textContent = "–";
    document.getElementById("stat-oldest-barrel-sub").textContent = "";
  }
}

// === AGE CHART ===
function renderAgeChart(barrels) {
  const container = document.getElementById("age-chart");
  container.innerHTML = "";

  const margin = { top: 20, right: 20, bottom: 40, left: 60 };
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 320;

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const data = barrels.filter((b) => b.fillDate && b.ageYears != null);

  if (!data.length) {
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#6b7280")
      .text("No barrels with valid fill dates yet.");
    return;
  }

  const xExtent = d3.extent(data, (d) => d.fillDate);
  const yMax = d3.max(data, (d) => d.ageYears) || 1;

  const xScale = d3.scaleTime().domain(xExtent).range([0, innerWidth]).nice();
  const yScale = d3
    .scaleLinear()
    .domain([0, yMax * 1.1])
    .range([innerHeight, 0])
    .nice();

  const spiritSet = Array.from(new Set(data.map((d) => d.spirit)));
  const color = d3.scaleOrdinal(d3.schemeTableau10).domain(spiritSet);

  // Axes
  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).ticks(6))
    .selectAll("text")
    .style("fill", "#9ca3af");

  g.append("g")
    .call(d3.axisLeft(yScale).ticks(6))
    .selectAll("text")
    .style("fill", "#9ca3af");

  g.selectAll(".domain, .tick line")
    .attr("stroke", "#374151")
    .attr("stroke-width", 0.8);

  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 32)
    .attr("text-anchor", "middle")
    .attr("fill", "#9ca3af")
    .text("Fill Date");

  g.append("text")
    .attr("x", -innerHeight / 2)
    .attr("y", -45)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .attr("fill", "#9ca3af")
    .text("Age (years)");

  // Points
  g.selectAll(".barrel-point")
    .data(data, (d) => d.barrelNo)
    .join("circle")
    .attr("class", "barrel-point")
    .attr("cx", (d) => xScale(d.fillDate))
    .attr("cy", (d) => yScale(d.ageYears))
    .attr("r", 6)
    .attr("fill", (d) => color(d.spirit))
    .attr("stroke", "#020617")
    .attr("stroke-width", 1)
    .attr("fill-opacity", 0.9)
    .on("mouseenter touchstart", function (event, d) {
      const fmtAge = d3.format(".2f");
      const fmtOPG = d3.format(",.2f");

      const html = `
        <div><strong>Barrel ${d.barrelNo}</strong></div>
        <div>${d.spirit}</div>
        <div style="margin-top:4px;">
          <div>Fill Date: ${d.fillDateStr || "N/A"}</div>
          <div>Age: ${fmtAge(d.ageYears)} years</div>
          <div>Gallons: ${d.gallons || 0}</div>
          <div>OPG: ${fmtOPG(d.opg || 0)}</div>
          ${d.lotId ? `<div>Lot: ${d.lotId}</div>` : ""}
          ${d.barrelType ? `<div>Barrel: ${d.barrelType}</div>` : ""}
          ${d.notes ? `<div style="margin-top:4px;">Notes: ${d.notes}</div>` : ""}
          ${
            d.docLink
              ? `<div style="margin-top:4px;"><a href="${d.docLink}" target="_blank">Open Barrel Doc</a></div>`
              : ""
          }
        </div>
      `;
      showTooltip(html, event);
    })
    .on("mousemove touchmove", moveTooltip)
    .on("mouseleave touchend touchcancel", hideTooltip)
    .on("click", (event, d) => {
      if (d.docLink) window.open(d.docLink, "_blank");
    });

  // Legend
  const legendContainer = d3.select("#age-legend");
  legendContainer.selectAll("*").remove();

  const legendItems = legendContainer
    .selectAll(".legend-item")
    .data(spiritSet)
    .join("div")
    .attr("class", "legend-item");

  legendItems
    .append("span")
    .attr("class", "legend-swatch")
    .style("background", (d) => color(d));

  legendItems.append("span").text((d) => d);
}

// === SPIRIT BREAKDOWN (OPG by Spirit) ===
function renderSpiritChart(barrels) {
  const container = document.getElementById("spirit-chart");
  container.innerHTML = "";

  const margin = { top: 20, right: 20, bottom: 60, left: 80 };
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 320;

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const grouped = d3.rollups(
    barrels,
    (v) => d3.sum(v, (b) => b.opg || 0),
    (b) => b.spirit
  );

  const data = grouped
    .map(([spirit, opg]) => ({ spirit, opg }))
    .sort((a, b) => d3.descending(a.opg, b.opg));

  if (!data.length) {
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#6b7280")
      .text("No OPG data yet.");
    return;
  }

  const xScale = d3
    .scaleBand()
    .domain(data.map((d) => d.spirit))
    .range([0, innerWidth])
    .padding(0.25);

  const yMax = d3.max(data, (d) => d.opg) || 1;

  const yScale = d3
    .scaleLinear()
    .domain([0, yMax * 1.1])
    .range([innerHeight, 0])
    .nice();

  const color = d3
    .scaleOrdinal(d3.schemeTableau10)
    .domain(data.map((d) => d.spirit));

  // Axes
  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .style("fill", "#9ca3af")
    .style("font-size", 11)
    .attr("transform", "rotate(-30)")
    .attr("text-anchor", "end");

  g.append("g")
    .call(d3.axisLeft(yScale).ticks(6))
    .selectAll("text")
    .style("fill", "#9ca3af");

  g.selectAll(".domain, .tick line")
    .attr("stroke", "#374151")
    .attr("stroke-width", 0.8);

  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 46)
    .attr("text-anchor", "middle")
    .attr("fill", "#9ca3af")
    .text("Spirit Type");

  g.append("text")
    .attr("x", -innerHeight / 2)
    .attr("y", -55)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .attr("fill", "#9ca3af")
    .text("Proof Gallons (OPG)");

  const fmtOPG = d3.format(",.2f");

  g.selectAll(".spirit-bar")
    .data(data)
    .join("rect")
    .attr("class", "spirit-bar")
    .attr("x", (d) => xScale(d.spirit))
    .attr("y", (d) => yScale(d.opg))
    .attr("width", xScale.bandwidth())
    .attr("height", (d) => innerHeight - yScale(d.opg))
    .attr("fill", (d) => color(d.spirit))
    .attr("fill-opacity", 0.9)
    .attr("rx", 4)
    .on("mouseenter touchstart", function (event, d) {
      const html = `
        <div><strong>${d.spirit}</strong></div>
        <div>OPG: ${fmtOPG(d.opg)}</div>
      `;
      showTooltip(html, event);
    })
    .on("mousemove touchmove", moveTooltip)
    .on("mouseleave touchend touchcancel", hideTooltip);
}
