// Распадается только видимая строка; содержимое выбранных файлов не читается.
(() => {
  const active = new Map();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clear = (surface) => {
    for (const [canvas, effect] of active) {
      if (!surface || effect.surface === surface) effect.stop();
    }
  };
  const dissolve = (row, surface) => {
    if (reduced.matches || document.hidden) return;
    const box = row.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const source = document.createElement('canvas');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    source.width = Math.ceil(box.width * dpr);
    source.height = Math.ceil(box.height * dpr);
    const ink = source.getContext('2d', { willReadFrequently: true });
    if (!ink) return;
    ink.scale(dpr, dpr);
    row.querySelectorAll('.upload-file__name, .upload-file__size').forEach((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      ink.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      ink.fillStyle = style.color;
      let text = node.textContent;
      if (ink.measureText(text).width > rect.width) {
        const letters = Array.from(text);
        while (letters.length && ink.measureText(letters.join('') + '…').width > rect.width) letters.pop();
        text = letters.join('') + '…';
      }
      const metrics = ink.measureText(text);
      const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
      const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
      ink.fillText(text, rect.left - box.left, rect.top - box.top + (rect.height - ascent - descent) / 2 + ascent);
    });
    row.querySelectorAll('svg').forEach((svg) => {
      const rect = svg.getBoundingClientRect();
      const view = svg.viewBox.baseVal;
      ink.save();
      ink.translate(rect.left - box.left, rect.top - box.top);
      ink.scale(rect.width / view.width, rect.height / view.height);
      ink.translate(-view.x, -view.y);
      svg.querySelectorAll('path').forEach((path) => {
        ink.fillStyle = getComputedStyle(path).fill;
        ink.fill(new Path2D(path.getAttribute('d')), path.getAttribute('fill-rule') || 'nonzero');
      });
      ink.restore();
    });
    const pixels = ink.getImageData(0, 0, source.width, source.height).data;
    const particles = [];
    const step = Math.max(1, Math.round(dpr * 2));
    for (let y = 0; y < source.height; y += step) {
      for (let x = 0; x < source.width; x += step) {
        const i = (y * source.width + x) * 4;
        if (pixels[i + 3] < 30) continue;
        particles.push({ x: x / dpr, y: y / dpr,
          color: `rgb(${pixels[i]},${pixels[i + 1]},${pixels[i + 2]})`, alpha: pixels[i + 3] / 255,
          delay: (1 - x / source.width) * 300, dx: 25 + Math.random() * 70,
          dy: -10 - Math.random() * 22, wave: Math.random() * Math.PI * 2,
          size: .8 + Math.random() * 1.3 });
      }
    }
    if (!particles.length) return;
    // Ограничиваем нагрузку даже при быстром удалении нескольких файлов подряд.
    if (active.size >= 3) active.values().next().value.stop();
    const canvas = document.createElement('canvas');
    canvas.className = 'upload-dust';
    canvas.setAttribute('aria-hidden', 'true');
    const stage = surface.getBoundingClientRect();
    const width = Math.ceil(box.width + 124), height = Math.ceil(box.height + 120);
    Object.assign(canvas.style, { left: `${box.left - stage.left - 24}px`, top: `${box.top - stage.top - 80}px`, width: `${width}px`, height: `${height}px` });
    canvas.width = Math.ceil(width * dpr);
    canvas.height = Math.ceil(height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    // Частицы не заходят на зону загрузки и соседние строки.
    ctx.beginPath();
    ctx.rect(0, 76, width, box.height + 8);
    ctx.clip();
    let frame = 0;
    const stop = () => { cancelAnimationFrame(frame); canvas.remove(); active.delete(canvas); };
    active.set(canvas, { surface, stop });
    surface.append(canvas);
    const start = performance.now();
    const draw = (now) => {
      const elapsed = now - start;
      if (elapsed >= 950 || !surface.isConnected) { stop(); return; }
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = 1;
      const intact = Math.max(0, 1 - elapsed / 300) * box.width;
      if (intact > 0) ctx.drawImage(source, 0, 0, intact * dpr, source.height, 24, 80, intact, box.height);
      for (const particle of particles) {
        const t = (elapsed - particle.delay) / 650;
        if (t < 0 || t >= 1) continue;
        const drift = t * t;
        ctx.globalAlpha = particle.alpha * (1 - t) ** 1.3;
        ctx.fillStyle = particle.color;
        const x = 24 + particle.x + particle.dx * drift;
        const y = 80 + particle.y + particle.dy * t + Math.sin(t * 5 + particle.wave) * t * 5;
        const size = particle.size * (1 - t * .5);
        ctx.fillRect(x, y, size, size);
      }
      frame = requestAnimationFrame(draw);
    };
    draw(start);
    return true;
  };
  reduced.addEventListener('change', () => { if (reduced.matches) clear(); });
  window.addEventListener('resize', () => clear());
  window.addEventListener('pagehide', () => clear());
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  window.TRDSUploadDust = { dissolve, clear };
})();
