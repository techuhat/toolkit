(function () {
  function initNav() {
    if (window.__NAV_INIT_DONE) return;

    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    if (!btn || !menu) {
      // Nothing to init on this page
      window.__NAV_INIT_DONE = true; // prevent toolkit fallback from rebinding later
      return;
    }

    // Toggle on click
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = menu.classList.toggle('hidden');
      btn.setAttribute('aria-expanded', String(!isHidden));
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!menu.classList.contains('hidden')) {
        if (!menu.contains(e.target) && !btn.contains(e.target)) {
          menu.classList.add('hidden');
          btn.setAttribute('aria-expanded', 'false');
        }
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.classList.contains('hidden')) {
        menu.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    window.__NAV_INIT_DONE = true;
  }

  if (!window.__NAV_INIT_DONE) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initNav, { once: true });
    } else {
      initNav();
    }
  }
})();

// Site-wide UI enhancements: cookie consent, consistent footer, and Privacy FAQ fixes
(function () {
  if (window.__SITE_UI_INIT_DONE) return;

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function computePrefixes() {
    try {
      const path = (location.pathname || '').replace(/\\/g, '/');
      const parts = path.split('/').filter(Boolean);
      const last = parts[parts.length - 1] || '';
      const hasFile = /\.[a-z0-9]+$/i.test(last);
      // Number of directory segments from site root to current directory
      const dirCount = hasFile ? parts.length - 1 : parts.length;
      const rootPrefix = dirCount > 0 ? '../'.repeat(dirCount) : '';

      const pagesIndex = parts.findIndex(p => p.toLowerCase() === 'pages');
      const inPages = pagesIndex !== -1;
      let pagesPrefix = 'pages/';
      if (inPages) {
        // How many segments are we inside pages/ (excluding the 'pages' segment itself and the file segment if present)
        const insideCount = Math.max(0, (hasFile ? parts.length - 1 : parts.length) - (pagesIndex + 1));
        pagesPrefix = insideCount > 0 ? '../'.repeat(insideCount) : '';
      }

      // Custom domain deployment: always use root
      const scopeBase = '/';

      return { inPages, rootPrefix, pagesPrefix, scopeBase };
    } catch (e) {
      return { inPages: false, rootPrefix: '', pagesPrefix: 'pages/', scopeBase: '/' };
    }
  }

  // Header builder for consistent navigation across pages
  function buildHeaderHTML() {
    const { scopeBase } = computePrefixes();
    return `
    <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <div>
            <a href="${scopeBase}index.html"><h1 class="text-xl font-bold text-gradient">ImageToolkit Pro</h1></a>
            <p class="text-xs text-text-secondary">Professional Processing</p>
          </div>
        </div>

        <div class="hidden md:flex items-center space-x-8">
          <a href="${scopeBase}index.html" class="text-text-secondary hover:text-primary transition-colors duration-300">Home</a>
          <a href="${scopeBase}pages/image_processing_hub.html" class="text-text-secondary hover:text-primary transition-colors duration-300">Image Tools</a>
          <div class="relative group has-dropdown">
            <button class="text-text-secondary hover:text-primary transition-colors duration-300" aria-haspopup="true" aria-expanded="false">PDF Tools</button>
            <div class="absolute hidden dropdown-menu bg-surface border border-border rounded-lg mt-2 shadow-lg right-0 w-48 z-20">
              <a href="${scopeBase}pages/pdf_merge.html" class="block px-4 py-2 text-sm hover:bg-background-light">Merge PDFs</a>
              <a href="${scopeBase}pages/pdf_split.html" class="block px-4 py-2 text-sm hover:bg-background-light">Split PDF</a>
            </div>
          </div>
          <a href="${scopeBase}pages/qr_code_studio.html" class="text-text-secondary hover:text-primary transition-colors duration-300">QR Studio</a>
          <a href="${scopeBase}pages/batch_processing_center.html" class="text-text-secondary hover:text-primary transition-colors duration-300">Batch Process</a>
          <a href="${scopeBase}pages/blog/index.html" class="text-text-secondary hover:text-primary transition-colors duration-300">Blog</a>
          <a href="${scopeBase}pages/privacy-policy.html" class="text-text-secondary hover:text-primary transition-colors duration-300">Privacy</a>
        </div>

        <button class="md:hidden p-2 rounded-lg hover:bg-surface transition-colors duration-300" id="mobile-menu-btn" aria-expanded="false" aria-controls="mobile-menu">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>

      <div class="md:hidden hidden" id="mobile-menu">
        <div class="px-2 pt-2 pb-3 space-y-1 bg-surface rounded-lg mt-2">
          <a href="${scopeBase}index.html" class="block px-3 py-2 text-text-secondary hover:text-primary transition-colors duration-300">Home</a>
          <a href="${scopeBase}pages/image_processing_hub.html" class="block px-3 py-2 text-text-secondary hover:text-primary transition-colors duration-300">Image Tools</a>
          <div class="px-3 py-2">
            <div class="text-text-secondary mb-2">PDF Tools</div>
            <div class="grid grid-cols-1 gap-1">
              <a href="${scopeBase}pages/pdf_merge.html" class="block px-3 py-2 rounded hover:bg-surface">Merge PDFs</a>
              <a href="${scopeBase}pages/pdf_split.html" class="block px-3 py-2 rounded hover:bg-surface">Split PDF</a>
            </div>
          </div>
          <a href="${scopeBase}pages/qr_code_studio.html" class="block px-3 py-2 text-text-secondary hover:text-primary transition-colors duration-300">QR Studio</a>
          <a href="${scopeBase}pages/batch_processing_center.html" class="block px-3 py-2 text-text-secondary hover:text-primary transition-colors duration-300">Batch Process</a>
          <a href="${scopeBase}pages/blog/index.html" class="block px-3 py-2 text-text-secondary hover:text-primary transition-colors duration-300">Blog</a>
          <a href="${scopeBase}pages/privacy-policy.html" class="block px-3 py-2 text-text-secondary hover:text-primary transition-colors duration-300">Privacy</a>
        </div>
      </div>
    </nav>`;
  }

  function bindMobileNav() {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;

    if (!menu.dataset.bound) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const hidden = menu.classList.toggle('hidden');
        btn.setAttribute('aria-expanded', String(!hidden));
      });
      document.addEventListener('click', (e) => {
        if (!menu.classList.contains('hidden')) {
          if (!menu.contains(e.target) && !btn.contains(e.target)) {
            menu.classList.add('hidden');
            btn.setAttribute('aria-expanded', 'false');
          }
        }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !menu.classList.contains('hidden')) {
          menu.classList.add('hidden');
          btn.setAttribute('aria-expanded', 'false');
        }
      });
      menu.dataset.bound = 'true';
    }
  }

  function ensureHeaderConsistency() {
    try {
      let header = document.querySelector('header');
      if (!header) {
        header = document.createElement('header');
        header.className = 'sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border';
        document.body.insertBefore(header, document.body.firstChild);
      }
      header.innerHTML = buildHeaderHTML();
      bindMobileNav();
      // Bind improved desktop dropdown behavior
      try {
        const dropdownParents = Array.from(header.querySelectorAll('.has-dropdown'));
        dropdownParents.forEach(parent => {
          const btn = parent.querySelector('button');
          const menu = parent.querySelector('.dropdown-menu');
          if (!btn || !menu) return;

          let hideTimer;
          const show = () => {
            menu.classList.remove('hidden');
            btn.setAttribute('aria-expanded', 'true');
            clearTimeout(hideTimer);
          };
          const scheduleHide = () => {
            clearTimeout(hideTimer);
            hideTimer = setTimeout(() => {
              menu.classList.add('hidden');
              btn.setAttribute('aria-expanded', 'false');
            }, 120);
          };

          parent.addEventListener('mouseenter', show);
          parent.addEventListener('mouseleave', scheduleHide);
          menu.addEventListener('mouseenter', show);
          menu.addEventListener('mouseleave', scheduleHide);
          parent.addEventListener('focusin', show);
          parent.addEventListener('focusout', scheduleHide);
        });
      } catch (_) {}
    } catch (e) {
      // no-op
    }
  }

  function buildFooterHTML() {
    const { scopeBase } = computePrefixes();
    return `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div class="col-span-1 md:col-span-2">
            <div class="flex items-center space-x-3 mb-4">
              <div class="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <div>
                <h3 class="text-xl font-bold text-gradient">ImageToolkit Pro</h3>
                <p class="text-sm text-text-secondary">Professional Processing Suite</p>
              </div>
            </div>
            <p class="text-text-secondary mb-4 max-w-md leading-relaxed">
              Transform your digital workflow with professional-grade processing tools. Built for creators, optimized for performance, designed for privacy.
            </p>
          </div>
          <div>
            <h4 class="font-semibold mb-4">Tools</h4>
            <ul class="space-y-2">
              <li><a href="${scopeBase}pages/image_processing_hub.html" class="text-text-secondary hover:text-primary transition-colors duration-300">Image Processing</a></li>
              <li><a href="${scopeBase}pages/pdf_merge.html" class="text-text-secondary hover:text-primary transition-colors duration-300">Merge PDFs</a></li>
              <li><a href="${scopeBase}pages/pdf_split.html" class="text-text-secondary hover:text-primary transition-colors duration-300">Split PDF</a></li>
              <li><a href="${scopeBase}pages/qr_code_studio.html" class="text-text-secondary hover:text-primary transition-colors duration-300">QR Studio</a></li>
              <li><a href="${scopeBase}pages/batch_processing_center.html" class="text-text-secondary hover:text-primary transition-colors duration-300">Batch Processing</a></li>
              <li><a href="${scopeBase}pages/blog/index.html" class="text-text-secondary hover:text-primary transition-colors duration-300">Blog</a></li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold mb-4">Resources</h4>
            <ul class="space-y-2">
              <li><a href="${scopeBase}pages/privacy-policy.html" class="text-text-secondary hover:text-primary transition-colors duration-300">Privacy Policy</a></li>
              <li><a href="${scopeBase}pages/terms.html" class="text-text-secondary hover:text-primary transition-colors duration-300">Terms &amp; Conditions</a></li>
              <li><a href="${scopeBase}pages/disclaimer.html" class="text-text-secondary hover:text-primary transition-colors duration-300">Disclaimer</a></li>
              <li><a href="${scopeBase}pages/cookies.html" class="text-text-secondary hover:text-primary transition-colors duration-300">Cookie Policy</a></li>
              <li><a href="${scopeBase}pages/about.html" class="text-text-secondary hover:text-primary transition-colors duration-300">About Us</a></li>
              <li><a href="${scopeBase}pages/contact.html" class="text-text-secondary hover:text-primary transition-colors duration-300">Contact Us</a></li>
            </ul>
          </div>
        </div>
        <div class="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p class="text-text-secondary text-sm">
            © 2025 ImageToolkit Pro. All Rights Reserved. Built with privacy and performance in mind.
          </p>
          <div class="flex items-center space-x-6 mt-4 md:mt-0">
            <a href="https://github.com/techuhat" target="_blank" rel="noopener noreferrer" class="text-text-secondary hover:text-primary transition-colors duration-300" aria-label="GitHub">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
            <a href="https://www.linkedin.com/in/mohdkhanumar/" target="_blank" rel="noopener noreferrer" class="text-text-secondary hover:text-primary transition-colors duration-300" aria-label="LinkedIn">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    `;
  }

  function ensureFooterConsistency() {
    try {
      let footer = document.querySelector('footer');
      if (!footer) {
        footer = document.createElement('footer');
        footer.className = 'bg-surface border-t border-border py-12';
        document.body.appendChild(footer);
      }
      footer.innerHTML = buildFooterHTML();
    } catch (e) {
      // no-op
    }
  }

  // Normalize internal links so site works at root and under /toolkit/
  function normalizeInternalLinks() {
    try {
      const { scopeBase } = computePrefixes();
      const locPath = (location.pathname || '/').replace(/\\+/g, '/');
      const inPages = /(^|\/)pages\//.test(locPath);
      const domain = 'imagetoolkit.tech';
      const ghPagesHost = 'techuhat.github.io';
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      anchors.forEach(a => {
        const href = a.getAttribute('href') || '';
        // Skip in-page, javascript, mailto, tel
        if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

        // Absolute to custom domain → normalize to root-relative
        if (href.startsWith('https://'+domain+'/') || href.startsWith('http://'+domain+'/')) {
          const path = href.replace(/^https?:\/\/[^/]+\//, '');
          a.setAttribute('href', scopeBase + path);
          return;
        }

        // Absolute to GitHub Pages path → normalize to root-relative
        if (href.startsWith('https://'+ghPagesHost+'/toolkit/') || href.startsWith('http://'+ghPagesHost+'/toolkit/')) {
          const path = href.replace(/^https?:\/\/[^/]+\/toolkit\//, '');
          a.setAttribute('href', scopeBase + path);
          return;
        }

        // Root-absolute → prefix with scopeBase
        if (href.startsWith('/')) {
          a.setAttribute('href', scopeBase + href.replace(/^\//, ''));
          return;
        }

        // Fix common relative patterns that break under nested routes
        // e.g., on /pages/... a link like "pages/qr_code_studio.html" becomes /pages/pages/...
        if (href.startsWith('./pages/')) {
          a.setAttribute('href', scopeBase + href.replace(/^\.\//, ''));
          return;
        }
        if (href.startsWith('pages/')) {
          a.setAttribute('href', scopeBase + href);
          return;
        }

        // Plain index.html on a nested page should go to site root index
        if (inPages && href === 'index.html') {
          a.setAttribute('href', scopeBase + 'index.html');
          return;
        }
        // Otherwise: relative links are fine
      });
    } catch (_) {}
  }

  function getCookiePrefs() {
    try {
      const raw = localStorage.getItem('itk_cookie_prefs');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function saveCookiePrefs(prefs) {
    try {
      localStorage.setItem('itk_cookie_prefs', JSON.stringify({
        essential: true,
        analytics: !!prefs.analytics,
        marketing: !!prefs.marketing,
        savedAt: Date.now()
      }));
    } catch (e) {}
  }

  function injectCookieModal() {
    let modal = document.getElementById('cookies-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'cookies-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 hidden';
      modal.innerHTML = `
        <div class="card-elevated max-w-md w-full relative animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="cookies-title">
          <button id="close-cookies" class="absolute top-3 right-3 text-text-secondary hover:text-error" aria-label="Close">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <div class="flex items-center gap-3 mb-2">
            <svg class="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 16h.01M16 12h.01"/></svg>
            <h2 id="cookies-title" class="font-bold text-xl">Cookies Preferences</h2>
          </div>
          <p class="text-text-secondary mb-4">We use cookies to improve your experience. Choose your preferences below.</p>
          <form id="cookies-form" class="space-y-4">
            <div class="flex items-center justify-between">
              <label class="font-medium">Essential Cookies</label>
              <input type="checkbox" checked disabled class="accent-warning" />
            </div>
            <div class="flex items-center justify-between">
              <label class="font-medium">Analytics Cookies</label>
              <input type="checkbox" id="analytics-cb" class="accent-primary" />
            </div>
            <div class="flex items-center justify-between">
              <label class="font-medium">Marketing Cookies</label>
              <input type="checkbox" id="marketing-cb" class="accent-accent" />
            </div>
            <div class="flex gap-3 pt-2">
              <button type="button" id="save-cookies" class="btn-primary flex-1">Save Preferences</button>
              <button type="button" id="accept-all" class="btn-secondary flex-1">Accept All</button>
            </div>
          </form>
        </div>`;
      document.body.appendChild(modal);
    }

    // Floating cookies button if page doesn't have one
    if (!document.getElementById('cookies-btn') && !document.getElementById('floating-cookies-btn')) {
      const floatBtn = document.createElement('button');
      floatBtn.id = 'floating-cookies-btn';
      floatBtn.className = 'fixed left-4 bottom-4 z-50 btn-secondary inline-flex items-center gap-2';
      floatBtn.innerHTML = '<svg class="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 16h.01M16 12h.01"/></svg> Cookies';
      document.body.appendChild(floatBtn);
    }

    // Wire events once
    if (!modal.dataset.wired) {
      const closeBtn = modal.querySelector('#close-cookies');
      const saveBtn = modal.querySelector('#save-cookies');
      const acceptAllBtn = modal.querySelector('#accept-all');
      const analyticsCb = modal.querySelector('#analytics-cb');
      const marketingCb = modal.querySelector('#marketing-cb');

      // Prefill from stored prefs
      const prefs = getCookiePrefs();
      if (prefs) {
        if (analyticsCb) analyticsCb.checked = !!prefs.analytics;
        if (marketingCb) marketingCb.checked = !!prefs.marketing;
      }

      const openModal = () => modal.classList.remove('hidden');
      const hideModal = () => modal.classList.add('hidden');

      [document.getElementById('cookies-btn'), document.getElementById('floating-cookies-btn')]
        .filter(Boolean)
        .forEach(btn => btn.addEventListener('click', openModal));

      closeBtn && closeBtn.addEventListener('click', hideModal);
      modal.addEventListener('click', (e) => { if (e.target === modal) hideModal(); });

      saveBtn && saveBtn.addEventListener('click', () => {
        saveCookiePrefs({ analytics: analyticsCb?.checked, marketing: marketingCb?.checked });
        hideModal();
        window.showToast?.('Preferences saved!', 'success', 3500);
      });

      acceptAllBtn && acceptAllBtn.addEventListener('click', () => {
        if (analyticsCb) analyticsCb.checked = true;
        if (marketingCb) marketingCb.checked = true;
        saveCookiePrefs({ analytics: true, marketing: true });
        hideModal();
        window.showToast?.('All cookies accepted!', 'success', 3500);
      });

      modal.dataset.wired = 'true';

      // Show on first visit if not set and DNT is not enabled
      const dnt = navigator.doNotTrack === '1' || window.doNotTrack === '1';
      if (!getCookiePrefs() && !dnt) {
        setTimeout(() => { openModal(); }, 1200);
      }
    }
  }

  function fixPrivacyFAQ() {
    const container = document.getElementById('privacy-faqs');
    if (!container) return;

    // Inject CSS for arrow rotation
    const style = document.createElement('style');
    style.textContent = `#privacy-faqs details summary svg{transition: transform 200ms ease;}#privacy-faqs details[open] summary svg{transform: rotate(180deg);}`;
    document.head.appendChild(style);

    const items = Array.from(container.querySelectorAll('details'));
    items.forEach((d) => {
      d.addEventListener('toggle', () => {
        if (d.open) {
          items.forEach((other) => { if (other !== d) other.open = false; });
        }
      });
    });
  }

  // Only inject PNG apple-touch-icon if the asset actually exists
  function ensureAppleTouchIcon() {
    try {
      const hasPngTouchIcon = !!document.querySelector('link[rel="apple-touch-icon"][href$=".png"]');
      if (hasPngTouchIcon) return;
      const { scopeBase } = computePrefixes();
      const url = `${scopeBase}public/apple-touch-icon-180.png`;
      fetch(url, { method: 'HEAD' }).then((resp) => {
        if (!resp || !resp.ok) return;
        const ct = resp.headers.get('content-type') || '';
        const len = parseInt(resp.headers.get('content-length') || '0', 10);
        if (!ct.includes('image/png')) return;
        if (!Number.isFinite(len) || len <= 0) return;
        const touch = document.createElement('link');
        touch.rel = 'apple-touch-icon';
        touch.sizes = '180x180';
        touch.href = url;
        document.head.appendChild(touch);
      }).catch(() => {});
    } catch (_) {}
  }

  onReady(() => {
    try { ensureHeaderConsistency(); } catch (e) {}
    try { ensureFooterConsistency(); } catch (e) {}
    try { fixPrivacyFAQ(); } catch (e) {}
    try { normalizeInternalLinks(); } catch (e) {}
    // Ensure manifest and PWA bootstrap are present site-wide
    try {
      const hasManifest = !!document.querySelector('link[rel="manifest"]');
      if (!hasManifest) {
        const link = document.createElement('link');
        link.rel = 'manifest';
        const { scopeBase } = computePrefixes();
        link.href = `${scopeBase}public/manifest.json`;
        document.head.appendChild(link);
      }
      const hasPWAScript = !!document.querySelector('script[src$="/js/pwa.js"],script[src$="js/pwa.js"]');
      if (!hasPWAScript) {
        const s = document.createElement('script');
        const { scopeBase } = computePrefixes();
        s.src = `${scopeBase}js/pwa.js`;
        s.defer = true;
        document.body.appendChild(s);
      }
      // Prefer a PNG apple-touch-icon for iOS add-to-home (only if file exists)
      ensureAppleTouchIcon();
    } catch (_) {}
    window.__SITE_UI_INIT_DONE = true;
  });
})();
