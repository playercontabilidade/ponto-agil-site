// Menu Toggle Mobile
const menuToggle = document.getElementById('menuToggle');
const nav = document.querySelector('.nav');
const baseUrl = typeof window.PONTO_AGIL_API === 'string' && window.PONTO_AGIL_API
    ? window.PONTO_AGIL_API.replace(/\/$/, '')
    : 'https://pontoagil.playercontabilidade.com';

/** Planos retornados por GET /plano/publico (para rótulo do plano selecionado). */
let pricingPlansCache = [];

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

function formatCurrencyBRL(value) {
    return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sanitizeBandName(name) {
    return String(name || '').trim().toLowerCase();
}

const WHATSAPP_URL = 'https://wa.me/5563993124723';
const ENTERPRISE_BAND = 'Acima de 100 colaboradores';

function isBandAbove100(bandName) {
    const name = String(bandName || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const aboveMatch = name.match(/(?:acima|mais)\s+de\s+(\d+)/);
    if (aboveMatch) return Number(aboveMatch[1]) >= 100;

    const plusMatch = name.match(/(\d+)\s*\+/);
    if (plusMatch) return Number(plusMatch[1]) >= 100;

    const rangeMatch = name.match(/(\d+)\s*(?:a|ate|-)\s*(\d+)/);
    if (rangeMatch) return Number(rangeMatch[1]) > 100;

    const numbers = (name.match(/\d+/g) || []).map(Number);
    if (numbers.length === 0) return false;
    return Math.min(...numbers) > 100;
}

function createEnterprisePanel(bandName, isActive) {
    const panel = document.createElement('div');
    panel.className = `pricing-panel pricing-panel--large${isActive ? ' active' : ''}`;
    panel.setAttribute('data-band', sanitizeBandName(bandName));
    const waText = encodeURIComponent(
        `Olá! Tenho interesse em uma proposta especial para a faixa ${bandName}.`
    );
    panel.innerHTML = `
        <article class="plan-enterprise-card">
            <h4 class="plan-enterprise-title">Proposta especial</h4>
            <p class="plan-enterprise-text">Para empresas com <strong>${bandName}</strong>, elaboramos um plano sob medida.
                Entre em contato pelo WhatsApp e nossa equipe prepara a melhor proposta para você.</p>
            <a href="${WHATSAPP_URL}?text=${waText}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
        </article>
    `;
    return panel;
}

function getPlanWeight(name) {
    const normalized = String(name || '').toLowerCase();
    if (normalized.includes('essencial')) return 1;
    if (normalized.includes('profissional')) return 2;
    if (normalized.includes('completo')) return 3;
    return 99;
}

function createDetailCard(plan, faixa, isFeatured) {
    const card = document.createElement('article');
    card.className = `plan-detail-card${isFeatured ? ' plan-detail-card--highlight' : ''}`;
    const funcionalidades = Array.isArray(plan.funcionalidades) ? plan.funcionalidades : [];
    const ctaClass = isFeatured ? 'plan-detail-cta plan-detail-cta--primary' : 'plan-detail-cta';
    const faixaNome = faixa ? faixa.nome : '';
    const faixaPreco = faixa ? faixa.preco : 0;
    const ctaHtml = plan.id != null && faixa && faixa.id != null
        ? `<button type="button" class="${ctaClass} plan-checkout-btn" data-plan-id="${plan.id}" data-faixa-id="${faixa.id}" aria-label="Assinar ${plan.nome || ''} ${faixaNome}">Assinar</button>`
        : `<button type="button" class="${ctaClass} open-lead-modal-btn">Falar com a equipe</button>`;
    card.innerHTML = `
        <h4 class="plan-detail-name">${plan.nome || ''}</h4>
        <p class="plan-detail-audience">${faixaNome || ''}</p>
        <p class="plan-detail-price">R$&nbsp;<span>${formatCurrencyBRL(faixaPreco)}</span><small>/mês</small></p>
        <ul class="plan-detail-list">
            ${funcionalidades.map((item) => `<li>${item.nome || ''}</li>`).join('')}
        </ul>
        ${ctaHtml}
    `;
    return card;
}

let checkoutModalLastFocus = null;

function openCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    if (!modal) return;
    checkoutModalLastFocus = document.activeElement;
    modal.removeAttribute('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const email = document.getElementById('email');
    window.requestAnimationFrame(() => {
        if (email) email.focus();
    });
}

function closeCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    if (!modal) return;
    modal.setAttribute('hidden', '');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (checkoutModalLastFocus && typeof checkoutModalLastFocus.focus === 'function') {
        checkoutModalLastFocus.focus({ preventScroll: true });
    }
    checkoutModalLastFocus = null;
}

function openLeadModalFromStrip() {
    const plano = document.getElementById('field_plano_id')?.value?.trim();
    const faixa = document.getElementById('field_faixa_id')?.value?.trim();
    const hint = document.getElementById('lead-selection-hint');
    if ((!plano || !faixa) && hint) {
        hint.classList.remove('is-ok');
        hint.innerHTML = 'Nenhum plano selecionado. Feche e clique em <strong>Assinar</strong> em um dos planos antes de ir ao pagamento.';
    }
    openCheckoutModal();
}

function findCheckoutLabel(planId, faixaId) {
    const pid = Number(planId);
    const fid = Number(faixaId);
    const plan = pricingPlansCache.find((p) => Number(p.id) === pid);
    const faixa = plan && Array.isArray(plan.faixas)
        ? plan.faixas.find((f) => Number(f.id) === fid)
        : null;
    if (plan && faixa) {
        return `${plan.nome} — ${faixa.nome} (R$ ${formatCurrencyBRL(faixa.preco)}/mês)`;
    }
    return 'Plano selecionado';
}

function setCheckoutSelection(planId, faixaId) {
    const planoInput = document.getElementById('field_plano_id');
    const faixaInput = document.getElementById('field_faixa_id');
    const hint = document.getElementById('lead-selection-hint');
    if (planoInput) planoInput.value = String(planId);
    if (faixaInput) faixaInput.value = String(faixaId);
    if (hint) {
        hint.textContent = `Selecionado: ${findCheckoutLabel(planId, faixaId)}. Preencha os dados e prossiga ao pagamento.`;
        hint.classList.add('is-ok');
    }
    openCheckoutModal();
}

document.addEventListener('click', (e) => {
    const planBtn = e.target.closest('.plan-checkout-btn');
    if (planBtn && !planBtn.disabled) {
        const planId = planBtn.getAttribute('data-plan-id');
        const faixaId = planBtn.getAttribute('data-faixa-id');
        if (planId != null && faixaId != null && planId !== '' && faixaId !== '') {
            setCheckoutSelection(planId, faixaId);
        }
        return;
    }
    if (e.target.closest('.open-lead-modal-btn')) {
        openLeadModalFromStrip();
    }
});

function bindCheckoutModalUi() {
    document.getElementById('checkoutModalClose')?.addEventListener('click', closeCheckoutModal);
    document.getElementById('checkoutModalBackdrop')?.addEventListener('click', closeCheckoutModal);
    document.getElementById('openLeadModalBtn')?.addEventListener('click', openLeadModalFromStrip);
}

bindCheckoutModalUi();

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const modal = document.getElementById('checkoutModal');
    if (!modal || modal.hasAttribute('hidden')) return;
    closeCheckoutModal();
});

async function parseApiError(response) {
    const text = await response.text();
    try {
        const data = JSON.parse(text);
        if (typeof data.mensagem === 'string' && data.mensagem) return data.mensagem;
        if (typeof data.message === 'string' && data.message) return data.message;
        if (Array.isArray(data.errors)) {
            return data.errors
                .map((err) => (typeof err === 'string' ? err : err.defaultMessage || err.message || ''))
                .filter(Boolean)
                .join(' ') || text;
        }
        if (data.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
            return Object.entries(data.errors)
                .map(([k, v]) => `${k}: ${v}`)
                .join('; ');
        }
        if (typeof data.error === 'string') return data.error;
    } catch (_) {
        /* texto não JSON */
    }
    return text || `Erro HTTP ${response.status}`;
}

async function initPricingPlans() {
    const toggle = document.getElementById('pricing-toggle');
    const panelWrap = document.getElementById('pricing-panel-wrap');
    if (!toggle || !panelWrap) return;

    try {
        const response = await fetch(`${baseUrl}/plano/publico`);
        if (!response.ok) return;
        const plansPayload = await response.json();
        if (!Array.isArray(plansPayload) || plansPayload.length === 0) return;

        const plans = [...plansPayload].sort((a, b) => getPlanWeight(a.nome) - getPlanWeight(b.nome));
        pricingPlansCache = plans;
        const featuredIndex = plans.findIndex((plan) => String(plan.nome || '').toLowerCase().includes('profissional'));
        const effectiveFeaturedIndex = featuredIndex >= 0 ? featuredIndex : Math.min(1, plans.length - 1);

        const bandMap = new Map();
        plans.forEach((plan) => {
            (Array.isArray(plan.faixas) ? plan.faixas : []).forEach((faixa) => {
                const key = sanitizeBandName(faixa.nome);
                if (!bandMap.has(key)) {
                    bandMap.set(key, faixa.nome);
                }
            });
        });

        const bands = Array.from(bandMap.values());
        if (!bands.some((name) => sanitizeBandName(name) === sanitizeBandName(ENTERPRISE_BAND))) {
            bands.push(ENTERPRISE_BAND);
        }
        if (bands.length === 0) return;

        toggle.innerHTML = '';
        panelWrap.innerHTML = '';

        bands.forEach((bandName, bandIndex) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `pricing-toggle-btn${bandIndex === 0 ? ' active' : ''}`;
            button.textContent = bandName;
            button.setAttribute('role', 'tab');
            toggle.appendChild(button);

            let panel;
            if (isBandAbove100(bandName)) {
                panel = createEnterprisePanel(bandName, bandIndex === 0);
            } else {
                panel = document.createElement('div');
                panel.className = `pricing-panel pricing-panel-grid${bandIndex === 0 ? ' active' : ''}`;
                panel.setAttribute('data-band', sanitizeBandName(bandName));

                plans.forEach((plan, planIndex) => {
                    const faixa = (Array.isArray(plan.faixas) ? plan.faixas : []).find((item) => sanitizeBandName(item.nome) === sanitizeBandName(bandName));
                    if (faixa) {
                        panel.appendChild(createDetailCard(plan, faixa, planIndex === effectiveFeaturedIndex));
                    }
                });
            }
            panelWrap.appendChild(panel);

            button.addEventListener('click', () => {
                toggle.querySelectorAll('.pricing-toggle-btn').forEach((btn) => btn.classList.remove('active'));
                panelWrap.querySelectorAll('.pricing-panel').forEach((item) => item.classList.remove('active'));
                button.classList.add('active');
                panel.classList.add('active');
            });
        });

        if (document.body.classList.contains('loaded')) {
            initScrollReveal();
        }
    } catch (_) {
        return;
    }
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

    const contactStripInner = document.querySelector('.contact-strip__inner');
    if (contactStripInner) {
        contactStripInner.dataset.delay = '0';
        observer.observe(contactStripInner);
    }

    initPricingPlans();
});

// Lead + cobrança (API) → checkout Asaas
const leadForm = document.getElementById('leadForm');
if (leadForm) {
    leadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const button = leadForm.querySelector('button[type="submit"]');
        const buttonText = button ? button.querySelector('.btn-text') : null;
        const formMessage = document.getElementById('form-message');
        const originalText = buttonText ? buttonText.textContent : button ? button.textContent : '';

        const planoIdVal = document.getElementById('field_plano_id')?.value?.trim();
        const faixaIdVal = document.getElementById('field_faixa_id')?.value?.trim();

        if (!planoIdVal || !faixaIdVal) {
            if (formMessage) {
                formMessage.textContent = 'Selecione um plano nos cards acima (botão Assinar) antes de continuar.';
                formMessage.style.display = 'block';
                formMessage.className = 'form-message error';
            }
            const hint = document.getElementById('lead-selection-hint');
            if (hint) {
                hint.classList.remove('is-ok');
                hint.innerHTML = 'Nenhum plano selecionado. Feche e clique em <strong>Assinar</strong> em um dos planos.';
            }
            openCheckoutModal();
            return;
        }

        const planoId = Number(planoIdVal);
        const faixaId = Number(faixaIdVal);
        if (!Number.isFinite(planoId) || !Number.isFinite(faixaId)) {
            if (formMessage) {
                formMessage.textContent = 'Seleção de plano inválida. Escolha novamente em Planos.';
                formMessage.style.display = 'block';
                formMessage.className = 'form-message error';
            }
            return;
        }

        if (buttonText) buttonText.textContent = 'Processando...';
        else if (button) button.textContent = 'Processando...';
        if (button) button.disabled = true;
        if (formMessage) formMessage.style.display = 'none';

        const leadBody = {
            email: document.getElementById('email')?.value?.trim() || '',
            razao_social: document.getElementById('razao_social')?.value?.trim() || '',
            cnpj: document.getElementById('cnpj')?.value?.trim() || '',
            cep: document.getElementById('cep')?.value?.trim() || '',
            cpf_proprietario: document.getElementById('cpf_proprietario')?.value?.trim() || ''
        };
        const telefone = document.getElementById('telefone')?.value?.trim();
        if (telefone) leadBody.telefone = telefone;

        try {
            const leadRes = await fetch(`${baseUrl}/leads`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(leadBody)
            });

            if (!leadRes.ok) {
                throw new Error(await parseApiError(leadRes));
            }

            const leadData = await leadRes.json();
            const leadId = leadData.lead_id ?? leadData.leadId;
            if (!leadId) {
                throw new Error('Resposta da API sem identificador do lead.');
            }

            if (buttonText) buttonText.textContent = 'Abrindo pagamento...';
            else if (button) button.textContent = 'Abrindo pagamento...';

            const cobRes = await fetch(`${baseUrl}/cobrancas`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    lead_id: leadId,
                    plano_id: planoId,
                    faixa_id: faixaId
                })
            });

            if (!cobRes.ok) {
                throw new Error(await parseApiError(cobRes));
            }

            const cobData = await cobRes.json();
            const checkoutUrl = cobData.checkout_url ?? cobData.checkoutUrl;
            if (!checkoutUrl) {
                throw new Error('Não foi possível obter o link de pagamento. Tente novamente ou contate o suporte.');
            }

            window.location.href = checkoutUrl;
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.';
            if (formMessage) {
                formMessage.textContent = msg;
                formMessage.style.display = 'block';
                formMessage.className = 'form-message error';
            }
            if (buttonText) buttonText.textContent = originalText;
            else if (button) button.textContent = originalText;
            if (button) button.disabled = false;
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

