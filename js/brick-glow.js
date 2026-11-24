/*
 * Светящиеся блоки: собственная Canvas 2D-сцена по мотивам Ghost Brick Glow.
 * Без сторонних библиотек. Ниже по порядку: геометрия, рисование, время.
 */
(() => {
  const canvas = document.querySelector('.brick-glow');
  const context = canvas?.getContext('2d');
  if (!context) return;

  // Эти параметры можно менять, не разбираясь в формулах проекции.
  const settings = {
    layers: 4,
    brickHeight: 1.12,
    layerStep: 1.2,
    cycleSeconds: 9,
    arrivalGap: 1.05,
    launchTime: 5.6,
  };
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const pageColor = getComputedStyle(document.body).backgroundColor;
  const slots = [];
  let width = 0;
  let height = 0;
  let unit = 1;
  let originY = 0;
  let frameId = 0;
  let elapsed = 0;
  let previousTime = null;
  let inView = true;

  // Слои 4×4, 3×3, 2×2 и 1×1. Каждый верхний слой смещён к центру.
  for (let layer = 0; layer < settings.layers; layer++) {
    const side = settings.layers - layer;
    for (let row = 0; row < side; row++) {
      for (let column = 0; column < side; column++) {
        slots.push({
          x: column - side / 2,
          y: row - side / 2,
          z: layer * settings.layerStep,
          layer,
        });
      }
    }
  }

  // Четыре хорошо видимых места на ступенях, включая верхушку.
  const activeSlots = [15, 24, 28, 29];

  // Ортографическая изометрия: параллельные рёбра остаются параллельными.
  function project(x, y, z) {
    return {
      x: width / 2 + (x - y) * Math.SQRT1_2 * unit,
      y: originY + ((x + y) / Math.sqrt(6) - z * Math.sqrt(2 / 3)) * unit,
    };
  }

  function polygon(points) {
    context.beginPath();
    points.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
  }

  function face(points, lit, tone, opacity) {
    polygon(points);
    if (lit) {
      const top = Math.min(...points.map(point => point.y));
      const bottom = Math.max(...points.map(point => point.y));
      const gradient = context.createLinearGradient(0, top, 0, bottom + 1);
      gradient.addColorStop(0, `rgba(${tone}, ${tone + 3}, ${tone + 7}, ${opacity})`);
      gradient.addColorStop(1, `rgba(${tone - 40}, ${tone - 34}, ${tone - 22}, ${opacity})`);
      context.fillStyle = gradient;
      context.strokeStyle = `rgba(245, 248, 255, ${opacity * .9})`;
    } else {
      // Непрозрачная заливка цветом страницы скрывает рёбра дальних блоков.
      context.fillStyle = pageColor;
      context.strokeStyle = `rgba(150, 151, 160, ${opacity})`;
    }
    context.fill();
    context.lineWidth = .8;
    context.stroke();
  }

  function drawBrick(brick, lift = 0, lit = false, opacity = 1) {
    const { x, y, layer } = brick;
    const z = brick.z + lift;
    const size = .94;
    const topZ = z + settings.brickHeight;
    const a = project(x, y, topZ);
    const b = project(x + size, y, topZ);
    const c = project(x + size, y + size, topZ);
    const d = project(x, y + size, topZ);
    const bottomB = project(x + size, y, z);
    const bottomC = project(x + size, y + size, z);
    const bottomD = project(x, y + size, z);
    const lineOpacity = lit ? opacity : .17 + layer * .065;

    // Мягкий ореол рисуется отдельно: грани остаются резкими и читаемыми.
    if (lit) {
      context.save();
      context.shadowColor = `rgba(217, 230, 255, ${opacity * .65})`;
      context.shadowBlur = 20;
      context.fillStyle = `rgba(230, 238, 255, ${opacity * .18})`;
      polygon([a, b, bottomB, bottomC, bottomD, d]);
      context.fill();
      context.restore();
    }

    face([d, c, bottomC, bottomD], lit, 205, lineOpacity);
    face([b, c, bottomC, bottomB], lit, 170, lineOpacity);
    face([a, b, c, d], lit, 242, lineOpacity);

    // Круглый выступ: две эллиптические кромки и соединяющая их стенка.
    const studBottom = project(x + size / 2, y + size / 2, topZ);
    const studTop = project(x + size / 2, y + size / 2, topZ + .17);
    const radiusX = unit * .245;
    const radiusY = radiusX / Math.sqrt(3);
    context.beginPath();
    context.ellipse(studTop.x, studTop.y, radiusX, radiusY, 0, Math.PI, 0);
    context.lineTo(studBottom.x + radiusX, studBottom.y);
    context.ellipse(studBottom.x, studBottom.y, radiusX, radiusY, 0, 0, Math.PI);
    context.closePath();
    context.fillStyle = lit ? `rgba(193, 202, 216, ${opacity})` : pageColor;
    context.fill();
    context.stroke();
    context.beginPath();
    context.ellipse(studTop.x, studTop.y, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.fillStyle = lit ? `rgba(245, 248, 252, ${opacity})` : pageColor;
    context.fill();
    context.stroke();
  }

  // Падение замедляется у цели; вылет, наоборот, быстро ускоряется.
  function animationState(index, time) {
    if (motionPreference.matches) return { lift: 0, opacity: index < 3 ? 1 : 0 };
    const arrival = .4 + index * settings.arrivalGap;
    const departure = settings.launchTime + index * .18;
    if (time < arrival || time > departure + .65) return { lift: 0, opacity: 0 };
    if (time < departure) {
      return { lift: 10 * Math.exp(-(time - arrival) / .24), opacity: 1 };
    }
    return { lift: .07 * (Math.exp((time - departure) / .1) - 1), opacity: 1 };
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    const time = elapsed % settings.cycleSeconds;
    const scene = slots.map((brick, index) => ({ brick, index, lift: 0, lit: false }));
    activeSlots.forEach((slotIndex, index) => {
      const state = animationState(index, time);
      if (state.opacity) scene.push({ brick: slots[slotIndex], ...state, lit: true });
    });

    // Painter's algorithm: сначала дальние детали, потом ближние.
    // У осевших светящихся деталей скрываем их контурную копию.
    const settled = new Set(scene.filter(item => item.lit && item.lift < .01).map(item => item.brick));
    scene.sort((a, b) => (a.brick.x + a.brick.y + a.brick.z + a.lift)
      - (b.brick.x + b.brick.y + b.brick.z + b.lift) || Number(a.lit) - Number(b.lit));
    scene.forEach(item => {
      if (!item.lit && settled.has(item.brick)) return;
      drawBrick(item.brick, item.lift, item.lit, item.opacity);
    });
  }

  function tick(now) {
    if (previousTime !== null) elapsed += Math.min((now - previousTime) / 1000, .05);
    previousTime = now;
    draw();
    frameId = requestAnimationFrame(tick);
  }

  // В скрытой вкладке и за пределами экрана не тратим время на анимацию.
  function updatePlayback() {
    cancelAnimationFrame(frameId);
    previousTime = null;
    if (!motionPreference.matches && !document.hidden && inView) {
      frameId = requestAnimationFrame(tick);
    } else {
      draw();
    }
  }

  function resize() {
    const box = canvas.getBoundingClientRect();
    width = box.width;
    height = box.height;
    const pixelRatio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    unit = Math.min(width / 6.5, (height - 38) / 5.72);
    originY = height - 16 - 1.633 * unit;
    draw();
  }

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    updatePlayback();
  }).observe(canvas);
  motionPreference.addEventListener('change', updatePlayback);
  document.addEventListener('visibilitychange', updatePlayback);
  resize();
  updatePlayback();
})();
