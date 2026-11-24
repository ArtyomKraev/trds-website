/*
 * Живая сетка точек по мотивам фона bencho.dev, без библиотек.
 * Свет медленно проходит по сетке; мышь притягивает точки, клик даёт волну.
 */
(() => {
  const canvas = document.querySelector('.dot-field');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;

  // Основные ручки настройки эффекта, все размеры в CSS-пикселях.
  const settings = {
    spacing: 20,
    radius: 0.75,
    color: '200, 201, 202',
    brightness: 0.5,
    idleReach: 230,
    mouseReach: 130,
    attraction: 9,
    idleSpeed: 0.16,
    trailSeconds: 0.85,
  };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mouse = { x: 0, y: 0, inside: false, lastMove: -10 };
  let points = [];
  let ripples = [];
  let width = 0;
  let height = 0;
  let time = 0;
  let lastFrame = null;
  let frame = 0;
  let visible = true;

  function rebuildGrid() {
    const box = canvas.getBoundingClientRect();
    width = box.width;
    height = box.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    points = [];
    const startX = (width % settings.spacing + settings.spacing) / 2;
    const startY = (height % settings.spacing + settings.spacing) / 2;
    for (let y = startY; y < height; y += settings.spacing) {
      for (let x = startX; x < width; x += settings.spacing) {
        points.push({ x, y, offsetX: 0, offsetY: 0, velocityX: 0, velocityY: 0, light: 0 });
      }
    }
    draw(0);
  }

  // Два световых пятна идут по краям. После движения мыши уступают ей место.
  function lightSources() {
    const useMouse = !reducedMotion.matches && mouse.inside && time - mouse.lastMove < 1.2;
    if (useMouse) return [{ x: mouse.x, y: mouse.y, reach: settings.mouseReach }];
    const angle = reducedMotion.matches ? -0.5 : time * settings.idleSpeed - 0.5;
    return [0, Math.PI].map(phase => ({
      x: width * (0.5 + Math.cos(angle + phase) * 0.39),
      y: height * (0.5 + Math.sin(angle + phase) * 0.34),
      reach: Math.min(settings.idleReach, width * 0.45),
    }));
  }

  function draw(delta) {
    ctx.clearRect(0, 0, width, height);
    const lights = lightSources();
    ripples = ripples.filter(ripple => time - ripple.started < 0.9);

    for (const point of points) {
      let targetX = 0;
      let targetY = 0;
      let light = 0;
      let wave = 0;

      for (const source of lights) {
        const dx = source.x - point.x;
        const dy = source.y - point.y;
        const distance = Math.hypot(dx, dy);
        const influence = Math.max(0, 1 - distance / source.reach) ** 2;
        light = Math.max(light, influence);
        if (distance > 0 && !reducedMotion.matches) {
          const pull = influence * settings.attraction * Math.min(1, distance / 24);
          targetX += dx / distance * pull;
          targetY += dy / distance * pull;
        }
      }

      // Волна расходится от места клика и плавно гаснет меньше чем за секунду.
      for (const ripple of ripples) {
        const age = (time - ripple.started) / 0.9;
        const radius = 90 * (1 - (1 - age) ** 3);
        const dx = point.x - ripple.x;
        const dy = point.y - ripple.y;
        const distance = Math.hypot(dx, dy);
        const strength = Math.exp(-(((distance - radius) / 20) ** 2)) * (1 - age) ** 1.5;
        wave = Math.max(wave, strength);
        if (distance > 0) {
          targetX += dx / distance * strength * 3;
          targetY += dy / distance * strength * 3;
        }
      }

      // Пружина возвращает точку в исходную ячейку, а след света затухает отдельно.
      if (delta > 0 && !reducedMotion.matches) {
        const stiffness = 225;
        const damping = 17;
        point.velocityX += ((targetX - point.offsetX) * stiffness - point.velocityX * damping) * delta;
        point.velocityY += ((targetY - point.offsetY) * stiffness - point.velocityY * damping) * delta;
        point.offsetX += point.velocityX * delta;
        point.offsetY += point.velocityY * delta;
        point.light = Math.max(light, wave, point.light * Math.exp(-delta / settings.trailSeconds));
      } else {
        point.light = light;
      }

      // Мягкое исчезновение у границ скрывает прямоугольную форму canvas.
      const edge = Math.min(1, point.x / 48, (width - point.x) / 48,
        point.y / 48, (height - point.y) / 64);
      const opacity = point.light * settings.brightness * Math.max(0, edge);
      if (opacity < 0.012) continue;
      ctx.fillStyle = `rgba(${settings.color}, ${opacity})`;
      ctx.beginPath();
      ctx.arc(point.x + point.offsetX, point.y + point.offsetY,
        settings.radius * (1 + light * 0.25 + wave * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function tick(now) {
    const delta = lastFrame === null ? 0 : Math.min((now - lastFrame) / 1000, 0.033);
    lastFrame = now;
    time += delta;
    draw(delta);
    frame = requestAnimationFrame(tick);
  }

  function updatePlayback() {
    cancelAnimationFrame(frame);
    lastFrame = null;
    if (reducedMotion.matches) {
      ripples = [];
      points.forEach(point => {
        point.offsetX = point.offsetY = point.velocityX = point.velocityY = 0;
      });
      draw(0);
    } else if (!document.hidden && visible) {
      frame = requestAnimationFrame(tick);
    }
  }

  function pointerPosition(event) {
    const box = canvas.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    return { x, y, inside: x >= 0 && y >= 0 && x <= width && y <= height };
  }

  window.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || reducedMotion.matches) return;
    Object.assign(mouse, pointerPosition(event), { lastMove: time });
  }, { passive: true });
  window.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || reducedMotion.matches) return;
    const position = pointerPosition(event);
    if (position.inside) ripples.push({ ...position, started: time });
    ripples = ripples.slice(-6);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { mouse.inside = false; });
  window.addEventListener('blur', () => { mouse.inside = false; });
  window.addEventListener('scroll', () => { mouse.inside = false; }, { passive: true });
  document.addEventListener('visibilitychange', updatePlayback);
  reducedMotion.addEventListener('change', updatePlayback);
  new ResizeObserver(rebuildGrid).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updatePlayback();
  }).observe(canvas);
  rebuildGrid();
  updatePlayback();
})();
