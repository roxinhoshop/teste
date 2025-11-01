// Mapeamento de links externos por ID de produto
(function(){
  const links = {
    mercadoLivre: {
      // Exemplo: 1: 'https://www.mercadolivre.com.br/exemplo-produto-1'
    },
    amazon: {
      // Exemplo: 1: 'https://www.amazon.com.br/dp/EXEMPLO1'
    }
  };

  window.obterLinkMercadoLivre = function(id){
    return links.mercadoLivre[id] || null;
  };

  window.obterLinkAmazon = function(id){
    return links.amazon[id] || null;
  };
})();