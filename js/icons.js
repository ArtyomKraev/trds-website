/* Каталог работает с оригинальными SVG TRDS; в DOM одновременно только 20 плиток. */
(() => {
  const grid = document.getElementById('icon-grid');
  if (!grid) return;
  const labels = {
    Arrows: 'Стрелки', Actions: 'Действия', Data: 'Данные', Signs: 'Знаки', Human: 'Пользователи',
    Time: 'Время', 'Text & Editing': 'Текст и редактирование', 'Communication & Calls': 'Общение и звонки',
    'Media & Devices': 'Медиа и устройства', Objects: 'Объекты', 'Weather & Nature': 'Погода и природа',
    'Transport & Travel': 'Транспорт и путешествия', Commerce: 'Торговля', Layout: 'Компоновка',
    'Health & Medicine': 'Здоровье и медицина', 'Security & Privacy': 'Безопасность',
  };
  const aliases = {
    angle: 'угол шеврон стрелка', arrow: 'стрелка', arrows: 'стрелки', up: 'вверх', down: 'вниз',
    left: 'влево левый', right: 'вправо правый', check: 'галочка проверка', times: 'крестик закрыть',
    plus: 'плюс добавить', minus: 'минус убрать', cloud: 'облако облачный', upload: 'загрузка загрузить',
    download: 'скачать скачивание', calendar: 'календарь дата', search: 'поиск найти', filter: 'фильтр',
    user: 'пользователь профиль', users: 'пользователи группа', envelope: 'письмо почта', link: 'ссылка',
    file: 'файл документ', folder: 'папка', edit: 'редактировать карандаш', copy: 'копировать копия',
    trash: 'корзина удалить', bell: 'колокол уведомления', setting: 'настройки шестерёнка',
    heart: 'сердце избранное', star: 'звезда избранное', lock: 'замок закрыто', unlock: 'открыто',
    home: 'дом главная', phone: 'телефон звонок', camera: 'камера фото', image: 'изображение картинка',
    clock: 'часы время', play: 'играть воспроизведение', pause: 'пауза', stop: 'стоп', eye: 'глаз просмотр',
    save: 'сохранить', share: 'поделиться', print: 'печать принтер', info: 'информация', question: 'вопрос помощь',
  };
  const normalize = (text) => text.toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const shortName = (icon) => icon.name.split('/').at(-1);
  const sourceLink = (icon) => `https://www.figma.com/design/TDEt0QXn8xkQihCoXz4Jzx?node-id=${icon.id.replace(':', '-')}`;
  const formatCount = (number) => new Intl.NumberFormat('ru-RU').format(number);
  const complete = Array.isArray(window.TRDS_ICONS) && window.TRDS_ICONS.length > 0;
  // При недоступном файле данных остаются 20 встроенных образцов и их действия.
  const icons = complete ? window.TRDS_ICONS : [...grid.querySelectorAll('[data-icon-id]')].map((tile) => ({
    id: tile.dataset.iconId, name: tile.dataset.iconName, category: tile.dataset.iconCategory,
    svg: tile.querySelector('svg').outerHTML.replace(/ (?:aria-hidden|focusable)="[^"]*"/g, '').replace(/width="32" height="32"/, 'width="24" height="24"'),
  }));
  const byId = new Map(icons.map((icon) => [icon.id, icon]));
  const searchText = new Map(icons.map((icon) => [icon.id, normalize([
    icon.name, labels[icon.category], ...shortName(icon).toLowerCase().split(/\W+/).map((word) => aliases[word] || ''),
  ].join(' '))]));
  const search = document.getElementById('icon-search');
  const filters = document.querySelector('.icon-filters');
  const track = document.querySelector('.icon-category-track');
  const categoryButtons = [...document.querySelectorAll('[data-category]')];
  const more = document.getElementById('icon-more-toggle');
  const moreMenu = document.getElementById('icon-more-menu');
  const indicator = document.querySelector('.icon-category-indicator');
  const inspector = document.getElementById('icon-inspector');
  const heading = document.getElementById('icon-name');
  const preview = document.getElementById('icon-preview');
  const copyButtons = [...document.querySelectorAll('[data-icon-copy]')];
  const status = document.getElementById('icon-copy-status');
  const previous = document.getElementById('icon-previous');
  const next = document.getElementById('icon-next');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const PAGE_SIZE = 20;
  let category = 'all';
  let pageIndex = 0;
  let selected = byId.get('81:3100') || icons[0];
  let matching = icons;
  let selectionVersion = 0;
  const copyTimers = new Map();
  let announceTimer;

  // Две иконки содержат clipPath. Префикс не даёт превью ссылаться на маску плитки.
  const svgMarkup = (icon, scope, size) => icon.svg
    .replace(/\bid="([^"]+)"/g, (_, id) => `id="${scope}-${id}"`)
    .replace(/url\(#([^)]*)\)/g, (_, id) => `url(#${scope}-${id})`)
    .replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`)
    .replace('<svg ', '<svg aria-hidden="true" focusable="false" ');

  const announce = (message) => {
    clearTimeout(announceTimer);
    status.textContent = '';
    announceTimer = setTimeout(() => { status.textContent = message; }, 30);
  };

  const selectIcon = (icon, { reveal = false, speak = false } = {}) => {
    selected = icon;
    selectionVersion += 1;
    inspector.hidden = !icon;
    document.getElementById('icon-manual-copy').hidden = true;
    grid.querySelectorAll('[data-icon-id]').forEach((tile) => {
      const active = tile.dataset.iconId === icon?.id;
      tile.classList.toggle('is-selected', active);
      tile.setAttribute('aria-pressed', String(active));
    });
    copyButtons.forEach((button) => {
      clearTimeout(copyTimers.get(button));
      button.disabled = !icon;
      button.querySelector('span').textContent = button.dataset.iconCopy === 'svg' ? 'Скопировать SVG' : 'Скопировать имя';
    });
    if (!icon) return;
    heading.textContent = shortName(icon);
    document.getElementById('icon-category').textContent = labels[icon.category];
    preview.innerHTML = svgMarkup(icon, 'preview', 80);
    document.getElementById('icon-figma-link').href = sourceLink(icon);
    if (speak) announce(`Выбрана иконка ${shortName(icon)}. ${labels[icon.category]}.`);
    if (reveal && getComputedStyle(inspector).position === 'static') {
      heading.focus({ preventScroll: true });
      inspector.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
    }
  };

  const moveIndicator = () => {
    const active = categoryButtons.find((button) => button.dataset.category === category);
    const target = active && track.contains(active) ? active : more;
    const bounds = target.getBoundingClientRect();
    indicator.style.width = `${bounds.width}px`;
    indicator.style.transform = `translateX(${bounds.left - track.getBoundingClientRect().left}px)`;
  };

  const closeMenu = (restoreFocus = false) => {
    moreMenu.hidden = true;
    more.setAttribute('aria-expanded', 'false');
    if (restoreFocus) more.focus();
  };

  const render = () => {
    const terms = normalize(search.value).split(' ').filter(Boolean);
    matching = icons.filter((icon) => (category === 'all' || icon.category === category)
      && terms.every((term) => searchText.get(icon.id).includes(term)));
    const pages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
    pageIndex = Math.min(pageIndex, pages - 1);
    const visible = matching.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);
    const fragment = document.createDocumentFragment();
    visible.forEach((icon) => {
      const tile = document.createElement('a');
      tile.className = 'icon-tile';
      tile.href = sourceLink(icon);
      tile.dataset.iconId = icon.id;
      tile.setAttribute('role', 'button');
      tile.innerHTML = svgMarkup(icon, `grid-${icon.id.replace(':', '-')}`, 32);
      const label = document.createElement('span');
      label.textContent = shortName(icon);
      tile.append(label);
      fragment.append(tile);
    });
    grid.replaceChildren(fragment);
    grid.hidden = !visible.length;
    document.getElementById('icon-empty').hidden = !!visible.length;
    document.getElementById('icon-range').textContent = visible.length
      ? `${formatCount(pageIndex * PAGE_SIZE + 1)}–${formatCount(pageIndex * PAGE_SIZE + visible.length)} из ${formatCount(matching.length)}`
      : 'Найдено: 0';
    document.querySelector('.icon-pagination nav').hidden = !visible.length;
    const pageLabel = document.getElementById('icon-page');
    pageLabel.textContent = `${pageIndex + 1} / ${pages}`;
    pageLabel.setAttribute('aria-label', `Страница ${pageIndex + 1} из ${pages}`);
    previous.disabled = pageIndex === 0;
    next.disabled = pageIndex >= pages - 1;
    selectIcon(visible.find((icon) => icon.id === selected?.id) || visible[0] || null);
  };

  const chooseCategory = (value) => {
    category = value;
    pageIndex = 0;
    categoryButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
    const extra = [...moreMenu.querySelectorAll('[data-category]')].some((button) => button.dataset.category === category);
    more.toggleAttribute('data-active', extra);
    more.querySelector('span').textContent = extra ? labels[category] : 'Ещё';
    closeMenu();
    moveIndicator();
    render();
  };

  grid.addEventListener('click', (event) => {
    const tile = event.target.closest('[data-icon-id]');
    if (!tile || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    selectIcon(byId.get(tile.dataset.iconId), { reveal: true, speak: true });
  });
  grid.addEventListener('keydown', (event) => {
    const tile = event.target.closest('[data-icon-id]');
    if (tile && event.key === ' ') { event.preventDefault(); tile.click(); }
  });

  categoryButtons.forEach((button) => button.addEventListener('click', () => {
    const fromMenu = moreMenu.contains(button);
    chooseCategory(button.dataset.category);
    if (fromMenu) more.focus();
  }));
  more.addEventListener('click', () => {
    const open = moreMenu.hidden;
    moreMenu.hidden = !open;
    more.setAttribute('aria-expanded', String(open));
    if (open) {
      const bounds = more.getBoundingClientRect();
      const parent = filters.getBoundingClientRect();
      moreMenu.style.left = `${Math.max(0, Math.min(bounds.left - parent.left, parent.width - moreMenu.offsetWidth))}px`;
    }
  });
  more.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (moreMenu.hidden) more.click();
      moreMenu.querySelector('[aria-pressed="true"], button').focus();
    }
  });
  moreMenu.addEventListener('keydown', (event) => {
    const buttons = [...moreMenu.querySelectorAll('button')];
    const current = buttons.indexOf(document.activeElement);
    let nextIndex;
    if (event.key === 'ArrowDown') nextIndex = (current + 1) % buttons.length;
    if (event.key === 'ArrowUp') nextIndex = (current + buttons.length - 1) % buttons.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = buttons.length - 1;
    if (nextIndex !== undefined) { event.preventDefault(); buttons[nextIndex].focus(); }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !moreMenu.hidden) { event.preventDefault(); closeMenu(true); }
  });
  document.addEventListener('pointerdown', (event) => {
    if (!moreMenu.hidden && !moreMenu.contains(event.target) && !more.contains(event.target)) closeMenu();
  });
  search.addEventListener('input', () => { pageIndex = 0; render(); });
  document.getElementById('icon-reset').addEventListener('click', () => {
    search.value = '';
    chooseCategory('all');
    search.focus();
  });
  [previous, next].forEach((button, index) => button.addEventListener('click', () => {
    pageIndex += index === 0 ? -1 : 1;
    render();
    if (grid.getBoundingClientRect().top < 0) grid.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
  }));
  document.getElementById('icon-back').hidden = false;
  document.getElementById('icon-back').addEventListener('click', () => {
    const tile = grid.querySelector('.is-selected') || grid.querySelector('a');
    tile?.focus({ preventScroll: true });
    tile?.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'center' });
  });

  const fallbackCopy = (text) => {
    const field = document.createElement('textarea');
    const focused = document.activeElement;
    field.value = text;
    field.readOnly = true;
    field.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.append(field);
    field.select();
    try { return document.execCommand('copy'); }
    finally { field.remove(); focused?.focus({ preventScroll: true }); }
  };
  copyButtons.forEach((button) => button.addEventListener('click', async () => {
    if (!selected) return;
    const version = selectionVersion;
    const text = button.dataset.iconCopy === 'svg' ? selected.svg : selected.name;
    const originalLabel = button.dataset.iconCopy === 'svg' ? 'Скопировать SVG' : 'Скопировать имя';
    button.disabled = true;
    try {
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
        await navigator.clipboard.writeText(text);
      } catch {
        if (!fallbackCopy(text)) throw new Error('Copy failed');
      }
      if (version !== selectionVersion) return;
      document.getElementById('icon-manual-copy').hidden = true;
      button.querySelector('span').textContent = 'Скопировано';
      announce('Скопировано в буфер обмена');
      clearTimeout(copyTimers.get(button));
      copyTimers.set(button, setTimeout(() => { button.querySelector('span').textContent = originalLabel; }, 1800));
    } catch {
      if (version !== selectionVersion) return;
      document.getElementById('icon-copy-text').value = text;
      document.getElementById('icon-manual-copy').hidden = false;
      announce('Не удалось скопировать автоматически. Текст доступен для ручного копирования.');
    } finally {
      if (version === selectionVersion) button.disabled = false;
    }
  }));

  grid.querySelectorAll('[data-icon-id]').forEach((tile) => tile.setAttribute('role', 'button'));
  if (complete) {
    search.disabled = false;
    categoryButtons.forEach((button) => { button.disabled = false; });
    more.disabled = false;
    render();
  } else {
    document.getElementById('icons-load-error').hidden = false;
    selectIcon(selected);
  }
  moveIndicator();
  requestAnimationFrame(() => requestAnimationFrame(() => track.setAttribute('data-indicator-ready', '')));
  const observer = new ResizeObserver(moveIndicator);
  observer.observe(track);
  [...track.querySelectorAll('button')].forEach((button) => observer.observe(button));
  window.addEventListener('resize', () => closeMenu());
})();
