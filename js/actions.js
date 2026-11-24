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
  const chipDefaults = chips.map(chip => chip.getAttribute('aria-pressed'));
  const dropdownMotion = menu ? createDropdownMotion(menu, trigger, items) : null;
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
    if (dropdownMotion) {
      const target = items.includes(hovered) ? hovered : items.includes(document.activeElement) ? document.activeElement : items.find(item => ['hover','focus'].includes(item.dataset.previewState));
      dropdownMotion.highlight(target && !target.disabled && !menu.inert ? target : null);
    }
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
      dropdownMotion.setOpen(open);
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
      const selected = chips.find(chip => chip.getAttribute('aria-pressed') === 'true');
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
    if (settings.selection === 'single') {
      chips.forEach(item => item.setAttribute('aria-pressed', String(item === chip && next)));
    } else {
      chip.setAttribute('aria-pressed', String(next));
    }
  }));

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
        dropdownMotion.setLabel(item.querySelector('span').textContent);
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
      chips.forEach((chip,index) => chip.setAttribute('aria-pressed', chipDefaults[index]));
      dropdownMotion?.stop();
      if (trigger) trigger.querySelector('span').textContent = items[1].querySelector('span').textContent;
      render();
    });
  });
  render();

  function createDropdownMotion(panel, control, rows) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const motions = new Set();
    let lastOpen, labelMotion, widthMotion;
    const highlight = document.createElement('div');
    highlight.className = 'dropdown-highlight';
    highlight.setAttribute('aria-hidden', 'true');
    panel.prepend(highlight);
    const sample = node => {
      const style = getComputedStyle(node);
      return { transform: style.transform, opacity: style.opacity };
    };
    function animate(node, frames, options) {
      const animation = node.animate(frames, options);
      motions.add(animation);
      animation.finished.then(() => { motions.delete(animation); animation.cancel(); }, () => motions.delete(animation));
      return animation;
    }
    function stopPanel() {
      motions.forEach(animation => animation.cancel());
      motions.clear();
    }
    function stop() {
      stopPanel(); labelMotion?.cancel(); widthMotion?.cancel();
    }
    reduced.addEventListener('change', stop);
    window.addEventListener('pagehide', stop);
    window.addEventListener('resize', stop);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    return {
      stop,
      highlight(target) {
        rows.forEach(row => row.toggleAttribute('data-highlighted', row === target));
        highlight.style.opacity = target ? '1' : '0';
        if (target) {
          highlight.style.transform = `translateY(${target.offsetTop}px)`;
          highlight.toggleAttribute('data-selected', target.dataset.kind === 'selected');
        }
      },
      setOpen(open) {
        if (lastOpen === open) return;
        const initial = lastOpen === undefined;
        const start = sample(panel);
        const rowStarts = rows.map(sample);
        stopPanel();
        lastOpen = open;
        panel.inert = !open;
        panel.setAttribute('aria-hidden', String(!open));
        if (initial || reduced.matches) return;
        if (!open) {
          animate(panel, [start, {transform:'translateY(-8px) scale(.92,.86)', opacity:0}], {duration:180, easing:'cubic-bezier(.4,0,1,1)'});
          // Preserve intermediate row positions when a reveal is interrupted.
          rows.forEach((row,index) => animate(row, [rowStarts[index], {transform:'none',opacity:1}], {duration:180,easing:'ease-out'}));
          return;
        }
        const fresh = Number(start.opacity) < .02;
        const matrix = new DOMMatrixReadOnly(start.transform);
        const from = fresh ? {x:.86,y:.72,top:-10} : {x:matrix.a,y:matrix.d,top:matrix.f};
        // Same damped spring as the category picker on the Icons page.
        const frames = Array.from({length:41}, (_,index) => {
          const time = index / 40 * .6;
          const progress = index === 40 ? 1 : 1 - Math.exp(-10*time) * (Math.cos(21.34*time) + 10/21.34*Math.sin(21.34*time));
          return {transform:`translateY(${from.top*(1-progress)}px) scale(${from.x+(1-from.x)*progress},${from.y+(1-from.y)*progress})`,opacity:Number(start.opacity)+(1-Number(start.opacity))*Math.min(1,time/.16)};
        });
        animate(panel, frames, {duration:600,easing:'linear'});
        rows.forEach((row,index) => animate(row, [fresh ? {opacity:0,transform:'translateY(-8px)'} : rowStarts[index], {opacity:1,transform:'none'}], {
          duration:320, delay:fresh ? index*28+25 : 0, easing:'cubic-bezier(.22,1,.36,1)', fill:'backwards'
        }));
      },
      setLabel(text) {
        const label = control.querySelector('span');
        if (label.textContent === text) return;
        const width = control.getBoundingClientRect().width;
        labelMotion?.cancel(); widthMotion?.cancel();
        label.textContent = text;
        if (reduced.matches) return;
        widthMotion = control.animate([{width:`${width}px`},{width:`${control.getBoundingClientRect().width}px`}], {duration:280,easing:'cubic-bezier(.22,1,.36,1)'});
        labelMotion = label.animate([{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}], {duration:280,easing:'cubic-bezier(.22,1,.36,1)'});
      }
    };
  }
})();
