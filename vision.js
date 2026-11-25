(() => {
  const hero = document.querySelector(".hero");
  const viewer = hero.querySelector(".viewer");
  const panel = viewer.querySelector(".instrument");
  const image = document.getElementById("iris");
  const surface = document.getElementById("relief");
  const rain = hero.querySelector(".binary-rain");
  const rainContext = rain.getContext("2d");
  const plot = surface.getContext("2d");
  const pause = viewer.querySelector(".motion-control");
  const modes = viewer.querySelector(".modes");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const root = document.documentElement;
  let preference;
  try { preference = localStorage.getItem("portfolio-motion"); } catch {}
  let moving = false, visible = true, frame = 0, last = 0, elapsed = 0;
  let width = 0, height = 0, targetX = 0, targetY = 0, mode = "image";
  let columns = [], points = [];

  function drawRain() {
    if (!rainContext) return;
    rainContext.clearRect(0, 0, width, height);
    rainContext.font = "11px monospace";
    columns.forEach(({x, start, speed, code}) => {
      const head = (start + elapsed * speed) % (height + 240);
      for (let k = 0; k < code.length; k++) {
        const y = head - 14 * k;
        if (y < 0 || y > height) continue;
        rainContext.fillStyle = k === 0 ? "#aaf6dd" : "#65cbb5";
        rainContext.globalAlpha = .38 * (1 - k / code.length);
        rainContext.fillText(code[k], x, y);
      }
    });
    rainContext.globalAlpha = 1;
  }

  function drawSurface() {
    if (!plot || mode !== "relief") return;
    const size = surface.width;
    plot.clearRect(0, 0, size, size);
    const yaw = -.22 + Math.sin(elapsed * .36) * .2 + targetX * .65;
    const pitch = -.57 + targetY * .38;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const dot = Math.max(1.1, size / 240);
    for (const p of points) {
      const x = p.x * cy - p.z * sy;
      const z = p.x * sy + p.z * cy;
      const depth = p.y * sp + z * cp;
      const scale = size * .48 / (1.26 - depth * .24);
      plot.fillStyle = p.color;
      plot.fillRect(size * .5 + x * scale, size * .51 + (p.y * cp - z * sp) * scale, dot, dot);
    }
  }

  function prepareSurface(photo) {
    const source = document.createElement("canvas");
    const n = 164;
    source.width = source.height = n;
    const ctx = source.getContext("2d", {willReadFrequently:true});
    if (!ctx || !plot) return;
    ctx.drawImage(photo, 0, 0, n, n);
    const pixels = ctx.getImageData(0, 0, n, n).data;
    const samples = [];
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const pos = (j * n + i) * 4;
        const r = pixels[pos], g = pixels[pos + 1], b = pixels[pos + 2];
        const light = (.23 * r + .65 * g + .12 * b) / 255;
        if (light < .07) continue;
        const x = (i + .5) * 2 / n - 1, y = (j + .5) * 2 / n - 1;
        samples.push({x, y, z:light * .46 + .16 * (1 - x*x - y*y),
          color:"rgb(" + r + "," + g + "," + b + ")"});
      }
    }
    points = samples;
    modes.querySelector('[data-view="relief"]').disabled = false;
    drawSurface();
  }

  function resize() {
    width = hero.clientWidth;
    height = hero.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    rain.width = Math.round(width * dpr); rain.height = Math.round(height * dpr);
    rainContext?.setTransform(dpr, 0, 0, dpr, 0, 0);
    surface.width = surface.height = Math.min(720, Math.max(240, Math.round(image.clientWidth * dpr)));
    columns = Array.from({length:Math.ceil(width / 29)}, (_, i) => ({
      x:i*29 + Math.random()*9, start:Math.random()*(height+240), speed:17+Math.random()*26,
      code:Array.from({length:12}, () => Math.random() < .5 ? "0" : "1")
    }));
    drawRain(); drawSurface();
  }
  function tick(time) {
    if (!moving || !visible || document.hidden) { frame = 0; return; }
    if (time - last >= 48) {
      elapsed += last ? Math.min(time-last, 100)/1000 : 0;
      last = time;
      drawRain(); drawSurface();
      panel.style.setProperty("--yaw", (-9 + Math.sin(elapsed*.47)*5 + targetX*14) + "deg");
      panel.style.setProperty("--pitch", (6 + Math.cos(elapsed*.33)*3 - targetY*11) + "deg");
    }
    frame = requestAnimationFrame(tick);
  }
  function synchronize() {
    moving = preference == null ? !reduced.matches : preference === "on";
    root.dataset.motion = moving ? "on" : "off";
    pause.dataset.paused = String(!moving);
    pause.textContent = moving ? "Duraklat" : "Oynat";
    pause.setAttribute("aria-label", moving ? "Animasyonu duraklat" : "Animasyonu başlat");
    if (moving && visible && !document.hidden) {
      if (!frame) { last = 0; frame = requestAnimationFrame(tick); }
    } else { cancelAnimationFrame(frame); frame = 0; }
  }
  panel.addEventListener("pointermove", event => {
    if (!moving || (event.pointerType === "touch" && !event.buttons)) return;
    const box = panel.getBoundingClientRect();
    targetX = (event.clientX - box.left) / box.width * 2 - 1;
    targetY = (event.clientY - box.top) / box.height * 2 - 1;
  });
  panel.addEventListener("pointerleave", () => { targetX = targetY = 0; });
  pause.addEventListener("click", () => {
    preference = moving ? "off" : "on";
    try { localStorage.setItem("portfolio-motion", preference); } catch {}
    synchronize();
  });
  modes.querySelector('[data-view="relief"]').disabled = true;
  const source = new Image();
  source.onload = () => prepareSurface(source);
  source.src = image.src;
  modes.addEventListener("click", event => {
    const button = event.target.closest("[data-view]");
    if (!button || button.disabled) return;
    mode = viewer.dataset.mode = button.dataset.view;
    image.src = mode === "edges" ? "vision-edges.webp" : "vision-iris.webp";
    image.alt = mode === "edges" ? "İris liflerinin kenar haritası" : "Turkuaz ve bakır tonlarında temsili iris";
    surface.hidden = mode !== "relief";
    for (const other of modes.children) other.setAttribute("aria-pressed", String(other === button));
    drawSurface();
  });
  modes.hidden = pause.hidden = false;
  reduced.addEventListener("change", synchronize);
  document.addEventListener("visibilitychange", synchronize);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; synchronize(); }).observe(hero);
  new ResizeObserver(resize).observe(hero);
  synchronize(); resize();

  const entries = [...document.querySelectorAll(".atlas-entry")];
  const atlasImage = document.getElementById("atlas-image");
  const caption = document.getElementById("atlas-caption");
  entries.forEach(entry => entry.addEventListener("toggle", () => {
    if (!entry.open) return;
    for (const other of entries) if (entry !== other) other.open = false;
    atlasImage.src = "vision-" + entry.dataset.plate + ".webp";
    caption.textContent = "İllüstrasyon · " + entry.dataset.caption;
  }));
  const reveal = new IntersectionObserver(records => {
    for (const record of records) if (record.isIntersecting) {
      record.target.classList.add("entered"); reveal.unobserve(record.target);
    }
  }, {threshold:.12});
  for (const element of document.querySelectorAll(".atlas-title,.section-head,.spot-grid,.atlas-plate")) reveal.observe(element);
})();
