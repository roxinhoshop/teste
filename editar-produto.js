const API_BASE = window.API_BASE || window.location.origin;

function getParamId() {
  const p = new URLSearchParams(window.location.search);
  const id = parseInt(p.get('id'));
  return isNaN(id) ? null : id;
}

async function carregarProduto(id) {
  const status = document.getElementById('status');
  try {
    const resp = await fetch(`${API_BASE}/api/products/${id}`);
    if (!resp.ok) throw new Error('Falha ao carregar produto');
    const json = await resp.json();
    const p = json?.data;
    if (!p) throw new Error('Produto não encontrado');

    document.getElementById('idProduto').value = p.id;
    document.getElementById('titulo').value = p.titulo || '';
    document.getElementById('descricao').value = p.descricao || '';

    let imgs = [];
    if (Array.isArray(p.imagens)) imgs = p.imagens;
    else if (typeof p.imagens === 'string') { try { imgs = JSON.parse(p.imagens); } catch(_){} }
    imgs = Array.isArray(imgs) ? imgs.slice(0,4) : [];
    while (imgs.length < 4) imgs.push('');
    document.getElementById('img1').value = imgs[0] || '';
    document.getElementById('img2').value = imgs[1] || '';
    document.getElementById('img3').value = imgs[2] || '';
    document.getElementById('img4').value = imgs[3] || '';

    document.getElementById('precoML').value = p.precoMercadoLivre ?? '';
    document.getElementById('precoAMZ').value = p.precoAmazon ?? '';
    document.getElementById('linkML').value = p.linkMercadoLivre || '';
    document.getElementById('linkAMZ').value = p.linkAmazon || '';
    document.getElementById('mlId').value = p.mercadoLivreId || '';
    document.getElementById('asin').value = p.amazonAsin || '';

    status.textContent = 'Produto carregado';
    status.style.color = '#10b981';
  } catch (e) {
    status.textContent = e.message || 'Erro ao carregar produto';
    status.style.color = '#ef4444';
  }
}

async function salvarProduto() {
  const status = document.getElementById('status');
  const id = parseInt(document.getElementById('idProduto').value);
  if (!id) {
    status.textContent = 'Informe um ID válido';
    status.style.color = '#ef4444';
    return;
  }

  const payload = {
    titulo: document.getElementById('titulo').value.trim(),
    descricao: document.getElementById('descricao').value.trim(),
    imagens: [
      document.getElementById('img1').value.trim(),
      document.getElementById('img2').value.trim(),
      document.getElementById('img3').value.trim(),
      document.getElementById('img4').value.trim()
    ].filter(u => u),
    precoMercadoLivre: document.getElementById('precoML').value.trim() || null,
    precoAmazon: document.getElementById('precoAMZ').value.trim() || null,
    linkMercadoLivre: document.getElementById('linkML').value.trim(),
    linkAmazon: document.getElementById('linkAMZ').value.trim(),
    mercadoLivreId: document.getElementById('mlId').value.trim(),
    amazonAsin: document.getElementById('asin').value.trim()
  };

  try {
    const resp = await fetch(`${API_BASE}/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await resp.json();
    if (resp.ok && json.success) {
      status.textContent = 'Produto atualizado com sucesso';
      status.style.color = '#10b981';
    } else {
      throw new Error(json.message || 'Falha ao atualizar');
    }
  } catch (e) {
    status.textContent = e.message || 'Erro ao atualizar';
    status.style.color = '#ef4444';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const paramId = getParamId();
  if (paramId) carregarProduto(paramId);

  document.getElementById('btnCarregar').addEventListener('click', () => {
    const id = parseInt(document.getElementById('idProduto').value);
    if (id) carregarProduto(id);
  });
  document.getElementById('btnSalvar').addEventListener('click', salvarProduto);
});
