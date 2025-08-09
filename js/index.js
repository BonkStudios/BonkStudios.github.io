// Banner Carousel
const slides = document.querySelectorAll('.banner-slide');
const dots = document.querySelectorAll('.dot');
let currentSlide = 0;

const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('active');
});

function showSlide(index) {
  slides.forEach((slide, i) => {
    slide.classList.toggle('active', i === index);
    dots[i].classList.toggle('active', i === index);
  });
  currentSlide = index;
}

document.querySelector('.carousel-btn.prev').addEventListener('click', () => {
  const newIndex = (currentSlide - 1 + slides.length) % slides.length;
  showSlide(newIndex);
});

document.querySelector('.carousel-btn.next').addEventListener('click', () => {
  const newIndex = (currentSlide + 1) % slides.length;
  showSlide(newIndex);
});

dots.forEach((dot, i) => {
  dot.addEventListener('click', () => showSlide(i));
});

// Auto slide (optional)
setInterval(() => {
  const newIndex = (currentSlide + 1) % slides.length;
  showSlide(newIndex);
}, 10000); // troca a cada 10 segundos

// Scroll das thumbs com botões
document.querySelectorAll('.thumb-carousel').forEach(carousel => {
  const thumbs = carousel.querySelector('.thumbs');
  const leftBtn = carousel.querySelector('.thumb-btn.left');
  const rightBtn = carousel.querySelector('.thumb-btn.right');

  function getThumbWidth() {
    const thumb = thumbs.querySelector('.thumb');
    const style = getComputedStyle(thumb);
    const margin = parseFloat(style.marginLeft) + parseFloat(style.marginRight);
    return thumb.offsetWidth + margin;
  }

  function scrollToThumb(direction) {
    const thumbWidth = getThumbWidth();
    const currentScroll = thumbs.scrollLeft;

    const currentIndex = Math.round(currentScroll / thumbWidth);
    const newIndex = direction === 'right' ? currentIndex + 1 : currentIndex - 1;
    const newScrollPosition = newIndex * thumbWidth;

    thumbs.scrollTo({ left: newScrollPosition, behavior: 'smooth' });
  }

  leftBtn.addEventListener('click', () => scrollToThumb('left'));
  rightBtn.addEventListener('click', () => scrollToThumb('right'));
});

