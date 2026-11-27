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
    const response = await fetch(jsonPath);
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