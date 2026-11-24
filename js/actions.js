(() => {
  'use strict';
  const form = document.querySelector('[data-action-component]');
  if (!form) return;
  const kind = form.dataset.actionComponent;
  const preview = form.querySelector('.playground__preview');
  const status = form.querySelector('.action-status');
  const defaults = Object.fromEntries([...form.querySelectorAll('.play-setting input:checked')].map(input => [input.name, input.value]));
  let settings = { ...defaults };
  let hovered = null, pressed = null;
  let selectedItem = 1, demoItem = 1;
  let completeTimer, typeTimer, search = '';
  const targets = [...preview.querySelectorAll('.action-target')];
  const items = [...preview.querySelectorAll('.dropdown-item')];
  const trigger = preview.querySelector('.dropdown-trigger');
  const menu = preview.querySelector('.action-menu');
  const chips = [...preview.querySelectorAll('[data-chip]')];
  const removable = preview.querySelector('[data-chip-wrapper]');
  const button = preview.querySelector('.action-button');
  const link = preview.querySelector('.action-link');
  const linkURL = link?.getAttribute('href');
  const focusState = kind === 'dropdown' ? 'focus' : 'focused';

  const radio = (name, value) => {
    const input = form.querySelector(`.play-setting input[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
  };
  function syncState() {
    let actual = null;
    for (const target of targets) {
      const disabled = target.disabled || target.getAttribute('aria-disabled') === 'true';
      const eligible = !target.closest('[hidden], [inert]');
      const forced = kind !== 'dropdown' || Number(target.dataset.item) === demoItem;
      let state = forced ? settings.state : 'default';
      if (!disabled && eligible) {
        if (hovered === target) state = 'hover';
        if (document.activeElement === target) state = focusState;
        if (pressed === target) state = 'pressed';
        if (hovered === target || document.activeElement === target || pressed === target) {
          if (!actual || state === 'pressed' || state === focusState) actual = state;
        }
      }
      target.dataset.previewState = disabled ? 'disabled' : state;
    }
    if (settings.state) radio('state', actual || settings.state);
  }

  function render() {
    for (const [name,value] of Object.entries(settings)) {
      form.dataset[name] = value;
      radio(name,value);
    }
    for (const target of targets) {
      const disabled = settings.state === 'disabled' && (kind !== 'dropdown' || Number(target.dataset.item) === demoItem);
      if (target.tagName === 'BUTTON') target.disabled = disabled;
    }
    if (link) {
      const disabled = settings.state === 'disabled';
      link.setAttribute('aria-disabled', String(disabled));
      if (disabled) { link.removeAttribute('href'); link.tabIndex = -1; }
      else { link.setAttribute('href', linkURL); link.removeAttribute('tabindex'); }
    }
    if (menu) {
      const open = settings.menu === 'open';
      trigger.setAttribute('aria-expanded', String(open));
      menu.inert = !open;
      menu.setAttribute('aria-hidden', String(!open));
      items.forEach((item,index) => {
        const selected = settings.selection === 'value' && index === selectedItem;
        item.setAttribute('role', settings.selection === 'value' ? 'menuitemradio' : 'menuitem');
        if (settings.selection === 'value') item.setAttribute('aria-checked', String(selected));
        else item.removeAttribute('aria-checked');
        item.dataset.kind = index === demoItem ? settings.variant : selected ? 'selected' : 'default';
      });
      // One entry point for Tab; arrows move focus within the open menu.
      const entry = items.find(item => item === document.activeElement && !item.disabled) || items.find((item,index) => index === selectedItem && !item.disabled) || items.find(item => !item.disabled);
      items.forEach(item => { item.tabIndex = open && item === entry ? 0 : -1; });
    }
    syncState();
  }

  function setMenu(open, focusIndex = null) {
    settings.menu = open ? 'open' : 'closed';
    if (!open && menu.contains(document.activeElement)) trigger.focus({ preventScroll: true });
    render();
    if (open && focusIndex !== null) focusItem(focusIndex);
  }
  function focusItem(index) {
    const enabled = items.filter(item => !item.disabled);
    let target = items[index];
    if (!target || target.disabled) target = enabled[0];
    if (!target) return;
    items.forEach(item => { item.tabIndex = item === target ? 0 : -1; });
    target.focus({ preventScroll: true });
  }
  function resetButton() {
    clearTimeout(completeTimer);
    if (button) {
      button.removeAttribute('data-complete');
      button.firstElementChild.removeAttribute('aria-hidden');
      button.querySelector('.action-button__done').setAttribute('aria-hidden', 'true');
    }
  }

  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('change', event => {
    const input = event.target;
    if (!input.matches('.play-setting input')) return;
    settings[input.name] = input.value;
    pressed = hovered = null;
    if (kind === 'chip' && input.name === 'selection' && input.value === 'single') {
      const selected = chips.find(chip => chip.getAttribute('aria-pressed') === 'true' && !chip.closest('[hidden]')) || chips[0];
      chips.forEach(chip => chip.setAttribute('aria-pressed', String(chip === selected)));
    }
    if (kind === 'dropdown' && input.name === 'variant') {
      if (input.value === 'selected') { settings.selection = 'value'; selectedItem = demoItem; }
      else if (selectedItem === demoItem) selectedItem = -1;
    }
    if (kind === 'dropdown' && input.name === 'selection') {
      settings.variant = input.value === 'value' ? 'selected' : 'default';
      selectedItem = input.value === 'value' ? demoItem : -1;
    }
    resetButton();
    render();
  });

  for (const target of targets) {
    target.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { hovered = target; syncState(); } });
    target.addEventListener('pointerleave', () => { if (hovered === target) hovered = null; syncState(); });
    target.addEventListener('pointerdown', () => { pressed = target; syncState(); });
    target.addEventListener('focus', syncState);
    target.addEventListener('blur', () => { if (pressed === target) pressed = null; queueMicrotask(syncState); });
    target.addEventListener('keydown', event => {
      if (event.key === ' ' || event.key === 'Enter') { pressed = target; syncState(); }
    });
  }
  const release = () => { pressed = null; syncState(); };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('keyup', release);
  window.addEventListener('blur', () => { hovered = pressed = null; syncState(); });

  if (button) {
    const done = document.createElement('span');
    done.className = 'action-button__done';
    done.textContent = 'Готово';
    done.setAttribute('aria-hidden', 'true');
    button.append(done);
    button.addEventListener('click', () => {
      resetButton();
      button.setAttribute('data-complete','');
      button.firstElementChild.setAttribute('aria-hidden','true');
      done.removeAttribute('aria-hidden');
      status.textContent = 'Действие выполнено';
      completeTimer = setTimeout(resetButton, 1200);
    });
  }
  if (link) link.addEventListener('click', event => { if (settings.state === 'disabled') event.preventDefault(); });

  chips.forEach(chip => chip.addEventListener('click', () => {
    const next = chip.getAttribute('aria-pressed') !== 'true';
    if (settings.selection === 'single' || chip.dataset.chip === 'all') {
      chips.forEach(item => item.setAttribute('aria-pressed', String(item === chip)));
    } else {
      chip.setAttribute('aria-pressed', String(next));
      chips[0].setAttribute('aria-pressed', String(!chips.slice(1).some(item => !item.closest('[hidden]') && item.getAttribute('aria-pressed') === 'true')));
    }
  }));
  preview.querySelector('.chip-remove')?.addEventListener('click', () => {
    removable.hidden = true;
    chips[2].setAttribute('aria-pressed','false');
    if (!chips.slice(1).some(item => !item.closest('[hidden]') && item.getAttribute('aria-pressed') === 'true')) chips[0].setAttribute('aria-pressed','true');
    chips[1].focus({ preventScroll: true });
    status.textContent = 'Фильтр PDF удалён';
  });

  if (menu) {
    trigger.addEventListener('click', () => setMenu(settings.menu !== 'open', selectedItem));
    trigger.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); setMenu(true, event.key === 'ArrowUp' ? items.length - 1 : Math.max(selectedItem,0));
      } else if (event.key === 'Escape') { event.preventDefault(); setMenu(false); }
    });
    items.forEach((item,index) => item.addEventListener('click', () => {
      if (settings.selection === 'value') {
        selectedItem = demoItem = index;
        settings.variant = 'selected';
        trigger.querySelector('span').textContent = item.querySelector('span').textContent;
      }
      status.textContent = `Выбрано: ${item.querySelector('span').textContent}`;
      setMenu(false);
    }));
    menu.addEventListener('keydown', event => {
      const enabled = items.filter(item => !item.disabled);
      const index = enabled.indexOf(document.activeElement);
      let next;
      if (event.key === 'ArrowDown') next = enabled[(index + 1) % enabled.length];
      else if (event.key === 'ArrowUp') next = enabled[(index - 1 + enabled.length) % enabled.length];
      else if (event.key === 'Home') next = enabled[0];
      else if (event.key === 'End') next = enabled[enabled.length - 1];
      else if (event.key === 'Escape') { event.preventDefault(); setMenu(false); }
      else if (event.key.length === 1 && event.key !== ' ' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        clearTimeout(typeTimer); search += event.key.toLocaleLowerCase('ru');
        const ordered = [...enabled.slice(index + 1), ...enabled.slice(0,index + 1)];
        next = ordered.find(item => item.textContent.trim().toLocaleLowerCase('ru').startsWith(search));
        typeTimer = setTimeout(() => { search = ''; }, 600);
      }
      if (next) { event.preventDefault(); focusItem(items.indexOf(next)); }
    });
    // Preserve access to the settings while inspecting an open menu.
    document.addEventListener('pointerdown', event => { if (!form.contains(event.target)) setMenu(false); });
    form.addEventListener('focusout', event => {
      // activeElement is temporarily body between blur and the next focus event.
      if (event.relatedTarget && !form.contains(event.relatedTarget)) setMenu(false);
    });
  }

  form.addEventListener('reset', () => {
    queueMicrotask(() => {
      settings = { ...defaults }; selectedItem = demoItem = 1;
      hovered = pressed = null; search = ''; clearTimeout(typeTimer); resetButton(); status.textContent = '';
      if (removable) removable.hidden = false;
      chips.forEach((chip,index) => chip.setAttribute('aria-pressed', String(index !== 0)));
      if (trigger) trigger.querySelector('span').textContent = items[1].querySelector('span').textContent;
      render();
    });
  });
  render();
})();
