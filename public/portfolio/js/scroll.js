// Smooth scrolling for all links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80,
                behavior: 'smooth'
            });
            
            // Close mobile menu if open
            const navbarCollapse = document.querySelector('.navbar-collapse');
            if (navbarCollapse.classList.contains('show')) {
                const bsCollapse = new bootstrap.Collapse(navbarCollapse);
                bsCollapse.hide();
            }
        }
    });
});

// Scroll spy for navigation
window.addEventListener('scroll', function() {
    const scrollPosition = window.scrollY;
    const sections = document.querySelectorAll('section');
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}` || 
                   (sectionId === 'home' && link.getAttribute('href') === 'index.html')) {
                    link.classList.add('active');
                }
            });
        }
    });
});

// Parallax effect for elements
window.addEventListener('scroll', function() {
    const scrollPosition = window.scrollY;
    const parallaxElements = document.querySelectorAll('.parallax');
    
    parallaxElements.forEach(element => {
        const speed = parseFloat(element.getAttribute('data-speed')) || 0.5;
        element.style.transform = `translateY(${scrollPosition * speed}px)`;
    });
});

// Scroll progress indicator
window.addEventListener('scroll', function() {
    const scrollPosition = window.scrollY;
    const pageHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollProgress = (scrollPosition / pageHeight) * 100;
    
    const progressBar = document.querySelector('.scroll-progress');
    if (progressBar) {
        progressBar.style.width = `${scrollProgress}%`;
    }
});

// Lazy loading for images
document.addEventListener('DOMContentLoaded', function() {
    const lazyImages = document.querySelectorAll('img.lazy');
    
    const lazyLoad = function() {
        lazyImages.forEach(img => {
            if (img.getBoundingClientRect().top < window.innerHeight + 100 && 
                img.getBoundingClientRect().bottom > 0 && 
                getComputedStyle(img).display !== 'none') {
                img.src = img.dataset.src;
                img.classList.remove('lazy');
            }
        });
    };
    
    // Initial load
    lazyLoad();
    
    // Load on scroll
    window.addEventListener('scroll', lazyLoad);
    window.addEventListener('resize', lazyLoad);
    window.addEventListener('orientationchange', lazyLoad);
});

// Scroll reveal animations
document.addEventListener('DOMContentLoaded', function() {
    const scrollReveal = ScrollReveal({
        origin: 'bottom',
        distance: '60px',
        duration: 1000,
        delay: 200,
        reset: true
    });
    
    scrollReveal.reveal('.section-title, .hero-content', { 
        origin: 'left',
        interval: 100
    });
    
    scrollReveal.reveal('.service-card, .project-card, .testimonial-slide', {
        interval: 100
    });
    
    scrollReveal.reveal('.about-image', { 
        origin: 'left' 
    });
    
    scrollReveal.reveal('.about-content', { 
        origin: 'right' 
    });
});