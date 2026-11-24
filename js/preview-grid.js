// Постоянная тихая сетка; RAF работает только во время движения и затухания мыши.
document.querySelectorAll('.playground__preview').forEach((surface) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.className = 'preview-grid';
  canvas.setAttribute('aria-hidden', 'true');
  surface.prepend(canvas);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0, height = 0, frame = 0, lastTime = 0, visible = true;
  let x = 0, y = 0, targetX = 0, targetY = 0, glow = 0, targetGlow = 0;
  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    for (let py = 10; py < height; py += 20) {
      for (let px = 10; px < width; px += 20) {
        const dx = x - px, dy = y - py;
        const distance = Math.hypot(dx, dy);
        const influence = Math.max(0, 1 - distance / 130) ** 2 * glow;
        const pull = distance ? influence * 3 / Math.max(distance, 24) : 0;
        ctx.fillStyle = `rgba(200,201,202,${.10 + influence * .20})`;
        ctx.beginPath();
        ctx.arc(px + dx * pull, py + dy * pull, .75 + influence * .15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
  const tick = (now) => {
    frame = 0;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, .05) : 1 / 60;
    lastTime = now;
    const movement = 1 - Math.exp(-dt / .07);
    x += (targetX - x) * movement;
    y += (targetY - y) * movement;
    glow += (targetGlow - glow) * (1 - Math.exp(-dt / .14));
    draw();
    if (Math.abs(targetX - x) + Math.abs(targetY - y) > .05 || Math.abs(targetGlow - glow) > .001) start();
    else lastTime = 0;
  };
  const start = () => {
    if (!frame && !reduced.matches && visible && !document.hidden) frame = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = lastTime = glow = targetGlow = 0;
    draw();
  };
  new ResizeObserver(() => {
    width = surface.clientWidth;
    height = surface.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    surface.dataset.gridReady = '';
    draw();
  }).observe(surface);
  surface.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || reduced.matches) return;
    const box = surface.getBoundingClientRect();
    targetX = event.clientX - box.left;
    targetY = event.clientY - box.top;
    if (!glow) { x = targetX; y = targetY; }
    targetGlow = 1;
    start();
  }, { passive: true });
  surface.addEventListener('pointerleave', () => { targetGlow = 0; start(); });
  window.addEventListener('blur', stop);
  window.addEventListener('scroll', stop, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  reduced.addEventListener('change', stop);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) stop();
  }).observe(surface);
});
