// ==================== FUNCIONALIDADES DO CABEÇALHO (LEGADO) ====================
// Atenção: Login e saudação de usuário agora são controlados por js/cabecalho-melhorado.js
// Este arquivo mantém apenas a Lista de Desejos baseada no cliente.

document.addEventListener('DOMContentLoaded', function() {
  // ==================== LISTA DE DESEJOS ====================
  function inicializarListaDesejos() {
    const botaoDesejos = document.getElementById('botao-desejos');
    const dropdownDesejos = document.getElementById('dropdown-desejos');
    const contadorDesejos = document.getElementById('contador-desejos');
    const totalDesejos = document.getElementById('total-desejos');
    const listaDesejosConteudo = document.getElementById('lista-desejos-conteudo');

    if (!botaoDesejos || !dropdownDesejos) return;

    // Carregar lista de desejos do localStorage, validando IDs e renderizando com dados da API
    async function carregarListaDesejos() {
      const desejos = JSON.parse(localStorage.getItem('listaDesejos') || '[]');

      let produtosApi = [];
      try {
        const API_BASE = window.API_BASE || window.location.origin;
        const resp = await fetch(`${API_BASE}/api/products`);
        if (resp.ok) {
          const json = await resp.json();
          produtosApi = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
        }
      } catch (_) {}

      const validIds = new Set(produtosApi.map(p => Number(p.id)));
      const desejosFiltrados = Array.isArray(desejos)
        ? desejos.filter(it => validIds.has(Number(it.id)))
        : [];

      // Persistir filtragem (mantém apenas objetos com {id})
      try { localStorage.setItem('listaDesejos', JSON.stringify(desejosFiltrados.map(d => ({ id: d.id })))); } catch (_) {}

      if (contadorDesejos) contadorDesejos.textContent = desejosFiltrados.length;
      if (totalDesejos) totalDesejos.textContent = `${desejosFiltrados.length} ${desejosFiltrados.length === 1 ? 'item' : 'itens'}`;

      if (listaDesejosConteudo) {
        if (desejosFiltrados.length === 0) {
          listaDesejosConteudo.innerHTML = '<p class="lista-vazia">Sua lista de desejos está vazia</p>';
        } else {
          const produtosDesejos = desejosFiltrados
            .map(it => produtosApi.find(p => Number(p.id) === Number(it.id)))
            .filter(Boolean);

          listaDesejosConteudo.innerHTML = produtosDesejos.map(produto => {
            const precoML = Number(produto.precoMercadoLivre || 0);
            const precoAMZ = Number(produto.precoAmazon || 0);
            const menorPreco = Math.min(...[precoML, precoAMZ].filter(v => v > 0));
            const precoTexto = menorPreco > 0
              ? `R$ ${menorPreco.toFixed(2).replace('.', ',')}`
              : 'Indisponível';

            let img = produto.imagem;
            try {
              let imgs = produto.imagens;
              if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch (_) {} }
              if ((!img || !/^https?:\/\/.+|imagens\//i.test(String(img))) && Array.isArray(imgs)) {
                const cand = imgs.find(u => /^https?:\/\/.+|imagens\//i.test(String(u)));
                if (cand) img = cand;
              }
            } catch (_) {}
if (!img) img = '/imagens/logos/logo-cabecalho.png';

            return `
              <div class="item-desejo">
<img src="${img}" alt="${produto.titulo}" class="item-imagem" onerror="this.src='/imagens/logos/logo-cabecalho.png'">
                <div class="item-detalhes">
                  <h4 class="item-titulo">${produto.titulo}</h4>
                  <p class="item-preco">${precoTexto}</p>
                </div>
  <a class="ir-produto" href="/pagina-produto?id=${produto.id}" aria-label="Ver produto">Ver</a>
                <button class="remover-item" onclick="removerDosDesejos(${produto.id})" aria-label="Remover">&times;</button>
              </div>
            `;
          }).join('');
        }
      }
    }

    carregarListaDesejos();
  }

  // Inicializações principais (login é tratado por cabecalho-melhorado.js)
  inicializarListaDesejos();

  // (Removido) Toggle mobile de categorias — agora as categorias somem progressivamente até restar apenas "DEPARTAMENTOS" em telas menores.
});

// ==================== APIs globais usadas em páginas ====================
// Mantém lista de desejos no cliente (até ter backend próprio)
window.adicionarAosDesejos = function(produto) {
  const lista = JSON.parse(localStorage.getItem('listaDesejos') || '[]');
  const id = Number(produto?.id);
  if (!id) return;
  if (!lista.some(p => Number(p.id) === id)) {
    lista.push({ id });
    localStorage.setItem('listaDesejos', JSON.stringify(lista));
  }
};

window.removerDosDesejos = function(produtoId) {
  const lista = JSON.parse(localStorage.getItem('listaDesejos') || '[]');
  const novaLista = lista.filter(p => p.id !== produtoId);
  localStorage.setItem('listaDesejos', JSON.stringify(novaLista));
};
