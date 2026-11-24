/* Копируем текст без подсветки и сообщаем результат, не меняя размер кнопки. */
(() => {
  const status = document.querySelector('.copy-status');
  const resets = new WeakMap();
  let statusTimer;

  function textFor(target) {
    if (target.matches('code')) return target.textContent.trim();
    return [...target.querySelectorAll('p')].map(paragraph => {
      const copy = paragraph.cloneNode(true);
      copy.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
      return copy.textContent.trim().replace(/\n[ \t]+/g, '\n');
    }).join('\n\n');
  }

  function fallbackCopy(text) {
    // Запасной способ для локального HTML и браузеров без Clipboard API.
    const field = document.createElement('textarea');
    const focused = document.activeElement;
    field.value = text;
    field.readOnly = true;
    field.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.append(field);
    field.select();
    let copied = false;
    try { copied = document.execCommand('copy'); }
    finally { field.remove(); focused?.focus({ preventScroll: true }); }
    return copied;
  }

  function announce(message) {
    clearTimeout(statusTimer);
    status.textContent = message;
    statusTimer = setTimeout(() => { status.textContent = ''; }, 4000);
  }

  document.querySelectorAll('[data-copy]').forEach(button => {
    const label = button.getAttribute('aria-label');
    button.addEventListener('click', async () => {
      if (button.dataset.copying) return;
      const target = document.getElementById(button.dataset.copy);
      if (!target) return;
      button.dataset.copying = 'true';
      clearTimeout(resets.get(button));
      delete button.dataset.copied;
      button.setAttribute('aria-label', label);
      const text = textFor(target);
      try {
        try {
          if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
          await navigator.clipboard.writeText(text);
        } catch {
          if (!fallbackCopy(text)) throw new Error('Copy failed');
        }
        button.dataset.copied = 'true';
        button.setAttribute('aria-label', 'Скопировано');
        announce('Скопировано в буфер обмена');
        resets.set(button, setTimeout(() => {
          delete button.dataset.copied;
          button.setAttribute('aria-label', label);
        }, 2000));
      } catch {
        announce('Не удалось скопировать. Выделите и скопируйте текст вручную.');
      } finally {
        delete button.dataset.copying;
      }
    });
  });
})();
