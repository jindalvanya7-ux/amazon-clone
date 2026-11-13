const button = document.querySelector('.nav-toggle');
const menu = document.querySelector('.mobile-menu');

if (button && menu) {
  button.addEventListener('click', function () {
    const open = menu.classList.toggle('open');
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}
