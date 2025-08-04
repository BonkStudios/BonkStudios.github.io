// Banner Carousel
const slides = document.querySelectorAll('.banner-slide');
const dots = document.querySelectorAll('.dot');
let currentSlide = 0;

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
const thumbs = document.querySelector('.thumbs');
const leftBtn = document.querySelector('.thumb-btn.left');
const rightBtn = document.querySelector('.thumb-btn.right');

leftBtn.addEventListener('click', () => {
  thumbs.scrollBy({ left: -300, behavior: 'smooth' });
});

rightBtn.addEventListener('click', () => {
  thumbs.scrollBy({ left: 300, behavior: 'smooth' });
});
