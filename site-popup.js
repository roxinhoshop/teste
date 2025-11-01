// Popup global reutilizável (alert/confirm/prompt) com fallback seguro
(function() {
  if (window.sitePopup) return; // evitar redefinições

  function ensureContainer() {
    if (document.querySelector('.site-popup-overlay')) return;
    const overlay = document.createElement('div');
    overlay.className = 'site-popup-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `
      <div class="site-popup" role="dialog" aria-modal="true">
        <div class="site-popup-header">
          <span class="site-popup-title">Aviso</span>
          <button class="site-popup-close" aria-label="Fechar">&times;</button>
        </div>
        <div class="site-popup-content"></div>
        <div class="site-popup-actions"></div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  function show(opts) {
    ensureContainer();
    const overlay = document.querySelector('.site-popup-overlay');
    const modal = overlay.querySelector('.site-popup');
    const titleEl = modal.querySelector('.site-popup-title');
    const contentEl = modal.querySelector('.site-popup-content');
    const actionsEl = modal.querySelector('.site-popup-actions');

    titleEl.textContent = opts.title || 'Aviso';
    contentEl.innerHTML = opts.message || '';
    modal.className = 'site-popup ' + (opts.variant || 'info');
    actionsEl.innerHTML = '';

    const buttons = opts.buttons || [{ label: 'OK', variant: 'primary', value: true }];
    buttons.forEach(btnDef => {
      const btn = document.createElement('button');
      btn.className = 'site-popup-btn ' + (btnDef.variant || 'primary');
      btn.textContent = btnDef.label;
      btn.addEventListener('click', () => {
        overlay.style.display = 'none';
        if (opts.resolve) opts.resolve(btnDef.value);
      });
      actionsEl.appendChild(btn);
    });

    const closeBtn = modal.querySelector('.site-popup-close');
    closeBtn.onclick = () => { overlay.style.display = 'none'; if (opts.resolve) opts.resolve(false); };
    overlay.onclick = (e) => { if (e.target === overlay) { overlay.style.display = 'none'; if (opts.resolve) opts.resolve(false); } };

    overlay.style.display = 'flex';
  }

  function alertPopup(message, title = 'Aviso', variant = 'info') {
    return new Promise(resolve => show({ message, title, variant, resolve }));
  }

  function confirmPopup(message, title = 'Confirmar') {
    return new Promise(resolve => show({
      message,
      title,
      variant: 'confirm',
      resolve,
      buttons: [
        { label: 'Cancelar', variant: 'ghost', value: false },
        { label: 'Confirmar', variant: 'primary', value: true }
      ]
    }));
  }

  function promptPopup(message, title = 'Entrada', placeholder = 'Digite aqui...') {
    return new Promise(resolve => {
      ensureContainer();
      const overlay = document.querySelector('.site-popup-overlay');
      const modal = overlay.querySelector('.site-popup');
      const titleEl = modal.querySelector('.site-popup-title');
      const contentEl = modal.querySelector('.site-popup-content');
      const actionsEl = modal.querySelector('.site-popup-actions');

      titleEl.textContent = title;
      modal.className = 'site-popup prompt';
      contentEl.innerHTML = `<p>${message}</p><input class="site-popup-input" placeholder="${placeholder}" autofocus />`;
      actionsEl.innerHTML = '';

      const btnCancel = document.createElement('button');
      btnCancel.className = 'site-popup-btn ghost';
      btnCancel.textContent = 'Cancelar';
      btnCancel.onclick = () => { overlay.style.display = 'none'; resolve(null); };

      const btnOk = document.createElement('button');
      btnOk.className = 'site-popup-btn primary';
      btnOk.textContent = 'OK';
      btnOk.onclick = () => { const val = modal.querySelector('.site-popup-input').value; overlay.style.display = 'none'; resolve(val); };

      actionsEl.append(btnCancel, btnOk);

      const closeBtn = modal.querySelector('.site-popup-close');
      closeBtn.onclick = () => { overlay.style.display = 'none'; resolve(null); };
      overlay.onclick = (e) => { if (e.target === overlay) { overlay.style.display = 'none'; resolve(null); } };

      overlay.style.display = 'flex';
    });
  }

  window.sitePopup = { alert: alertPopup, confirm: confirmPopup, prompt: promptPopup };
})();

