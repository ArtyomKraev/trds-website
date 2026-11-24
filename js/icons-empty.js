/* SVG из Paper: независимая глубина тарелки, персонажа, луча и звёзд. */
(() => {
  const scene = document.getElementById('icon-empty');
  if (!scene) return;
  const layers = [...scene.querySelectorAll('[data-parallax-layer]')].map((node) => ({
    node, x: Number(node.dataset.x), y: Number(node.dataset.y),
    angle: Number(node.dataset.angle), pivot: node.dataset.pivot,
  }));
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const current = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const velocity = { x: 0, y: 0 };
  let frame = 0;
  let previousTime = 0;

  function draw() {
    layers.forEach(({ node, x, y, angle, pivot }) => {
      node.setAttribute('transform', `translate(${(current.x * x).toFixed(3)} ${(current.y * y).toFixed(3)}) rotate(${(current.x * angle).toFixed(3)} ${pivot})`);
    });
  }

  function tick(time) {
    const dt = previousTime ? Math.min((time - previousTime) / 1000, 1 / 30) : 1 / 60;
    previousTime = time;
    let moving = false;
    for (const axis of ['x', 'y']) {
      velocity[axis] += ((target[axis] - current[axis]) * 180 - velocity[axis] * 24) * dt;
      current[axis] += velocity[axis] * dt;
      if (Math.abs(target[axis] - current[axis]) < .0005 && Math.abs(velocity[axis]) < .002) {
        current[axis] = target[axis];
        velocity[axis] = 0;
      } else moving = true;
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
    target.x = target.y = 0;
    if (instant || reducedMotion.matches || !mouse.matches || scene.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      current.x = current.y = velocity.x = velocity.y = 0;
      draw();
    } else start();
  }

  function track(event) {
    if (event.pointerType !== 'mouse' || !mouse.matches || reducedMotion.matches || scene.hidden || document.hidden) return;
    const box = scene.getBoundingClientRect();
    if (!box.width || !box.height) return;
    target.x = Math.max(-1, Math.min(1, (event.clientX - box.left) / box.width * 2 - 1));
    target.y = Math.max(-1, Math.min(1, (event.clientY - box.top) / box.height * 2 - 1));
    start();
  }

  scene.addEventListener('pointerenter', track);
  scene.addEventListener('pointermove', track);
  scene.addEventListener('pointerleave', () => reset());
  scene.addEventListener('pointercancel', () => reset(true));
  mouse.addEventListener('change', () => reset(true));
  reducedMotion.addEventListener('change', () => reset(true));
  ['blur', 'resize', 'scroll'].forEach((event) => window.addEventListener(event, () => reset(true), { passive: true }));
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(true); });
  // Возврат результатов поиска немедленно останавливает скрытую сцену.
  new MutationObserver(() => reset(true)).observe(scene, { attributes: true, attributeFilter: ['hidden'] });
  new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) reset(true);
  }).observe(scene);
})();
