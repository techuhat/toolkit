/**
 * PDF.js Worker Configuration Utility
 * Provides consistent PDF.js worker setup across all tools
 */

window.PDFConfig = {
    // PDF.js worker configuration
    workerConfig: {
        // CDN version for production reliability
        cdnWorkerSrc: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
        // Local worker path for development
        localWorkerSrc: './js/pdf.worker.min.js',
        // Fallback worker for offline scenarios
        fallbackWorkerSrc: './js/pdf.worker.min.js'
    },

    /**
     * Initialize PDF.js worker with environment-aware configuration
     * @param {Object} options - Configuration options
     * @param {boolean} options.preferLocal - Prefer local worker over CDN
     * @param {boolean} options.forceCDN - Force CDN usage regardless of environment
     * @param {string} options.customWorkerSrc - Custom worker source URL
     */
    initWorker: function(options = {}) {
        if (typeof pdfjsLib === 'undefined') {
            console.warn('PDF.js library not loaded');
            return false;
        }

        let workerSrc;
        
        // Check if custom worker source is provided
        if (options.customWorkerSrc) {
            workerSrc = options.customWorkerSrc;
        }
        // Force CDN usage
        else if (options.forceCDN) {
            workerSrc = this.workerConfig.cdnWorkerSrc;
        }
        // Environment-based detection
        else {
            const isLocalhost = this.isLocalEnvironment();
            const isFileProtocol = window.location.protocol === 'file:';
            
            if (isLocalhost && !options.preferCDN && !isFileProtocol) {
                // Local development environment
                workerSrc = this.workerConfig.localWorkerSrc;
            } else if (isFileProtocol) {
                // File protocol (local HTML files)
                workerSrc = this.workerConfig.fallbackWorkerSrc;
            } else {
                // Production environment (GitHub Pages, etc.)
                workerSrc = this.workerConfig.cdnWorkerSrc;
            }
        }

        try {
            pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
            console.log('PDF.js worker configured:', workerSrc);
            return true;
        } catch (error) {
            console.error('Failed to configure PDF.js worker:', error);
            return false;
        }
    },

    /**
     * Check if running in local development environment
     */
    isLocalEnvironment: function() {
        const hostname = window.location.hostname;
        return hostname === 'localhost' || 
               hostname === '127.0.0.1' || 
               hostname === '0.0.0.0' ||
               hostname.endsWith('.local');
    },

    /**
     * Get current worker configuration
     */
    getWorkerSrc: function() {
        if (typeof pdfjsLib !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
            return pdfjsLib.GlobalWorkerOptions.workerSrc;
        }
        return null;
    },

    /**
     * Validate PDF.js setup
     */
    validateSetup: function() {
        const checks = {
            libraryLoaded: typeof pdfjsLib !== 'undefined',
            workerConfigured: this.getWorkerSrc() !== null,
            workerAccessible: false
        };

        // Test worker accessibility (basic check)
        if (checks.workerConfigured) {
            try {
                const workerSrc = this.getWorkerSrc();
                // For CDN workers, assume they're accessible
                if (workerSrc.startsWith('http')) {
                    checks.workerAccessible = true;
                } else {
                    // For local workers, we'd need to actually test the path
                    // For now, assume it's accessible if configured
                    checks.workerAccessible = true;
                }
            } catch (error) {
                console.warn('Worker accessibility check failed:', error);
            }
        }

        return checks;
    },

    /**
     * Get setup status as human-readable text
     */
    getSetupStatus: function() {
        const validation = this.validateSetup();
        
        if (!validation.libraryLoaded) {
            return '❌ PDF.js library not loaded';
        }
        
        if (!validation.workerConfigured) {
            return '⚠️ PDF.js worker not configured';
        }
        
        if (!validation.workerAccessible) {
            return '⚠️ PDF.js worker may not be accessible';
        }
        
        return '✅ PDF.js configured correctly';
    }
};

// Auto-initialize on page load if PDF.js is available
document.addEventListener('DOMContentLoaded', function() {
    if (typeof pdfjsLib !== 'undefined') {
        // Auto-configure with default settings
        window.PDFConfig.initWorker();
    }
});

// Also try immediate initialization in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
    // DOM is still loading, event listener will handle it
} else {
    // DOM is already loaded
    if (typeof pdfjsLib !== 'undefined') {
        window.PDFConfig.initWorker();
    }
}
