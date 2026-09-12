document.addEventListener('DOMContentLoaded', () => {
  // Mobile Menu Logic
  const burgerBtn = document.getElementById('burgerBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileOverlay = document.getElementById('mobileOverlay');
  const body = document.body;
  
  const closeMenu = () => {
    burgerBtn.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.add('hidden');
    body.classList.remove('menu-open');
  };

  const openMenu = () => {
    burgerBtn.setAttribute('aria-expanded', 'true');
    mobileMenu.classList.remove('hidden');
    body.classList.add('menu-open');
  };

  burgerBtn.addEventListener('click', () => {
    const isExpanded = burgerBtn.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  mobileOverlay.addEventListener('click', closeMenu);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && body.classList.contains('menu-open')) {
      closeMenu();
    }
  });

  const mobileLinks = mobileMenu.querySelectorAll('a');
  mobileLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 720 && body.classList.contains('menu-open')) {
      closeMenu();
    }
  });

  // Stats Counter Logic
  const stats = document.querySelectorAll('.stat-val');
  
  const animateValue = (obj, start, end, duration, decimals) => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      
      const current = (progress === 1) ? end : start + (end - start) * ease;
      obj.innerHTML = current.toFixed(decimals);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  };

  const observerOptions = {
    threshold: 0.25
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        stats.forEach((stat, i) => {
          const target = parseFloat(stat.getAttribute('data-target'));
          const decimals = parseInt(stat.getAttribute('data-decimals'), 10);
          const duration = 1500 + i * 80;
          const delay = 480 + i * 90;
          
          setTimeout(() => {
            animateValue(stat, 0, target, duration, decimals);
          }, delay);
        });
        observer.disconnect(); // Run once
      }
    });
  }, observerOptions);

  if (stats.length > 0) {
    observer.observe(document.querySelector('.stats'));
  }
});
