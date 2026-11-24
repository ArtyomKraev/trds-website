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
  const tabs = [...form.querySelectorAll('[role="tab"]')];
  const panels = [...form.querySelectorAll('[role="tabpanel"]')];
  const digits = [...form.querySelectorAll('.ds-code__digit')];
  const choices = [...form.querySelectorAll('.ds-choice__input')];
  const email = form.querySelector('#demo-email');
  const comment = form.querySelector('#demo-comment');
  const toggle = form.querySelector('#demo-toggle');
  const fileInput = form.querySelector('#demo-files');
  const zone = form.querySelector('.ds-upload');
  let files = [];
  let dragDepth = 0;

  const currentInputs = () => activeField === 'code' ? digits : [activeField === 'area' ? comment : email];
  const syncValue = () => setSetting('value', currentInputs().some((input) => input.value.length) ? 'filled' : 'empty');
  const updateCounter = () => { form.querySelector('#comment-counter').value = `${comment.value.length}/200`; };
  const applyState = () => {
    form.dataset.state = state.state || 'enabled';
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
    }
    if (choices.length) {
      choices.forEach((input) => {
        input.type = state.type;
        input.disabled = state.state === 'disabled';
        input.setAttribute('aria-invalid', String(state.state === 'error'));
      });
      if (kind === 'selection-control') choices[0].checked = state.selected === 'on';
      form.querySelectorAll('.ds-choice__helper').forEach((helper) => {
        helper.hidden = state.description === 'single';
        const input = helper.closest('.ds-choice').querySelector('input');
        if (helper.hidden) input.removeAttribute('aria-describedby');
        else input.setAttribute('aria-describedby', helper.id);
      });
    }
    if (toggle) toggle.checked = state.selected === 'on';
    if (zone) {
      const dragging = state.state === 'dragging' || dragDepth > 0;
      form.dataset.dragging = String(dragging);
      zone.querySelector('.ds-upload__drop').hidden = !dragging;
    }
  };
  const selectTab = (tab, focus = false) => {
    activeField = tab.id.replace('tab-', '');
    tabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    panels.forEach((panel) => { panel.hidden = panel.id !== tab.getAttribute('aria-controls'); });
    syncValue();
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
    readSettings();
    if (kind === 'fields' && input.name === 'value') {
      const values = activeField === 'text' ? ['name@company.ru'] : activeField === 'area' ? ['Добавьте доступ для команды.'] : ['1','2','3','4','5','6'];
      currentInputs().forEach((field, i) => { field.value = state.value === 'filled' ? values[i] : ''; });
    }
    // Смена Checkbox → Radio сохраняет только один выбранный элемент.
    if (choices.length && input.name === 'type' && state.type === 'radio') {
      const first = choices.find((choice) => choice.checked);
      choices.forEach((choice) => { choice.checked = choice === first; });
    }
    applyState();
  });
  choices.forEach((input) => input.addEventListener('change', () => {
    if (kind === 'selection-control') setSetting('selected', input.checked ? 'on' : 'off');
  }));
  toggle?.addEventListener('change', () => setSetting('selected', toggle.checked ? 'on' : 'off'));
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
      const label = document.createElement('span');
      label.textContent = file.name;
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
      row.append(label, remove);
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
    settings.forEach((input) => { input.checked = input.defaultChecked; });
    readSettings();
    preview.querySelectorAll('input, textarea').forEach((input) => {
      if (input.type !== 'file') input.value = input.defaultValue;
      else input.value = '';
    });
    choices.forEach((input) => { input.type = 'checkbox'; input.checked = input.defaultChecked; });
    if (tabs.length) selectTab(tabs[0]);
    if (zone) { files = []; dragDepth = 0; renderFiles(); }
    applyState();
  });
  readSettings();
  applyState();
});
