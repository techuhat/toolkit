// PWA bootstrap: register SW and handle installation prompt
(function(){
  if ('serviceWorker' in navigator) {
    function getBaseScope() {
      const parts = (location.pathname || '/').split('/').filter(Boolean);
      // If first segment looks like a file (e.g., index.html), use root scope
      if (parts.length < 2 || /\.[a-z0-9]+$/i.test(parts[0])) return '/';
      // Otherwise, treat first segment as base, e.g., /toolkit/
      return `/${parts[0]}/`;
    }
    window.addEventListener('load', () => {
      const scope = getBaseScope();
      const swUrl = `${scope}sw.js`;
      navigator.serviceWorker.register(swUrl, { scope }).catch(console.error);
    });
  }

  let deferredPrompt = null;

  function ensureInstallButton() {
    let btn = document.getElementById('install-app-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'install-app-btn';
      btn.className = 'fixed right-4 bottom-4 z-50 btn-primary shadow-lg hidden';
      btn.textContent = 'Install App';
      document.body.appendChild(btn);
    }
    if (!btn.dataset.bound) {
      btn.addEventListener('click', async () => {
        if (!deferredPrompt) {
          window.showToast?.('Install option not available yet. Visit from Chrome/Edge on desktop or Android after browsing a bit.', 'warning');
          return;
        }
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice.catch(() => null);
        if (choice && choice.outcome === 'accepted') {
          window.showToast?.('App install started', 'success');
        }
        deferredPrompt = null;
        btn.classList.add('hidden');
      });
      btn.dataset.bound = 'true';
    }
    return btn;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = ensureInstallButton();
    btn.classList.remove('hidden');
  });

  window.addEventListener('appinstalled', () => {
    const btn = document.getElementById('install-app-btn');
    if (btn) btn.classList.add('hidden');
  });

  // Ensure button exists early if page already includes it in markup
  document.addEventListener('DOMContentLoaded', () => {
    const existing = document.getElementById('install-app-btn');
    if (existing) ensureInstallButton();
  });
})();
