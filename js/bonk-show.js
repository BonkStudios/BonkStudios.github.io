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
      const response = await fetch('videos.json');
      if (!response.ok) throw new Error('Não foi possível carregar videos.json');
      
      const videos = await response.json();
      renderizarCatalogo(videos);
    } catch (erro) {
      console.error('Erro ao carregar o catálogo:', erro);
      catalogGrid.innerHTML = '<p style="color: #888;">Erro ao carregar os vídeos.</p>';
    }
  }

  // Cria os cartões no HTML
  function renderizarCatalogo(videos) {
    catalogGrid.innerHTML = '';
    shortsShelf.innerHTML = '';

    videos.forEach(video => {
      const thumbUrl = video.thumb || `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`;

      // Se for Short, vai para a prateleira 9:16
      if (video.categoria === 'short') {
        const shortCard = document.createElement('a');
        shortCard.href = `https://www.youtube.com/shorts/${video.id}`;
        shortCard.target = '_blank';
        shortCard.rel = 'noopener noreferrer';
        shortCard.className = 'short-card';
        shortCard.innerHTML = `
          <img src="${thumbUrl}" alt="${video.titulo}" loading="lazy"
            onerror="this.onerror=null; this.src='https://img.youtube.com/vi/${video.id}/hqdefault.jpg';" />
          <span class="short-title">${video.titulo}</span>
        `;
        shortsShelf.appendChild(shortCard);
        return;
      }

      // Caso contrário, vai para a grelha principal 16:9 (com suporte ao selo de membros)
      const badgeMembros = video.membros ? '<span class="badge-membros">★ Membros</span>' : '';
      const card = document.createElement('a');
      card.href = `https://www.youtube.com/watch?v=${video.id}`;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      card.className = 'thumb-card';
      card.setAttribute('data-category', video.categoria);

      card.innerHTML = `
        ${badgeMembros}
        <img src="${thumbUrl}" alt="${video.titulo}" loading="lazy"
          onerror="this.onerror=null; this.src='https://img.youtube.com/vi/${video.id}/hqdefault.jpg';" />
        <div class="thumb-overlay">
          <h3>${video.titulo}</h3>
          <p>${video.descricao}</p>
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
        if (filtro === 'todos' || card.getAttribute('data-category') === filtro) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  carregarVideos();
});