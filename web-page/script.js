const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');

toggle.addEventListener('click', () => {
  const isOpen = links.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(isOpen));
});

links.addEventListener('click', () => {
  links.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
});

const lightbox = document.querySelector('.lightbox');
const lightboxImage = lightbox.querySelector('img');
const closeButton = lightbox.querySelector('button');
let lastFocused = null;

function closeLightbox() {
  lightbox.classList.remove('open');
  lastFocused?.focus();
}

document.querySelectorAll('.zoom').forEach((button) => {
  button.addEventListener('click', () => {
    const image = button.querySelector('img');
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    lastFocused = button;
    lightbox.classList.add('open');
    closeButton.focus();
  });
});

lightbox.addEventListener('click', (event) => {
  if (event.target !== lightboxImage) {
    closeLightbox();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && lightbox.classList.contains('open')) {
    closeLightbox();
  }
});

const navLinks = [...links.querySelectorAll('a')];
const observer = new IntersectionObserver(
  (entries) => {
    entries
      .filter((entry) => entry.isIntersecting)
      .forEach((entry) => {
        navLinks.forEach((link) => {
          link.classList.toggle('active', link.hash === `#${entry.target.id}`);
        });
      });
  },
  { rootMargin: '-40% 0px -55% 0px' },
);

document.querySelectorAll('section[id]').forEach((section) => {
  observer.observe(section);
});
