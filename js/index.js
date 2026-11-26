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