// Прогрессивные вкладки: без скрипта ссылки ведут к видимым разделам.
document.querySelectorAll('[data-tabs]').forEach((widget) => {
  const list = widget.querySelector('[data-tab-list]');
  const tabs = [...list.querySelectorAll('[data-tab]')];
  const panels = tabs.map((tab) => document.getElementById(tab.hash.slice(1)));
  if (panels.some((panel) => !panel)) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const isGrid = widget.classList.contains('grid-widget');
  const isPalette = widget.hasAttribute('data-palette');
  const indicator = document.createElement('span');
  indicator.className = 'foundation-tabs__indicator';
  indicator.setAttribute('aria-hidden', 'true');
  list.append(indicator);
  let displayed = -1;
  let requested = -1;
  let selected = -1;
  let running = false;
  let generation = 0;
  let themeTransition = null;
  let revealOrigin = null;
  const animations = new Set();

  const moveIndicator = () => {
    if (selected < 0) return;
    const tab = tabs[selected].getBoundingClientRect();
    const track = list.getBoundingClientRect();
    indicator.style.width = `${tab.width}px`;
    indicator.style.transform = `translateX(${tab.left - track.left}px)`;
  };

  const selectTab = (index) => {
    selected = index;
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    moveIndicator();
  };

  const cancelAnimations = () => {
    animations.forEach((animation) => animation.cancel());
    animations.clear();
  };

  const showPanel = (index) => {
    panels.forEach((panel, i) => {
      panel.hidden = i !== index;
      panel.inert = i !== index;
      if (i === index) panel.removeAttribute('aria-hidden');
      else panel.setAttribute('aria-hidden', 'true');
    });
    displayed = index;
    if (isPalette) {
      document.body.dataset.theme = panels[index].dataset.paletteTheme;
      document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.body).getPropertyValue('--color-surface-page').trim();
    }
  };

  const play = (elements, frames, options) => Promise.allSettled([...elements].map((element) => {
    const animation = element.animate(frames, { fill: 'both', ...options });
    animations.add(animation);
    return animation.finished;
  }));

  const settle = () => {
    generation += 1;
    themeTransition?.skipTransition();
    themeTransition = null;
    document.documentElement.removeAttribute('data-theme-reveal');
    cancelAnimations();
    selectTab(requested);
    showPanel(requested);
    running = false;
  };

  // Снимок новой темы раскрывается поверх старой от точки клика до дальнего угла.
  // В маску попадает вся страница: фон, меню, текст и сами образцы палитры.
  const revealTheme = async () => {
    running = true;
    const run = ++generation;
    const root = document.documentElement;
    while (displayed !== requested) {
      const index = requested;
      const { x, y } = revealOrigin;
      const radius = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))) + 2;
      root.setAttribute('data-theme-reveal', '');
      const reveal = document.startViewTransition(() => {
        if (run !== generation) return;
        selectTab(index);
        showPanel(index);
      });
      themeTransition = reveal;
      try {
        await reveal.ready;
        if (run !== generation) return;
        const wave = root.animate([
          { clipPath: `circle(0px at ${x}px ${y}px)` },
          { clipPath: `circle(${radius}px at ${x}px ${y}px)` },
        ], {
          duration: 820,
          easing: 'cubic-bezier(.18, .65, .3, 1)',
          fill: 'both',
          pseudoElement: '::view-transition-new(root)',
        });
        animations.add(wave);
        await reveal.finished;
      } catch {
        // Браузер может пропустить снимок, например при уходе в другую вкладку.
        await reveal.updateCallbackDone.catch(() => {});
      } finally {
        if (run === generation) {
          cancelAnimations();
          themeTransition = null;
          root.removeAttribute('data-theme-reveal');
        }
      }
      if (run !== generation) return;
    }
    running = false;
  };

  // Две половины переворота: меняем SVG на ребре, не показывая зеркальный текст.
  // Частые клики объединяются в последний запрос, не обрывая текущий поворот.
  const transition = async () => {
    running = true;
    const run = ++generation;
    while (displayed !== requested) {
      const direction = requested > displayed ? 1 : -1;
      const previous = panels[displayed];
      const previousHeight = previous.getBoundingClientRect().height;
      previous.inert = true;
      previous.setAttribute('aria-hidden', 'true');
      const stages = previous.querySelectorAll('.grid-stage');
      const captions = previous.querySelectorAll('.grid-example h2, .grid-metrics');
      await Promise.all([
        play(isGrid ? stages : [previous], isGrid ? [
          { transform: 'perspective(1200px) rotateY(0deg)' },
          { transform: `perspective(1200px) rotateY(${-90 * direction}deg)` },
        ] : [
          { opacity: 1, transform: 'translateX(0)' },
          { opacity: 0, transform: `translateX(${-12 * direction}px)` },
        ], { duration: isGrid ? 220 : 140, easing: 'cubic-bezier(.55, 0, 1, .45)' }),
        play(captions, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in' }),
      ]);
      if (run !== generation) return;
      cancelAnimations();
      showPanel(requested);
      const current = panels[displayed];
      const currentHeight = current.getBoundingClientRect().height;
      await Promise.all([
        play(isGrid ? current.querySelectorAll('.grid-stage') : [current], isGrid ? [
          { transform: `perspective(1200px) rotateY(${90 * direction}deg)` },
          { transform: 'perspective(1200px) rotateY(0deg)' },
        ] : [
          { opacity: 0, transform: `translateX(${12 * direction}px)` },
          { opacity: 1, transform: 'translateX(0)' },
        ], { duration: isGrid ? 360 : 260, easing: 'cubic-bezier(.16, 1, .3, 1)' }),
        play(current.querySelectorAll('.grid-example h2, .grid-metrics'), [
          { opacity: 0, transform: `translateX(${12 * direction}px)` },
          { opacity: 1, transform: 'translateX(0)' },
        ], { duration: 300, easing: 'cubic-bezier(.22, 1, .36, 1)' }),
        // На телефоне высота схем отличается; футер тоже перемещается плавно.
        ...(isGrid && Math.abs(previousHeight - currentHeight) > 1 ? [play([current], [
          { height: `${previousHeight}px` }, { height: `${currentHeight}px` },
        ], { duration: 360, easing: 'cubic-bezier(.22, 1, .36, 1)' })] : []),
      ]);
      if (run !== generation) return;
      cancelAnimations();
    }
    running = false;
  };

  const activate = (index, focus = false, point = null) => {
    requested = index;
    const bounds = tabs[index].getBoundingClientRect();
    revealOrigin = point || { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    if (focus) tabs[index].focus();
    if (displayed < 0 || reducedMotion.matches || !Element.prototype.animate) settle();
    else if (isPalette && document.startViewTransition) {
      if (!running) void revealTheme();
    } else {
      selectTab(index);
      if (!running) void transition();
    }
  };

  list.setAttribute('role', 'tablist');
  tabs.forEach((tab, index) => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panels[index].id);
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].setAttribute('aria-labelledby', tab.id);
    panels[index].tabIndex = 0;
    tab.addEventListener('click', (event) => {
      event.preventDefault();
      activate(index, false, event.detail > 0 ? { x: event.clientX, y: event.clientY } : null);
    });
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (event.key === ' ') next = index;
      if (next === undefined) return;
      event.preventDefault();
      activate(next, true);
    });
  });
  widget.setAttribute('data-tabs-ready', '');
  const fromHash = tabs.findIndex((tab) => tab.hash === location.hash);
  activate(fromHash >= 0 ? fromHash : 0);
  // Сначала ставим линию под стартовой вкладкой, затем разрешаем скольжение.
  requestAnimationFrame(() => requestAnimationFrame(() => list.setAttribute('data-indicator-ready', '')));
  const observer = new ResizeObserver(moveIndicator);
  observer.observe(list);
  tabs.forEach((tab) => observer.observe(tab));
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) settle();
  });
  // При смене ширины не сохраняем промежуточную высоту от старой раскладки.
  window.addEventListener('resize', () => {
    if (running) settle();
    moveIndicator();
  });
});
