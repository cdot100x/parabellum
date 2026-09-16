(() => {
  const DATA = window.PB_ENCYCLOPEDIA;
  const app = document.getElementById("app");
  const searchInput = document.getElementById("searchInput");
  const unitsSelect = document.getElementById("unitsSelect");

  if (!DATA || !Array.isArray(DATA.aircraft)) {
    app.innerHTML = "<p class='empty'>Missing catalog. Run <code>python tools/build_encyclopedia.py</code>.</p>";
    return;
  }

  const byId = Object.fromEntries(DATA.aircraft.map((a) => [a.id, a]));
  const campaigns = Array.isArray(DATA.campaigns) ? DATA.campaigns : [];
  const campaignById = Object.fromEntries(campaigns.map((c) => [c.id, c]));
  const domini = DATA.domini || { world: {}, continents: [] };
  const continents = Array.isArray(domini.continents) ? domini.continents : [];
  const continentById = Object.fromEntries(continents.map((c) => [c.id, c]));
  const newsPosts = Array.isArray(DATA.news) ? DATA.news : [];
  const newsById = Object.fromEntries(newsPosts.map((p) => [p.id, p]));
  const NEWS_CATEGORIES = [
    { id: "all", label: "All" },
    { id: "event", label: "Event" },
    { id: "game", label: "Game" },
    { id: "news", label: "News" },
    { id: "lore", label: "Lore" },
  ];
  let section = "aircraft";
  let dominiView = "2d";
  let selectedContinent = continents[0]?.id || "";
  let newsFilter = "all";
  let units = localStorage.getItem("pb_enc_units") || "us";
  unitsSelect.value = units;

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** First paragraph = brief; remaining blocks under Overview. */
  function dossierBriefHtml(text) {
    const parts = String(text || "")
      .trim()
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
      .filter(Boolean);
    if (!parts.length) {
      return `<p class="lore">No dossier text yet.</p>`;
    }
    const [lead, ...rest] = parts;
    let html = `<p class="lore">${esc(lead)}</p>`;
    if (rest.length) {
      html += `<h3 class="lore-subhead">Overview</h3>`;
      html += rest.map((p) => `<p class="lore">${esc(p)}</p>`).join("");
    }
    return html;
  }

  function designation(a) {
    return (a.variant_code && a.variant_code.trim()) || a.display_name || a.id;
  }

  function kmhToMph(v) {
    return Math.round(Number(v) * 0.621371);
  }
  function kmToNm(v) {
    return Math.round(Number(v) * 0.539957);
  }
  function mToFt(v) {
    return Math.round(Number(v) * 3.28084);
  }
  function kgToLb(v) {
    return Math.round(Number(v) * 2.20462);
  }
  function knToLbf(v) {
    return Math.round(Number(v) * 224.809);
  }

  function fmtSpeed(a) {
    const v = a.max_speed_kmh || 0;
    return units === "us" ? `${kmhToMph(v)} mph` : `${v} km/h`;
  }
  function fmtRadius(a) {
    const v = a.combat_radius_km || 0;
    return units === "us" ? `${kmToNm(v)} nmi` : `${v} km`;
  }
  function fmtCeil(a) {
    const v = a.service_ceiling_m || 0;
    return units === "us" ? `${mToFt(v)} ft` : `${v} m`;
  }
  function fmtWeight(a) {
    const v = a.empty_weight_kg || 0;
    return units === "us" ? `${kgToLb(v)} lb` : `${v} kg`;
  }
  function fmtThrust(a) {
    const v = a.thrust_kn || 0;
    return units === "us" ? `${knToLbf(v)} lbf` : `${v} kN`;
  }

  function cleanBrief(text) {
    return String(text ?? "")
      .replace(/Planned playable as[^.]*\.\s*/gi, "")
      .replace(/Planned FPS \/ ground mode[^.]*\.\s*/gi, "")
      .trim();
  }

  function campaignStatus(c) {
    if (c.playable) return "Playable";
    return "Archives";
  }

  function filterCampaigns() {
    const q = (searchInput.value || "").trim().toLowerCase();
    return campaigns.filter((c) => {
      if (!q) return true;
      const blob = [c.title, c.years, c.desc, c.id].join(" ").toLowerCase();
      return blob.includes(q);
    });
  }

  function stopDominiGlobe() {
    if (app._dominiCleanup) {
      app._dominiCleanup();
      app._dominiCleanup = null;
    }
  }

  function route() {
    const hash = location.hash.replace(/^#\/?/, "");
    stopDominiGlobe();
    if (hash.startsWith("aircraft/")) {
      renderDetail(hash.slice("aircraft/".length));
      return;
    }
    if (hash.startsWith("campaign/")) {
      section = "campaigns";
      renderCampaignDetail(hash.slice("campaign/".length));
      return;
    }
    if (hash === "domini" || hash.startsWith("domini/")) {
      section = "domini";
      const rest = hash.slice("domini".length).replace(/^\//, "");
      if (rest === "3d") dominiView = "3d";
      else if (rest === "2d") dominiView = "2d";
      else if (rest && continentById[rest]) {
        dominiView = "2d";
        selectedContinent = rest;
      }
      renderDomini();
      return;
    }
    if (hash === "news" || hash.startsWith("news/")) {
      section = "news";
      const rest = hash.slice("news".length).replace(/^\//, "");
      if (rest.startsWith("post/")) {
        renderNewsDetail(rest.slice("post/".length));
        return;
      }
      if (rest && NEWS_CATEGORIES.some((c) => c.id === rest)) {
        newsFilter = rest;
      } else if (!rest) {
        newsFilter = "all";
      }
      renderNewsBrowse();
      return;
    }
    if (hash === "heli" || hash === "rotary") {
      section = "heli";
      renderBrowse();
      return;
    }
    if (hash === "special") {
      section = "special";
      renderBrowse();
      return;
    }
    if (hash === "campaigns") {
      section = "campaigns";
      renderBrowse();
      return;
    }
    section = "aircraft";
    renderBrowse();
  }

  function setNavActive() {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.section === section);
    });
  }

  function filterList(ids) {
    const q = (searchInput.value || "").trim().toLowerCase();
    return ids
      .map((id) => byId[id])
      .filter(Boolean)
      .filter((a) => {
        if (!q) return true;
        const blob = [
          a.display_name,
          a.variant_code,
          a.nation,
          a.role,
          a.manufacturer,
          a.id,
        ]
          .join(" ")
          .toLowerCase();
        return blob.includes(q);
      });
  }

  function cardHtml(a, delay) {
    const art = a.card || "";
    const flag = a.flag || "";
    const badge = a.future_update
      ? '<span class="badge">Future Update</span>'
      : "";
    return `
      <a class="air-card" href="#/aircraft/${esc(a.id)}" style="animation-delay:${delay}s">
        ${badge}
        <div class="air-card-art" style="background-image:url('${esc(art)}')"></div>
        <div class="air-card-body">
          <div class="air-card-row">
            ${flag ? `<img class="flag" src="${esc(flag)}" alt="" />` : ""}
            <span class="designation" title="${esc(a.display_name)}">${esc(designation(a))}</span>
          </div>
          <div class="meta-line">${esc(a.nation || "—")} · ${esc(a.tier || "—")}</div>
        </div>
      </a>`;
  }

  function eraBlocks(eras) {
    return eras
      .map((era) => {
        const list = filterList(era.ids || []);
        if (!list.length) return "";
        return `
          <section class="section" id="era-${esc(era.id)}">
            <div class="section-head">
              <h2>${esc(era.title)}</h2>
              <span>${list.length} airframe${list.length === 1 ? "" : "s"}</span>
            </div>
            <div class="card-grid">
              ${list.map((a, i) => cardHtml(a, 0.04 * i)).join("")}
            </div>
          </section>`;
      })
      .join("");
  }

  function heroArtId() {
    const pool =
      section === "heli"
        ? (DATA.heli_eras[0] && DATA.heli_eras[0].ids) || []
        : section === "special"
          ? DATA.special_ids || []
          : (DATA.air_eras[DATA.air_eras.length - 1] &&
              DATA.air_eras[DATA.air_eras.length - 1].ids) ||
            [];
    const pick = pool.find((id) => byId[id] && byId[id].card) || DATA.aircraft[0]?.id;
    return pick;
  }

  function dominiHash(view, continentId) {
    if (view === "3d") return "#/domini/3d";
    if (continentId) return `#/domini/${continentId}`;
    return "#/domini/2d";
  }

  function timelineHtml(events) {
    const list = Array.isArray(events) ? events : [];
    if (!list.length) return `<p class="domini-empty">No chronology published yet.</p>`;
    let lastYear = null;
    return list
      .map((ev) => {
        const yearBlock =
          ev.year !== lastYear
            ? `<div class="domini-year">${esc(ev.year)}</div>`
            : "";
        lastYear = ev.year;
        return `
        ${yearBlock}
        <article class="domini-event">
          <div class="domini-event-date">${esc(ev.date || "—")}</div>
          <div class="domini-event-body">
            <h3>${esc(ev.title || "Event")}</h3>
            <p>${esc(ev.text || "")}</p>
          </div>
          <button type="button" class="domini-info" title="Details" aria-label="Event details">i</button>
        </article>`;
      })
      .join("");
  }

  function countriesHtml(countries) {
    const list = Array.isArray(countries) ? countries : [];
    if (!list.length) return `<p class="domini-empty">No countries registered.</p>`;
    return `
      <ul class="domini-country-list">
        ${list
          .map(
            (c) => `
          <li class="domini-country">
            ${c.flag ? `<span class="domini-country-flag"><img class="flag" src="${esc(c.flag)}" alt="" loading="lazy" decoding="async" /></span>` : `<span class="domini-country-code">${esc(c.short || "—")}</span>`}
            <div class="domini-country-copy">
              <strong>${esc(c.title)}</strong>
              <span class="domini-country-meta">${esc(c.short || "")}${c.faction ? ` · ${esc(c.faction)}` : ""}</span>
              <p>${esc(c.desc || "")}</p>
            </div>
          </li>`
          )
          .join("")}
      </ul>`;
  }

  function continentOptions(activeId) {
    return continents
      .map(
        (c) =>
          `<option value="${esc(c.id)}"${c.id === activeId ? " selected" : ""}>${esc(c.title)}</option>`
      )
      .join("");
  }

  function drawDominiMap2d(canvas, continentId) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(320, Math.floor(rect.width * dpr));
    const h = Math.max(240, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#1a2330";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(180, 200, 220, 0.12)";
    ctx.lineWidth = 1;
    const grid = 24;
    for (let x = 0; x <= w; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(200, 210, 220, 0.08)";
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.52, w * 0.42, h * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    continents.forEach((cont) => {
      const r = cont.map_region || { x: 0.2, y: 0.2, w: 0.15, h: 0.12 };
      const rx = r.x * w;
      const ry = r.y * h;
      const rw = r.w * w;
      const rh = r.h * h;
      const active = cont.id === continentId;
      ctx.fillStyle = active ? "rgba(201, 162, 39, 0.35)" : "rgba(140, 155, 170, 0.22)";
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = active ? "rgba(201, 162, 39, 0.85)" : "rgba(180, 200, 220, 0.25)";
      ctx.lineWidth = active ? 2 : 1;
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.fillStyle = active ? "#f0dfaa" : "#b8c4d0";
      ctx.font = `${Math.max(10, Math.floor(11 * dpr))}px "Space Grotesk", sans-serif`;
      ctx.textAlign = "center";
      const label = cont.title.replace(" / ", "\n");
      const lines = label.split("\n");
      lines.forEach((line, i) => {
        ctx.fillText(line, rx + rw / 2, ry + rh / 2 - (lines.length - 1) * 6 + i * 12);
      });
    });
    ctx.fillStyle = "rgba(139, 154, 171, 0.75)";
    ctx.font = `${Math.max(9, Math.floor(10 * dpr))}px "Space Grotesk", sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText("10,000 × 10,000 placeholder grid", 12 * dpr, h - 12 * dpr);
  }

  function bindGlobe(canvas) {
    if (!canvas) {
      return {
        cleanup: () => {},
        adjustZoom: () => {},
      };
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return {
        cleanup: () => {},
        adjustZoom: () => {},
      };
    }

    let active = true;
    let rotY = 0.85;
    let rotX = 0.35;
    let drag = false;
    let lastX = 0;
    let lastY = 0;
    let zoom = 1;
    let raf = 0;
    let autoSpin = true;
    let dirty = true;
    let spinFrames = 0;
    const ZOOM_MIN = 0.55;
    const ZOOM_MAX = 2.75;
    const OCEAN = [0xc5, 0x82, 0x9b, 255];
    const mapPath =
      (domini && domini.globe_map) || "media/domini/domini_map_wip.png";

    let mapPixels = null;
    let mapW = 0;
    let mapH = 0;
    let mapReady = false;
    // Chunked sphere paint — never lock the tab on one huge sync pass.
    let job = null; // { size, out, data, py, cx, cy, radius, cosX, sinX, cosY, sinY }
    const RENDER_BUDGET_MS = 10;
    const CAP_IDLE = 1400;
    const CAP_DRAG = 960;
    const CAP_SPIN = 768;

    const sphereCanvas = document.createElement("canvas");
    const sphereCtx = sphereCanvas.getContext("2d", { alpha: true, willReadFrequently: false });

    const loader = new Image();
    loader.decoding = "async";
    loader.onload = () => {
      try {
        const scratch = document.createElement("canvas");
        scratch.width = loader.naturalWidth || loader.width;
        scratch.height = loader.naturalHeight || loader.height;
        const sctx = scratch.getContext("2d", { willReadFrequently: true });
        if (!sctx) throw new Error("no 2d context");
        sctx.drawImage(loader, 0, 0);
        const img = sctx.getImageData(0, 0, scratch.width, scratch.height);
        mapPixels = img.data;
        mapW = scratch.width;
        mapH = scratch.height;
        // Drop GPU/CPU scratch so 4096² decode doesn't stick around.
        scratch.width = 0;
        scratch.height = 0;
        mapReady = true;
        dirty = true;
      } catch (err) {
        console.error("Domini globe map decode failed:", err);
        mapReady = false;
        dirty = true;
      }
    };
    loader.onerror = () => {
      mapReady = false;
      dirty = true;
    };
    loader.src = mapPath;

    function setZoom(next) {
      zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next));
      // Zoom only changes blit size — do not kill the in-flight sphere job
      // (clearing mid-paint was flashing blank / half-rendered frames).
      const wanted = pickLayerSize(Math.min(canvas.width || 0, canvas.height || 0) * 0.34 * zoom * 2);
      if (wanted !== (job?.size || sphereCanvas.width)) {
        dirty = true;
      }
    }

    function adjustZoom(delta) {
      setZoom(zoom + delta);
      autoSpin = false;
    }

    function sampleMapInto(u, v, data, i) {
      if (!mapReady || !mapPixels) {
        data[i] = OCEAN[0];
        data[i + 1] = OCEAN[1];
        data[i + 2] = OCEAN[2];
        data[i + 3] = 255;
        return;
      }
      // Horizontal flip + slight horizontal stretch (continents read wider on sphere).
      const MAP_H_STRETCH = 1.12;
      let uu = 1 - u;
      uu = 0.5 + (uu - 0.5) / MAP_H_STRETCH;
      uu = ((uu % 1) + 1) % 1;
      const vv = Math.max(0, Math.min(1, v));
      const x = uu * (mapW - 1);
      const y = vv * (mapH - 1);
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const x1 = (x0 + 1) % mapW;
      const y1 = Math.min(mapH - 1, y0 + 1);
      const fx = x - x0;
      const fy = y - y0;
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;
      const i00 = (y0 * mapW + x0) * 4;
      const i10 = (y0 * mapW + x1) * 4;
      const i01 = (y1 * mapW + x0) * 4;
      const i11 = (y1 * mapW + x1) * 4;
      data[i] =
        (mapPixels[i00] * w00 +
          mapPixels[i10] * w10 +
          mapPixels[i01] * w01 +
          mapPixels[i11] * w11 +
          0.5) |
        0;
      data[i + 1] =
        (mapPixels[i00 + 1] * w00 +
          mapPixels[i10 + 1] * w10 +
          mapPixels[i01 + 1] * w01 +
          mapPixels[i11 + 1] * w11 +
          0.5) |
        0;
      data[i + 2] =
        (mapPixels[i00 + 2] * w00 +
          mapPixels[i10 + 2] * w10 +
          mapPixels[i01 + 2] * w01 +
          mapPixels[i11 + 2] * w11 +
          0.5) |
        0;
      data[i + 3] = 255;
    }

    function beginSphereJob(size) {
      if (!sphereCtx) return;
      // Build into ImageData only — do not resize sphereCanvas here or the
      // last good frame gets wiped and the globe flashes while chunking.
      const out = sphereCtx.createImageData(size, size);
      job = {
        size,
        out,
        data: out.data,
        py: 0,
        cx: (size - 1) * 0.5,
        cy: (size - 1) * 0.5,
        radius: size * 0.5 - 0.5,
        cosX: Math.cos(rotX),
        sinX: Math.sin(rotX),
        cosY: Math.cos(rotY),
        sinY: Math.sin(rotY),
      };
    }

    /** Paint as many rows as fit in RENDER_BUDGET_MS. Returns true when frame is complete. */
    function pumpSphereJob() {
      if (!job) return true;
      const { size, data, cx, cy, radius, cosX, sinX, cosY, sinY } = job;
      const t0 = performance.now();
      let py = job.py;
      while (py < size) {
        for (let px = 0; px < size; px++) {
          const i = (py * size + px) * 4;
          const nx = (px - cx) / radius;
          const ny = (cy - py) / radius;
          const r2 = nx * nx + ny * ny;
          if (r2 > 1) {
            data[i + 3] = 0;
            continue;
          }
          const nz = Math.sqrt(1 - r2);
          // Inverse of model→camera (rotY then rotX), frozen for this job.
          const y0 = ny * cosX + nz * sinX;
          const z1 = -ny * sinX + nz * cosX;
          const x0 = nx * cosY - z1 * sinY;
          const z0 = nx * sinY + z1 * cosY;
          const lon = Math.atan2(z0, x0);
          const lat = Math.asin(Math.max(-1, Math.min(1, y0)));
          const u = (lon + Math.PI) / (Math.PI * 2);
          const v = 0.5 - lat / Math.PI;
          sampleMapInto(u, v, data, i);
        }
        py += 1;
        if (performance.now() - t0 >= RENDER_BUDGET_MS) {
          job.py = py;
          return false;
        }
      }
      if (sphereCanvas.width !== size || sphereCanvas.height !== size) {
        sphereCanvas.width = size;
        sphereCanvas.height = size;
      }
      sphereCtx.putImageData(job.out, 0, 0);
      job = null;
      return true;
    }

    function pickLayerSize(displayDiameter) {
      const srcW = mapW || 4096;
      let cap = CAP_IDLE;
      if (drag) cap = CAP_DRAG;
      else if (autoSpin) cap = CAP_SPIN;
      // When zoomed in and idle, allow a denser layer so close-ups stay sharp.
      if (!drag && !autoSpin && zoom > 1.15) {
        cap = Math.min(srcW, Math.round(CAP_IDLE * Math.min(1.5, 0.75 + zoom * 0.4)));
      }
      cap = Math.min(srcW, cap);
      let size = Math.ceil(Math.max(displayDiameter * 1.05, 640));
      size = Math.min(cap, Math.max(512, size));
      return size & ~1;
    }

    function draw() {
      if (!active) return;
      if (document.hidden) {
        raf = requestAnimationFrame(draw);
        return;
      }

      try {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) {
          raf = requestAnimationFrame(draw);
          return;
        }
        const w = Math.max(280, Math.floor(rect.width * dpr));
        const h = Math.max(280, Math.floor(rect.height * dpr));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          dirty = true;
          job = null;
        }

        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(w, h) * 0.34 * zoom;
        const drawSize = radius * 2;
        const layerSize = pickLayerSize(drawSize);

        if (dirty && !job) {
          beginSphereJob(layerSize);
          dirty = false;
        }
        const done = pumpSphereJob();
        // If rotation changed while a chunk was painting, queue a fresh job after this one.
        if (done && dirty) {
          beginSphereJob(layerSize);
          dirty = false;
          pumpSphereJob();
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "#0c1016";
        ctx.fillRect(0, 0, w, h);

        // Prefer crisp 1:1 when buffer ≈ display; high-quality scale otherwise.
        ctx.imageSmoothingEnabled = Math.abs(layerSize - drawSize) > 1;
        ctx.imageSmoothingQuality = "high";
        if (sphereCanvas.width > 0 && sphereCanvas.height > 0) {
          ctx.drawImage(
            sphereCanvas,
            cx - drawSize / 2,
            cy - drawSize / 2,
            drawSize,
            drawSize
          );
        }

        ctx.fillStyle = "rgba(232, 180, 198, 0.9)";
        ctx.font = `${Math.max(10, Math.floor(11 * dpr))}px "Space Grotesk", sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("WIP globe texture · pink ocean = testing", cx, h - 18 * dpr);

        if (autoSpin && done) {
          rotY += 0.0035;
          spinFrames += 1;
          if (spinFrames % 3 === 0) {
            dirty = true;
            job = null;
          }
        }
      } catch (err) {
        console.error("Domini globe render failed:", err);
        job = null;
        dirty = false;
      }

      if (active) raf = requestAnimationFrame(draw);
    }

    const markDirty = (interrupt) => {
      dirty = true;
      // Drag: let the current chunk finish so the globe keeps updating.
      // Zoom / resize / leave: cancel mid-job and restart at the new size.
      if (interrupt) job = null;
    };

    const onDown = (ev) => {
      drag = true;
      autoSpin = false;
      lastX = ev.clientX;
      lastY = ev.clientY;
      markDirty(true);
      try {
        canvas.setPointerCapture(ev.pointerId);
      } catch (_) {}
    };
    const onMove = (ev) => {
      if (!drag) return;
      rotY += (ev.clientX - lastX) * 0.008;
      rotX += (ev.clientY - lastY) * 0.008;
      rotX = Math.max(-1.2, Math.min(1.2, rotX));
      lastX = ev.clientX;
      lastY = ev.clientY;
      markDirty(false);
    };
    const onUp = () => {
      drag = false;
      markDirty(true);
    };
    const onWheel = (ev) => {
      ev.preventDefault();
      adjustZoom(ev.deltaY > 0 ? -0.12 : 0.12);
    };
    const onVisibility = () => {
      if (!document.hidden) markDirty(true);
    };

    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(draw);

    return {
      cleanup: () => {
        active = false;
        job = null;
        cancelAnimationFrame(raf);
        canvas.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        canvas.removeEventListener("wheel", onWheel);
        document.removeEventListener("visibilitychange", onVisibility);
      },
      adjustZoom,
    };
  }

  function bindDominiControls(root) {
    const globeApi = bindGlobe(root.querySelector("[data-domini-globe]"));
    const mapCanvas = root.querySelector("[data-domini-map]");
    const redraw = () => drawDominiMap2d(mapCanvas, selectedContinent);
    redraw();
    const onResize = () => redraw();
    window.addEventListener("resize", onResize);

    root.querySelectorAll("[data-domini-view]").forEach((btn) => {
      btn.addEventListener("click", () => {
        dominiView = btn.dataset.dominiView;
        location.hash = dominiHash(dominiView, dominiView === "2d" ? selectedContinent : "");
      });
    });

    const select = root.querySelector("[data-domini-continent-select]");
    if (select) {
      select.addEventListener("change", () => {
        selectedContinent = select.value;
        location.hash = dominiHash("2d", selectedContinent);
      });
    }

    root.querySelectorAll("[data-domini-continent]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedContinent = btn.dataset.dominiContinent;
        location.hash = dominiHash("2d", selectedContinent);
      });
    });

    root.querySelectorAll("[data-map-zoom]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mapWrap = root.querySelector(".domini-map-shell");
        if (!mapWrap) return;
        if (mapWrap.classList.contains("domini-map-shell--globe")) {
          globeApi.adjustZoom(btn.dataset.mapZoom === "in" ? 0.25 : -0.25);
          return;
        }
        const level = Number(mapWrap.dataset.zoom || 1);
        const next = btn.dataset.mapZoom === "in" ? level + 0.25 : Math.max(0.75, level - 0.25);
        mapWrap.dataset.zoom = String(next);
        mapWrap.style.setProperty("--map-zoom", next);
      });
    });

    if (mapCanvas) {
      const onMapClick = (ev) => {
        const rect = mapCanvas.getBoundingClientRect();
        const nx = (ev.clientX - rect.left) / rect.width;
        const ny = (ev.clientY - rect.top) / rect.height;
        const hit = continents.find((cont) => {
          const r = cont.map_region || {};
          return nx >= r.x && nx <= r.x + r.w && ny >= r.y && ny <= r.y + r.h;
        });
        if (hit) location.hash = dominiHash("2d", hit.id);
      };
      mapCanvas.addEventListener("click", onMapClick);
      return () => {
        globeApi.cleanup();
        window.removeEventListener("resize", onResize);
        mapCanvas.removeEventListener("click", onMapClick);
      };
    }

    return () => {
      globeApi.cleanup();
      window.removeEventListener("resize", onResize);
    };
  }

  function renderDominiPanel2d(cont) {
    if (!cont) return `<p class="domini-empty">Select a continent.</p>`;
    return `
      <header class="domini-panel-head">
        <p class="wiki-kicker">Continent</p>
        <h2>${esc(cont.title)}</h2>
        <p class="domini-summary">${esc(cont.summary || "")}</p>
      </header>
      <section class="domini-panel-section">
        <h3>Countries & territories</h3>
        ${countriesHtml(cont.countries)}
      </section>
      <section class="domini-panel-section">
        <h3>Chronology</h3>
        <div class="domini-timeline">${timelineHtml(cont.timeline)}</div>
      </section>`;
  }

  function renderDominiPanel3d() {
    const blocks = continents
      .map(
        (c) => `
      <article class="domini-abstract-block">
        <header>
          <h3>${esc(c.title)}</h3>
          <a class="wiki-link" href="${dominiHash("2d", c.id)}">Open in 2D map →</a>
        </header>
        <p>${esc(c.summary || "")}</p>
        <p class="domini-abstract-meta">${esc(String((c.countries || []).length))} registered ${(c.countries || []).length === 1 ? "state" : "states"}</p>
      </article>`
      )
      .join("");
    return `
      <header class="domini-panel-head">
        <p class="wiki-kicker">Abstracts</p>
        <h2>Domini overview</h2>
        <p class="domini-summary">${esc(domini.world?.overview || "Domini world registry.")}</p>
      </header>
      <div class="domini-abstract-list">${blocks}</div>`;
  }

  function renderDomini() {
    app.classList.remove("app--dossier");
    app.classList.add("app--wiki", "app--domini");
    setNavActive();
    const cont = continentById[selectedContinent] || continents[0];
    if (cont && !selectedContinent) selectedContinent = cont.id;

    const continentNav = continents
      .map(
        (c) =>
          `<button type="button" class="domini-continent-btn${c.id === selectedContinent ? " is-active" : ""}" data-domini-continent="${esc(c.id)}">${esc(c.title)}</button>`
      )
      .join("");

    const mapBlock =
      dominiView === "3d"
        ? `
        <div class="domini-map-shell domini-map-shell--globe" data-zoom="1">
          <canvas data-domini-globe class="domini-globe" aria-label="Domini globe placeholder"></canvas>
          <div class="domini-map-controls">
            <button type="button" data-map-zoom="in" aria-label="Zoom in">+</button>
            <button type="button" data-map-zoom="out" aria-label="Zoom out">−</button>
          </div>
          <span class="domini-map-hint domini-map-hint--globe">WIP map · pink ocean = testing · drag / scroll / +/−</span>
        </div>`
        : `
        <div class="domini-map-shell" data-zoom="1" style="--map-zoom:1">
          <canvas data-domini-map class="domini-map" aria-label="Domini 2D map placeholder"></canvas>
          <div class="domini-map-controls">
            <button type="button" data-map-zoom="in" aria-label="Zoom in">+</button>
            <button type="button" data-map-zoom="out" aria-label="Zoom out">−</button>
          </div>
        </div>`;

    const sidePanel =
      dominiView === "3d"
        ? renderDominiPanel3d()
        : renderDominiPanel2d(cont);

    app.innerHTML = `
      <article class="domini-page">
        <header class="domini-head">
          <p class="wiki-kicker">Category</p>
          <h1 class="domini-title">Domini</h1>
          <p class="domini-lead">${esc(domini.world?.overview || "")}</p>
          <nav class="domini-subnav" aria-label="Domini views">
            <button type="button" class="domini-subtab${dominiView === "3d" ? " is-active" : ""}" data-domini-view="3d">3D Globe</button>
            <button type="button" class="domini-subtab${dominiView === "2d" ? " is-active" : ""}" data-domini-view="2d">2D Map</button>
          </nav>
        </header>

        <div class="domini-layout">
          <div class="domini-map-col">
            <p class="domini-map-kicker">${
              dominiView === "3d"
                ? '3D globe — WIP Domini texture (pink ocean = under test). 2D map stays placeholder.'
                : "Learn more about the history of Domini"
            }</p>
            ${mapBlock}
            ${
              dominiView === "2d"
                ? `
            <label class="domini-select-wrap">
              <span>Continent</span>
              <select data-domini-continent-select aria-label="Select continent">${continentOptions(selectedContinent)}</select>
            </label>
            <div class="domini-continent-nav" aria-label="Continents">${continentNav}</div>`
                : ""
            }
          </div>
          <div class="domini-detail-col">${sidePanel}</div>
        </div>
      </article>`;

    app._dominiCleanup = bindDominiControls(app);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function newsCategoryLabel(id) {
    const hit = NEWS_CATEGORIES.find((c) => c.id === id);
    return hit ? hit.label : String(id || "News").toUpperCase();
  }

  function filterNewsPosts() {
    const q = (searchInput.value || "").trim().toLowerCase();
    return newsPosts.filter((p) => {
      if (newsFilter !== "all" && p.category !== newsFilter) return false;
      if (!q) return true;
      const blob = [p.title, p.excerpt, p.body, p.category, p.date, p.id].join(" ").toLowerCase();
      return blob.includes(q);
    });
  }

  function newsBodyHtml(text) {
    return esc(text || "")
      .split(/\n\n+/)
      .filter(Boolean)
      .map((para) => `<p>${para}</p>`)
      .join("");
  }

  function bindNewsControls(root) {
    root.querySelectorAll("[data-news-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cat = btn.dataset.newsFilter;
        location.hash = cat === "all" ? "#/news" : `#/news/${cat}`;
      });
    });
    const topBtn = root.querySelector("[data-back-top]");
    if (topBtn) {
      topBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }

  function renderNewsCard(p, delay) {
    const cat = String(p.category || "news").toLowerCase();
    return `
      <a class="news-card" href="#/news/post/${esc(p.id)}" style="animation-delay:${delay}s">
        <div class="news-card-art"${p.art ? ` style="background-image:url('${esc(p.art)}')"` : ""}>
          ${p.art ? "" : `<span class="news-card-fallback">${esc(newsCategoryLabel(cat))}</span>`}
        </div>
        <div class="news-card-meta">
          <time datetime="${esc(p.date || "")}">${esc(p.date || "—")}</time>
          <span class="news-tag news-tag--${esc(cat)}">${esc(newsCategoryLabel(cat))}</span>
        </div>
        <h2 class="news-card-title">${esc(p.title || "Untitled")}</h2>
        <p class="news-card-excerpt">${esc(p.excerpt || "")}</p>
      </a>`;
  }

  function renderNewsBrowse() {
    app.classList.remove("app--dossier", "app--domini");
    app.classList.add("app--wiki", "app--news");
    if (app._dominiCleanup) {
      app._dominiCleanup();
      app._dominiCleanup = null;
    }
    setNavActive();
    const list = filterNewsPosts();
    const filters = NEWS_CATEGORIES.map(
      (c) =>
        `<button type="button" class="news-filter${newsFilter === c.id ? " is-active" : ""}" data-news-filter="${esc(c.id)}">${esc(c.label)}</button>`
    ).join("");
    const grid =
      list.length > 0
        ? list.map((p, i) => renderNewsCard(p, 0.03 * i)).join("")
        : `<p class="news-empty">No posts match this filter.</p>`;

    app.innerHTML = `
      <article class="news-page">
        <div class="news-panel">
          <header class="news-head">
            <div class="news-head-rule" aria-hidden="true"></div>
            <h1 class="news-title">News</h1>
            <div class="news-head-rule" aria-hidden="true"></div>
          </header>
          <p class="news-lead">Creator-fed lore drops, game updates, and random Domini chaos — straight from the universe author.</p>

          <div class="news-category-bar">
            <span class="news-category-label">Category</span>
            <nav class="news-filters" aria-label="News categories">${filters}</nav>
          </div>

          <div class="news-grid">${grid}</div>
        </div>
        <button type="button" class="news-back-top" data-back-top aria-label="Back to top">↑</button>
      </article>`;

    bindNewsControls(app);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderNewsDetail(id) {
    const p = newsById[id];
    if (!p) {
      app.classList.remove("app--dossier", "app--domini", "app--news");
      app.innerHTML = `<p class="empty">Unknown post: ${esc(id)}</p>`;
      return;
    }
    app.classList.remove("app--dossier", "app--domini");
    app.classList.add("app--wiki", "app--news");
    if (app._dominiCleanup) {
      app._dominiCleanup();
      app._dominiCleanup = null;
    }
    setNavActive();
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("is-active"));
    const newsBtn = document.querySelector('[data-section="news"]');
    if (newsBtn) newsBtn.classList.add("is-active");

    const cat = String(p.category || "news").toLowerCase();
    app.innerHTML = `
      <article class="news-article">
        <div class="news-panel news-panel--article">
          <p class="news-breadcrumb"><a class="wiki-link" href="#/news">News</a></p>
          <header class="news-article-head">
            <div class="news-article-meta">
              <time datetime="${esc(p.date || "")}">${esc(p.date || "—")}</time>
              <span class="news-tag news-tag--${esc(cat)}">${esc(newsCategoryLabel(cat))}</span>
            </div>
            <h1>${esc(p.title || "Untitled")}</h1>
            ${p.excerpt ? `<p class="news-article-deck">${esc(p.excerpt)}</p>` : ""}
          </header>
          ${p.art ? `<div class="news-article-art" style="background-image:url('${esc(p.art)}')"></div>` : ""}
          <div class="news-article-body">${newsBodyHtml(p.body)}</div>
          <footer class="news-article-foot">
            <a class="btn" href="#/news">← All news</a>
          </footer>
        </div>
        <button type="button" class="news-back-top" data-back-top aria-label="Back to top">↑</button>
      </article>`;

    bindNewsControls(app);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderCampaignBrowse() {
    const list = filterCampaigns();
    const rows = list
      .map(
        (c) => `
      <tr>
        <td><a class="wiki-link" href="#/campaign/${esc(c.id)}">${esc(c.title)}</a></td>
        <td>${esc(c.years || "—")}</td>
        <td>${esc(String(c.mission_count || 0))}</td>
        <td><span class="wiki-tag ${c.playable ? "wiki-tag--play" : ""}">${esc(campaignStatus(c))}</span></td>
      </tr>`
      )
      .join("");

    return `
      <article class="wiki-index">
        <header class="wiki-index-head">
          <p class="wiki-kicker">Domini conflicts</p>
          <h1>Campaign registry</h1>
          <p class="wiki-lead">Chronology of wars and operations across the Parabellum universe — wiki-style dossiers for each conflict.</p>
        </header>
        <table class="wiki-table">
          <thead>
            <tr>
              <th>Conflict</th>
              <th>Date</th>
              <th>Missions</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows || "<tr><td colspan='4' class='empty'>No campaigns match.</td></tr>"}</tbody>
        </table>
      </article>`;
  }

  function renderCampaignDetail(id) {
    const c = campaignById[id];
    if (!c) {
      app.classList.remove("app--dossier", "app--wiki");
      app.innerHTML = `<p class="empty">Unknown campaign: ${esc(id)}</p>`;
      return;
    }
    app.classList.remove("app--dossier", "app--domini", "app--news");
    app.classList.add("app--wiki");
    if (app._dominiCleanup) {
      app._dominiCleanup();
      app._dominiCleanup = null;
    }
    setNavActive();
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("is-active"));
    const campBtn = document.querySelector('[data-section="campaigns"]');
    if (campBtn) campBtn.classList.add("is-active");

    const missions = Array.isArray(c.missions) ? c.missions : [];
    const missionRows = missions
      .map(
        (m) => `
      <tr>
        <td>${esc(String(m.index ?? "—"))}</td>
        <td>${esc(m.date || "—")}</td>
        <td><strong>${esc(m.title || "—")}</strong></td>
        <td>${esc(m.location || "—")}</td>
        <td class="wiki-mission-brief">${esc(cleanBrief(m.brief))}</td>
      </tr>`
      )
      .join("");

    const missionBlock =
      missions.length > 0
        ? `
        <h2 id="sec-missions">Mission chronology</h2>
        <table class="wiki-table wiki-table--missions">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Operation</th>
              <th>Location</th>
              <th>Brief</th>
            </tr>
          </thead>
          <tbody>${missionRows}</tbody>
        </table>`
        : `<p class="wiki-body">Mission list not published for this conflict yet.</p>`;

    app.innerHTML = `
      <article class="wiki-article">
        <nav class="wiki-toc" aria-label="Contents">
          <p class="wiki-toc-title">Contents</p>
          <ol>
            <li><a href="#sec-overview">Overview</a></li>
            ${missions.length ? "<li><a href='#sec-missions'>Mission chronology</a></li>" : ""}
            <li><a href="#/campaigns">All campaigns</a></li>
          </ol>
        </nav>

        <div class="wiki-main">
          <p class="wiki-kicker"><a class="wiki-link" href="#/campaigns">Campaigns</a></p>
          <h1 class="wiki-title">${esc(c.title)}</h1>
          <p class="wiki-subtitle">${esc(c.years || "")}</p>

          <section id="sec-overview">
            <h2>Overview</h2>
            <p class="wiki-body">${esc(c.desc || "")}</p>
          </section>

          ${missionBlock}
        </div>

        <aside class="wiki-infobox">
          <h2 class="wiki-infobox-title">${esc(c.title)}</h2>
          ${c.art ? `<img class="wiki-infobox-img" src="${esc(c.art)}" alt="" />` : ""}
          <table class="wiki-infobox-table">
            <tr><th>Date</th><td>${esc(c.years || "—")}</td></tr>
            <tr><th>Status</th><td>${esc(campaignStatus(c))}</td></tr>
            <tr><th>Missions</th><td>${esc(String(c.mission_count || missions.length || 0))}</td></tr>
            <tr><th>Registry ID</th><td><code>${esc(c.id)}</code></td></tr>
          </table>
        </aside>
      </article>`;

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function browseHashForSection(sec) {
    if (sec === "heli") return "#/heli";
    if (sec === "special") return "#/special";
    if (sec === "campaigns") return "#/campaigns";
    return "#/";
  }

  function renderBrowse() {
    app.classList.remove("app--dossier", "app--wiki", "app--domini", "app--news");
    setNavActive();
    if (section === "campaigns") {
      app.innerHTML = renderCampaignBrowse();
      return;
    }
    if (section === "news") {
      renderNewsBrowse();
      return;
    }

    const featured = byId[heroArtId()];
    const art = featured?.card || "";
    let body = "";
    if (section === "aircraft") body = eraBlocks(DATA.air_eras || []);
    else if (section === "heli") body = eraBlocks(DATA.heli_eras || []);
    else {
      const list = filterList(DATA.special_ids || []);
      body = `
        <section class="section">
          <div class="section-head">
            <h2>Special Units</h2>
            <span>${list.length}</span>
          </div>
          <div class="card-grid">
            ${list.map((a, i) => cardHtml(a, 0.04 * i)).join("")}
          </div>
        </section>`;
    }

    app.innerHTML = `
      <section class="hero">
        <div class="hero-art" style="background-image:url('${esc(art)}')"></div>
        <p class="hero-kicker">encyclopedia.parabellumuniverse.com</p>
        <h1>PARABELLUM</h1>
        <p class="hero-lead">Aircraft encyclopedia — designations, operators, and Airbook stats for every Domini airframe.</p>
        <div class="hero-cta">
          <a class="btn btn-solid" href="#era-${esc((DATA.air_eras[0] || {}).id || "lead_in")}">Browse eras</a>
          <button type="button" class="btn" data-jump-special>Special Units</button>
          <button type="button" class="btn" data-jump-domini>Domini</button>
          <button type="button" class="btn" data-jump-campaigns>Campaigns</button>
          <button type="button" class="btn" data-jump-news>News</button>
        </div>
      </section>
      ${body || "<p class='empty'>No airframes match.</p>"}
    `;

    const jump = app.querySelector("[data-jump-special]");
    if (jump) {
      jump.addEventListener("click", () => {
        location.hash = "#/special";
      });
    }
    const jumpDomini = app.querySelector("[data-jump-domini]");
    if (jumpDomini) {
      jumpDomini.addEventListener("click", () => {
        location.hash = "#/domini/2d";
      });
    }
    const jumpCamp = app.querySelector("[data-jump-campaigns]");
    if (jumpCamp) {
      jumpCamp.addEventListener("click", () => {
        location.hash = "#/campaigns";
      });
    }
    const jumpNews = app.querySelector("[data-jump-news]");
    if (jumpNews) {
      jumpNews.addEventListener("click", () => {
        location.hash = "#/news";
      });
    }
  }

  function categoryLabel(a) {
    if (a.category === "helicopter") return "Rotary-wing";
    return "Fixed-wing";
  }

  function potentialityBar(a) {
    const filled = Number(a.potentiality_filled) || 0;
    const max = Number(a.potentiality_max) || 5;
    const pct = max > 0 ? Math.round((filled / max) * 100) : 0;
    return `
      <div class="pot-bar" role="img" aria-label="Potentiality ${filled} of ${max}">
        <div class="pot-bar-fill" style="width:${pct}%"></div>
      </div>
      <span class="pot-label">${filled} / ${max}</span>`;
  }

  function statusLabel(a) {
    if (a.future_update) return "Future Update";
    return "Airbook entry";
  }

  function statTile(label, body, extraClass) {
    const cls = extraClass ? ` stat-tile ${extraClass}` : "stat-tile";
    return `
      <div class="${cls.trim()}">
        <span class="stat-tile-label">${esc(label)}</span>
        <div class="stat-tile-body">${body}</div>
      </div>`;
  }

  function nationChip(nation, flag) {
    if (flag) {
      return `<span class="stat-operator"><img class="flag flag--tile" src="${esc(flag)}" alt="" /><span>${esc(nation || "—")}</span></span>`;
    }
    return `<span class="stat-operator"><span>${esc(nation || "—")}</span></span>`;
  }

  function operatorTileHtml(a) {
    const primary = nationChip(a.nation || "—", a.flag || "");
    const coops = Array.isArray(a.cooperated) ? a.cooperated.filter((c) => c && c.nation) : [];
    if (!coops.length) {
      return statTile("Operator", `<div class="stat-operator-wrap">${primary}</div>`);
    }
    const list = coops
      .map((c) => `<li>${nationChip(c.nation, c.flag || "")}</li>`)
      .join("");
    const body = `
      <div class="stat-operator-wrap">
        ${primary}
        <details class="stat-cooperated">
          <summary>
            <span class="stat-cooperated-label">Co-operated</span>
            <span class="stat-cooperated-count">${coops.length}</span>
          </summary>
          <ul class="stat-cooperated-list">${list}</ul>
        </details>
      </div>`;
    return statTile("Operator", body, "stat-tile--operator");
  }

  function performanceTable(a) {
    return `
      <table class="stat-table">
        <tr><th>Max speed</th><td>${esc(fmtSpeed(a))}${a.mach_max ? ` · Mach ${esc(a.mach_max)}` : ""}</td></tr>
        <tr><th>Combat radius</th><td>${esc(fmtRadius(a))}</td></tr>
        <tr><th>Service ceiling</th><td>${esc(fmtCeil(a))}</td></tr>
        <tr><th>Empty weight</th><td>${esc(fmtWeight(a))}</td></tr>
        <tr><th>Thrust (total)</th><td>${esc(fmtThrust(a))}</td></tr>
        <tr><th>Hardpoints</th><td>${esc(a.hardpoints ?? "—")}</td></tr>
        <tr><th>Crew</th><td>${esc(a.crew ?? "—")}</td></tr>
        <tr><th>RWR</th><td>${a.has_rwr ? "Yes" : "No"}</td></tr>
        <tr><th>MAWS</th><td>${a.has_maws ? "Yes" : "No"}</td></tr>
      </table>`;
  }

  function lineageStrip(siblings, currentId) {
    if (siblings.length <= 1) return "";
    return `
      <section class="variant-strip" id="sec-lineage">
        <h2 class="variant-strip-title">Bloodline variants</h2>
        <div class="variant-scroll">
          ${siblings
            .map((s) => {
              const active = s.id === currentId ? " is-active" : "";
              return `
            <a class="variant-card${active}" href="#/aircraft/${esc(s.id)}">
              <div class="variant-card-art" style="background-image:url('${esc(s.card || "")}')"></div>
              <div class="variant-card-meta">
                ${s.flag ? `<img class="flag" src="${esc(s.flag)}" alt="" />` : ""}
                <span>${esc(designation(s))}</span>
              </div>
            </a>`;
            })
            .join("")}
        </div>
      </section>`;
  }

  function bindDossierTabs(root) {
    const tabs = root.querySelectorAll("[data-dossier-tab]");
    const panels = root.querySelectorAll("[data-dossier-panel]");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const id = tab.dataset.dossierTab;
        tabs.forEach((t) => t.classList.toggle("is-active", t === tab));
        panels.forEach((p) => {
          p.hidden = p.dataset.dossierPanel !== id;
        });
      });
    });
    root.querySelectorAll("[data-jump]").forEach((link) => {
      link.addEventListener("click", (ev) => {
        const target = link.dataset.jump;
        if (target.startsWith("tab:")) {
          ev.preventDefault();
          const tabId = target.slice(4);
          const tab = root.querySelector(`[data-dossier-tab="${tabId}"]`);
          if (tab) tab.click();
          return;
        }
        if (target.startsWith("#")) return;
        ev.preventDefault();
        const el = root.querySelector(`#${target}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function renderDetail(id) {
    const a = byId[id];
    if (!a) {
      app.classList.remove("app--dossier", "app--domini", "app--news");
      app.innerHTML = `<p class="empty">Unknown airframe: ${esc(id)}</p>`;
      return;
    }
    app.classList.remove("app--wiki", "app--domini", "app--news");
    if (app._dominiCleanup) {
      app._dominiCleanup();
      app._dominiCleanup = null;
    }
    app.classList.add("app--dossier");
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("is-active"));

    const siblings = a.lineage_family
      ? DATA.aircraft.filter((x) => x.lineage_family === a.lineage_family)
      : [];

    const weapons = (a.starter_weapons || []).length
      ? `<ul class="weapon-list">${a.starter_weapons.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>`
      : `<p class="lore">Starter loadout not listed in Airbook yet.</p>`;

    const tiles = [
      statTile("Service tier", `<strong class="stat-big">${esc(a.tier || "—")}</strong>`),
      statTile("Domini era", `<strong class="stat-big stat-big--sm">${esc(a.era || "—")}</strong>`),
      operatorTileHtml(a),
      statTile("Mission role", `<strong class="stat-big stat-big--sm">${esc(a.role || "—")}</strong>`),
      statTile("Potentiality", potentialityBar(a)),
      statTile("Registry status", `<strong class="stat-big stat-big--sm ${a.future_update ? "stat-future" : ""}">${esc(statusLabel(a))}</strong>`),
    ].join("");

    app.innerHTML = `
      <article class="dossier">
        <aside class="dossier-rail" aria-label="Section index">
          <p class="rail-kicker">Airframe dossier</p>
          <nav class="rail-nav">
            <a href="#/" class="rail-back">← Registry</a>
            <a href="#" data-jump="tab:dossier">Operational brief</a>
            <a href="#" data-jump="tab:performance">Flight envelope</a>
            <a href="#" data-jump="tab:loadout">Starter loadout</a>
            <a href="#" data-jump="sec-lineage">Bloodline</a>
          </nav>
        </aside>

        <div class="dossier-main">
          <header class="dossier-banner">
            <div class="dossier-banner-bg" style="background-image:url('${esc(a.card || "")}')"></div>
            ${a.flag ? `<div class="dossier-banner-wash" style="background-image:url('${esc(a.flag)}')"></div>` : ""}
            <div class="dossier-banner-grid">
              <div class="dossier-banner-copy">
                <p class="dossier-kicker">${esc(categoryLabel(a))}</p>
                <h1 class="dossier-name">${esc(a.display_name)}</h1>
                <p class="dossier-designation">${esc(designation(a))}</p>
                <div class="dossier-actions">
                  <a class="btn btn-solid" href="#/">All airframes</a>
                  ${siblings.length > 1 ? `<a class="btn" href="#" data-jump="sec-lineage">View bloodline</a>` : ""}
                </div>
              </div>
              <div class="dossier-banner-visual" aria-hidden="true">
                <div class="dossier-banner-plane" style="background-image:url('${esc(a.card || "")}')"></div>
              </div>
              <div class="dossier-stat-grid">${tiles}</div>
            </div>
          </header>

          <nav class="dossier-tabs" aria-label="Dossier sections">
            <button type="button" class="dossier-tab is-active" data-dossier-tab="dossier">Operational brief</button>
            <button type="button" class="dossier-tab" data-dossier-tab="performance">Flight envelope</button>
            <button type="button" class="dossier-tab" data-dossier-tab="loadout">Starter loadout</button>
            <button type="button" class="dossier-tab" data-dossier-tab="identity">Identity</button>
          </nav>

          <div class="dossier-body">
            <section class="dossier-panel" data-dossier-panel="dossier">
              <h2>Operational brief</h2>
              ${dossierBriefHtml(a.description)}
              ${a.irl_basis ? `<p class="lore lore-note"><strong>Design reference:</strong> ${esc(a.irl_basis)}</p>` : ""}
            </section>
            <section class="dossier-panel" data-dossier-panel="performance" hidden>
              <h2>Flight envelope</h2>
              ${performanceTable(a)}
            </section>
            <section class="dossier-panel" data-dossier-panel="loadout" hidden>
              <h2>Starter loadout</h2>
              ${weapons}
            </section>
            <section class="dossier-panel" data-dossier-panel="identity" hidden>
              <h2>Identity</h2>
              <table class="stat-table">
                <tr><th>Manufacturer</th><td>${esc(a.manufacturer || "—")}</td></tr>
                <tr><th>Designation</th><td>${esc(designation(a))}</td></tr>
                <tr><th>Registry ID</th><td><code>${esc(a.id)}</code></td></tr>
                <tr><th>Category</th><td>${esc(categoryLabel(a))}</td></tr>
                <tr><th>Lineage family</th><td>${esc(a.lineage_family || "—")}</td></tr>
              </table>
            </section>
          </div>

          ${lineageStrip(siblings, a.id)}
        </div>

        <aside class="dossier-aside" aria-label="Quick reference">
          <div class="aside-block">
            <h3>On this page</h3>
            <a href="#" data-jump="tab:dossier">Operational brief</a>
            <a href="#" data-jump="tab:performance">Flight envelope</a>
            <a href="#" data-jump="tab:loadout">Starter loadout</a>
            <a href="#" data-jump="tab:identity">Identity</a>
            <a href="#" data-jump="sec-lineage">Bloodline</a>
          </div>
          <div class="aside-block">
            <h3>Display</h3>
            <p class="aside-hint">Units follow the header toggle (US / International). Stats mirror in-game Airbook dossier.</p>
          </div>
          <div class="aside-block aside-block--dim">
            <h3>Data source</h3>
            <p class="aside-hint">Parabellum <code>AircraftData</code> · encyclopedia.parabellumuniverse.com</p>
          </div>
        </aside>
      </article>`;

    bindDossierTabs(app);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = btn.dataset.section || "aircraft";
      if (next === "domini") {
        location.hash = dominiHash("2d", selectedContinent || continents[0]?.id || "");
        return;
      }
      if (next === "news") {
        location.hash = "#/news";
        return;
      }
      location.hash = browseHashForSection(next);
    });
  });

  searchInput.addEventListener("input", () => {
    const hash = location.hash.replace(/^#\/?/, "");
    if (!hash || hash === "/" || hash === "heli" || hash === "rotary" || hash === "special" || hash === "campaigns") {
      renderBrowse();
      return;
    }
    if (hash === "news" || hash.startsWith("news/")) {
      if (hash.startsWith("news/post/")) return;
      renderNewsBrowse();
    }
  });

  unitsSelect.addEventListener("change", () => {
    units = unitsSelect.value;
    localStorage.setItem("pb_enc_units", units);
    route();
  });

  const brand = document.querySelector(".brand");
  if (brand) {
    brand.addEventListener("click", () => {
      section = "aircraft";
    });
  }

  window.addEventListener("hashchange", route);
  route();
})();
