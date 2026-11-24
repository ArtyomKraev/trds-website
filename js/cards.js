/* Наклон по мотивам Bencho: край под курсором уходит вглубь, без затемнения. */
(() => {
  const cards = [...document.querySelectorAll('.card')];
  const grid = document.querySelector('.cards');
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const settings = { tilt: 10, depth: 14, stiffness: 180, damping: 24 };
  const resets = [];

  cards.forEach(card => {
    const surface = card.querySelector('.card__surface');
    // Широким карточкам задаём более спокойный наклон через data-атрибуты.
    const tilt = Number(card.dataset?.tilt ?? settings.tilt);
    const depth = Number(card.dataset?.depth ?? settings.depth);
    const current = { x: 0, y: 0, depth: 0 };
    const target = { x: 0, y: 0, depth: 0 };
    const velocity = { x: 0, y: 0, depth: 0 };
    let frame = 0;
    let previousTime = 0;

    function draw() {
      surface.style.setProperty('--card-rx', `${current.x.toFixed(3)}deg`);
      surface.style.setProperty('--card-ry', `${current.y.toFixed(3)}deg`);
      surface.style.setProperty('--card-depth', `${current.depth.toFixed(3)}px`);
    }

    // Пружина учитывает время кадра и останавливается после успокоения.
    function tick(time) {
      const dt = previousTime ? Math.min((time - previousTime) / 1000, 1 / 30) : 1 / 60;
      previousTime = time;
      let moving = false;

      for (const axis of Object.keys(current)) {
        const distance = target[axis] - current[axis];
        velocity[axis] += (distance * settings.stiffness - velocity[axis] * settings.damping) * dt;
        current[axis] += velocity[axis] * dt;
        if (Math.abs(target[axis] - current[axis]) < .005 && Math.abs(velocity[axis]) < .02) {
          current[axis] = target[axis];
          velocity[axis] = 0;
        } else {
          moving = true;
        }
      }

      draw();
      frame = moving ? requestAnimationFrame(tick) : 0;
    }

    function start() {
      if (frame) return;
      previousTime = 0;
      frame = requestAnimationFrame(tick);
    }

    function reset(instant = false) {
      card.classList.remove('is-hovered');
      target.x = target.y = target.depth = 0;
      if (instant) {
        cancelAnimationFrame(frame);
        frame = 0;
        for (const axis of Object.keys(current)) current[axis] = velocity[axis] = 0;
        draw();
      } else {
        start();
      }
    }

    function track(event) {
      if (!mouse.matches || reducedMotion.matches || document.hidden || event.pointerType !== 'mouse') return;
      // Измеряем неподвижную ссылку: вращение не меняет расчёт позиции мыши.
      const box = card.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (event.clientX - box.left) / box.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (event.clientY - box.top) / box.height * 2 - 1));
      target.x = -y * tilt;
      target.y = x * tilt;
      target.depth = -depth;
      card.classList.add('is-hovered');
      start();
    }

    card.addEventListener('pointerenter', track);
    card.addEventListener('pointermove', track);
    card.addEventListener('pointerleave', () => reset());
    card.addEventListener('pointercancel', () => reset(true));
    resets.push(reset);
  });

  // Скрытие вкладки, прокрутка и смена настроек не оставляют карточки наклонёнными.
  function resetAll() { resets.forEach(reset => reset(true)); }
  mouse.addEventListener('change', resetAll);
  reducedMotion.addEventListener('change', resetAll);
  window.addEventListener('blur', resetAll);
  window.addEventListener('resize', resetAll);
  window.addEventListener('scroll', resetAll, { passive: true });
  document.addEventListener('visibilitychange', () => {
    grid?.classList.toggle('is-paused', document.hidden);
    if (document.hidden) resetAll();
  });
})();
