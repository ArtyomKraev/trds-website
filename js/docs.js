/* Плавное раскрытие details. Без JS остаётся нативный аккордеон. */
(() => {
  const menu = document.querySelector('.docs-menu');
  if (!menu) return;
  const mobile = matchMedia('(max-width: 48rem)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const groups = [...menu.querySelectorAll('.nav-group')];
  const controls = new Map();

  // Нативное name закрывает соседей мгновенно; с JS закрываем их сами.
  groups.forEach(group => group.removeAttribute('name'));

  [menu, ...groups].forEach(details => {
    const summary = details.querySelector(':scope > summary');
    const content = summary.nextElementSibling;
    let expanded = details.open;
    let animation;

    function finish() {
      animation?.cancel();
      animation = null;
      details.open = expanded;
      details.style.height = '';
      details.style.overflow = '';
    }

    function setExpanded(next, instant = false) {
      const from = details.getBoundingClientRect().height;
      animation?.cancel();
      animation = null;
      expanded = next;
      details.dataset.expanded = String(next);
      summary.setAttribute('aria-expanded', String(next));
      if (!next && content.contains(document.activeElement)) summary.focus();
      content.inert = !next;

      if (instant || reducedMotion.matches) {
        finish();
        return;
      }

      // Держим содержимое до конца закрытия, в том числе при смене направления.
      details.open = true;
      details.style.height = '';
      const to = next ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height;
      details.style.overflow = 'hidden';
      details.style.height = `${to}px`;
      animation = details.animate(
        [{ height: `${from}px` }, { height: `${to}px` }],
        { duration: 300, easing: 'cubic-bezier(.2, .7, .2, 1)' }
      );
      animation.onfinish = finish;
    }

    controls.set(details, { setExpanded, finish, isExpanded: () => expanded });
    setExpanded(expanded, true);
    summary.addEventListener('click', event => {
      if (details === menu && !mobile.matches) return;
      event.preventDefault();
      const next = !expanded;
      if (next && details !== menu) {
        groups.forEach(group => {
          const other = controls.get(group);
          if (group !== details && other.isExpanded()) other.setExpanded(false);
        });
      }
      setExpanded(next);
    });
  });

  function setLayout() { controls.get(menu).setExpanded(!mobile.matches, true); }
  setLayout();
  mobile.addEventListener('change', setLayout);
  // При изменении размеров возвращаем естественную высоту, чтобы текст не обрезался.
  window.addEventListener('resize', () => controls.forEach(control => control.finish()));
  reducedMotion.addEventListener('change', () => controls.forEach(control => control.finish()));
})();
