(() => {
  const hero = document.querySelector(".hero");
  const canvas = document.querySelector(".binary-rain");
  const scene = document.querySelector(".portrait-art");
  const control = document.querySelector(".motion-control");
  const context = canvas.getContext("2d", { alpha: true });
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const pointer = matchMedia("(hover: hover) and (pointer: fine)");
  const tilting = Array.from(document.querySelectorAll(".project-card"), card => [card, card, 5]);
  tilting.push([scene.closest(".portrait"), scene, 10]);

  let preference;
  let active = false;
  let frame = 0;
  let lastFrame = 0;
  let visible = true;
  let width = 0;
  let height = 0;
  let columns = [];

  try { preference = localStorage.getItem("portfolio-motion"); } catch {}

  function enabled() {
    return preference == null ? !reduced.matches : preference === "on";
  }

  function resetColumn(column, spread) {
    column.y = spread ? Math.random() * (height + 300) - 200 : -20 - Math.random() * 300;
    column.speed = 29 + Math.random() * 65;
    column.length = 9 + Math.floor(Math.random() * 16);
  }

  function paint(elapsed) {
    if (!context || !width || !height) return;
    context.clearRect(0, 0, width, height);
    context.textBaseline = "middle";
    for (const column of columns) {
      column.y += column.speed * elapsed;
      const tail = column.length * column.spacing;
      if (column.y - tail > height) resetColumn(column, false);
      context.font = column.size + "px monospace";
      for (let index = 0; index < column.length; index++) {
        const y = column.y - index * column.spacing;
        if (y < -column.size || y > height + column.size) continue;
        const brightness = (1 - index / column.length) ** 1.35 * column.strength;
        context.globalAlpha = index === 0 ? column.strength * 1.5 : brightness;
        context.fillStyle = index === 0 ? "#bbffcb" : index < 3 ? "#77ffc0" : "#50d98d";
        context.fillText(column.digits[index], column.x, y);
      }
    }
    context.globalAlpha = 1;
  }

  function resize() {
    const size = canvas.getBoundingClientRect();
    width = Math.round(size.width);
    height = Math.round(size.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    const step = width < 620 ? 19 : 23;
    columns = Array.from({ length: Math.ceil(width / step) }, (_, index) => {
      const size = 9 + Math.floor(Math.random() * 7);
      const column = {
        x: index * step + Math.random() * 8,
        size,
        spacing: size * 1.48,
        strength: .14 + Math.random() * .24,
        digits: Array.from({ length: 25 }, () => Math.random() > .5 ? "1" : "0")
      };
      resetColumn(column, true);
      return column;
    });
    scene.style.setProperty("--scene-h", scene.offsetHeight + "px");
    paint(0);
  }

  function animate(time) {
    frame = 0;
    if (!active) return;
    if (!lastFrame || time - lastFrame >= 32) {
      paint(lastFrame ? Math.min((time - lastFrame) / 1000, .09) : 0);
      lastFrame = time;
    }
    frame = requestAnimationFrame(animate);
  }

  function clearTilt(target) {
    target.style.removeProperty("--rx");
    target.style.removeProperty("--ry");
  }

  function synchronize() {
    const motion = enabled();
    active = motion && visible && !document.hidden;
    hero.classList.toggle("motion-on", active);
    const label = motion ? "Animasyonu duraklat" : "Animasyonu başlat";
    control.setAttribute("aria-label", label);
    control.title = label;
    control.textContent = motion ? "Ⅱ" : "▶";
    if (active && !frame) {
      lastFrame = 0;
      frame = requestAnimationFrame(animate);
    } else if (!active && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    if (!motion) tilting.forEach(([, target]) => clearTilt(target));
  }

  for (const [surface, target, angle] of tilting) {
    surface.addEventListener("pointermove", event => {
      if (!enabled() || !pointer.matches || event.pointerType === "touch") return;
      const bounds = surface.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - .5;
      const y = (event.clientY - bounds.top) / bounds.height - .5;
      target.style.setProperty("--rx", (-y * angle * 2).toFixed(2) + "deg");
      target.style.setProperty("--ry", (x * angle * 2).toFixed(2) + "deg");
    }, { passive: true });
    surface.addEventListener("pointerleave", () => clearTilt(target));
  }

  control.addEventListener("click", () => {
    preference = enabled() ? "off" : "on";
    try { localStorage.setItem("portfolio-motion", preference); } catch {}
    synchronize();
  });
  reduced.addEventListener("change", synchronize);
  document.addEventListener("visibilitychange", synchronize);
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    synchronize();
  }).observe(hero);

  resize();
  synchronize();
  control.hidden = false;
})();
