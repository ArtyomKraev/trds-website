(() => {
  'use strict';
  const scriptURL = document.currentScript.src;
  const root = new URL('../', scriptURL);
  const asset = name => new URL(`assets/images/trophies/${name}`, root).href;
  const collectionURL = new URL('trophies.html', root).href;
  const key = 'trds.trophies.v1';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 48rem)');
  const ranks = { bronze: 'Бронзовый', silver: 'Серебряный', gold: 'Золотой', platinum: 'Платиновый' };
  const trophies = [
    ['platinum', 'Синдром отличника', 'Получить остальные девять трофеев.', 'platinum'],
    ['bell', 'For Whom The Bell Tolls...', 'Заставить колокольчик в Toggle зазвонить.', 'bronze'],
    ['snap', "I'll do it myself", 'Удалить фото из Upload Zone.', 'silver'],
    ['party', "It's My Party", 'Ввести 060204 в Code Field и запустить конфетти.', 'gold'],
    ['rps', 'Цу-е-фа', 'Проиграть все три анимации в Chip.', 'bronze'],
    ['round', 'Right Round', 'Быстро сменить положение Tooltip несколько раз.', 'bronze'],
    ['choice', '…и не выбирай вообще', 'Закрыть Modal крестиком, отменой и подтверждением.', 'silver'],
    ['orbit', 'Поехали!', 'Оказаться на странице 404.', 'gold'],
    ['ufo', 'Истина где-то рядом', 'Получить пустой результат поиска в каталоге иконок.', 'bronze'],
    ['free', '…гуляй смело', 'Запустить падение чекбоксов в Selection.', 'silver'],
  ].map(([id, title, condition, rank]) => ({ id, title, condition, rank }));
  const ids = new Set(trophies.map(trophy => trophy.id));
  const groups = { chips: ['rock', 'paper', 'scissors'], modal: ['close', 'cancel', 'confirm'] };
  const cup = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v5a5 5 0 0 1-4 4.9V17h4v3H7v-3h4v-4.1A5 5 0 0 1 7 8V3Z" fill="currentColor"/><path d="M7 5H3v2a5 5 0 0 0 5 5M17 5h4v2a5 5 0 0 1-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const locked = '<svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true"><g transform="translate(4 4) scale(2.2)"><path d="M7 3h10v5a5 5 0 0 1-4 4.9V17h4v3H7v-3h4v-4.1A5 5 0 0 1 7 8V3Z" fill="currentColor"/><path d="M7 5H3v2a5 5 0 0 0 5 5M17 5h4v2a5 5 0 0 1-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></g><rect x="43" y="43" width="26" height="24" rx="5" fill="currentColor" stroke="var(--color-surface-raised)" stroke-width="4"/><path d="M49 43v-5a7 7 0 0 1 14 0v5" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="56" cy="53" r="3" fill="var(--color-surface-raised)"/><path d="M56 54v5" stroke="var(--color-surface-raised)" stroke-width="3"/></svg>';

  function clean(value) {
    const result = { unlocked: {}, chips: [], modal: [], introduced: false };
    if (!value || typeof value !== 'object') return result;
    result.introduced = value.introduced === true;
    for (const id of ids) {
      const date = value.unlocked?.[id];
      if (typeof date === 'string' && Number.isFinite(Date.parse(date))) result.unlocked[id] = new Date(date).toISOString();
    }
    for (const [group, allowed] of Object.entries(groups)) {
      result[group] = allowed.filter(item => Array.isArray(value[group]) && value[group].includes(item));
    }
    return result;
  }
  function read() {
    try { return clean(JSON.parse(localStorage.getItem(key))); } catch { return clean(null); }
  }
  let state = read();
  function merge(other) {
    state.introduced ||= other.introduced;
    for (const id of ids) {
      if (other.unlocked[id] && (!state.unlocked[id] || other.unlocked[id] < state.unlocked[id])) state.unlocked[id] = other.unlocked[id];
    }
    for (const [group, allowed] of Object.entries(groups)) state[group] = allowed.filter(item => state[group].includes(item) || other[group].includes(item));
  }
  function save() {
    // Merge before each write; storage events reconcile simultaneous tabs as a union.
    merge(read());
    state = clean(state);
    try {
      const serialized = JSON.stringify(state);
      if (localStorage.getItem(key) !== serialized) localStorage.setItem(key, serialized);
    } catch { /* Storage may be unavailable; achievements still work in this page. */ }
  }
  const motions = new Set();
  function animate(node, frames, options) {
    if (reduced.matches || document.hidden) return;
    const animation = node.animate(frames, options);
    motions.add(animation);
    animation.finished.then(() => { motions.delete(animation); animation.cancel(); }, () => motions.delete(animation));
    return animation;
  }
  function stopMotions() { motions.forEach(animation => animation.cancel()); motions.clear(); }
  const count = () => Object.keys(state.unlocked).length;
  const header = document.querySelector('.docs-header, .site-header');
  let headerLink;
  function showLink(attention = false) {
    if (!header || !count() || !state.introduced || headerLink) return;
    headerLink = document.createElement('a');
    headerLink.className = 'trophy-link';
    headerLink.href = collectionURL;
    headerLink.innerHTML = `${cup}<span class="ds-link__label">Мои трофеи</span>`;
    if (document.querySelector('[data-trophy-page]')) headerLink.setAttribute('aria-current', 'page');
    header.querySelector('.logo').after(headerLink);
    header.classList.add('has-trophies');
    if (attention) animate(headerLink, [
      { opacity: 0, transform: 'translateY(-6px) scale(.9)' },
      { opacity: 1, transform: 'translateY(0) scale(1.06)', offset: .28 },
      { transform: 'translateX(-4px) rotate(-3deg)', offset: .44 },
      { transform: 'translateX(3px) rotate(2.5deg)', offset: .58 },
      { transform: 'translateX(-2px) rotate(-1.5deg)', offset: .73 },
      { transform: 'translateX(1px) rotate(.7deg)', offset: .86 },
      { opacity: 1, transform: 'none' },
    ], { duration: 850, easing: 'ease-out' });
  }

  const live = document.createElement('div');
  live.className = 'trophy-sr-only';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-atomic', 'true');
  document.body.append(live);
  const queue = [];
  let toast, toastTimer, toastDeadline = 0, remaining = 8000, hovered = false, closing = false;
  function introduce() {
    if (state.introduced) return;
    state.introduced = true;
    save(); showLink(true);
  }
  function pauseToast() {
    clearTimeout(toastTimer);
    if (toastDeadline) remaining = Math.max(0, toastDeadline - performance.now());
    toastDeadline = 0;
  }
  function resumeToast() {
    if (!toast || closing || hovered || toast.contains(document.activeElement) || document.hidden) return;
    clearTimeout(toastTimer);
    toastDeadline = performance.now() + remaining;
    toastTimer = setTimeout(dismissToast, remaining);
  }
  function dismissToast() {
    if (!toast || closing) return;
    pauseToast(); closing = true;
    const current = toast;
    const done = () => {
      if (toast !== current) return;
      const wasFocused = current.contains(document.activeElement);
      current.remove(); toast = null; closing = hovered = false;
      introduce();
      if (wasFocused) headerLink?.focus({ preventScroll: true });
      live.textContent = '';
      showNext();
    };
    const motion = animate(current, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: mobile.matches ? 'translateY(-16px) scale(.98)' : 'translateX(24px) scale(.98)' }], { duration: 400, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' });
    if (motion) motion.finished.then(done, done); else done();
  }
  function showNext() {
    if (toast || !queue.length || document.hidden) return;
    const trophy = queue.shift();
    toast = document.createElement('a');
    toast.className = 'trophy-toast';
    toast.dataset.trophy = trophy.id;
    toast.href = collectionURL;
    toast.setAttribute('aria-label', `Трофей получен: ${trophy.title}. Мои трофеи`);
    toast.innerHTML = `<img class="trophy-toast__art" src="${asset(trophy.id + '.png')}" alt="" width="64" height="64"><span class="trophy-toast__copy"><span class="trophy-toast__eyebrow">Трофей получен!</span><span class="trophy-toast__title"></span></span><img class="trophy-toast__rank" src="${asset(trophy.rank + '.svg')}" width="32" height="32" alt="${ranks[trophy.rank]}">`;
    toast.querySelector('.trophy-toast__title').textContent = trophy.title;
    document.body.append(toast);
    live.textContent = `Трофей получен! ${trophy.title}. ${ranks[trophy.rank]}.`;
    remaining = 8000;
    toast.addEventListener('click', () => { state.introduced = true; save(); });
    toast.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { hovered = true; pauseToast(); } });
    toast.addEventListener('pointerleave', () => { hovered = false; resumeToast(); });
    toast.addEventListener('focusin', pauseToast);
    toast.addEventListener('focusout', () => queueMicrotask(resumeToast));
    const axis = mobile.matches ? 'translateY' : 'translateX';
    animate(toast, [
      { opacity: 0, transform: `${axis}(${mobile.matches ? -48 : 64}px) scale(.97)` },
      { opacity: 1, transform: `${axis}(${mobile.matches ? -12 : 16}px) scale(.99)`, offset: .45 },
      { opacity: 1, transform: `${axis}(${mobile.matches ? 1 : -1}px) scale(1.002)`, offset: .8 },
      { opacity: 1, transform: 'none' },
    ], { duration: 1150, easing: 'cubic-bezier(.25,.6,.35,1)' });
    animate(toast.querySelector('.trophy-toast__art'), [{ transform: 'scale(.94) rotate(-3deg)' }, { transform: 'scale(1.02) rotate(1deg)', offset: .65 }, { transform: 'none' }], { duration: 900, delay: 120, easing: 'ease-out', fill: 'backwards' });
    animate(toast.querySelector('.trophy-toast__rank'), [0, -6, 4, -2, 0].map(angle => ({ transform: `rotate(${angle}deg)` })), { duration: 850, delay: 250, easing: 'ease-in-out' });
    resumeToast();
  }
  function unlock(id) {
    if (!ids.has(id)) return;
    merge(read());
    if (state.unlocked[id]) return;
    if (id === 'platinum' && trophies.some(item => item.id !== id && !state.unlocked[item.id])) return;
    state.unlocked[id] = new Date().toISOString();
    save(); showLink(); renderCollection();
    queue.push(trophies.find(item => item.id === id)); showNext();
    if (id !== 'platinum' && count() === 9) unlock('platinum');
  }
  function record(group, item) {
    if (!groups[group]?.includes(item)) return;
    merge(read());
    if (!state[group].includes(item)) { state[group].push(item); save(); }
    if (groups[group].every(value => state[group].includes(value))) unlock(group === 'chips' ? 'rps' : 'choice');
  }
  window.TRDSTrophies = Object.freeze({ unlock, record });

  const page = document.querySelector('[data-trophy-page]');
  const tabs = page ? [...page.querySelectorAll('[data-trophy-filter]')] : [];
  let filter = 'all';
  const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
  function renderCollection() {
    if (!page) return;
    const total = count();
    page.querySelector('[data-trophy-count]').textContent = total;
    const progress = page.querySelector('progress');
    progress.value = total;
    progress.setAttribute('aria-label', `Получено ${total} из 10 трофеев`);
    const counts = { all: 10, unlocked: total, locked: 10 - total };
    tabs.forEach(tab => { tab.querySelector('span').textContent = counts[tab.dataset.trophyFilter]; });
    const list = page.querySelector('.trophy-list');
    const fragment = document.createDocumentFragment();
    for (const trophy of trophies) {
      const date = state.unlocked[trophy.id];
      if ((filter === 'unlocked' && !date) || (filter === 'locked' && date)) continue;
      const row = document.createElement('li');
      row.className = `trophy-row${date ? ' is-unlocked' : ''}`;
      // Hidden rows have no title/condition in text, attributes, or image requests.
      row.innerHTML = `${date ? `<img class="trophy-row__art" src="${asset(trophy.id + '.png')}" alt="" width="96" height="96" loading="lazy">` : `<div class="trophy-row__locked">${locked}</div>`}<div class="trophy-row__copy"><h2></h2><p></p><div class="trophy-row__meta"><img src="${asset(trophy.rank + '.svg')}" width="24" height="24" alt=""><span>${date ? ranks[trophy.rank] : 'Не получен'}</span>${date ? '<time></time>' : ''}</div></div><span class="trophy-row__earned">${date ? cup : ''}</span>`;
      row.querySelector('h2').textContent = date ? trophy.title : 'Скрытый трофей';
      row.querySelector('p').textContent = date ? trophy.condition : 'Описание скрыто';
      if (date) {
        const time = row.querySelector('time');
        time.dateTime = date;
        time.textContent = `${dateFormat.format(new Date(date))} · ${timeFormat.format(new Date(date))}`;
      }
      fragment.append(row);
    }
    list.replaceChildren(fragment);
    const empty = page.querySelector('.trophy-empty');
    empty.hidden = !!list.children.length;
    empty.textContent = filter === 'unlocked' ? 'Пока нет полученных трофеев. Исследуйте компоненты TRDS — в них спрятаны сюрпризы.' : 'Все трофеи открыты. Коллекция собрана!';
  }
  function selectTab(tab) {
    filter = tab.dataset.trophyFilter;
    tabs.forEach(item => { const selected = item === tab; item.setAttribute('aria-selected', String(selected)); item.tabIndex = selected ? 0 : -1; });
    page.querySelector('[role="tabpanel"]').setAttribute('aria-labelledby', tab.id);
    renderCollection();
    animate(page.querySelector('.trophy-list'), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault(); selectTab(tabs[next]); tabs[next].focus();
    });
  });
  window.addEventListener('storage', event => {
    if (event.key !== key || !event.newValue) return;
    try { merge(clean(JSON.parse(event.newValue))); } catch { return; }
    save(); showLink(); renderCollection();
    if (count() === 9 && !state.unlocked.platinum) unlock('platinum');
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !event.defaultPrevented && toast) dismissToast();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { pauseToast(); stopMotions(); }
    else { showNext(); resumeToast(); }
  });
  window.addEventListener('pagehide', () => { pauseToast(); stopMotions(); });
  window.addEventListener('pageshow', () => { merge(read()); showLink(); renderCollection(); showNext(); resumeToast(); });
  reduced.addEventListener('change', stopMotions);
  mobile.addEventListener('change', stopMotions);
  showLink(); renderCollection();
  if (count() && !state.introduced) {
    const first = trophies.filter(item => state.unlocked[item.id]).sort((a, b) => state.unlocked[a.id].localeCompare(state.unlocked[b.id]))[0];
    queue.push(first); showNext();
  }
  if (count() === 9 && !state.unlocked.platinum) unlock('platinum');
  if (document.body.classList.contains('not-found-page')) unlock('orbit');
})();
