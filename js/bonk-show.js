document.addEventListener('DOMContentLoaded', () => {
  const catalogGrid = document.getElementById('catalog-grid');
  const filterBtns = document.querySelectorAll('.filter-btn');
  
  // Controlo do Carrossel de Séries (avança 1 ecrã inteiro = 5 séries)
  const seriesCarousel = document.getElementById('series-carousel');
  const seriesControls = document.getElementById('series-controls');
  const seriesCards = seriesCarousel.querySelectorAll('.series-card');

  if (seriesCards.length <= 5) {
    seriesControls.style.display = 'none'; // Esconde as setas até terem mais de 5 séries
  } else {
    document.getElementById('series-prev').addEventListener('click', () => {
      seriesCarousel.scrollBy({ left: -seriesCarousel.clientWidth, behavior: 'smooth' });
    });
    document.getElementById('series-next').addEventListener('click', () => {
      seriesCarousel.scrollBy({ left: seriesCarousel.clientWidth, behavior: 'smooth' });
    });
  }

  // Controlo da Prateleira de Shorts
  const shortsShelf = document.getElementById('shorts-shelf');
  document.getElementById('shorts-prev').addEventListener('click', () => {
    shortsShelf.scrollBy({ left: -600, behavior: 'smooth' });
  });
  document.getElementById('shorts-next').addEventListener('click', () => {
    shortsShelf.scrollBy({ left: 600, behavior: 'smooth' });
  });

  // Carrega os vídeos do ficheiro JSON
  async function carregarVideos() {
    try {
      const response = await fetch('videos.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Não foi possível carregar videos.json');
      
      const videos = await response.json();

      // Ordena do mais recente para o mais antigo (vídeos sem data vão para o fim)
      videos.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));
      renderizarCatalogo(videos);
    } catch (erro) {
      console.error('Erro ao carregar o catálogo:', erro);
      catalogGrid.innerHTML = '<p style="color: #888;">Erro ao carregar os vídeos.</p>';
    }
  }

  function formatarData(dataISO) {
    if (!dataISO) return '';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  }
  
  // Cria os cartões no HTML
  function renderizarCatalogo(videos) {
    catalogGrid.innerHTML = '';
    shortsShelf.innerHTML = '';

    videos.forEach(video => {
      const thumbUrl = video.thumb || `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`;

      const nomesCategorias = {
        episodio: 'Episódio',
        trailer: 'Teaser / Trailer',
        live: 'Live',
        especial: 'Especial'
      };

      // Se for Short, vai para a prateleira 9:16
      if (video.categoria === 'short') {
        const shortCard = document.createElement('a');
        shortCard.href = `https://www.youtube.com/shorts/${video.id}`;
        shortCard.target = '_blank';
        shortCard.rel = 'noopener noreferrer';
        shortCard.className = 'short-card';
        shortCard.innerHTML = `
          <img src="${thumbUrl}" alt="${video.titulo}" loading="lazy"
            onload="if (this.naturalWidth <= 120) { this.onload=null; this.src='https://img.youtube.com/vi/${video.id}/hqdefault.jpg'; }"
            onerror="this.onerror=null; this.src='https://img.youtube.com/vi/${video.id}/hqdefault.jpg';" />
          <span class="short-title">${video.titulo}</span>
        `;
        shortsShelf.appendChild(shortCard);
        return;
      }

      const nomeCat = nomesCategorias[video.categoria];
      const badgeCategoria = nomeCat
        ? `<span class="badge-categoria cat-${video.categoria}">${nomeCat}</span>`
        : '';
      
      const dataHtml = video.data ? `<span class="thumb-date">${formatarData(video.data)}</span>` : '';

      // Verifica se o vídeo saiu nos últimos 30 dias
      const ehRecente = video.data && (Date.now() - new Date(video.data)) / (1000 * 60 * 60 * 24) <= 30;

      let badgeTopo = '';
      if (video.membros) {
        badgeTopo = '<span class="badge-membros">★ Membros</span>';
      } else if (video.novo || ehRecente) {
        badgeTopo = '<span class="badge-novo">★ Novo</span>';
      }

      const card = document.createElement('a');
      card.href = `https://www.youtube.com/watch?v=${video.id}`;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      card.className = 'thumb-card';
      card.setAttribute('data-category', video.categoria);
      card.setAttribute('data-membros', video.membros ? 'true' : 'false');

      card.innerHTML = `
        ${badgeTopo}
        ${badgeCategoria}
        <img src="${thumbUrl}" alt="${video.titulo}" loading="lazy"
          onerror="this.onerror=null; this.src='https://img.youtube.com/vi/${video.id}/hqdefault.jpg';" />
        <div class="thumb-overlay">
          <h3>${video.titulo}</h3>
          <p>${video.descricao}</p>
          ${dataHtml}
        </div>
      `;
      catalogGrid.appendChild(card);
    });
  }

  // Lógica dos filtros
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filtro = btn.getAttribute('data-filter');
      const cards = catalogGrid.querySelectorAll('.thumb-card');

      cards.forEach(card => {
        const ehMembros = card.getAttribute('data-membros') === 'true';
        const categoria = card.getAttribute('data-category');

        if (
          filtro === 'todos' ||
          (filtro === 'membros' && ehMembros) ||
          categoria === filtro
        ) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  carregarVideos();
});