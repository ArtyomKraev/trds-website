(() => {
  'use strict';
  const form = document.querySelector('[data-panel-component]');
  if (!form) return;
  const kind = form.dataset.panelComponent;
  const preview = form.querySelector('.playground__preview');
  const status = form.querySelector('.panel-status');
  const defaults = Object.fromEntries([...form.querySelectorAll('.play-setting input:checked')].map(input => [input.name, input.value]));
  let settings = { ...defaults };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motions = new Map();
  let controller;

  const radio = (name, value) => {
    const input = form.querySelector(`.play-setting input[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
  };
  function sync() {
    for (const [name, value] of Object.entries(settings)) {
      form.dataset[name] = value;
      radio(name, value);
    }
  }
  function finishMotions() {
    for (const [element, { animation, done }] of motions) {
      motions.delete(element);
      animation.cancel();
      done?.();
    }
  }
  function move(element, destination, duration = 240, done) {
    const computed = getComputedStyle(element);
    const from = Object.fromEntries(Object.keys(destination).map(key => [key, computed[key]]));
    motions.get(element)?.animation.cancel();
    motions.delete(element);
    Object.assign(element.style, destination);
    if (reduced.matches || document.hidden) { done?.(); return; }
    const animation = element.animate([from, destination], { duration, easing: 'cubic-bezier(.2,.7,.2,1)' });
    motions.set(element, { animation, done });
    animation.finished.then(() => {
      if (motions.get(element)?.animation !== animation) return;
      motions.delete(element);
      animation.cancel();
      done?.();
    }).catch(() => {});
  }

  function modalDemo() {
    const card = preview.querySelector('.modal-card');
    const launch = preview.querySelector('.modal-launch');
    const cancel = card.querySelector('.modal-cancel');
    let opened = true;
    function setOpen(open, focus = false, animate = true) {
      settings.window = open ? 'open' : 'closed';
      sync();
      card.inert = !open;
      card.setAttribute('aria-hidden', String(!open));
      launch.hidden = open;
      if (open) card.style.visibility = 'visible';
      if (open !== opened) {
        const end = { opacity: open ? '1' : '0', transform: open ? 'translateY(0) scale(1)' : 'translateY(8px) scale(.98)' };
        // Скрытое окно сохраняет место: высота сцены и кнопка открытия не скачут.
        const finish = () => { card.style.visibility = open ? 'visible' : 'hidden'; };
        if (animate) move(card, end, open ? 320 : 180, finish);
        else { Object.assign(card.style, end); finish(); }
      }
      opened = open;
      if (focus) (open ? card.querySelector('.modal-close') : launch).focus({ preventScroll: true });
    }
    launch.addEventListener('click', () => setOpen(true, true));
    card.querySelector('.modal-close').addEventListener('click', () => {
      if (opened) window.TRDSTrophies?.record('modal', 'close');
      setOpen(false, true);
    });
    cancel.addEventListener('click', () => {
      if (opened) window.TRDSTrophies?.record('modal', 'cancel');
      setOpen(false, true);
    });
    card.querySelector('.modal-confirm').addEventListener('click', () => {
      if (opened) window.TRDSTrophies?.record('modal', 'confirm');
      status.textContent = 'Проект перемещён';
      setOpen(false, true);
    });
    form.addEventListener('keydown', event => {
      if (event.key === 'Escape' && opened) { event.preventDefault(); setOpen(false, true); }
    });
    return {
      render(name) {
        cancel.hidden = settings.secondary === 'hide';
        setOpen(settings.window === 'open', name === 'window' && card.contains(document.activeElement));
      },
      reset() { cancel.hidden = false; setOpen(true, false, false); },
    };
  }

  function tabDemo() {
    const tabs = [...preview.querySelectorAll('[role="tab"]')];
    const panels = [...preview.querySelectorAll('[role="tabpanel"]')];
    const indicator = preview.querySelector('.demo-tab-indicator');
    let hovered = null, pressed = null, active = 0;
    function layout() {
      const tab = tabs[active];
      indicator.style.left = `${tab.offsetLeft}px`;
      indicator.style.width = `${tab.offsetWidth}px`;
    }
    function state() {
      let actual = null;
      tabs.forEach(tab => {
        let value = settings.state;
        if (!tab.disabled) {
          if (tab === hovered) value = 'hover';
          if (tab === document.activeElement && tab.matches(':focus-visible')) value = 'focused';
          if (tab === pressed) value = 'pressed';
          if (tab === hovered || tab === document.activeElement || tab === pressed) {
            if (!actual || value === 'focused' || value === 'pressed') actual = value;
          }
        }
        tab.dataset.previewState = tab.disabled ? 'disabled' : value;
      });
      radio('state', actual || settings.state);
    }
    function render(animate = true) {
      const previous = active;
      active = Number(settings.tab);
      tabs.forEach((tab, index) => {
        tab.disabled = settings.state === 'disabled';
        tab.setAttribute('aria-selected', String(index === active));
        tab.tabIndex = index === active && !tab.disabled ? 0 : -1;
        panels[index].hidden = index !== active;
      });
      layout();
      if (previous !== active && animate) {
        const panel = panels[active];
        panel.style.opacity = '0';
        panel.style.transform = `translateX(${active > previous ? 8 : -8}px)`;
        move(panel, { opacity: '1', transform: 'translateX(0)' }, 260);
      }
      state();
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => { settings.tab = String(index); sync(); render(); });
      tab.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { hovered = tab; state(); } });
      tab.addEventListener('pointerleave', () => { if (hovered === tab) hovered = null; state(); });
      tab.addEventListener('pointerdown', () => { pressed = tab; state(); });
      tab.addEventListener('focus', state);
      tab.addEventListener('blur', () => { pressed = null; queueMicrotask(state); });
      tab.addEventListener('keydown', event => {
        const enabled = tabs.filter(item => !item.disabled);
        const current = enabled.indexOf(tab);
        let next;
        if (event.key === 'ArrowRight') next = enabled[(current + 1) % enabled.length];
        if (event.key === 'ArrowLeft') next = enabled[(current - 1 + enabled.length) % enabled.length];
        if (event.key === 'Home') next = enabled[0];
        if (event.key === 'End') next = enabled.at(-1);
        if (next) {
          event.preventDefault();
          tabs.forEach(item => { item.tabIndex = item === next ? 0 : -1; });
          next.focus({ preventScroll: true });
        }
        if (event.key === ' ' || event.key === 'Enter') { pressed = tab; state(); }
      });
    });
    const release = () => { pressed = null; state(); };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('keyup', release);
    preview.querySelector('.demo-tablist').addEventListener('focusout', event => {
      if (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget)) tabs.forEach((tab, index) => { tab.tabIndex = index === active && !tab.disabled ? 0 : -1; });
    });
    return {
      render() { hovered = pressed = null; render(); },
      reset() { hovered = pressed = null; render(false); },
      layout,
      cleanup() { hovered = pressed = null; state(); },
    };
  }

  function tooltipDemo() {
    const stage = preview.querySelector('.tooltip-stage');
    const trigger = stage.querySelector('.tooltip-trigger');
    const tooltip = stage.querySelector('.demo-tooltip');
    let hovered = false, focused = false, hideTimer, copyTimer, copyGeneration = 0;
    let positionBurst = [], spin;
    function spinAfterRapidChanges() {
      const now = performance.now();
      positionBurst = positionBurst.filter(time => now - time < 1600);
      positionBurst.push(now);
      if (positionBurst.length < 4) return;
      positionBurst = [];
      window.TRDSTrophies?.unlock('round');
      if (reduced.matches) return;
      const from = parseFloat(getComputedStyle(trigger).rotate) || 0;
      spin?.cancel();
      spin = trigger.animate([{ rotate: `${from}deg` }, { rotate: '375deg', offset: .75 }, { rotate: '356deg', offset: .9 }, { rotate: '360deg' }], { duration: 900, easing: 'cubic-bezier(.22,.8,.25,1)' });
      const current = spin;
      current.finished.then(() => { if (spin === current) { spin.cancel(); spin = null; } }, () => {});
    }
    function layout() {
      const horizontal = ['left', 'right'].includes(settings.position);
      // Rotation is decorative; layout uses the unrotated button dimensions.
      const button = { width: trigger.offsetWidth, height: trigger.offsetHeight };
      const width = stage.clientWidth, height = stage.clientHeight;
      tooltip.style.maxWidth = `${Math.max(64, horizontal ? width - button.width - 8 : width)}px`;
      const tip = tooltip.getBoundingClientRect();
      let bx = width / 2, by = height / 2, tx = bx, ty = by;
      if (horizontal) {
        const sign = settings.position === 'right' ? 1 : -1;
        bx -= sign * (tip.width + 8) / 2;
        tx = bx + sign * (button.width / 2 + 8 + tip.width / 2);
      } else {
        const sign = settings.position === 'bottom' ? 1 : -1;
        by -= sign * (tip.height + 8) / 2;
        ty = by + sign * (button.height / 2 + 8 + tip.height / 2);
      }
      trigger.style.left = `${bx}px`; trigger.style.top = `${by}px`;
      tooltip.style.left = `${tx}px`; tooltip.style.top = `${ty}px`;
    }
    function show(visible, animate = true) {
      clearTimeout(hideTimer);
      settings.visibility = visible ? 'show' : 'hide';
      sync();
      tooltip.setAttribute('aria-hidden', String(!visible));
      tooltip.style.visibility = 'visible';
      if (visible) trigger.setAttribute('aria-describedby', tooltip.id);
      else trigger.removeAttribute('aria-describedby');
      const finish = () => { tooltip.style.visibility = visible ? 'visible' : 'hidden'; };
      if (animate) move(tooltip, { opacity: visible ? '1' : '0' }, 180, finish);
      else { tooltip.style.opacity = visible ? '1' : '0'; finish(); }
    }
    const leave = () => {
      clearTimeout(hideTimer);
      if (!hovered && !focused) hideTimer = setTimeout(() => show(false), 120);
    };
    [trigger, tooltip].forEach(element => {
      element.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { hovered = true; clearTimeout(hideTimer); show(true); } });
      element.addEventListener('pointerleave', () => { hovered = false; leave(); });
    });
    trigger.addEventListener('focus', () => { focused = true; show(true); });
    trigger.addEventListener('blur', () => { focused = false; leave(); });
    form.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); show(false); } });
    trigger.addEventListener('click', async () => {
      const generation = ++copyGeneration;
      clearTimeout(copyTimer);
      try {
        await navigator.clipboard.writeText(location.href.split('#')[0]);
        if (generation !== copyGeneration) return;
        tooltip.textContent = 'Ссылка скопирована'; status.textContent = 'Ссылка скопирована';
      } catch {
        if (generation !== copyGeneration) return;
        tooltip.textContent = 'Не удалось скопировать'; status.textContent = 'Не удалось скопировать ссылку';
      }
      layout(); show(true);
      copyTimer = setTimeout(() => { tooltip.textContent = 'Скопировать ссылку'; layout(); if (!hovered && !focused) show(false); }, 1800);
    });
    function cleanup() {
      spin?.cancel(); spin = null; positionBurst = [];
      copyGeneration++;
      clearTimeout(hideTimer); clearTimeout(copyTimer);
      tooltip.textContent = 'Скопировать ссылку';
      hovered = focused = false;
      layout();
    }
    return {
      render(name) { layout(); show(settings.visibility === 'show'); if (name === 'position') spinAfterRapidChanges(); },
      reset() { cleanup(); layout(); show(true, false); },
      layout,
      cleanup,
    };
  }

  function tableDemo() {
    const body = preview.querySelector('tbody');
    const rows = [...body.rows];
    const checks = rows.map(row => row.querySelector('.row-check'));
    const names = rows.map(row => row.querySelector('.table-name').textContent);
    const emails = rows.map(row => row.cells[2].textContent);
    const roles = rows.map(row => row.querySelector('.table-value').textContent);
    const amounts = [12, 8, 3];
    const sortButton = preview.querySelector('.table-sort');
    const heading = preview.querySelector('.table-value-heading');
    const dialog = document.querySelector('.member-dialog');
    let demoRow = 2, hovered = null;
    function openMember(index) {
      dialog.querySelector('h2').textContent = names[index];
      dialog.querySelector('.member-email').textContent = emails[index];
      dialog.querySelector('.member-role').textContent = roles[index];
      dialog.showModal();
    }
    dialog.querySelector('button').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const box = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
    });
    function cells() {
      heading.textContent = { text: 'Роль', number: 'Проекты', link: 'Профиль', badge: 'Роль', custom: 'Роль' }[settings.cell];
      rows.forEach((row, index) => {
        const cell = row.querySelector('.table-value');
        const value = document.createElement(settings.cell === 'link' ? 'button' : 'span');
        value.className = `table-${settings.cell}`;
        value.textContent = roles[index];
        if (settings.cell === 'number') value.textContent = amounts[index].toLocaleString('ru');
        if (settings.cell === 'link') {
          value.type = 'button'; value.setAttribute('aria-label', `Открыть профиль: ${names[index]}`);
          const label = document.createElement('span'); label.textContent = 'Открыть профиль';
          value.replaceChildren(label);
          value.addEventListener('click', () => openMember(index));
        }
        if (settings.cell === 'custom') {
          const avatar = document.createElement('span'); avatar.className = 'table-avatar'; avatar.setAttribute('aria-hidden', 'true');
          avatar.textContent = names[index].split(' ').map(word => word[0]).join('');
          value.prepend(avatar);
        }
        cell.replaceChildren(value);
      });
    }
    function state() {
      rows.forEach((row, index) => {
        row.dataset.selected = String(checks[index].checked);
        row.dataset.previewState = hovered === row ? 'hover' : index === demoRow ? settings.state : 'default';
      });
      radio('state', hovered ? 'hover' : settings.state);
      radio('selected', String(checks[demoRow].checked));
    }
    function sort() {
      const sorted = [...rows];
      if (settings.sort !== 'none') sorted.sort((a, b) => names[Number(a.dataset.row)].localeCompare(names[Number(b.dataset.row)], 'ru') * (settings.sort === 'descending' ? -1 : 1));
      // Перемещение существующих строк сохраняет выбор и обработчики.
      for (const row of sorted) body.append(row);
      sortButton.closest('th').setAttribute('aria-sort', settings.sort);
    }
    rows.forEach((row, index) => {
      checks[index].addEventListener('change', () => {
        demoRow = index; settings.selected = String(checks[index].checked); sync(); state();
      });
      row.addEventListener('click', event => {
        if (event.target.closest('button, a, input, label')) return;
        checks[index].checked = !checks[index].checked;
        checks[index].dispatchEvent(new Event('change', { bubbles: true }));
      });
      row.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { hovered = row; state(); } });
      row.addEventListener('pointerleave', () => { if (hovered === row) hovered = null; state(); });
      row.addEventListener('focusin', () => { demoRow = index; settings.selected = String(checks[index].checked); state(); });
    });
    sortButton.addEventListener('click', () => {
      const order = ['none', 'ascending', 'descending'];
      settings.sort = order[(order.indexOf(settings.sort) + 1) % order.length]; sync(); sort();
    });
    return {
      render(name) {
        hovered = null;
        if (name === 'cell' || !name) cells();
        if (name === 'sort' || !name) sort();
        if (name === 'selected') checks[demoRow].checked = settings.selected === 'true';
        state();
      },
      reset() {
        demoRow = 2; hovered = null;
        checks.forEach((check, index) => { check.checked = index === 2; });
        if (dialog.open) dialog.close();
        cells(); sort(); state();
      },
      cleanup() { hovered = null; state(); },
    };
  }

  sync();
  controller = { modal: modalDemo, tab: tabDemo, tooltip: tooltipDemo, table: tableDemo }[kind]();
  controller.render();
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('change', event => {
    if (!event.target.matches('.play-setting input')) return;
    settings[event.target.name] = event.target.value;
    sync(); controller.render(event.target.name);
  });
  form.addEventListener('reset', () => {
    queueMicrotask(() => {
      finishMotions();
      settings = { ...defaults }; status.textContent = '';
      sync(); controller.reset();
    });
  });
  const cleanup = () => { finishMotions(); controller.cleanup?.(); };
  window.addEventListener('blur', cleanup);
  window.addEventListener('pagehide', cleanup);
  window.addEventListener('hashchange', cleanup);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cleanup(); });
  reduced.addEventListener('change', cleanup);
  const resize = new ResizeObserver(() => { finishMotions(); controller.layout?.(); });
  resize.observe(preview);
  document.fonts.ready.then(() => controller.layout?.());
})();
