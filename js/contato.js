// Envio de contato ao backend usando API_BASE
(function(){
  function setLoading(loading) {
    const btn = document.getElementById('btnEnviar');
    if (btn) {
      btn.disabled = !!loading;
      btn.textContent = loading ? 'Enviando...' : 'Enviar';
    }
  }

  async function enviarContato(payload) {
    const url = '/api/contact'; // será prefixado por API_BASE pelo config.js
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    const data = await resp.json().catch(() => ({ ok: false }));
    if (!resp.ok || !data.ok) {
      throw new Error(data && data.message || 'Falha ao enviar contato');
    }
    return data;
  }

  function validarCampos(nome, email, mensagem) {
    if (!nome || nome.length < 2) return 'Informe seu nome completo.';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Informe um email válido.';
    if (!mensagem || mensagem.length < 10) return 'Escreva uma mensagem com pelo menos 10 caracteres.';
    return null;
  }

  function limparFormulario() {
    try {
      document.getElementById('campoNome').value = '';
      document.getElementById('campoEmail').value = '';
      document.getElementById('campoMensagem').value = '';
    } catch(_){}
  }

  function init() {
    const form = document.getElementById('formContato');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nome = (document.getElementById('campoNome')?.value || '').trim();
      const email = (document.getElementById('campoEmail')?.value || '').trim();
      const mensagem = (document.getElementById('campoMensagem')?.value || '').trim();
      const erro = validarCampos(nome, email, mensagem);
      if (erro) {
        window.sitePopup && window.sitePopup.alert(erro, 'Atenção');
        return;
      }
      setLoading(true);
      try {
        await enviarContato({ nome, email, mensagem });
        window.sitePopup && window.sitePopup.alert('Mensagem enviada com sucesso! Em breve entraremos em contato.', 'Sucesso');
        limparFormulario();
      } catch (err) {
        window.sitePopup && window.sitePopup.alert(String(err && err.message || err), 'Erro');
      } finally {
        setLoading(false);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

