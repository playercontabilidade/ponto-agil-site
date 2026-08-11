function animarContador(elemento, alvo, duracao = 2000) {
  let inicio = 0;
  const incremento = alvo / (duracao / 16);
  const timer = setInterval(() => {
    inicio += incremento;
    if (inicio >= alvo) {
      elemento.textContent = `+${Math.floor(alvo)}`;
      clearInterval(timer);
    } else {
      elemento.textContent = `+${Math.floor(inicio)}`;
    }
  }, 16);
}

function inicializarScrollReveal() {
  const elementos = document.querySelectorAll('[data-scroll-reveal]');

  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada, indice) => {
        if (entrada.isIntersecting && !entrada.target.classList.contains('revealed')) {
          const atraso = (indice % 6) * 100;
          setTimeout(() => {
            entrada.target.classList.add('revealed');
            const subtitulo = entrada.target
              .closest('.hero-content-wrapper')
              ?.querySelector('.hero-subtitle');
            if (subtitulo && !subtitulo.classList.contains('expanded')) {
              setTimeout(() => subtitulo.classList.add('expanded'), 500);
            }
          }, atraso);
          observador.unobserve(entrada.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -100px 0px' },
  );

  elementos.forEach((elemento) => observador.observe(elemento));

  const observadorCards = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada, indice) => {
        if (entrada.isIntersecting && !entrada.target.classList.contains('revealed')) {
          setTimeout(() => {
            entrada.target.classList.add('revealed');
            const icone = entrada.target.querySelector('.feature-icon, .benefit-icon');
            if (icone) {
              icone.style.transform = 'scale(1.2)';
              setTimeout(() => {
                icone.style.transform = 'scale(1)';
              }, 300);
            }
          }, (indice % 6) * 80);
          observadorCards.unobserve(entrada.target);
        }
      });
    },
    { threshold: 0.2, rootMargin: '0px 0px -50px 0px' },
  );

  document
    .querySelectorAll('.feature-card[data-scroll-reveal], .benefit-item[data-scroll-reveal]')
    .forEach((card) => observadorCards.observe(card));
}

function inicializarObservadorSecoes() {
  const opcoes = { threshold: 0.15, rootMargin: '0px 0px -100px 0px' };
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada, indice) => {
      if (entrada.isIntersecting) {
        const atraso = entrada.target.dataset.delay || indice * 0.1;
        setTimeout(() => {
          entrada.target.classList.add('animate-in');
          if (entrada.target.classList.contains('stat-number') && !entrada.target.classList.contains('counted')) {
            entrada.target.classList.add('counted');
            animarContador(entrada.target, parseInt(entrada.target.getAttribute('data-target'), 10));
          }
        }, atraso * 1000);
      }
    });
  }, opcoes);

  document.querySelectorAll('.section-title, .section-subtitle').forEach((titulo, indice) => {
    titulo.dataset.delay = String(indice * 0.1);
    observador.observe(titulo);
  });

  document.querySelectorAll('.stat-number').forEach((stat) => observador.observe(stat));

  const depoimento = document.querySelector('.testimonial-card');
  if (depoimento) {
    depoimento.dataset.delay = '0';
    observador.observe(depoimento);
  }

  const faixaContato = document.querySelector('.contact-strip__inner');
  if (faixaContato) {
    faixaContato.dataset.delay = '0';
    observador.observe(faixaContato);
  }

  const imagemHero = document.querySelector('.hero-image .prototype-placeholder');
  const subtituloHero = document.querySelector('.hero-subtitle');
  if (imagemHero) {
    const observadorHero = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            setTimeout(() => {
              entrada.target.classList.add('animate-in');
              if (subtituloHero) {
                setTimeout(() => subtituloHero.classList.add('expanded'), 600);
              }
            }, 400);
            observadorHero.unobserve(entrada.target);
          }
        });
      },
      { threshold: 0.3 },
    );
    observadorHero.observe(imagemHero);
  }
}

export function inicializarAnimacoesPagina() {
  document.querySelectorAll('a[href^="#"]').forEach((ancora) => {
    ancora.addEventListener('click', function (evento) {
      evento.preventDefault();
      const alvo = document.querySelector(this.getAttribute('href'));
      if (!alvo) return;
      const posicao = alvo.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({ top: posicao, behavior: 'smooth' });
    });
  });

  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.pageYOffset > 50) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    });
  }

  let aguardandoParallax = false;
  window.addEventListener('scroll', () => {
    if (aguardandoParallax) return;
    aguardandoParallax = true;
    window.requestAnimationFrame(() => {
      const scroll = window.pageYOffset;
      const fundoHero = document.querySelector('.hero-background');
      const conteudoHero = document.querySelector('.hero-content');
      if (fundoHero && scroll < window.innerHeight) {
        fundoHero.style.transform = `translateY(${scroll * 0.4}px) scale(${1 + scroll * 0.0003})`;
        if (conteudoHero) {
          conteudoHero.style.opacity = String(Math.max(0, 1 - scroll / window.innerHeight));
        }
      }
      aguardandoParallax = false;
    });
  });

  document.addEventListener('mousemove', (evento) => {
    document.querySelectorAll('.feature-card, .benefit-item').forEach((card) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', `${evento.clientX - rect.left}px`);
      card.style.setProperty('--mouse-y', `${evento.clientY - rect.top}px`);
    });
  });

  inicializarObservadorSecoes();

  window.addEventListener('load', () => {
    document.body.classList.add('loaded');
    inicializarScrollReveal();
  });
}
