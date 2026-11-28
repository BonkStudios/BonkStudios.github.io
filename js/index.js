// Menu Mobile (funciona em todas as páginas)
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });
}

// Banner Carousel (só corre se existir na página)
const slides = document.querySelectorAll('.banner-slide');
const dots = document.querySelectorAll('.dot');
const prevBtn = document.querySelector('.carousel-btn.prev');
const nextBtn = document.querySelector('.carousel-btn.next');

if (slides.length > 0 && prevBtn && nextBtn) {
  let currentSlide = 0;

  function showSlide(index) {
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
      if (dots[i]) dots[i].classList.toggle('active', i === index);
    });
    currentSlide = index;
  }

  prevBtn.addEventListener('click', () => {
    const newIndex = (currentSlide - 1 + slides.length) % slides.length;
    showSlide(newIndex);
  });

  nextBtn.addEventListener('click', () => {
    const newIndex = (currentSlide + 1) % slides.length;
    showSlide(newIndex);
  });

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => showSlide(i));
  });

  setInterval(() => {
    const newIndex = (currentSlide + 1) % slides.length;
    showSlide(newIndex);
  }, 10000);
}

// Scroll das thumbs com botões
document.querySelectorAll('.thumb-carousel').forEach(carousel => {
  const thumbs = carousel.querySelector('.thumbs');
  const leftBtn = carousel.querySelector('.thumb-btn.left');
  const rightBtn = carousel.querySelector('.thumb-btn.right');

  if (!thumbs || !leftBtn || !rightBtn) return;

  function getThumbWidth() {
    const thumb = thumbs.querySelector('.thumb');
    if (!thumb) return 300;
    const style = getComputedStyle(thumb);
    const margin = parseFloat(style.marginLeft) + parseFloat(style.marginRight);
    return thumb.offsetWidth + margin;
  }

  function scrollToThumb(direction) {
    const thumbWidth = getThumbWidth();
    const currentIndex = Math.round(thumbs.scrollLeft / thumbWidth);
    const newIndex = direction === 'right' ? currentIndex + 1 : currentIndex - 1;
    thumbs.scrollTo({ left: newIndex * thumbWidth, behavior: 'smooth' });
  }

  leftBtn.addEventListener('click', () => scrollToThumb('left'));
  rightBtn.addEventListener('click', () => scrollToThumb('right'));
});

function formatarData(dataISO) {
  if (!dataISO) return '';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

// Carregar carrosséis da Home a partir dos videos.json de cada canal
async function carregarCarrosselHome(containerId, jsonPath, limite = 8) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const response = await fetch(jsonPath, { cache: 'no-store' });
    if (!response.ok) return; // Se o JSON ainda não existir, mantém o HTML atual

    const videos = await response.json();

    // Ordena do mais recente para o mais antigo (vídeos sem data vão para o fim)
    videos.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));

    // Filtra apenas vídeos 16:9 (exclui Shorts) e limita a quantidade
    const lancamentos = videos
      .filter(v => !['short', 'live'].includes(v.categoria))
      .slice(0, limite);

    if (lancamentos.length === 0) return;

    const nomesCategorias = {
      episodio: 'Episódio',
      trailer: 'Teaser / Trailer',
      live: 'Live',
      especial: 'Extras'
    };

    container.innerHTML = '';

    lancamentos.forEach(video => {
      const thumbUrl = video.thumb || `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`;
      // Verifica se o vídeo saiu nos últimos 30 dias
      const ehRecente = video.data && (Date.now() - new Date(video.data)) / (1000 * 60 * 60 * 24) <= 30;

      let badgeTopo = '';
      if (video.membros) {
        badgeTopo = '<span class="badge-membros">★ Membros</span>';
      } else if (video.novo || ehRecente) {
        badgeTopo = '<span class="badge-novo">★ Novo</span>';
      }
      const nomeCat = nomesCategorias[video.categoria];
      const badgeCategoria = nomeCat
        ? `<span class="badge-categoria cat-${video.categoria}">${nomeCat}</span>`
        : '';
      const dataHtml = video.data ? `<span class="thumb-date">${formatarData(video.data)}</span>` : '';

      const card = document.createElement('a');
      card.href = `https://www.youtube.com/watch?v=${video.id}`;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      card.className = 'thumb';

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

      container.appendChild(card);
    });
  } catch (erro) {
    console.warn(`Ainda sem JSON em ${jsonPath}, a manter conteúdo estático.`);
  }
}

// Ativar na Home
carregarCarrosselHome('home-bonk-show', 'bonk-show/videos.json');
carregarCarrosselHome('home-bonk-music', 'bonk-music/videos.json');
carregarCarrosselHome('home-bonk-play', 'bonk-play/videos.json');

// Modal de Trailer nas páginas de Séries (suporta 1 ou vários trailers)
const trailerBtns = document.querySelectorAll('[data-trailer], [data-trailers]');

if (trailerBtns.length > 0) {
  const modal = document.createElement('div');
  modal.className = 'trailer-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="trailer-modal-content">
      <button type="button" class="trailer-modal-close" aria-label="Fechar trailer">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <div class="trailer-tabs"></div>
      <div class="trailer-video-wrap">
        <iframe allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const modalContent = modal.querySelector('.trailer-modal-content');
  const tabsContainer = modal.querySelector('.trailer-tabs');
  const iframe = modal.querySelector('iframe');
  const closeBtn = modal.querySelector('.trailer-modal-close');

  function carregarVideo(videoId) {
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  }

  function abrirTrailers(lista) {
    tabsContainer.innerHTML = '';

    if (lista.length > 1) {
      tabsContainer.style.display = 'flex';
      modalContent.classList.remove('single-trailer');

      lista.forEach((item, index) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = `trailer-tab${index === 0 ? ' active' : ''}`;
        tab.textContent = item.titulo;
        tab.addEventListener('click', () => {
          tabsContainer.querySelectorAll('.trailer-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          carregarVideo(item.id);
        });
        tabsContainer.appendChild(tab);
      });
    } else {
      tabsContainer.style.display = 'none';
      modalContent.classList.add('single-trailer');
    }

    carregarVideo(lista[0].id);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function fecharTrailer() {
    modal.classList.remove('active');
    iframe.src = '';
    document.body.style.overflow = '';
  }

  trailerBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const rawLista = btn.getAttribute('data-trailers');
      const singleId = btn.getAttribute('data-trailer');

      if (rawLista) {
        const lista = rawLista
          .split(',')
          .map(par => {
            const [titulo, id] = par.split('|').map(s => s.trim());
            return { titulo, id };
          })
          .filter(item => item.id);

        if (lista.length > 0) abrirTrailers(lista);
      } else if (singleId) {
        abrirTrailers([{ titulo: 'Trailer', id: singleId.trim() }]);
      }
    });
  });

  closeBtn.addEventListener('click', fecharTrailer);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) fecharTrailer();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      fecharTrailer();
    }
  });
}

// Carregamento dinâmico do Elenco de Vozes e Produção da Dublagem via cast.json
async function carregarElenco() {
  const section = document.getElementById('cast-section');
  if (!section) return;

  const jsonPath = section.getAttribute('data-cast-src');
  if (!jsonPath) return;

  const tabsContainer = section.querySelector('.lang-tabs');
  const grid = section.querySelector('.cast-grid');
  const dubProdCard = document.getElementById('dub-production-card');

  function gerarIniciais(nome) {
    const partes = nome.trim().split(/\s+/);
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return nome.slice(0, 2).toUpperCase();
  }

  function renderizarProducaoDub(info, codigo) {
    if (!dubProdCard) return;

    const lista = info.producao || [];
    if (lista.length === 0) {
      dubProdCard.hidden = true;
      dubProdCard.innerHTML = '';
      return;
    }

    const label = info.label || codigo.toUpperCase();
    dubProdCard.hidden = false;
    dubProdCard.innerHTML = `<h4>Produção da Dublagem (${label})</h4>`;

    lista.forEach(item => {
      const p = document.createElement('p');
      let valorHtml = item.valor;

      if (item.links && item.links.length > 0) {
        const linksHtml = item.links
          .map(l => `<a href="${l.url}" target="_blank" rel="noopener noreferrer">${l.label}</a>`)
          .join(' • ');
        valorHtml += ` (${linksHtml})`;
      }

      p.innerHTML = `<strong>${item.funcao}:</strong> ${valorHtml}`;
      dubProdCard.appendChild(p);
    });
  }

  function renderizarIdioma(info, codigo) {
    grid.innerHTML = '';

    (info.elenco || []).forEach(membro => {
      const temLink = Boolean(membro.link);
      const card = document.createElement(temLink ? 'a' : 'div');
      card.className = 'cast-card';

      if (temLink) {
        card.href = membro.link;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
      }

      const avatarHtml = membro.avatar
        ? `<img src="${membro.avatar}" alt="${membro.nome}" class="cast-avatar" loading="lazy">`
        : `<div class="cast-avatar cast-placeholder" aria-hidden="true">${gerarIniciais(membro.nome)}</div>`;

      card.innerHTML = `
        ${avatarHtml}
        <div class="cast-info">
          <h4>${membro.nome}</h4>
          <span>${membro.personagem}</span>
        </div>
      `;

      grid.appendChild(card);
    });

    renderizarProducaoDub(info, codigo);
  }

  try {
    const response = await fetch(jsonPath, { cache: 'no-store' });
    if (!response.ok) throw new Error('Não foi possível carregar o elenco');

    const dados = await response.json();
    const codigos = Object.keys(dados.idiomas || {});
    if (codigos.length === 0) return;

    tabsContainer.innerHTML = '';

    if (codigos.length > 1) {
      codigos.forEach((codigo, index) => {
        const info = dados.idiomas[codigo];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `lang-tab${index === 0 ? ' active' : ''}`;
        btn.textContent = info.label || codigo.toUpperCase();

        btn.addEventListener('click', () => {
          tabsContainer.querySelectorAll('.lang-tab').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderizarIdioma(info, codigo);
        });

        tabsContainer.appendChild(btn);
      });
    }

    const primeiro = codigos[0];
    renderizarIdioma(dados.idiomas[primeiro], primeiro);
  } catch (erro) {
    console.error('Erro ao carregar elenco:', erro);
  }
}

carregarElenco();
