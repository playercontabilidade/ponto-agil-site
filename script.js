// Menu Toggle Mobile
const menuToggle = document.getElementById('menuToggle');
const nav = document.querySelector('.nav');

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        nav.classList.toggle('active');
    });

    // Fechar menu ao clicar em um link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('active');
        });
    });
}

// Scroll suave para links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Header scroll effect com classe
let lastScroll = 0;
const header = document.getElementById('header');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
});

// Animação de contador
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = '+' + Math.floor(target);
            clearInterval(timer);
        } else {
            element.textContent = '+' + Math.floor(start);
        }
    }, 16);
}

// Intersection Observer para animações estilo Apple
const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            // Adicionar delay escalonado para elementos em sequência
            const delay = entry.target.dataset.delay || index * 0.1;
            
            setTimeout(() => {
                if (entry.target.classList.contains('feature-card') || 
                    entry.target.classList.contains('benefit-item') ||
                    entry.target.classList.contains('prototype-item')) {
                    entry.target.classList.add('animate-in');
                } else {
                    entry.target.classList.add('animate-in');
                }

                // Animar contadores
                if (entry.target.classList.contains('stat-number')) {
                    const target = parseInt(entry.target.getAttribute('data-target'));
                    if (!entry.target.classList.contains('counted')) {
                        entry.target.classList.add('counted');
                        animateCounter(entry.target, target);
                    }
                }
            }, delay * 1000);
        }
    });
}, observerOptions);

// Observar elementos para animação estilo Apple
document.addEventListener('DOMContentLoaded', () => {
    // Animar imagem do hero quando visível e expandir texto
    const heroImage = document.querySelector('.hero-image .prototype-placeholder');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    
    if (heroImage) {
        const heroImageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add('animate-in');
                        
                        // Expandir subtítulo quando imagem aparecer
                        if (heroSubtitle) {
                            setTimeout(() => {
                                heroSubtitle.classList.add('expanded');
                            }, 600);
                        }
                    }, 400);
                    heroImageObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        heroImageObserver.observe(heroImage);
    }

    // Animar títulos e subtítulos das seções
    const sectionTitles = document.querySelectorAll('.section-title, .section-subtitle');
    sectionTitles.forEach((title, index) => {
        title.dataset.delay = index * 0.1;
        observer.observe(title);
    });

    // Animar números estatísticos
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        observer.observe(stat);
    });

    // Animar testimonial
    const testimonialCard = document.querySelector('.testimonial-card');
    if (testimonialCard) {
        testimonialCard.dataset.delay = '0';
        observer.observe(testimonialCard);
    }

    // Animar lead capture
    const leadContent = document.querySelector('.lead-content');
    if (leadContent) {
        leadContent.dataset.delay = '0';
        observer.observe(leadContent);
    }
});

// Form submission com Formspree
const leadForm = document.getElementById('leadForm');
if (leadForm) {
    leadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const button = leadForm.querySelector('button[type="submit"]');
        const buttonText = button.querySelector('.btn-text');
        const formMessage = document.getElementById('form-message');
        const originalText = buttonText ? buttonText.textContent : button.textContent;
        
        // Feedback visual durante o envio
        if (buttonText) {
            buttonText.textContent = 'Enviando...';
        } else {
            button.textContent = 'Enviando...';
        }
        button.disabled = true;
        formMessage.style.display = 'none';
        
        // Coletar dados do formulário
        const formData = new FormData(leadForm);
        
        try {
            const response = await fetch(leadForm.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                // Sucesso
                if (buttonText) {
                    buttonText.textContent = '✓ Enviado com sucesso!';
                } else {
                    button.textContent = '✓ Enviado com sucesso!';
                }
                button.style.background = '#10b981';
                button.disabled = true;
                
                formMessage.textContent = 'Obrigado! Entraremos em contato em breve.';
                formMessage.style.display = 'block';
                formMessage.className = 'form-message success';
                
                leadForm.reset();
            } else {
                // Erro
                const data = await response.json();
                if (data.errors) {
                    formMessage.textContent = data.errors.map(error => error.message).join(', ');
                } else {
                    formMessage.textContent = 'Ops! Algo deu errado. Tente novamente.';
                }
                formMessage.style.display = 'block';
                formMessage.className = 'form-message error';
                
                if (buttonText) {
                    buttonText.textContent = originalText;
                } else {
                    button.textContent = originalText;
                }
                button.disabled = false;
            }
        } catch (error) {
            // Erro de rede
            formMessage.textContent = 'Erro de conexão. Verifique sua internet e tente novamente.';
            formMessage.style.display = 'block';
            formMessage.className = 'form-message error';
            
            if (buttonText) {
                buttonText.textContent = originalText;
            } else {
                button.textContent = originalText;
            }
            button.disabled = false;
        }
    });
}

// Adicionar efeito parallax sutil no hero estilo Apple
let ticking = false;

function updateParallax() {
    const scrolled = window.pageYOffset;
    const heroBackground = document.querySelector('.hero-background');
    const heroContent = document.querySelector('.hero-content');
    
    if (heroBackground && scrolled < window.innerHeight) {
        const parallaxSpeed = 0.4;
        heroBackground.style.transform = `translateY(${scrolled * parallaxSpeed}px) scale(${1 + scrolled * 0.0003})`;
        
        if (heroContent) {
            heroContent.style.opacity = Math.max(0, 1 - scrolled / window.innerHeight);
        }
    }
    
    ticking = false;
}

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
    }
});

// Efeito de parallax para seção de protótipos
function updatePrototypesParallax() {
    const prototypesSection = document.querySelector('.prototypes');
    if (!prototypesSection) return;
    
    const rect = prototypesSection.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
    
    if (isVisible) {
        const scrolled = window.pageYOffset;
        const sectionTop = prototypesSection.offsetTop;
        const parallaxOffset = (scrolled - sectionTop) * 0.2;
        
        const prototypeItems = document.querySelectorAll('.prototype-item');
        prototypeItems.forEach((item, index) => {
            const delay = index * 20;
            item.style.transform = `translateY(${parallaxOffset + delay}px)`;
        });
    }
}

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            updatePrototypesParallax();
            ticking = true;
            setTimeout(() => { ticking = false; }, 100);
        });
    }
});

// Sistema avançado de scroll reveal com animações escalonadas
function initScrollReveal() {
    const revealElements = document.querySelectorAll('[data-scroll-reveal]');
    
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting && !entry.target.classList.contains('revealed')) {
                // Adicionar delay escalonado baseado no índice
                const delay = (index % 6) * 100;
                
                setTimeout(() => {
                    entry.target.classList.add('revealed');
                    
                    // Animação especial para imagem do hero
                    if (entry.target.tagName === 'IMG' || entry.target.classList.contains('prototype-placeholder')) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0) scale(1)';
                    }
                    
                    // Animação para expansão de texto do subtítulo
                    const subtitle = entry.target.closest('.hero-content-wrapper')?.querySelector('.hero-subtitle');
                    if (subtitle && !subtitle.classList.contains('expanded')) {
                        setTimeout(() => {
                            subtitle.classList.add('expanded');
                        }, 500);
                    }
                    
                }, delay);
                
                // Não observar mais este elemento
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -100px 0px'
    });
    
    revealElements.forEach((element) => {
        revealObserver.observe(element);
    });
    
    // Observer especial para cards de features e benefits
    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting && !entry.target.classList.contains('revealed')) {
                const delay = (index % 6) * 80;
                
                setTimeout(() => {
                    entry.target.classList.add('revealed');
                    
                    // Animar ícone dentro do card
                    const icon = entry.target.querySelector('.feature-icon, .benefit-icon');
                    if (icon) {
                        icon.style.transform = 'scale(1.2)';
                        setTimeout(() => {
                            icon.style.transform = 'scale(1)';
                        }, 300);
                    }
                }, delay);
                
                cardObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
    });
    
    const cards = document.querySelectorAll('.feature-card[data-scroll-reveal], .benefit-item[data-scroll-reveal]');
    cards.forEach(card => cardObserver.observe(card));
}

// Preload de imagens (se houver)
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
    initScrollReveal();
});

// Slider de frases do hero
function initHeroSlider() {
    const titles = document.querySelectorAll('.hero-title');
    const dots = document.querySelectorAll('.slider-dots .dot');
    let currentSlide = 0;
    let sliderInterval;

    function showSlide(index) {
        // Remover active de todos
        titles.forEach(title => title.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));

        // Adicionar active ao slide atual
        if (titles[index]) {
            titles[index].classList.add('active');
        }
        if (dots[index]) {
            dots[index].classList.add('active');
        }

        currentSlide = index;
    }

    function nextSlide() {
        const next = (currentSlide + 1) % titles.length;
        showSlide(next);
    }

    // Adicionar event listeners aos dots
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            clearInterval(sliderInterval);
            showSlide(index);
            startSlider();
        });
    });

    function startSlider() {
        sliderInterval = setInterval(nextSlide, 4000);
    }

    // Iniciar slider
    if (titles.length > 0) {
        showSlide(0);
        startSlider();

        // Pausar ao passar mouse
        const sliderContainer = document.querySelector('.hero-title-slider');
        if (sliderContainer) {
            sliderContainer.addEventListener('mouseenter', () => clearInterval(sliderInterval));
            sliderContainer.addEventListener('mouseleave', startSlider);
        }
    }
}

// Adicionar cursor smooth para melhor UX
document.addEventListener('mousemove', (e) => {
    const cards = document.querySelectorAll('.feature-card, .benefit-item');
    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
    });
});

// Inicializar slider quando carregar
document.addEventListener('DOMContentLoaded', () => {
    initHeroSlider();
});

