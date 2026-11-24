// Интерактивные примеры используют нативные поля и единое состояние настроек.
document.querySelectorAll('[data-component]').forEach((form) => {
  const kind = form.dataset.component;
  const preview = form.querySelector('.playground__preview');
  const settings = [...form.querySelectorAll('.play-setting input')];
  const state = {};
  const readSettings = () => settings.forEach((input) => { if (input.checked) state[input.name] = input.value; });
  const setSetting = (name, value) => {
    state[name] = value;
    settings.filter((input) => input.name === name).forEach((input) => { input.checked = input.value === value; });
  };
  let activeField = 'text';
  let activeSelection = 'item';
  const tabs = [...form.querySelectorAll('[role="tab"]')];
  const defaultTab = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true');
  const panels = [...form.querySelectorAll('[role="tabpanel"]')];
  const digits = [...form.querySelectorAll('.ds-code__digit')];
  const choices = [...form.querySelectorAll('.ds-choice__input')];
  const email = form.querySelector('#demo-email');
  const comment = form.querySelector('#demo-comment');
  const toggle = form.querySelector('#demo-toggle');
  const bell = form.querySelector('.toggle-bell');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let bellAnimation;
  let selectionFall = [];
  const stopSelectionFall = () => { selectionFall.forEach((animation) => animation.cancel()); selectionFall = []; };
  const dropSelection = () => {
    stopSelectionFall();
    const items = choices.filter((input) => input.name === 'example-choice');
    if (reducedMotion.matches || activeSelection !== 'item' || state.description !== 'single' || !items.length || !items.every((input) => input.type === 'checkbox' && input.checked)) return;
    const rows = items.map((input) => input.closest('.ds-choice'));
    const stage = preview.getBoundingClientRect();
    const bounds = rows.map((row) => row.getBoundingClientRect());
    let top = stage.bottom - 32 - bounds.reduce((sum, rect) => sum + rect.height + 2, 0);
    selectionFall = rows.map((row, index) => {
      const y = Math.max(0, top - bounds[index].top);
      top += bounds[index].height + 2;
      const x = index ? 4 : -5;
      const angle = index ? 2 : -3;
      return row.animate([
        { transform: 'none', offset: 0, easing: 'cubic-bezier(.4,0,1,1)' },
        { transform: `translate(${x}px, ${y}px) rotate(${angle}deg)`, offset: .25, easing: 'ease-out' },
        { transform: `translate(${x}px, ${Math.max(0, y - 7)}px) rotate(${angle}deg)`, offset: .31, easing: 'ease-in' },
        { transform: `translate(${x}px, ${y}px) rotate(${angle}deg)`, offset: .37 },
        { transform: `translate(${x}px, ${y}px) rotate(${angle}deg)`, offset: .72, easing: 'cubic-bezier(.22,.8,.25,1)' },
        { transform: 'none', offset: 1 }
      ], { duration: 1800, delay: index * 45 });
    });
  };
  // Нативные inputs остаются доступны; отдельный декоративный слой двигает только цифры.
  const codeClips = digits.map((input, index) => {
    const clip = document.createElement('span');
    clip.className = 'ds-code__clip';
    clip.setAttribute('aria-hidden', 'true');
    clip.style.gridColumn = input.style.gridColumn = String(index + 1);
    input.placeholder = ' ';
    input.parentElement.append(clip);
    return clip;
  });
  const codeMotion = [
    { transform: 'translateY(-36px) scale(.92)', offset: 0, easing: 'cubic-bezier(.18,.75,.25,1)' },
    { transform: 'translateY(3px) scale(1.04)', offset: .65, easing: 'ease-out' },
    { transform: 'translateY(-1px) scale(1)', offset: .84, easing: 'ease-in-out' },
    { transform: 'none', offset: 1 }
  ];
  const codeMotionDuration = 400;
  const renderCode = (animate = false) => {
    let sequence = 0;
    digits.forEach((input, index) => {
      const clip = codeClips[index];
      if (clip.dataset.value === input.value) return;
      const previous = clip.dataset.value;
      clip.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
      clip.replaceChildren();
      clip.dataset.value = input.value;
      if (!input.value) {
        if (animate && previous && !reducedMotion.matches) {
          const outgoing = document.createElement('span');
          outgoing.className = 'ds-code__glyph';
          outgoing.dataset.exiting = '';
          outgoing.textContent = previous;
          clip.append(outgoing);
          const exit = outgoing.animate(codeMotion, {
            duration: codeMotionDuration, direction: 'reverse', fill: 'forwards'
          });
          exit.onfinish = () => outgoing.remove();
        }
        return;
      }
      const glyph = document.createElement('span');
      glyph.className = 'ds-code__glyph';
      glyph.textContent = input.value;
      clip.append(glyph);
      if (animate && !reducedMotion.matches) glyph.animate(codeMotion, {
        duration: codeMotionDuration, delay: sequence++ * 35, fill: 'backwards'
      });
    });
  };
  renderCode();
  if (digits.length) digits[0].parentElement.dataset.animated = '';
  const fileInput = form.querySelector('#demo-files');
  const zone = form.querySelector('.ds-upload');
  let files = [];
  let dragDepth = 0;
  const defaultState = kind === 'fields' || kind === 'upload' ? 'default' : 'enabled';
  const previewHasFocus = () => preview.contains(document.activeElement) && document.activeElement.matches('input, textarea, .toggle-bell');
  const ringBell = () => {
    bellAnimation?.cancel();
    if (!bell || reducedMotion.matches) return;
    bellAnimation = bell.querySelector('.toggle-bell__on').animate(
      [0, -16, 13, -9, 6, -3, 0].map((angle) => ({ transform: `rotate(${angle}deg)` })),
      { duration: 560, easing: 'ease-in-out' }
    );
  };

  const currentInputs = () => activeField === 'code' ? digits : [activeField === 'area' ? comment : email];
  const syncValue = () => { setSetting('value', currentInputs().some((input) => input.value.length) ? 'filled' : 'empty'); renderCode(true); };
  const updateCounter = () => { form.querySelector('#comment-counter').value = `${comment.value.length}/200`; };
  const applyState = () => {
    const focused = previewHasFocus();
    const effectiveState = focused ? 'focused' : state.state || defaultState;
    form.dataset.focused = String(focused);
    form.dataset.state = ['error', 'disabled'].includes(state.state) ? state.state : effectiveState;
    settings.filter((input) => input.name === 'state').forEach((input) => { input.checked = input.value === effectiveState; });
    form.dataset.size = state.size || 'm';
    if (kind === 'fields') {
      [email, comment, ...digits].forEach((input) => {
        input.disabled = state.state === 'disabled';
        input.setAttribute('aria-invalid', String(state.state === 'error'));
        const errorId = input === email ? 'email-error' : input === comment ? 'comment-error' : 'code-error';
        const description = [input === comment ? 'comment-counter' : '', state.state === 'error' ? errorId : ''].filter(Boolean).join(' ');
        if (description) input.setAttribute('aria-describedby', description);
        else input.removeAttribute('aria-describedby');
      });
      form.querySelectorAll('.field-error').forEach((error) => { error.hidden = state.state !== 'error'; });
      form.querySelector('[data-setting="size"]').hidden = activeField === 'code';
      updateCounter();
      renderCode();
    }
    if (choices.length) {
      choices.forEach((input) => {
        input.type = state.type;
        input.disabled = state.state === 'disabled';
        input.setAttribute('aria-invalid', String(state.state === 'error'));
      });
      if (kind === 'selection') {
        form.dataset.description = state.description;
        form.querySelector('#demo-choice').checked = state.selected === 'on';
        form.querySelector('[data-setting="selected"]').hidden = activeSelection !== 'control';
        form.querySelector('[data-setting="description"]').hidden = activeSelection !== 'item';
      }
      form.querySelectorAll('.ds-choice__helper').forEach((helper) => {
        helper.hidden = state.description === 'single';
        const input = helper.closest('.ds-choice').querySelector('input');
        if (helper.hidden) input.removeAttribute('aria-describedby');
        else input.setAttribute('aria-describedby', helper.id);
      });
    }
    if (toggle) {
      const wasOn = toggle.checked;
      toggle.checked = state.selected === 'on';
      bell.setAttribute('aria-pressed', String(toggle.checked));
      bell.querySelector('.toggle-bell__on').hidden = !toggle.checked;
      bell.querySelector('.toggle-bell__off').hidden = toggle.checked;
      if (toggle.checked && !wasOn) ringBell();
      if (!toggle.checked) bellAnimation?.cancel();
    }
    if (zone) {
      const dragging = state.state === 'dragging' || dragDepth > 0;
      form.dataset.dragging = String(dragging);
      zone.querySelector('.ds-upload__drop').hidden = !dragging;
    }
  };
  const selectTab = (tab, focus = false) => {
    stopSelectionFall();
    if (kind === 'fields') activeField = tab.id.replace('tab-', '');
    else activeSelection = tab.id.replace('tab-', '');
    tabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    panels.forEach((panel) => { panel.hidden = panel.id !== tab.getAttribute('aria-controls'); });
    if (kind === 'fields') syncValue();
    applyState();
    if (focus) tab.focus({ preventScroll: true });
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      selectTab(tabs[next], true);
    });
  });
  form.addEventListener('submit', (event) => event.preventDefault());
  form.addEventListener('change', (event) => {
    const input = event.target;
    if (!input.closest('.play-setting')) return;
    stopSelectionFall();
    state[input.name] = input.value;
    if (kind === 'fields' && input.name === 'value') {
      const values = activeField === 'text' ? ['name@company.ru'] : activeField === 'area' ? ['Добавьте доступ для команды.'] : ['1','2','3','4','5','6'];
      currentInputs().forEach((field, i) => { field.value = state.value === 'filled' ? values[i] : ''; });
    }
    // Смена Checkbox → Radio сохраняет только один выбранный элемент.
    if (choices.length && input.name === 'type' && state.type === 'radio') {
      const items = choices.filter((choice) => choice.name === 'example-choice');
      const first = items.find((choice) => choice.checked);
      items.forEach((choice) => { choice.checked = choice === first; });
    }
    applyState();
  });
  choices.forEach((input) => input.addEventListener('change', () => {
    if (input.id === 'demo-choice') setSetting('selected', input.checked ? 'on' : 'off');
    else dropSelection();
  }));
  toggle?.addEventListener('change', () => {
    setSetting('selected', toggle.checked ? 'on' : 'off');
    applyState();
    if (toggle.checked) ringBell();
  });
  bell?.addEventListener('click', () => {
    setSetting('selected', toggle.checked ? 'off' : 'on');
    applyState();
  });
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) return;
    bellAnimation?.cancel();
    stopSelectionFall();
    codeClips.forEach((clip) => {
      clip.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
      clip.querySelectorAll('[data-exiting]').forEach((glyph) => glyph.remove());
    });
  });
  preview.addEventListener('pointerdown', stopSelectionFall);
  preview.addEventListener('keydown', stopSelectionFall);
  window.addEventListener('resize', stopSelectionFall);
  preview.addEventListener('focusin', applyState);
  preview.addEventListener('focusout', (event) => {
    if (preview.contains(event.relatedTarget)) return;
    if (state.state === 'focused') state.state = defaultState;
    // Новый activeElement устанавливается после focusout; не перехватываем фокус.
    queueMicrotask(applyState);
  });
  if (kind === 'fields') {
    [email, comment].forEach((input) => input.addEventListener('input', () => {
      syncValue();
      updateCounter();
      if (state.state === 'error' && input === email && email.validity.valid && email.value) {
        setSetting('state', 'focused');
        applyState();
      }
    }));
    email.addEventListener('blur', () => {
      if (email.value && !email.validity.valid && !email.disabled) {
        setSetting('state', 'error');
        applyState();
      }
    });
    // Поддерживает вставку полного кода, автозаполнение, стрелки и Backspace.
    const distribute = (text, start) => {
      const clean = text.replace(/\D/g, '').slice(0, 6);
      if (!clean) return;
      const from = clean.length === 6 ? 0 : start;
      [...clean].slice(0, 6 - from).forEach((value, offset) => { digits[from + offset].value = value; });
      renderCode(true);
      const next = digits[Math.min(from + clean.length, 5)];
      next.focus({ preventScroll: true });
      next.select();
      syncValue();
    };
    digits.forEach((input, index) => {
      input.addEventListener('focus', () => input.select());
      input.addEventListener('input', () => {
        const clean = input.value.replace(/\D/g, '');
        input.value = clean.slice(0, 1);
        if (clean) distribute(clean, index);
        syncValue();
      });
      input.addEventListener('paste', (event) => {
        event.preventDefault();
        distribute(event.clipboardData.getData('text'), index);
      });
      input.addEventListener('keydown', (event) => {
        let next;
        if (event.key === 'ArrowLeft') next = Math.max(0, index - 1);
        if (event.key === 'ArrowRight') next = Math.min(5, index + 1);
        if (event.key === 'Backspace' && !input.value && index > 0) {
          next = index - 1;
          digits[next].value = '';
          syncValue();
        }
        if (next === undefined) return;
        event.preventDefault();
        digits[next].focus({ preventScroll: true });
        digits[next].select();
      });
    });
  }
  const renderFiles = () => {
    const list = form.querySelector('.upload-files');
    list.replaceChildren();
    list.hidden = !files.length;
    files.forEach((file, index) => {
      const row = document.createElement('li');
      const icon = document.createElement('span');
      icon.className = 'upload-file__icon';
      icon.append(form.querySelector('#file-icon').content.cloneNode(true));
      const details = document.createElement('span');
      details.className = 'upload-file__details';
      const label = document.createElement('span');
      label.className = 'upload-file__name';
      label.textContent = file.name;
      label.title = file.name;
      const size = document.createElement('span');
      size.className = 'upload-file__size';
      const units = ['Б', 'КБ', 'МБ', 'ГБ'];
      const unit = file.size ? Math.min(Math.floor(Math.log(file.size) / Math.log(1024)), 3) : 0;
      size.textContent = `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: unit ? 1 : 0 }).format(file.size / 1024 ** unit)} ${units[unit]}`;
      details.append(label, size);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Убрать ${file.name}`);
      remove.append(form.querySelector('#remove-file-icon').content.cloneNode(true));
      remove.addEventListener('click', () => {
        files.splice(index, 1);
        renderFiles();
        const remaining = list.querySelectorAll('button');
        (remaining[Math.min(index, remaining.length - 1)] || fileInput).focus({ preventScroll: true });
      });
      row.append(icon, details, remove);
      list.append(row);
    });
    form.querySelector('#upload-status').textContent = files.length ? `Выбрано файлов: ${files.length}` : 'Файлы не выбраны';
  };
  if (zone) {
    const acceptFiles = (picked) => {
      for (const file of picked) {
        if (!files.some((other) => other.name === file.name && other.size === file.size && other.lastModified === file.lastModified)) files.push(file);
      }
      dragDepth = 0;
      setSetting('state', 'default');
      applyState();
      renderFiles();
      fileInput.value = '';
    };
    fileInput.addEventListener('change', () => acceptFiles(fileInput.files));
    const isFileDrag = (event) => [...(event.dataTransfer?.types || [])].includes('Files');
    zone.addEventListener('dragenter', (event) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      dragDepth += 1;
      applyState();
    });
    zone.addEventListener('dragover', (event) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    });
    zone.addEventListener('dragleave', (event) => {
      if (event.relatedTarget && zone.contains(event.relatedTarget)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (!event.relatedTarget || !zone.contains(event.relatedTarget)) dragDepth = 0;
      applyState();
    });
    zone.addEventListener('drop', (event) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      acceptFiles(event.dataTransfer.files);
    });
    window.addEventListener('blur', () => { dragDepth = 0; applyState(); });
  }
  form.addEventListener('reset', (event) => {
    event.preventDefault();
    stopSelectionFall();
    settings.forEach((input) => { input.checked = input.defaultChecked; });
    readSettings();
    preview.querySelectorAll('input, textarea').forEach((input) => {
      if (input.type !== 'file') input.value = input.defaultValue;
      else input.value = '';
    });
    choices.forEach((input) => { input.type = 'checkbox'; input.checked = input.defaultChecked; });
    if (tabs.length) selectTab(defaultTab);
    if (zone) { files = []; dragDepth = 0; renderFiles(); }
    applyState();
  });
  readSettings();
  if (kind === 'selection') {
    const fromHash = tabs.find((tab) => tab.id === `tab-${location.hash.slice(1)}`);
    selectTab(fromHash || defaultTab);
    window.addEventListener('hashchange', () => {
      const requested = tabs.find((tab) => tab.id === `tab-${location.hash.slice(1)}`);
      if (requested) selectTab(requested);
    });
  }
  applyState();
});
