// Lightweight toast utility for pages that don't use ToolkitApp
// Usage: showToast(message, type = 'info', duration = 4000)
(function(){
  function getToastIcon(type){
    const icons = {
      success: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
      error: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
      warning: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>',
      info: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    };
    return icons[type] || icons.info;
  }

  window.showToast = function(message, type = 'info', duration = 4000){
    try {
      const toast = document.createElement('div');
      toast.className = `toast fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg border transform translate-x-full transition-transform duration-300 ease-out ${
        type === 'success' ? 'bg-green-500 border-green-400 text-white' : ''
      } ${ type === 'error' ? 'bg-red-500 border-red-400 text-white' : '' } ${
        type === 'warning' ? 'bg-yellow-500 border-yellow-400 text-white' : ''
      } ${ type === 'info' ? 'bg-blue-500 border-blue-400 text-white' : '' }`;

      toast.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <div class="flex-shrink-0">${getToastIcon(type)}</div>
            <div class="font-medium">${message}</div>
          </div>
          <button aria-label="Close" class="ml-4 text-white hover:text-gray-200" onclick="this.closest('.toast')?.remove()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>`;

      document.body.appendChild(toast);
      setTimeout(() => { toast.style.transform = 'translateX(0)'; }, 50);
      setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    } catch (e) {
      console.error('Toast error:', e);
    }
  };
})();
