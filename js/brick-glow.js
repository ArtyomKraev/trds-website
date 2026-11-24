/*
 * Ghost Brick Glow — своя реализация наблюдаемого эффекта на Canvas 2D.
 * Координаты объёмные: мышь поворачивает камеру, а не плоскую картинку.
 * Настройки, геометрия, отрисовка и управление временем разделены ниже.
 */
(() => {
  const canvas = document.querySelector('.brick-glow');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;

  // Значения из настроенного пользователем референса Vuesax.
  const settings = {
    speed: 0.7,
    count: 3,
    glow: 2.5,
    brickColor: '#0A69DA',
    glowColor: '#97C2FF',
    lineColor: '#00397F',
    pointer: 1,
    scroll: 1,
  };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const background = getComputedStyle(document.body).backgroundColor;
  const brickHeight = 1.2;
  const gap = 0.025;
  const cycle = 8.4;
  const yawBase = Math.PI / 4;
  const pitchBase = Math.atan(1 / Math.sqrt(2));
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let width = 0;
  let height = 0;
  let scale = 1;
  let centerX = 0;
  let centerY = 0;
  // Первый кадр уже показывает цветные детали, затем цикл продолжается.
  let elapsed = 3.4 / settings.speed;
  let lastTime = null;
  let frame = 0;
  let visible = true;
  let scroll = 0;

  /* Разреженные ступени, как в видимом референсе.
   * Каждая строка: x, y, число блоков в колонне.
   * Здесь можно редактировать композицию, не меняя код рисования.
   */
  const columns = [
    [-4, 3, 1], [-4, 2, 2], [-3, 1, 2], [-3, 3, 1],
    [-2, 1, 2], [-1, 1, 3], [0, -1, 4], [0, 0, 3],
    [1, 0, 2], [3, -2, 1], [4, -2, 1], [3, -1, 2],
    [4, -1, 2], [5, -1, 1], [4, 0, 1], [3, 0, 1],
    [0, 1, 1], [1, 2, 1], [-1, 2, 1],
  ];
  const bricks = columns.flatMap(([x, y, levels], column) =>
    Array.from({ length: levels }, (_, level) => ({
      x, y, z: level * brickHeight, column, level,
      top: level === levels - 1,
    })));
  const candidates = [5, 11, 6, 4, 12, 7, 1, 8];

  // Ортографическая камера. depth нужен для корректного перекрытия граней.
  function project(x, y, z, neutral = false) {
    const yaw = yawBase + (neutral ? 0 : pointer.x * 0.15 * settings.pointer);
    const pitch = pitchBase + (neutral ? 0 : pointer.y * 0.085 * settings.pointer + scroll * 0.025);
    const across = x * Math.cos(yaw) - y * Math.sin(yaw);
    const away = x * Math.sin(yaw) + y * Math.cos(yaw);
    return {
      x: across,
      y: away * Math.sin(pitch) - z * Math.cos(pitch),
      depth: away * Math.cos(pitch) + z * Math.sin(pitch),
    };
  }

  function screen(point) {
    const p = project(...point);
    return { x: width / 2 + (p.x - centerX) * scale,
      y: height / 2 + (p.y - centerY) * scale, depth: p.depth };
  }

  function path(points) {
    ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
  }

  // Смешивание цвета блока с белым даёт матовые светлые грани.
  function tint(hex, white = 0, brightness = 1) {
    const rgb = hex.match(/[a-f0-9]{2}/gi).map(value => parseInt(value, 16));
    return `rgb(${rgb.map(value => Math.round((value + (255 - value) * white) * brightness)).join(',')})`;
  }

  function drawFace(face) {
    const { points, lit, tone, opacity } = face;
    path(points);
    if (lit) {
      const ys = points.map(p => p.y);
      const gradient = ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys) + 1);
      const light = pointer.x * 0.035;
      gradient.addColorStop(0, tint(settings.brickColor, 0.09 + light, tone));
      gradient.addColorStop(0.6, tint(settings.brickColor, 0, tone * 0.85));
      gradient.addColorStop(1, tint(settings.brickColor, 0.13, tone));
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = background;
    }
    ctx.fill();

    // Внутренняя подсветка остаётся внутри каждой грани, контур — тонкий.
    if (lit) {
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = settings.glowColor;
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle = lit ? '#EDF5FF' : settings.lineColor;
    ctx.globalAlpha = lit ? 0.95 : opacity;
    ctx.lineWidth = lit ? 1.05 : 0.75;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Общая очередь граней обеспечивает перекрытия при повороте камеры.
  function addFace(scene, vertices, lit, tone, opacity) {
    const points = vertices.map(screen);
    scene.push({ points, lit, tone, opacity,
      depth: points.reduce((sum, p) => sum + p.depth, 0) / points.length });
  }

  function addBrick(scene, brick, lift, lit) {
    const x = brick.x + gap / 2;
    const y = brick.y + gap / 2;
    const z = brick.z + lift;
    const edge = 1 - gap;
    const top = z + brickHeight - gap;
    const opacity = 0.55 + brick.level * 0.14;
    addFace(scene, [[x, y + edge, top], [x + edge, y + edge, top],
      [x + edge, y + edge, z], [x, y + edge, z]], lit, 1, opacity);
    addFace(scene, [[x + edge, y, top], [x + edge, y + edge, top],
      [x + edge, y + edge, z], [x + edge, y, z]], lit, 0.82, opacity);
    addFace(scene, [[x, y, top], [x + edge, y, top],
      [x + edge, y + edge, top], [x, y + edge, top]], lit, 1.13, opacity);

    // Выступ — настоящий круг в плоскости XY: при наклоне меняется проекция.
    const topRing = [];
    const segments = 32;
    for (let i = 0; i < segments; i++) {
      const angle = i / segments * Math.PI * 2;
      const sx = x + edge / 2 + Math.cos(angle) * 0.235;
      const sy = y + edge / 2 + Math.sin(angle) * 0.235;
      topRing.push([sx, sy, top + 0.16]);
    }
    // Видимую стенку цилиндра рисуем единым силуэтом, без вертикальных полос.
    const yaw = yawBase + pointer.x * 0.15 * settings.pointer;
    const front = [];
    for (let i = 0; i <= segments / 2; i++) {
      const angle = yaw - Math.PI / 2 + i / (segments / 2) * Math.PI;
      front.push([x + edge / 2 + Math.cos(angle) * 0.235,
        y + edge / 2 + Math.sin(angle) * 0.235]);
    }
    addFace(scene, [...front.map(([sx, sy]) => [sx, sy, top + 0.16]),
      ...front.slice().reverse().map(([sx, sy]) => [sx, sy, top])], lit, 0.95, opacity);
    addFace(scene, topRing, lit, 1.16, opacity);
  }

  function state(index, time) {
    if (reducedMotion.matches) return { lift: 0 };
    const arrival = 0.35 + index * 1.05;
    const departure = 5.25 + index * 0.18;
    if (time < arrival || time > departure + 0.65) return null;
    return { lift: time < departure
      ? 12 * Math.exp(-(time - arrival) / 0.3)
      : 0.07 * (Math.exp((time - departure) / 0.1) - 1) };
  }

  function drawGlow(brick, lift) {
    const p = screen([brick.x + 0.5, brick.y + 0.5, brick.z + lift + 0.7]);
    const radius = scale * (1.2 + settings.glow * 0.15);
    const glow = ctx.createRadialGradient(p.x, p.y, scale * 0.25, p.x, p.y, radius);
    glow.addColorStop(0, settings.glowColor + '60');
    glow.addColorStop(0.5, settings.glowColor + '20');
    glow.addColorStop(1, settings.glowColor + '00');
    ctx.save();
    // Ореол только снаружи блока: он не высветляет синий материал до белого.
    const x = brick.x, y = brick.y, z = brick.z + lift;
    const top = z + brickHeight;
    const silhouette = [[x, y, top], [x + 1, y, top], [x + 1, y, z],
      [x + 1, y + 1, z], [x, y + 1, z], [x, y + 1, top]].map(screen);
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    silhouette.forEach((point, index) => index
      ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.closePath();
    ctx.clip('evenodd');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = glow;
    ctx.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const scene = [];
    const phase = elapsed * settings.speed;
    const round = Math.floor(phase / cycle);
    const active = [];
    for (let i = 0; i < settings.count; i++) {
      const motion = state(i, phase % cycle);
      if (!motion) continue;
      const column = candidates[(round * settings.count + i) % candidates.length];
      active.push({ brick: bricks.find(b => b.column === column && b.top), ...motion });
    }
    bricks.forEach(brick => {
      if (!active.some(item => item.brick === brick && item.lift < brickHeight)) {
        addBrick(scene, brick, 0, false);
      }
    });
    active.forEach(({ brick, lift }) => addBrick(scene, brick, lift, true));
    scene.sort((a, b) => a.depth - b.depth);
    scene.forEach(drawFace);
    active.forEach(({ brick, lift }) => drawGlow(brick, lift));
  }

  function tick(now) {
    const delta = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    elapsed += delta;
    const ease = 1 - Math.exp(-delta * 6);
    pointer.x += (pointer.targetX - pointer.x) * ease;
    pointer.y += (pointer.targetY - pointer.y) * ease;
    draw();
    frame = requestAnimationFrame(tick);
  }

  function updatePlayback() {
    cancelAnimationFrame(frame);
    lastTime = null;
    if (reducedMotion.matches) {
      pointer.x = pointer.y = scroll = 0;
      draw();
    } else if (!document.hidden && visible) {
      frame = requestAnimationFrame(tick);
    }
  }

  function resize() {
    const box = canvas.getBoundingClientRect();
    width = box.width;
    height = box.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Подгоняем камеру один раз по неподвижной геометрии: при движении нет скачков масштаба.
    const bounds = bricks.flatMap(b => [[b.x, b.y, b.z], [b.x + 1, b.y, b.z],
      [b.x, b.y + 1, b.z], [b.x + 1, b.y + 1, b.z],
      [b.x, b.y, b.z + brickHeight + 0.16]]).map(p => project(...p, true));
    const xs = bounds.map(p => p.x);
    const ys = bounds.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    centerX = (minX + maxX) / 2;
    centerY = (minY + maxY) / 2;
    scale = Math.min((width - 36) / (maxX - minX), (height - 44) / (maxY - minY));
    draw();
  }

  // Слушаем всю страницу: параллакс работает и когда курсор рядом с текстом.
  window.addEventListener('pointermove', event => {
    if (reducedMotion.matches || event.pointerType === 'touch') return;
    pointer.targetX = Math.max(-1, Math.min(1, event.clientX / innerWidth * 2 - 1));
    pointer.targetY = Math.max(-1, Math.min(1, event.clientY / innerHeight * 2 - 1));
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => {
    pointer.targetX = pointer.targetY = 0;
  });
  window.addEventListener('scroll', () => {
    if (!reducedMotion.matches) scroll = Math.min(scrollY / innerHeight, 1) * settings.scroll;
  }, { passive: true });
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updatePlayback();
  }).observe(canvas);
  document.addEventListener('visibilitychange', updatePlayback);
  reducedMotion.addEventListener('change', updatePlayback);
  resize();
  updatePlayback();
})();
