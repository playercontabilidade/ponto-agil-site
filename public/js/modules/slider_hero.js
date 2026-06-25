export function inicializarSliderHero() {
  const titles = document.querySelectorAll('.hero-title');
  const dots = document.querySelectorAll('.slider-dots .dot');
  let slideAtual = 0;
  let intervalo;

  function exibirSlide(indice) {
    titles.forEach((titulo) => titulo.classList.remove('active'));
    dots.forEach((ponto) => ponto.classList.remove('active'));

    if (titles[indice]) titles[indice].classList.add('active');
    if (dots[indice]) dots[indice].classList.add('active');

    slideAtual = indice;
  }

  function proximoSlide() {
    exibirSlide((slideAtual + 1) % titles.length);
  }

  function iniciarSlider() {
    intervalo = setInterval(proximoSlide, 4000);
  }

  dots.forEach((ponto, indice) => {
    ponto.addEventListener('click', () => {
      clearInterval(intervalo);
      exibirSlide(indice);
      iniciarSlider();
    });
  });

  if (titles.length === 0) return;

  exibirSlide(0);
  iniciarSlider();

  const container = document.querySelector('.hero-title-slider');
  if (container) {
    container.addEventListener('mouseenter', () => clearInterval(intervalo));
    container.addEventListener('mouseleave', iniciarSlider);
  }
}
