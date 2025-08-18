// ================================================================================
// IMAGEPDF TOOLKIT - MAIN JAVASCRIPT FILE
// ================================================================================
// This file contains all functionality for the ImagePDF Toolkit tools
// Tools included: Image to PDF, PDF to Images, Image Compressor, Image Resizer,
// Format Converter, Batch Processor, PDF to DOC, QR Generator
// ================================================================================

// Global variables are declared in the HTML file
// currentFiles, processedFiles, currentTool, currentSlideIndex, imageDataUrls

// ================================================================================
// [Start] PDF.JS WORKER INITIALIZATION
// ================================================================================

// Detect if current page actually includes or needs PDF.js (to avoid noisy retries on pages like homepage)
const __PAGE_NEEDS_PDF__ = !!document.querySelector('script[src*="pdf.min.js"], script[data-needs-pdf], link[data-needs-pdf]');

// Initialize PDF.js worker only when required
function initializePDFWorker() {
    if (!__PAGE_NEEDS_PDF__) return 'skip';
    if (typeof pdfjsLib !== 'undefined') {
        // Worker path should be relative to the location of pdf.min.js; try common variants
        const probablePaths = [
            './js/pdf.worker.min.js', // tools pages (relative path when inside public root)
            '../../public/js/pdf.worker.min.js', // nested pages fallback
            'public/js/pdf.worker.min.js' // homepage fallback
        ];
        for (const p of probablePaths) {
            try {
                pdfjsLib.GlobalWorkerOptions.workerSrc = p;
                break;
            } catch(_) { /* ignore */ }
        }
        console.log('✅ PDF.js worker initialized:', pdfjsLib.GlobalWorkerOptions.workerSrc);
        return true;
    } else {
        console.log('⏳ PDF.js library not yet loaded, will retry...');
        return false;
    }
}

function ensurePDFWorker() {
    if (!__PAGE_NEEDS_PDF__) return true; // nothing to do
    if (typeof pdfjsLib !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = './js/pdf.worker.min.js';
        console.log('✅ PDF.js worker configured:', pdfjsLib.GlobalWorkerOptions.workerSrc);
        return true;
    } else if (typeof pdfjsLib !== 'undefined') {
        return true;
    }
    return false;
}

let pdfWorkerInitialized = false;
if (__PAGE_NEEDS_PDF__) {
    if (initializePDFWorker() === true) {
        pdfWorkerInitialized = true;
    }
    if (!pdfWorkerInitialized) {
        const pdfWorkerInitRetries = 5;
        let pdfWorkerInitAttempts = 0;
        const pdfWorkerInitInterval = setInterval(() => {
            pdfWorkerInitAttempts++;
            if (initializePDFWorker() === true) {
                pdfWorkerInitialized = true;
                clearInterval(pdfWorkerInitInterval);
                console.log('✅ PDF.js worker initialized after', pdfWorkerInitAttempts, 'attempts');
            } else if (pdfWorkerInitAttempts >= pdfWorkerInitRetries) {
                clearInterval(pdfWorkerInitInterval);
                console.warn('⚠️ PDF.js worker not available after retries (page may not need it).');
            }
        }, 500);
    }
} else {
    // Silent skip on pages that don't load pdf.min.js
    // console.log('ℹ️ Skipping PDF.js worker setup: page does not include pdf.min.js');
}

// ================================================================================
// [End] PDF.JS WORKER INITIALIZATION
// ================================================================================

// ================================================================================
// [Start] CLIENT-SIDE CONFIGURATION
// ================================================================================

// Client-side only configuration - no backend dependencies
const CLIENT_CONFIG = {
    // Default settings for image processing
    IMAGE_QUALITY: 0.9,
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    SUPPORTED_IMAGE_FORMATS: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    SUPPORTED_PDF_FORMATS: ['application/pdf']
};

// ================================================================================
// [End] CLIENT-SIDE CONFIGURATION
// ================================================================================

// ================================================================================
// [Start] UTILITY HELPER FUNCTIONS
// ================================================================================

// Utility Helper Functions for Client-side Processing
const UtilityHelper = {
    // Format file size for display
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Validate file type
    isValidImageFile(file) {
        return CLIENT_CONFIG.SUPPORTED_IMAGE_FORMATS.includes(file.type);
    },

    // Validate PDF file
    isValidPdfFile(file) {
        return CLIENT_CONFIG.SUPPORTED_PDF_FORMATS.includes(file.type);
    },

    // Check file size
    isValidFileSize(file) {
        return file.size <= CLIENT_CONFIG.MAX_FILE_SIZE;
    },

    // Create download link
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};

// ================================================================================
// [End] UTILITY HELPER FUNCTIONS
// ================================================================================

// ================================================================================
// [Start] TOAST NOTIFICATION SYSTEM
// ================================================================================

// ================================================================================
// UNIFIED TOAST NOTIFICATION SYSTEM - CONSISTENT ACROSS ALL PAGES
// ================================================================================

const UnifiedToastSystem = {
    activeToasts: new Map(),
    toastId: 0,
    maxToasts: 5,
    
    // Initialize the toast system
    init() {
        this.ensureContainer();
        this.setupStyles();
    },
    
    // Ensure toast container exists
    ensureContainer() {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    },
    
    // Setup unified styles
    setupStyles() {
        if (document.getElementById('unified-toast-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'unified-toast-styles';
        style.textContent = `
            /* Modern Toast Animations */
            @keyframes slideIn {
                from {
                    transform: translateX(120%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(120%);
                    opacity: 0;
                }
            }

            @keyframes progressBar {
                from {
                    width: 100%;
                }
                to {
                    width: 0%;
                }
            }

            /* Toast Container */
            .toast-container {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 12px;
                max-width: 400px;
                pointer-events: none;
            }

            /* Modern Glassmorphism Toast */
            .toast {
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border-radius: 16px;
                padding: 16px 20px;
                min-width: 300px;
                max-width: 400px;
                box-shadow: 
                    0 20px 40px rgba(0, 0, 0, 0.3),
                    0 8px 16px rgba(0, 0, 0, 0.2),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.1);
                transform: translateX(120%);
                opacity: 0;
                animation: slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                position: relative;
                overflow: hidden;
                pointer-events: auto;
                user-select: none;
                -webkit-user-select: none;
                color: white;
                font-weight: 500;
                line-height: 1.4;
            }

            .toast.hiding {
                animation: slideOut 0.15s ease-out forwards;
            }

            .toast-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 100%;
                position: relative;
                z-index: 2;
            }

            .toast-message {
                flex: 1;
                font-size: 0.95rem;
                margin-right: 12px;
            }

            .toast-close {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.7);
                cursor: pointer;
                font-size: 1.25rem;
                padding: 4px;
                border-radius: 50%;
                transition: all 0.2s ease;
                flex-shrink: 0;
            }

            .toast-close:hover {
                color: white;
                background: rgba(255, 255, 255, 0.1);
            }

            .progress-bar {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: linear-gradient(90deg, #4ade80, #22c55e);
                border-radius: 0 0 16px 16px;
                animation: progressBar 4s linear forwards;
                z-index: 1;
                width: 100%;
                animation-play-state: running;
            }

            .toast.paused .progress-bar {
                animation-play-state: paused;
            }

            .toast.success .progress-bar {
                background: linear-gradient(90deg, #4ade80, #22c55e);
            }

            .toast.error .progress-bar {
                background: linear-gradient(90deg, #ef4444, #dc2626);
            }

            .toast.warning .progress-bar {
                background: linear-gradient(90deg, #f59e0b, #d97706);
            }

            .toast.info .progress-bar {
                background: linear-gradient(90deg, #3b82f6, #1d4ed8);
            }

            /* Mobile responsiveness */
            @media (max-width: 768px) {
                .toast-container {
                    right: 16px;
                    bottom: 16px;
                    left: 16px;
                    max-width: none;
                }

                .toast {
                    min-width: unset;
                    max-width: unset;
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    },
    
    // Main show function - UNIFIED ACROSS ALL PAGES
    show(message, type = 'success', duration = 4000) {
        try {
            this.init();
            const container = this.ensureContainer();
            
            const id = ++this.toastId;
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.dataset.id = id;
            
            // Use provided message or default
            const displayMessage = message || 'Notification';
            
            toast.innerHTML = `
                <div class="toast-content">
                    <div class="toast-message">${displayMessage}</div>
                    <button class="toast-close" onclick="UnifiedToastSystem.dismissToast(${id})">×</button>
                </div>
                <div class="progress-bar" style="animation-duration: ${duration}ms;"></div>
            `;
            
            container.appendChild(toast);
            this.activeToasts.set(id, toast);
            
            // Add swipe functionality
            this.addSwipeToToast(toast);
            
            // Auto remove
            const autoRemoveTimeout = setTimeout(() => {
                this.dismissToast(id);
            }, duration);
            
            toast.dataset.timeoutId = autoRemoveTimeout;
            
            return id;
            
        } catch (error) {
            console.error('❌ Toast error:', error);
            // Fallback to alert
            alert(`${type.toUpperCase()}: ${message}`);
        }
    },
    
    // Dismiss toast function
    dismissToast(id) {
        const toast = this.activeToasts.get(id);
        if (toast && toast.parentNode) {
            // Clear auto-remove timeout
            if (toast.dataset.timeoutId) {
                clearTimeout(parseInt(toast.dataset.timeoutId));
            }
            
            toast.classList.add('hiding');
            
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                    this.activeToasts.delete(id);
                }
            }, 300);
        }
    },
    
    // Add swipe functionality to toast - WITH HOVER PAUSE FUNCTIONALITY
    addSwipeToToast(toast) {
        let startX = 0;
        let currentX = 0;
        let isDragging = false;
        let isMouseDown = false;
        let rafId = null;
        let isHovered = false;
        
        // Add hover pause functionality for progress bar
        const progressBar = toast.querySelector('.progress-bar');
        if (progressBar) {
            toast.addEventListener('mouseenter', () => {
                isHovered = true;
                progressBar.style.animationPlayState = 'paused';
                toast.classList.add('paused');
            });
            
            toast.addEventListener('mouseleave', () => {
                if (!isDragging) { // Only unpause if not dragging
                    isHovered = false;
                    progressBar.style.animationPlayState = 'running';
                    toast.classList.remove('paused');
                }
            });
        }
        
        // Touch events for mobile
        toast.addEventListener('touchstart', handleTouchStart, { passive: false });
        toast.addEventListener('touchmove', handleTouchMove, { passive: false });
        toast.addEventListener('touchend', handleTouchEnd);
        
        // Mouse events for desktop - Handle both dragging and hover
        toast.addEventListener('mousedown', handleMouseStart);
        toast.addEventListener('mousemove', handleMouseMove);
        toast.addEventListener('mouseup', handleMouseEnd);
        
        function handleTouchStart(e) {
            startX = e.touches[0].clientX;
            isDragging = true;
            toast.style.transition = 'none';
            toast.style.willChange = 'transform, opacity';
            e.preventDefault();
        }
        
        function handleMouseStart(e) {
            startX = e.clientX;
            isDragging = true;
            isMouseDown = true;
            toast.style.transition = 'none';
            toast.style.willChange = 'transform, opacity';
            e.preventDefault();
            
            // Add global mouse events to handle dragging outside toast
            document.addEventListener('mousemove', handleGlobalMouseMove);
            document.addEventListener('mouseup', handleGlobalMouseUp);
        }
        
        function handleTouchMove(e) {
            if (!isDragging) return;
            currentX = e.touches[0].clientX;
            
            // Cancel previous animation frame
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
            
            // Use requestAnimationFrame for smooth animation
            rafId = requestAnimationFrame(updateSwipePosition);
            e.preventDefault();
        }
        
        function handleMouseMove(e) {
            if (!isDragging || !isMouseDown) return;
            currentX = e.clientX;
            
            // Cancel previous animation frame
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
            
            // Use requestAnimationFrame for smooth animation
            rafId = requestAnimationFrame(updateSwipePosition);
            e.preventDefault();
        }
        
        function handleGlobalMouseMove(e) {
            if (!isDragging || !isMouseDown) return;
            currentX = e.clientX;
            
            // Cancel previous animation frame
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
            
            // Use requestAnimationFrame for smooth animation
            rafId = requestAnimationFrame(updateSwipePosition);
            e.preventDefault();
        }
        
        function updateSwipePosition() {
            const deltaX = currentX - startX;
            
            // Only allow swiping to the right
            if (deltaX >= 0) {
                // Use transform3d for hardware acceleration
                toast.style.transform = `translate3d(${deltaX}px, 0, 0)`;
                
                // Faster opacity calculation
                const opacity = Math.max(0.2, 1 - (deltaX * 0.005));
                toast.style.opacity = opacity;
            }
        }
        
        function handleTouchEnd(e) {
            handleEnd();
        }
        
        function handleMouseEnd(e) {
            if (!isMouseDown) return;
            handleEnd();
        }
        
        function handleGlobalMouseUp(e) {
            if (!isMouseDown) return;
            handleEnd();
            
            // Remove global event listeners
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
        }
        
        function handleEnd() {
            if (!isDragging) return;
            isDragging = false;
            isMouseDown = false;
            
            // Cancel any pending animation frame
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            
            const deltaX = currentX - startX;
            
            // Reduced threshold for faster dismiss - 60px instead of 100px
            if (deltaX > 60) {
                // Fast dismiss animation
                toast.style.transition = 'all 0.15s ease-out';
                toast.style.transform = 'translate3d(400px, 0, 0)';
                toast.style.opacity = '0';
                
                setTimeout(() => {
                    const id = parseInt(toast.dataset.id);
                    UnifiedToastSystem.dismissToast(id);
                }, 150);
            } else {
                // Quick snap back
                toast.style.transition = 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                toast.style.transform = 'translate3d(0, 0, 0)';
                toast.style.opacity = '1';
                
                // Clean up styles after animation
                setTimeout(() => {
                    toast.style.willChange = 'auto';
                    
                    // Resume progress bar if still hovered after drag ends
                    if (progressBar && isHovered) {
                        progressBar.style.animationPlayState = 'paused';
                        toast.classList.add('paused');
                    } else if (progressBar) {
                        progressBar.style.animationPlayState = 'running';
                        toast.classList.remove('paused');
                    }
                }, 200);
            }
            
            startX = 0;
            currentX = 0;
        }
    },
    
    // Backward compatibility
    dismiss(id) {
        return this.dismissToast(id);
    }
};

// Global compatibility functions
function showToast(message, type = 'success', duration = 4000) {
    return UnifiedToastSystem.show(message, type, duration);
}

function dismissToast(toastOrId) {
    if (typeof toastOrId === 'string' || typeof toastOrId === 'number') {
        UnifiedToastSystem.dismiss(toastOrId);
    } else if (toastOrId && toastOrId.id) {
        UnifiedToastSystem.dismiss(toastOrId.id);
    }
}

// Auto-initialize when script loads
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => UnifiedToastSystem.init());
    } else {
        UnifiedToastSystem.init();
    }
}

// GLOBAL TOAST FUNCTION - CONSISTENT ACROSS ALL PAGES WITH SAFETY CHECKS
window.showToast = function(message, type = 'success', duration = 4000) {
    // Safety check for UnifiedToastSystem availability
    if (typeof UnifiedToastSystem !== 'undefined' && UnifiedToastSystem.show) {
        return UnifiedToastSystem.show(message, type, duration);
    } else {
        // Fallback for edge cases
        console.log(`Toast: [${type.toUpperCase()}] ${message}`);
        return null;
    }
};

// Universal safe toast - maximum compatibility function for all tools
window.safeToast = function(message, type = 'info', duration = 3000) {
    if (typeof UnifiedToastSystem !== 'undefined' && UnifiedToastSystem.show) {
        return UnifiedToastSystem.show(message, type, duration);
    } else if (typeof showToast === 'function') {
        return showToast(message, type, duration);
    } else {
        console.log(`Toast: [${type.toUpperCase()}] ${message}`);
        return null;
    }
};

// BACKWARD COMPATIBILITY FUNCTIONS
window.dismissToast = function(toastOrId) {
    if (typeof toastOrId === 'string') {
        UnifiedToastSystem.dismiss(toastOrId);
    } else if (toastOrId && toastOrId.id) {
        UnifiedToastSystem.dismiss(toastOrId.id);
    }
};

// ================================================================================
// [Start] SHARED UTILITIES AND HELPERS
// ================================================================================
// ENHANCED TOAST NOTIFICATION HELPERS FOR SPECIFIC ACTIONS
window.showProcessingStartToast = function(toolName) {
    const messages = {
        'image-to-pdf': '📄 Converting images to PDF...',
        'pdf-to-images': '🖼️ Extracting images from PDF...',
        'pdf-to-doc': '📝 Converting PDF to DOC...',
        'image-compressor': '🗜️ Compressing images...',
        'image-resizer': '📏 Resizing images...',
        'format-converter': '🔄 Converting image formats...',
        'batch-processor': '⚡ Processing batch files...'
    };
    const message = messages[toolName] || '🔄 Processing files...';
    return showToast(message, 'warning', 2000);
};

// Initialize toast system on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UnifiedToastSystem.init());
} else {
    UnifiedToastSystem.init();
}

function showProcessingCompleteToast(toolName, processedCount) {
    const messages = {
        'image-to-pdf': `✅ PDF created successfully from ${processedCount} images!`,
        'pdf-to-images': `✅ ${processedCount} images extracted successfully!`,
        'pdf-to-doc': `✅ ${processedCount} PDF files converted to DOC successfully!`,
        'image-compressor': `✅ ${processedCount} images compressed successfully!`,
        'image-resizer': `✅ ${processedCount} images resized successfully!`,
        'format-converter': `✅ ${processedCount} images converted successfully!`,
        'batch-processor': `✅ ${processedCount} files processed successfully!`
    };
    const message = messages[toolName] || `✅ ${processedCount} files processed successfully!`;
    
    // Show download button after processing is complete
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.classList.remove('hidden');
        downloadBtn.disabled = false;
        console.log('Download button shown after processing');
    }
    
    return showToast(message, 'success', 4000);
}

function showErrorToast(toolName, errorMessage) {
    return showToast(`❌ ${toolName} failed: ${errorMessage}`, 'error', 4000);
}

// File handling functions
function removeFile(index) {
    // Cleanup object URL if it exists
    const fileListContainer = document.getElementById('file-list');
    const fileItems = fileListContainer.children;
    if (fileItems[index]) {
        const img = fileItems[index].querySelector('img');
        if (img && img.src.startsWith('blob:')) {
            URL.revokeObjectURL(img.src);
        }
    }
    
    currentFiles.splice(index, 1);
    updateFileList(currentFiles);
    
    // Show warning toast for file removal
    setTimeout(() => {
        showToast(`🗑️ File removed from processing queue`, 'warning', 2500);
    }, 100);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) {
        return 'fa-image';
    } else if (mimeType === 'application/pdf') {
        return 'fa-file-pdf';
    } else {
        return 'fa-file';
    }
}

function validateFileTypes(files) {
    if (!currentTool) return files;
    
    const validFiles = [];
    
    for (const file of files) {
        let isValid = false;
        
        switch (currentTool) {
            case 'image-to-pdf':
            case 'image-compressor':
            case 'image-resizer':
            case 'format-converter':
                isValid = file.type.startsWith('image/');
                break;
            case 'pdf-to-images':
            case 'pdf-to-doc':
                isValid = file.type === 'application/pdf';
                break;
            case 'batch-processor':
                isValid = file.type.startsWith('image/') || file.type === 'application/pdf';
                break;
            default:
                isValid = true;
                break;
        }
        
        if (isValid) {
            validFiles.push(file);
        }
    }
    
    return validFiles;
}

async function updateFileList(files) {
    // Early PDF validation: remove corrupt/placeholder PDFs before UI build
    if (files && files.length) {
        const validatedFiles = [];
        for (const file of files) {
            if (file.type === 'application/pdf') {
                // Reject extremely small PDFs (cannot be valid)
                if (file.size < 10) {
                    console.warn('Skipping tiny PDF (likely invalid):', file.name, file.size);
                    showToast && showToast(`⚠️ Skipped invalid PDF: ${file.name}`, 'warning', 3000);
                    continue;
                }
                try {
                    // Read first 5 bytes for header check
                    const headerBuf = await file.slice(0, 5).arrayBuffer();
                    const header = new TextDecoder().decode(new Uint8Array(headerBuf));
                    if (!header.startsWith('%PDF')) {
                        console.warn('Skipping file with bad PDF header:', file.name, header);
                        showToast && showToast(`⚠️ Skipped non-PDF file: ${file.name}`, 'warning', 3000);
                        continue;
                    }
                } catch (err) {
                    console.warn('Error validating PDF header, skipping file:', file.name, err);
                    showToast && showToast(`⚠️ Skipped unreadable PDF: ${file.name}`, 'warning', 3000);
                    continue;
                }
            }
            validatedFiles.push(file);
        }
        if (validatedFiles.length !== files.length) {
            console.log(`PDF validation removed ${files.length - validatedFiles.length} invalid file(s).`);
        }
        files = validatedFiles;
    }
    currentFiles = files;
    const filePreview = document.getElementById('file-preview');
    const fileList = document.getElementById('file-list');
    
    // Find the process button (could be process-btn, convert-btn, etc.)
    const processBtn = document.getElementById('process-btn') || 
                      document.getElementById('convert-btn') || 
                      document.getElementById('convertBtn');
    
    if (files.length > 0) {
        filePreview.classList.remove('hidden');
        fileList.innerHTML = '';
        // Unhide tool-specific option areas if present (e.g., PDF to Images)
        try {
            const extractionOptions = document.getElementById('extraction-options');
            if (extractionOptions) extractionOptions.classList.remove('hidden');
            const actionButtons = document.getElementById('action-buttons');
            if (actionButtons) actionButtons.classList.remove('hidden');
        } catch (e) {
            // noop
        }
        
        // Get image files
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        // Create file list with debug version
        files.forEach((file, index) => {
            console.log(`Creating file item for: ${file.name}, index: ${index}`);
            
            // Create simple file item with better light mode support
            const fileItem = document.createElement('div');
            // Use CSS classes for proper theme switching
            fileItem.className = 'file-item-container bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-3 transition-all duration-200 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-500';
            fileItem.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                opacity: 0;
                transform: translateY(10px);
            `;
            
            // Create file info with preview
            const fileInfo = document.createElement('div');
            fileInfo.style.cssText = `
                flex: 1;
                margin-right: 16px;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 12px;
            `;
            fileInfo.className = 'text-gray-900 dark:text-white';
            
            // Create preview container with better light mode support
            const previewContainer = document.createElement('div');
            previewContainer.style.cssText = `
                width: 48px;
                height: 48px;
                border-radius: 8px;
                overflow: hidden;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            previewContainer.className = 'bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-500';
            
            // Create preview content
            if (file.type.startsWith('image/')) {
                const imageUrl = URL.createObjectURL(file);
                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = file.name;
                img.style.cssText = `
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 6px;
                `;
                img.onload = () => {
                    console.log('Image preview loaded for:', file.name);
                };
                img.onerror = () => {
                    console.log('Image preview failed for:', file.name);
                    previewContainer.innerHTML = `
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="text-gray-400">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7l-3 3.72L9 13l-3 4h12l-4-5z"/>
                        </svg>
                    `;
                };
                previewContainer.appendChild(img);
            } else {
                // For non-image files, show file type icon
                const fileIcon = getFileIcon(file.type);
                const iconColor = file.type.startsWith('image/') ? '#10b981' : 
                               file.type === 'application/pdf' ? '#ef4444' : '#3b82f6';
                previewContainer.innerHTML = `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="${iconColor}">
                        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 2 2h12c1.11 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
                    </svg>
                `;
            }
            
            // Create text info container
            const textInfo = document.createElement('div');
            textInfo.style.cssText = `
                flex: 1;
                min-width: 0;
            `;
            textInfo.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 4px; word-break: break-word;" class="text-gray-900 dark:text-white">${file.name}</div>
                <div style="font-size: 12px;" class="text-gray-600 dark:text-gray-400">${formatFileSize(file.size)} • ${file.type.split('/')[1] || 'Unknown'}</div>
            `;
            
            // Assemble file info
            fileInfo.appendChild(previewContainer);
            fileInfo.appendChild(textInfo);
            
            // Create remove button (guaranteed visible)
            const removeButton = document.createElement('button');
            removeButton.style.cssText = `
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
                border: none;
                border-radius: 8px;
                padding: 10px;
                cursor: pointer;
                font-size: 16px;
                font-weight: bold;
                min-width: 44px;
                min-height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
            `;
            removeButton.textContent = '✕';
            removeButton.title = 'Remove file';
            removeButton.setAttribute('aria-label', `Remove ${file.name} from upload queue`);
            removeButton.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Remove button clicked for:', file.name, 'index:', index);
                removeFile(index);
            };
            
            // Enhanced hover effects
            removeButton.onmouseenter = () => {
                removeButton.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
                removeButton.style.transform = 'scale(1.1)';
                removeButton.style.boxShadow = '0 4px 8px rgba(220, 38, 38, 0.3)';
            };
            removeButton.onmouseleave = () => {
                removeButton.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                removeButton.style.transform = 'scale(1)';
                removeButton.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.2)';
            };
            
            // Assemble
            fileItem.appendChild(fileInfo);
            fileItem.appendChild(removeButton);
            
            // Add hover effect to file item
            fileItem.onmouseenter = () => {
                fileItem.style.transform = fileItem.style.transform.includes('translateY(0)') ? 'translateY(-2px)' : fileItem.style.transform;
                fileItem.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                fileItem.style.borderColor = '#3b82f6';
            };
            fileItem.onmouseleave = () => {
                fileItem.style.transform = fileItem.style.transform.includes('translateY(-2px)') ? 'translateY(0)' : fileItem.style.transform;
                fileItem.style.boxShadow = 'none';
                fileItem.style.borderColor = '';
            };
            
            fileList.appendChild(fileItem);
            
            // Animate in
            setTimeout(() => {
                fileItem.style.opacity = '1';
                fileItem.style.transform = 'translateY(0)';
                console.log(`File item animated for: ${file.name}`);
            }, index * 100);
        });
        
        if (processBtn) {
            processBtn.disabled = false;
            processBtn.classList.remove('hidden');
            console.log('Process button enabled and made visible');
        }
        
        // Also check for convert-btn (some tools use this instead of process-btn)
        const convertBtn = document.getElementById('convert-btn');
        if (convertBtn) {
            convertBtn.disabled = false;
            convertBtn.classList.remove('hidden');
            console.log('Convert button enabled and made visible');
        }
        
        // Show clear button if it exists
        const clearBtn = document.getElementById('clear-btn');
        if (clearBtn) {
            clearBtn.classList.remove('hidden');
            clearBtn.disabled = false;
            console.log('Clear button enabled and made visible');
        }
        
        // Hide download button when new files are uploaded
        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) {
            downloadBtn.classList.add('hidden');
            downloadBtn.disabled = true;
            console.log('Download button hidden for new upload');
        }
        
        // Show enhanced file upload success toast
        const toolNames = {
            'image-to-pdf': 'Image to PDF Converter',
            'pdf-to-images': 'PDF to Images Converter', 
            'image-compressor': 'Image Compressor',
            'image-resizer': 'Image Resizer',
            'format-converter': 'Format Converter',
            'batch-processor': 'Batch Processor'
        };
        const toolName = toolNames[currentTool] || 'File Processor';
        
        if (files.length === 1) {
            setTimeout(() => {
                showToast(`✅ File "${files[0].name}" uploaded for ${toolName}!`, 'success', 3000);
            }, 100);
        } else {
            setTimeout(() => {
                showToast(`🎉 ${files.length} files uploaded for ${toolName}!`, 'success', 3000);
            }, 100);
        }
    } else {
        filePreview.classList.add('hidden');
        
        // Hide all action buttons when no files
        if (processBtn) {
            processBtn.disabled = true;
            processBtn.classList.add('hidden');
        }
        
        const convertBtn = document.getElementById('convert-btn');
        if (convertBtn) {
            convertBtn.disabled = true;
            convertBtn.classList.add('hidden');
        }
        
        const clearBtn = document.getElementById('clear-btn');
        if (clearBtn) {
            clearBtn.disabled = true;
            clearBtn.classList.add('hidden');
        }
        
        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.classList.add('hidden');
        }
        
        console.log('All buttons hidden - no files selected');
    }
}

// Theme Management - Enhanced with Better Sync
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    
    // Immediately sync toggle state if DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', syncToggleState);
    } else {
        syncToggleState();
    }
}

function syncToggleState() {
    const toggle = document.getElementById('dn');
    if (toggle) {
        const isDark = document.documentElement.classList.contains('dark');
        toggle.checked = isDark;
        console.log('Theme toggle synced:', isDark ? 'dark' : 'light');
    }
}

function toggleTheme() {
    const toggle = document.getElementById('dn');
    const isDark = document.documentElement.classList.contains('dark');
    
    if (isDark) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        if (toggle) toggle.checked = false;
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        if (toggle) toggle.checked = true;
    }
    
    // Show toast to confirm theme change
    const themeName = isDark ? 'Light' : 'Dark';
    showToast(`🌓 Switched to ${themeName} mode`, 'info', 2000);
}

// Make functions globally accessible
window.toggleTheme = toggleTheme;
window.initTheme = initTheme;
window.syncToggleState = syncToggleState;

// Initialize theme on page load
initTheme();

// Additional immediate theme application for faster loading
(function() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
})();

// Setup file input functionality
function setupFileInput() {
    const fileInput = document.getElementById('file-input');
    const fileDropZone = document.querySelector('.file-drop-zone');
    
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                // Validate file types
                const validFiles = validateFileTypes(files);
                if (validFiles.length > 0) {
                    updateFileList(validFiles);
                    if (validFiles.length < files.length) {
                        showToast(`⚠️ ${files.length - validFiles.length} files were skipped (invalid format)`, 'warning', 3000);
                    }
                } else {
                    showToast('❌ No valid files selected for this tool', 'error', 3000);
                }
            } else {
                showToast('❌ No files selected', 'warning', 2000);
            }
            // Reset input to allow selecting same files again
            e.target.value = '';
        });
    }
    
    if (fileDropZone) {
        setupFileDropZone(fileDropZone);
    }
}

// Setup drag and drop functionality for file drop zones
function setupFileDropZone(element) {
    element.addEventListener('dragenter', (e) => {
        e.preventDefault();
        element.classList.add('drag-over');
    });
    
    element.addEventListener('dragover', (e) => {
        e.preventDefault();
        element.classList.add('drag-over');
    });
    
    element.addEventListener('dragleave', (e) => {
        e.preventDefault();
        if (!element.contains(e.relatedTarget)) {
            element.classList.remove('drag-over');
        }
    });
    
    element.addEventListener('drop', (e) => {
        e.preventDefault();
        element.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            // Check for valid file types based on current tool
            const validFiles = validateFileTypes(files);
            if (validFiles.length > 0) {
                updateFileList(validFiles);
                if (validFiles.length < files.length) {
                    showToast(`⚠️ ${files.length - validFiles.length} files were skipped (invalid format)`, 'warning', 3000);
                }
            } else {
                showToast('❌ No valid files found for this tool', 'error', 3000);
            }
        } else {
            showToast('❌ No files detected in drop area', 'error', 2000);
        }
    });
}

// Global drag and drop functionality
function setupGlobalDragDrop() {
    let dragCounter = 0;
    
    document.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        if (currentTool && dragCounter === 1) {
            showGlobalDropOverlay();
        }
    });
    
    document.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
            hideGlobalDropOverlay();
        }
    });
    
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        hideGlobalDropOverlay();
        
        if (currentTool && !e.target.closest('.file-drop-zone')) {
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                updateFileList(files);
            }
        }
    });
}

function showGlobalDropOverlay() {
    let overlay = document.getElementById('global-drop-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-drop-overlay';
        overlay.className = 'fixed inset-0 bg-blue-600/20 backdrop-blur-sm z-50 flex items-center justify-center transition-all duration-300';
        overlay.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border-4 border-dashed border-blue-500 text-center max-w-md mx-4 transform scale-95 hover:scale-100 transition-transform">
                <svg class="w-16 h-16 text-blue-500 mb-4 animate-bounce" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
                <h3 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">Drop Files Here</h3>
                <p class="text-gray-600 dark:text-gray-300">Release to add files to <span class="font-semibold text-blue-600">${getToolDisplayName()}</span></p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.style.opacity = '1', 10);
}

function hideGlobalDropOverlay() {
    const overlay = document.getElementById('global-drop-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
}

function getToolDisplayName() {
    const names = {
        'image-to-pdf': 'Image to PDF Converter',
        'pdf-to-images': 'PDF to Images Converter',
        'image-compressor': 'Image Compressor',
        'image-resizer': 'Image Resizer',
        'format-converter': 'Format Converter',
        'batch-processor': 'Batch Processor'
    };
    return names[currentTool] || 'Current Tool';
}

// Theme toggle event listener and global initialization
document.addEventListener('DOMContentLoaded', function() {
    // Wait for initTheme from index.html to complete first
    setTimeout(() => {
        const toggle = document.getElementById('dn');
        
        if (toggle) {
            console.log('Script.js: Setting up theme toggle listener');
            
            // Remove any existing listeners first
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);
            
            // Add fresh event listener
            newToggle.addEventListener('change', function() {
                const isChecked = this.checked;
                const theme = isChecked ? 'dark' : 'light';
                localStorage.setItem('theme', theme);
                
                if (isChecked) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
                
                // Show confirmation toast
                if (typeof showToast === 'function') {
                    showToast(`🌓 Switched to ${isChecked ? 'Dark' : 'Light'} mode`, 'info', 2000);
                }
                
                console.log('Script.js: Theme changed to:', theme);
            });
            
            console.log('Script.js: Theme toggle listener attached');
        } else {
            console.warn('Script.js: Theme toggle element not found');
        }
    }, 200);
    
    // Ensure PDF.js worker is configured immediately after theme setup
    ensurePDFWorker();
    
    // Delayed check for PDF.js initialization (in case libraries load asynchronously)
    setTimeout(() => {
        ensurePDFWorker();
    }, 1000);
    
    // Initialize global drag and drop functionality
    if (typeof setupGlobalDragDrop === 'function') {
        setupGlobalDragDrop();
    }
    
    // Welcome toast handled by index.html
});

// Utility Functions
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Global Toast Manager - Removed duplicate implementation - Using UnifiedToastSystem instead

// Removed duplicate toast implementations - Using UnifiedToastSystem only

// Mobile touch support - Using UnifiedToastSystem instead

// Enhanced dismiss function with better exit animation - Using UnifiedToastSystem instead

function showProgress(show = true, message = 'Processing...') {
    const container = document.getElementById('progress-container');
    const bar = document.getElementById('progress-bar');
    const text = container.querySelector('.progress-text');
    
    if (show) {
        container.classList.remove('hidden');
        bar.style.width = '0%';
        bar.style.transition = 'width 0.3s ease-out';
        if (text) text.textContent = message;
        
        // Add pulse animation to container
        container.classList.add('animate-pulse');
        setTimeout(() => container.classList.remove('animate-pulse'), 500);
    } else {
        // Smooth hide animation
        container.style.opacity = '0';
        setTimeout(() => {
            container.classList.add('hidden');
            container.style.opacity = '1';
        }, 300);
    }
}

function updateProgress(percentage, message = null) {
    const bar = document.getElementById('progress-bar');
    const container = document.getElementById('progress-container');
    const text = container.querySelector('.progress-text');
    
    const clampedPercentage = Math.min(100, Math.max(0, percentage));
    
    // Smooth animation for width changes
    bar.style.transition = 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.5s ease';
    bar.style.width = `${clampedPercentage}%`;
    
    // Update message with fade effect if provided
    if (message && text) {
        // Create fade effect for message updates
        text.style.transition = 'opacity 0.3s ease';
        text.style.opacity = '0';
        setTimeout(() => {
            text.textContent = message;
            text.style.opacity = '1';
        }, 200);
    }
    
    // Add completion animation with enhanced effects
    if (clampedPercentage === 100) {
        // Enhanced rainbow gradient with better animation
        bar.style.background = 'linear-gradient(90deg, #10b981, #34d399, #6ee7b7, #34d399, #10b981)';
        bar.style.backgroundSize = '300% 100%';
        bar.style.animation = 'rainbow-progress 1.5s linear infinite';
        bar.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.7)';
        bar.classList.add('animate-pulse');
        
        // Add enhanced success sparkle effect with more particles
        const sparkles = document.createElement('div');
        sparkles.className = 'absolute inset-0 overflow-hidden';
        
        // Create multiple sparkles with varied sizes and animations
        let sparkleHTML = '';
        for (let i = 0; i < 12; i++) {
            const left = Math.random() * 100;
            const top = Math.random() * 100;
            const size = Math.random() * 2 + 1; // 1-3px
            const delay = Math.random() * 0.8;
            const duration = Math.random() * 0.5 + 0.6; // 0.6-1.1s
            
            sparkleHTML += `
                <div class="absolute w-${size} h-${size} bg-white rounded-full opacity-0" 
                     style="left: ${left}%; top: ${top}%; animation: sparkle ${duration}s ease-out ${delay}s"></div>
            `;
        }
        sparkles.innerHTML = sparkleHTML;
        bar.appendChild(sparkles);
        
        // Add animated dots for loading effect
        const dots = document.createElement('div');
        dots.className = 'absolute inset-0 flex items-center justify-center';
        dots.innerHTML = `
            <div class="flex space-x-1 opacity-70">
                <div class="w-1 h-1 bg-white rounded-full" style="animation: pulse-glow 0.6s ease-in-out infinite alternate; animation-delay: 0s;"></div>
                <div class="w-1 h-1 bg-white rounded-full" style="animation: pulse-glow 0.6s ease-in-out infinite alternate; animation-delay: 0.2s;"></div>
                <div class="w-1 h-1 bg-white rounded-full" style="animation: pulse-glow 0.6s ease-in-out infinite alternate; animation-delay: 0.4s;"></div>
            </div>
        `;
        bar.appendChild(dots);
        
        setTimeout(() => {
            bar.classList.remove('animate-pulse');
            // Fade out effect for progress bar
            container.style.transition = 'opacity 0.5s ease';
            container.style.opacity = '0';
            setTimeout(() => {
                showProgress(false);
                container.style.opacity = '1';
                // Show enhanced completion toast
                showToast('Processing completed successfully! ✨', 'success', 3000);
            }, 500);
        }, 1500);
    } else {
        // Update progress bar color based on percentage with enhanced gradients
        if (clampedPercentage < 30) {
            bar.style.background = 'linear-gradient(90deg, #ef4444, #f87171, #fca5a5, #f87171, #ef4444)';
            bar.style.backgroundSize = '200% 100%';
            bar.style.animation = 'shimmer 2s infinite linear';
            bar.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.4)';
        } else if (clampedPercentage < 70) {
            bar.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24, #fcd34d, #fbbf24, #f59e0b)';
            bar.style.backgroundSize = '200% 100%';
            bar.style.animation = 'shimmer 2s infinite linear';
            bar.style.boxShadow = '0 0 8px rgba(245, 158, 11, 0.4)';
        } else {
            bar.style.background = 'linear-gradient(90deg, #10b981, #34d399, #6ee7b7, #34d399, #10b981)';
            bar.style.backgroundSize = '200% 100%';
            bar.style.animation = 'shimmer 2s infinite linear';
            bar.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.4)';
        }
        
        // Add enhanced pulse effect at certain milestones
        if (clampedPercentage % 20 === 0 && clampedPercentage > 0) {
            // Create a flash effect
            const flash = document.createElement('div');
            flash.className = 'absolute inset-0 bg-white rounded-full';
            flash.style.opacity = '0';
            flash.style.animation = 'pulse-glow 0.6s ease-in-out';
            bar.appendChild(flash);
            
            setTimeout(() => {
                if (flash.parentElement) {
                    flash.parentElement.removeChild(flash);
                }
            }, 600);
        }
    }
}

// ================================================================================
// [Start] CORE IMAGE PROCESSING FUNCTIONS
// ================================================================================

// Helper functions for image processing - Optimized for performance
async function resizeImageFile(file, width, height, maintainAspect = true) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            let newWidth = width;
            let newHeight = height;
            
            if (maintainAspect) {
                const aspectRatio = img.width / img.height;
                if (width / height > aspectRatio) {
                    newWidth = height * aspectRatio;
                } else {
                    newHeight = width / aspectRatio;
                }
            }
            
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            const ctx = canvas.getContext('2d');
            // Enable image smoothing for better quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Use better resampling for high-quality resize
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            
            canvas.toBlob(resolve, file.type, 0.95);
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = URL.createObjectURL(file);
    });
}

async function convertImageFormat(file, outputFormat, quality = 90) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Handle transparency for PNG to JPEG conversion
            if (outputFormat === 'jpeg' && (file.type === 'image/png' || file.type === 'image/webp')) {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(
                resolve,
                `image/${outputFormat}`,
                quality / 100
            );
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = URL.createObjectURL(file);
    });
}

// ================================================================================
// [Start] IMAGE COMPRESSOR TOOL
// ================================================================================

// Enhanced compression with quality optimization
async function compressImageFile(file, quality) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            
            // Smart compression: reduce size for large images
            let { width, height } = img;
            const maxDimension = 2048; // Max width or height
            
            if (width > maxDimension || height > maxDimension) {
                const scale = Math.min(maxDimension / width, maxDimension / height);
                width *= scale;
                height *= scale;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(
                blob => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Compression failed'));
                    }
                },
                'image/jpeg',
                quality / 100
            );
        };
        img.onerror = function() {
            reject(new Error('Image load failed'));
        };
        img.src = URL.createObjectURL(file);
    });
}

function downloadFile(blob, filename) {
    try {
        // Validate blob parameter
        if (!blob) {
            throw new Error('No blob provided for download');
        }
        
        // Ensure we have a valid Blob object
        if (!(blob instanceof Blob)) {
            throw new Error('Invalid blob object provided');
        }
        
        // Validate filename
        if (!filename || typeof filename !== 'string') {
            filename = 'download_' + Date.now();
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Show download success toast
        setTimeout(() => {
            showToast(`🎉 ${filename} downloaded successfully!`, 'success', 3000);
        }, 100);
    } catch (error) {
        console.error('Download failed:', error);
        showToast(`❌ Failed to download ${filename}`, 'error', 3000);
    }
}

function downloadAllFiles(files = null, baseName = 'processed') {
    // Use global processedFiles if no files parameter is provided
    const filesToDownload = files || processedFiles;
    
    if (!filesToDownload || filesToDownload.length === 0) {
        showToast('❌ No files to download', 'error', 3000);
        return;
    }

    showToast('✅ Download started!', 'success', 2000);
    
    if (filesToDownload.length === 1) {
        const file = filesToDownload[0];
        const blob = file.blob || file;
        const filename = file.name || `${baseName}.pdf`;
        downloadFile(blob, filename);
    } else if (filesToDownload.length <= 5) {
        // Show multiple download notification
        showToast(`📁 Downloading ${filesToDownload.length} files...`, 'success', 2000);
        
        // For small number of files, download individually with delay
        filesToDownload.forEach((file, index) => {
            setTimeout(() => {
                const blob = file.blob || file;
                const filename = file.name || `${baseName}_${index + 1}.pdf`;
                downloadFile(blob, filename);
            }, index * 200); // 200ms delay between downloads
        });
    } else {
        // For many files, suggest ZIP download
        showToast('💡 Tip: For many files, use the ZIP download option in Batch Processor!', 'warning', 4000);
        showToast(`📁 Downloading ${filesToDownload.length} files in sequence...`, 'success', 3000);
        
        filesToDownload.forEach((file, index) => {
            setTimeout(() => {
                const blob = file.blob || file;
                const filename = file.name || `${baseName}_${index + 1}.pdf`;
                downloadFile(blob, filename);
            }, index * 300); // Longer delay for many files
        });
    }
}

function clearAllFiles() {
    // Clear current files
    currentFiles = [];
    processedFiles = [];
    
    // Clear file list display
    const fileList = document.getElementById('file-list');
    if (fileList) {
        fileList.innerHTML = '';
    }
    
    // Hide file preview
    const filePreview = document.getElementById('file-preview');
    if (filePreview) {
        filePreview.classList.add('hidden');
    }
    
    // Hide results
    const results = document.getElementById('results');
    if (results) {
        results.classList.add('hidden');
    }
    
    // Reset process button
    const processBtn = document.getElementById('process-btn');
    if (processBtn) {
        processBtn.disabled = true;
    }
    
    // Hide download button
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.classList.add('hidden');
        downloadBtn.disabled = true;
    }
    
    // Reset file input
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.value = '';
    }
    
    // Show success message
    showToast('🗑️ All files cleared successfully', 'success', 2000);
}

async function extractImagesFromPDF(pdfFile) {
    // This is a placeholder implementation since PDF.js is not included
    // In a real implementation, you would use PDF.js to extract images
    return new Promise((resolve) => {
        // For now, return a placeholder image file
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        
        // Create a placeholder image
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, 800, 600);
        ctx.fillStyle = '#333';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PDF Image Extraction', 400, 280);
        ctx.font = '16px Arial';
        ctx.fillText('Placeholder - PDF.js required for full functionality', 400, 320);
        
        canvas.toBlob((blob) => {
            const fileName = pdfFile.name.replace('.pdf', '_extracted_image.png');
            resolve([{
                blob: blob,
                name: fileName,
                size: blob.size
            }]);
        }, 'image/png');
    });
}

function showResults() {
    const results = document.getElementById('results');
    const resultsList = document.getElementById('results-list');
    const downloadBtn = document.getElementById('download-btn');
    
    // Show the main download button
    if (downloadBtn) {
        downloadBtn.classList.remove('hidden');
        downloadBtn.disabled = false;
        console.log('Main download button shown in showResults');
    }
    
    if (results && resultsList) {
        results.classList.remove('hidden');
        resultsList.innerHTML = '';
        
        processedFiles.forEach((file, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-2';
            resultItem.innerHTML = `
                <div class="flex items-center">
                    <svg class="w-5 h-5 text-green-600 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7l-3 3.72L9 13l-3 4h12l-4-5z"/>
                    </svg>
                    <div>
                        <div class="font-medium text-gray-900 dark:text-white">${file.name}</div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">${formatFileSize(file.size)}</div>
                    </div>
                </div>
                <button onclick="downloadSingleFile(${index})" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                    </svg>
                    Download
                </button>
            `;
            resultsList.appendChild(resultItem);
        });
    }
}

function downloadSingleFile(index) {
    const file = processedFiles[index];
    if (!file) {
        showToast('❌ File not found', 'error', 3000);
        return;
    }
    
    try {
        const blob = file.blob || file;
        const filename = file.name || `processed_file_${index + 1}.pdf`;
        
        // Validate blob before creating URL
        if (!blob || !(blob instanceof Blob)) {
            throw new Error('Invalid file data');
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast(`✅ ${filename} downloaded successfully!`, 'success', 2000);
    } catch (error) {
        console.error('Download failed:', error);
        showToast(`❌ Failed to download file`, 'error', 3000);
    }
}

// Image compression logic (duplicate removed - using the enhanced version above)

function setupImageCompressor() {
    const processBtn = document.getElementById('process-btn');
    const qualitySlider = document.getElementById('quality-slider');
    const qualityValue = document.getElementById('quality-value');
    const compressionStats = document.getElementById('compression-stats');
    const originalSizeEl = document.getElementById('original-size');
    const compressedSizeEl = document.getElementById('compressed-size');
    const savedPercentageEl = document.getElementById('saved-percentage');
    const resultsList = document.getElementById('results-list');
    const resultsDiv = document.getElementById('results');
    const downloadBtn = document.getElementById('download-btn');

    if (!processBtn) return;

    qualitySlider.addEventListener('input', function() {
        qualityValue.textContent = qualitySlider.value;
    });

    processBtn.onclick = async function() {
        if (!currentFiles.length) return;
        
        // Filter only image files
        const imageFiles = currentFiles.filter(file => file.type.startsWith('image/'));
        if (!imageFiles.length) {
            showToast('❌ Please select image files to compress', 'error', 3000);
            return;
        }
        
        processBtn.disabled = true;
        showProgress(true, 'Compressing images...');
        showProcessingStartToast('image-compressor');
        let totalOriginal = 0, totalCompressed = 0;
        processedFiles = [];
        resultsList.innerHTML = '';
        
        try {
            for (let i = 0; i < currentFiles.length; i++) {
            const file = currentFiles[i];
            if (!file.type.startsWith('image/')) continue;
            totalOriginal += file.size;
            try {
                const compressedBlob = await compressImageFile(file, parseInt(qualitySlider.value));
                totalCompressed += compressedBlob.size;
                
                const filename = file.name.replace(/\.[^/.]+$/, '') + '_compressed.' + file.name.split('.').pop();
                processedFiles.push({
                    blob: compressedBlob,
                    name: filename,
                    originalSize: file.size,
                    newSize: compressedBlob.size
                });
                
                // Show result item
                const item = document.createElement('div');
                item.className = 'flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded mb-2';
                item.innerHTML = `<span>${file.name}</span><span>${formatFileSize(file.size)} → ${formatFileSize(compressedBlob.size)}</span>`;
                resultsList.appendChild(item);
            } catch (e) {
                showToast(`❌ Compression failed for ${file.name}`, 'error', 3000);
            }
            updateProgress(Math.round(((i+1)/currentFiles.length)*100));
        }
        showProgress(false);
        if (totalOriginal > 0) {
            compressionStats.classList.remove('hidden');
            originalSizeEl.textContent = formatFileSize(totalOriginal);
            compressedSizeEl.textContent = formatFileSize(totalCompressed);
            const saved = totalOriginal > 0 ? Math.round(100 * (totalOriginal - totalCompressed) / totalOriginal) : 0;
            savedPercentageEl.textContent = saved + '%';
            
            // Show compression success toast
            showToast(`✅ ${processedFiles.length} images compressed! Saved ${saved}% space`, 'success', 4000);
        }
        resultsDiv.classList.remove('hidden');
        downloadBtn.classList.remove('hidden');
        downloadBtn.disabled = false;
        
        // Setup download functionality
        downloadBtn.onclick = function() {
            downloadAllFiles(processedFiles);
            showToast('✅ Download started!', 'success', 2000);
        };
        
        processBtn.disabled = false;
        showToast('Compression completed!', 'success', 2500);
        
        } catch (error) {
            showProgress(false);
            showToast('❌ Compression failed: ' + error.message, 'error', 3000);
            console.error('Compression error:', error);
            processBtn.disabled = false;
        }
    };
}

// ================================================================================
// [Start] IMAGE TO PDF TOOL
// ================================================================================

// Image to PDF converter setup
function setupImageToPdf() {
    const processBtn = document.getElementById('process-btn');
    const layoutSelect = document.getElementById('pdf-layout');
    const sizeSelect = document.getElementById('pdf-size');
    const marginSlider = document.getElementById('pdf-margin');
    const marginValue = document.getElementById('margin-value');
    const resultsDiv = document.getElementById('results');
    const resultsList = document.getElementById('results-list');
    const downloadBtn = document.getElementById('download-btn');

    if (!processBtn) return;

    if (marginSlider && marginValue) {
        marginSlider.addEventListener('input', function() {
            marginValue.textContent = marginSlider.value;
        });
    }

    processBtn.onclick = async function() {
        if (!currentFiles.length) return;
        
        // Filter only image files
        const imageFiles = currentFiles.filter(file => file.type.startsWith('image/'));
        if (!imageFiles.length) {
            showToast('❌ Please select image files to convert to PDF', 'error', 3000);
            return;
        }

        processBtn.disabled = true;
        showProgress(true, 'Converting images to PDF...');
        showProcessingStartToast('image-to-pdf');
        processedFiles = [];
        if (resultsList) resultsList.innerHTML = '';

        try {
            // Check if jsPDF is available
            if (typeof window.jspdf === 'undefined' || !window.jspdf.jsPDF) {
                throw new Error('jsPDF library is not loaded. Please refresh the page.');
            }
            
            const { jsPDF } = window.jspdf;
            
            // Get values with proper defaults
            const orientation = layoutSelect?.value || 'portrait';
            const format = sizeSelect?.value || 'a4';
            const margin = parseInt(marginSlider?.value) || 10;
            
            console.log('PDF Settings:', { orientation, format, margin });
            
            const pdf = new jsPDF({
                orientation: orientation,
                unit: 'mm',
                format: format
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth - (margin * 2);
            const imgHeight = pageHeight - (margin * 2);
            
            console.log('Page dimensions:', { pageWidth, pageHeight, imgWidth, imgHeight });

            updateProgress(20, 'Processing images...');
            
            let imagesAdded = 0;
            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i];
                updateProgress(20 + (i + 1) / imageFiles.length * 60, `Adding images to PDF... (${i + 1}/${imageFiles.length})`);
                
                // Convert image to JPEG data URL for better PDF compatibility
                const jpegDataUrl = await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        
                        const ctx = canvas.getContext('2d');
                        // Fill with white background for transparent images
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0);
                        
                        resolve(canvas.toDataURL('image/jpeg', 0.95));
                    };
                    img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
                    img.src = URL.createObjectURL(file);
                });

                // Calculate aspect ratio and fit image with proper margin handling
                const sizingImg = new Image();
                await new Promise((resolve, reject) => {
                    sizingImg.onload = resolve;
                    sizingImg.onerror = () => reject(new Error(`Image data is corrupted: ${file.name}`));
                    sizingImg.src = jpegDataUrl;
                });

                if (sizingImg.width === 0 || sizingImg.height === 0) {
                    console.warn(`Skipping image with zero dimensions: ${file.name}`);
                    showToast(`⚠️ Skipping invalid image: ${file.name}`, 'warning', 3000);
                    continue;
                }

                const aspectRatio = sizingImg.width / sizingImg.height;
                let finalWidth = imgWidth;
                let finalHeight = imgWidth / aspectRatio;

                // Ensure image fits within margins
                if (finalHeight > imgHeight) {
                    finalHeight = imgHeight;
                    finalWidth = imgHeight * aspectRatio;
                }

                // Apply margins properly
                const x = margin + (imgWidth - finalWidth) / 2;
                const y = margin + (imgHeight - finalHeight) / 2;

                if (i > 0) {
                    pdf.addPage();
                }

                // Add image with proper positioning
                pdf.addImage(jpegDataUrl, 'JPEG', x, y, finalWidth, finalHeight);
                imagesAdded++;
            }

            if (imagesAdded === 0) {
                throw new Error("No valid images could be added to the PDF.");
            }

            updateProgress(90, 'Finalizing PDF...');
            
            // Generate PDF blob using proper jsPDF method
            const pdfBlob = pdf.output('blob');
            const filename = 'converted_images.pdf';
            
            processedFiles.push({
                blob: pdfBlob,
                name: filename,
                originalSize: imageFiles.reduce((sum, f) => sum + f.size, 0),
                newSize: pdfBlob.size
            });
            
            // Add result item
            if (resultsList) {
                const item = document.createElement('div');
                item.className = 'flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded mb-2';
                item.innerHTML = `
                    <span>📄 ${filename}</span>
                    <span>${imageFiles.length} images → PDF (${formatFileSize(pdfBlob.size)})</span>
                `;
                resultsList.appendChild(item);
            }
            
            updateProgress(100, 'PDF created successfully!');
            
            showProgress(false);
            resultsDiv.classList.remove('hidden');
            downloadBtn.classList.remove('hidden');
            downloadBtn.disabled = false;
            
            // Setup download functionality
            downloadBtn.onclick = function() {
                if (processedFiles.length > 0) {
                    downloadAllFiles();
                } else {
                    showToast('❌ No PDF file to download.', 'error');
                }
            };
            
            showToast('✅ PDF created successfully!', 'success', 3000);
        } catch (error) {
            showProgress(false);
            showToast('❌ PDF conversion failed: ' + error.message, 'error', 3000);
            console.error('PDF conversion error:', error);
        } finally {
            processBtn.disabled = false;
        }
    };
    
    // Setup clear button for Image to PDF
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.onclick = function() {
            clearAllFiles();
        };
        console.log('Clear button setup completed for Image to PDF');
    }
}

// ================================================================================
// [Start] PDF TO IMAGES TOOL
// ================================================================================

// PDF to Images converter setup
function setupPdfToImages() {
    const processBtn = document.getElementById('process-btn');
    const formatSelect = document.getElementById('pdf-extract-format');
    const qualitySlider = document.getElementById('pdf-extract-quality');
    const qualityValue = document.getElementById('pdf-extract-quality-value');
    const dpiSelect = document.getElementById('pdf-extract-dpi');
    const resultsDiv = document.getElementById('results');
    const resultsList = document.getElementById('results-list');
    const downloadBtn = document.getElementById('download-btn');

    if (!processBtn) return;

    if (qualitySlider && qualityValue) {
        qualitySlider.addEventListener('input', function() {
            qualityValue.textContent = qualitySlider.value;
        });
    }

    processBtn.onclick = async function() {
        if (!currentFiles.length) return;
        
        // Filter only PDF files
        const pdfFiles = currentFiles.filter(file => file.type === 'application/pdf');
        if (!pdfFiles.length) {
            showToast('❌ Please select PDF files to extract images', 'error', 3000);
            return;
        }

        showProcessingStartToast('pdf-to-images');
        
        // Get page extraction options from the HTML form
        const pageRangeSelect = document.getElementById('page-range');
        const customPagesInput = document.getElementById('custom-pages');
        
        const pageOption = pageRangeSelect?.value || 'all';
        const pageInput = customPagesInput?.value || '';
        
        console.log(`🔧 PDF extraction settings: pageOption="${pageOption}", pageInput="${pageInput}"`);
        console.log(`🔧 Found ${pdfFiles.length} PDF files to process:`, pdfFiles.map(f => f.name));
        
        await extractPagesFromPDF(pdfFiles, pageOption, pageInput);
    };
    
    async function extractPagesFromPDF(pdfFiles, pageOption, pageInput) {
        processBtn.disabled = true;
        showProgress(true, 'Extracting images from PDF...');
        processedFiles = [];
        if (resultsList) resultsList.innerHTML = '';

        try {
            // Configure PDF.js with enhanced settings
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            
            // Set PDF.js configuration for better compatibility
            pdfjsLib.GlobalWorkerOptions.verbosity = pdfjsLib.VerbosityLevel.ERRORS; // Reduce console noise
            
            const formatSelect = document.getElementById('pdf-extract-format');
            const qualitySlider = document.getElementById('pdf-extract-quality');
            const dpiSelect = document.getElementById('pdf-extract-dpi');
            
            const outputFormat = formatSelect?.value || 'jpeg';
            const quality = parseInt(qualitySlider?.value) || 90;
            const dpi = parseInt(dpiSelect?.value) || 150;
            const scale = dpi / 72; // Convert DPI to scale factor

            updateProgress(10, 'Reading PDF files...');

            for (let fileIndex = 0; fileIndex < pdfFiles.length; fileIndex++) {
                const file = pdfFiles[fileIndex];
                console.log(`🔄 Starting loop iteration ${fileIndex + 1}/${pdfFiles.length} for file: ${file.name}`);
                
                try {
                    // Read PDF file with error handling for each file
                    updateProgress(15 + fileIndex * 5, `Reading PDF files... (${fileIndex + 1}/${pdfFiles.length})`);
                    
                    console.log(`🔍 Starting PDF file validation for: ${file.name} (${file.size} bytes)`);
                    
                    // Basic file validation
                    if (file.size === 0) {
                        console.log(`❌ File ${file.name} is empty`);
                        showToast(`❌ ${file.name} is empty`, 'error', 3000);
                        continue;
                    }
                    
                    if (file.size > 100 * 1024 * 1024) { // 100MB limit
                        console.log(`❌ File ${file.name} is too large: ${file.size} bytes`);
                        showToast(`❌ ${file.name} is too large (max 100MB)`, 'error', 3000);
                        continue;
                    }
                    
                    console.log(`🔍 Reading array buffer for: ${file.name}`);
                    const arrayBuffer = await file.arrayBuffer();
                    console.log(`✅ Array buffer read successfully: ${arrayBuffer.byteLength} bytes`);
                    
                    // Add PDF validation - Check for PDF header
                    const uint8Array = new Uint8Array(arrayBuffer);
                    const pdfHeader = String.fromCharCode(...uint8Array.slice(0, 4));
                    console.log(`🔍 PDF header check for ${file.name}: "${pdfHeader}"`);
                    if (pdfHeader !== '%PDF') {
                        console.log(`❌ Invalid PDF header for ${file.name}: "${pdfHeader}"`);
                        showToast(`❌ ${file.name} is not a valid PDF file`, 'error', 3000);
                        continue;
                    }
                    
                    console.log(`🔍 Creating PDF.js loading task for: ${file.name}`);
                    const loadingTask = pdfjsLib.getDocument({ 
                        data: arrayBuffer,
                        verbosity: 0, // Reduce PDF.js console output
                        isOffscreenCanvasSupported: false, // Better compatibility
                        standardFontDataUrl: null // Prevent font loading issues
                    });
                    
                    console.log(`🔍 Waiting for PDF.js promise for: ${file.name}`);
                    const pdf = await loadingTask.promise;
                    console.log(`✅ PDF loaded successfully: ${file.name}, Pages: ${pdf.numPages}`);
                    console.log(`✅ PDF loaded successfully: ${file.name}, Pages: ${pdf.numPages}`);
                    
                    // Validate PDF structure
                    if (!pdf || pdf.numPages === 0) {
                        console.log(`❌ PDF validation failed for ${file.name}: pdf=${!!pdf}, numPages=${pdf?.numPages}`);
                        showToast(`❌ ${file.name} has no readable pages`, 'error', 3000);
                        continue;
                    }
                
                    console.log(`📄 Processing ${file.name}: ${pdf.numPages} pages total, pageOption: "${pageOption}"`);
                    
                    // Determine which pages to extract
                    let pagesToExtract = [];
                    console.log(`🔍 Determining pages to extract with pageOption: "${pageOption}"`);
                    if (pageOption === 'all') {
                        pagesToExtract = Array.from({length: pdf.numPages}, (_, i) => i + 1);
                        console.log(`📄 Extracting ALL pages: [${pagesToExtract.join(', ')}]`);
                    } else if (pageOption === 'first') {
                        pagesToExtract = [1];
                        console.log(`📄 Extracting FIRST page only: [${pagesToExtract.join(', ')}]`);
                    } else if (pageOption === 'custom' && pageInput) {
                        console.log(`📄 Using CUSTOM page selection: "${pageInput}"`);
                        // Handle custom page ranges and specific pages
                        if (pageInput.includes('-')) {
                            // Range format like "1-5"
                            const rangeParts = pageInput.split('-');
                            if (rangeParts.length === 2) {
                                const start = parseInt(rangeParts[0]);
                                const end = parseInt(rangeParts[1]);
                                if (start > 0 && end <= pdf.numPages && start <= end) {
                                    pagesToExtract = Array.from({length: end - start + 1}, (_, i) => start + i);
                                }
                            }
                        } else if (pageInput.includes(',')) {
                            // Specific pages format like "1,3,5"
                            const specificPages = pageInput.split(',').map(p => parseInt(p.trim()));
                            pagesToExtract = specificPages.filter(p => p > 0 && p <= pdf.numPages);
                        } else {
                            // Single page
                            const singlePage = parseInt(pageInput);
                            if (singlePage > 0 && singlePage <= pdf.numPages) {
                                pagesToExtract = [singlePage];
                            }
                        }
                    }
                    
                    console.log(`🔍 Pages to extract determined: [${pagesToExtract.join(', ')}] (${pagesToExtract.length} pages)`);
                    
                    if (pagesToExtract.length === 0) {
                        console.log(`❌ No valid pages selected for ${file.name} - continuing to next file`);
                        showToast(`❌ No valid pages selected for ${file.name}`, 'warning', 3000);
                        continue;
                    }
                    
                    console.log(`📄 Processing PDF: ${file.name}, Pages to extract: ${pagesToExtract.length}`);
                    updateProgress(20 + fileIndex * 60, `Processing PDFs... (${fileIndex + 1}/${pdfFiles.length})`);
                    
                    // Extract selected pages with individual error handling
                    console.log(`🔍 Starting page extraction loop for ${file.name}...`);
                    for (let i = 0; i < pagesToExtract.length; i++) {
                        const pageNum = pagesToExtract[i];
                        try {
                            console.log(`📄 Extracting page ${pageNum} from ${file.name} (${i + 1}/${pagesToExtract.length})`);
                            const progress = 20 + fileIndex * 60 + (i / pagesToExtract.length) * 50;
                            updateProgress(progress, `Extracting pages... (${Math.round((fileIndex + (i / pagesToExtract.length)) / pdfFiles.length * 100)}%)`);
                            
                            const page = await pdf.getPage(pageNum);
                            const viewport = page.getViewport({ scale });
                            
                            // Create canvas
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            canvas.width = viewport.width;
                            canvas.height = viewport.height;
                            
                            // Render page to canvas
                            await page.render({ canvasContext: context, viewport }).promise;
                            
                            // Convert canvas to blob with timeout
                            const blob = await new Promise((resolve, reject) => {
                                const timeout = setTimeout(() => {
                                    reject(new Error('Blob conversion timeout'));
                                }, 30000); // 30 second timeout
                                
                                canvas.toBlob((result) => {
                                    clearTimeout(timeout);
                                    resolve(result);
                                }, `image/${outputFormat}`, quality / 100);
                            });
                            
                            if (blob && blob.size > 0) {
                                const filename = `${file.name.replace('.pdf', '')}_page${pageNum}.${outputFormat}`;
                                
                                processedFiles.push({
                                    blob,
                                    name: filename,
                                    originalSize: file.size,
                                    newSize: blob.size
                                });
                                
                                console.log(`✅ Successfully extracted: ${filename} (${blob.size} bytes)`);
                            } else {
                                console.warn(`Failed to convert page ${pageNum} from ${file.name} to blob`);
                            }
                            
                            // Cleanup canvas and context
                            context.clearRect(0, 0, canvas.width, canvas.height);
                            canvas.width = 0;
                            canvas.height = 0;
                            
                            // Cleanup page object
                            page.cleanup && page.cleanup();
                            
                        } catch (pageError) {
                            console.error(`Error processing page ${pageNum} from ${file.name}:`, pageError);
                            showToast(`❌ Failed to extract page ${pageNum} from ${file.name}: ${pageError.message}`, 'warning', 2000);
                        }
                    }
                    
                    // Cleanup PDF document and free memory
                    if (pdf && pdf.cleanup) {
                        pdf.cleanup();
                    }
                    if (pdf && pdf.destroy) {
                        pdf.destroy();
                    }
                    
                    // Add result item for this PDF
                    if (resultsList) {
                        const item = document.createElement('div');
                        item.className = 'flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded mb-2';
                        item.innerHTML = `
                            <span>📄 ${file.name}</span>
                            <span>${pagesToExtract.length} pages processed (${outputFormat.toUpperCase()}, ${dpi} DPI)</span>
                        `;
                        resultsList.appendChild(item);
                    }
                    
                } catch (fileError) {
                    console.error(`❌ Error processing PDF file ${file.name}:`, fileError);
                    showToast(`❌ Failed to process ${file.name}: ${fileError.message}`, 'error', 4000);
                    continue; // Continue with next file instead of failing completely
                }
                
                console.log(`🔄 Completed processing file ${fileIndex + 1}/${pdfFiles.length}: ${file.name}`);
                
                // Add a small delay between files to prevent resource conflicts
                if (fileIndex < pdfFiles.length - 1) {
                    console.log(`⏳ Adding delay before processing next file...`);
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            console.log(`🏁 Loop completed! Processed all ${pdfFiles.length} PDF files.`);
            
            console.log(`📊 Total processed files: ${processedFiles.length} images from ${pdfFiles.length} PDFs`);
            updateProgress(100, 'PDF processing completed!');
            
            showProgress(false);
            
            // Check if any images were successfully processed
            if (processedFiles.length > 0) {
                const resultsDiv = document.getElementById('results');
                const downloadButtons = document.getElementById('download-buttons');
                resultsDiv.classList.remove('hidden');
                
                // Show new download buttons instead of old single button
                if (downloadButtons) {
                    downloadButtons.classList.remove('hidden');
                }
                
                // Also show results grid with individual download buttons
                displayPdfImageResults();
                
                const totalFiles = pdfFiles.length;
                const successfulExtractions = processedFiles.length;
                
                if (totalFiles === 1) {
                    showToast(`✅ Successfully extracted ${successfulExtractions} images!`, 'success', 3000);
                } else {
                    showToast(`✅ Extracted ${successfulExtractions} images from ${totalFiles} PDF files!`, 'success', 3000);
                }
            } else {
                showToast('❌ No images could be extracted from the PDF files', 'error', 4000);
            }
            
        } catch (error) {
            showProgress(false);
            showToast('❌ PDF extraction failed: ' + error.message, 'error', 3000);
            console.error('PDF extraction error:', error);
        } finally {
            processBtn.disabled = false;
        }
    }
}

// Display PDF extraction results with individual download buttons
function displayPdfImageResults() {
    const resultsGrid = document.getElementById('results-grid');
    if (!resultsGrid) return;
    
    resultsGrid.innerHTML = '';
    
    processedFiles.forEach((file, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md border border-gray-200 dark:border-gray-700';
        
        // Create image preview
        const img = document.createElement('img');
        img.className = 'w-full h-32 object-cover rounded-md mb-3';
        img.src = URL.createObjectURL(file.blob);
        img.alt = file.name;
        
        // File info
        const fileName = document.createElement('div');
        fileName.className = 'font-medium text-sm text-gray-900 dark:text-white mb-1 truncate';
        fileName.textContent = file.name;
        
        const fileSize = document.createElement('div');
        fileSize.className = 'text-xs text-gray-500 dark:text-gray-400 mb-3';
        fileSize.textContent = formatFileSize(file.newSize);
        
        // Individual download button
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'w-full btn-base btn-primary btn-sm';
        downloadBtn.onclick = () => downloadSingleImage(index);
        downloadBtn.innerHTML = `
            <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
            Download
        `;
        
        resultItem.appendChild(img);
        resultItem.appendChild(fileName);
        resultItem.appendChild(fileSize);
        resultItem.appendChild(downloadBtn);
        resultsGrid.appendChild(resultItem);
    });
}

// Download single extracted image
function downloadSingleImage(index) {
    if (processedFiles[index]) {
        const file = processedFiles[index];
        downloadFile(file.blob, file.name);
        showToast(`Downloaded ${file.name}`, 'success');
    }
}

// ================================================================================
// [Start] IMAGE RESIZER TOOL
// ================================================================================

// Image resizer setup
function setupImageResizer() {
    const processBtn = document.getElementById('process-btn');
    const widthInput = document.getElementById('resize-width');
    const heightInput = document.getElementById('resize-height');
    const maintainAspectCheckbox = document.getElementById('maintain-aspect');
    const resultsDiv = document.getElementById('results');
    const resultsList = document.getElementById('results-list');
    const downloadBtn = document.getElementById('download-btn');

    if (!processBtn) return;

        // Enhanced aspect ratio maintenance with better user experience
    if (widthInput && heightInput && maintainAspectCheckbox) {
        let originalRatio = null;
        let isUpdating = false; // Prevent infinite loops
        let userSetValues = { width: false, height: false }; // Track user inputs
        
        // Calculate aspect ratio when files are loaded
        function updateAspectRatio() {
            if (currentFiles && currentFiles.length > 0) {
                const firstImageFile = currentFiles.find(file => file.type.startsWith('image/'));
                if (firstImageFile) {
                    const img = new Image();
                    img.onload = function() {
                        originalRatio = img.width / img.height;
                        console.log('Aspect ratio calculated:', originalRatio, 'from image:', img.width, 'x', img.height);
                        
                        // Set default values based on first image
                        if (!userSetValues.width && !userSetValues.height) {
                            const defaultWidth = Math.min(img.width, 1200); // Max 1200px default
                            widthInput.value = defaultWidth;
                            heightInput.value = Math.round(defaultWidth / originalRatio);
                            
                            // Show aspect ratio info to user
                            showToast(`📐 Original size: ${img.width}×${img.height} (Ratio: ${originalRatio.toFixed(2)})`, 'info', 4000);
                        }
                    };
                    img.src = URL.createObjectURL(firstImageFile);
                }
            }
        }
        
        // Enhanced width input handler
        widthInput.addEventListener('input', function() {
            userSetValues.width = true;
            // Auto-calculate height only when lock is enabled
            if (!isUpdating && maintainAspectCheckbox.checked && originalRatio && this.value && this.value > 0) {
                isUpdating = true;
                const newHeight = Math.round(this.value / originalRatio);
                heightInput.value = newHeight;
                isUpdating = false;
                
                // Show calculation feedback
                console.log(`Width: ${this.value} → Height: ${newHeight} (Ratio: ${originalRatio.toFixed(2)})`);
            }
        });
        
        // Enhanced height input handler  
        heightInput.addEventListener('input', function() {
            userSetValues.height = true;
            
            // Auto-calculate width when height changes (if maintain aspect is checked)
            if (!isUpdating && maintainAspectCheckbox.checked && originalRatio && this.value && this.value > 0) {
                isUpdating = true;
                const newWidth = Math.round(this.value * originalRatio);
                widthInput.value = newWidth;
                isUpdating = false;
                
                console.log(`Height: ${this.value} → Width: ${newWidth} (Ratio: ${originalRatio.toFixed(2)})`);
            }
        });
        
        // Enhanced checkbox toggle functionality
        maintainAspectCheckbox.addEventListener('change', function() {
            if (this.checked) {
                // When checked: lock aspect ratio and update height based on current width
                if (originalRatio && widthInput.value && widthInput.value > 0) {
                    isUpdating = true;
                    heightInput.value = Math.round(widthInput.value / originalRatio);
                    isUpdating = false;
                    
                    showToast('🔒 Aspect ratio locked! Width changes will auto-adjust height', 'info', 3000);
                }
                // Disable free editing of height when locked
                heightInput.disabled = true;
            } else {
                // When unchecked: allow free editing
                showToast('🔓 Free editing enabled! Set custom width and height', 'info', 3000);
                heightInput.disabled = false;
            }
        });
        
        // Update aspect ratio when files change
        const originalUpdateFileList = window.updateFileList;
        window.updateFileList = function(files) {
            const result = originalUpdateFileList.call(this, files);
            // Reset user input tracking when new files are loaded
            userSetValues = { width: false, height: false };
            setTimeout(updateAspectRatio, 100); // Small delay to ensure files are loaded
            return result;
        };
        
        // Initial setup
        // Reflect initial checkbox state in height input interactivity
        heightInput.disabled = maintainAspectCheckbox.checked;
        updateAspectRatio();
    }

    processBtn.onclick = async function() {
        if (!currentFiles.length) return;
        
        // Filter only image files
        const imageFiles = currentFiles.filter(file => file.type.startsWith('image/'));
        if (!imageFiles.length) {
            showToast('❌ Please select image files to resize', 'error', 3000);
            return;
        }

        const width = parseInt(widthInput?.value);
        const height = parseInt(heightInput?.value);
        
        if (!width || !height || width <= 0 || height <= 0) {
            showToast('❌ Please enter valid width and height values', 'error', 3000);
            return;
        }

        processBtn.disabled = true;
        showProgress(true, 'Resizing images...');
        processedFiles = [];
        if (resultsList) resultsList.innerHTML = '';

        try {
            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i];
                updateProgress(Math.round(((i + 1) / imageFiles.length) * 100), `Resizing images... (${i + 1}/${imageFiles.length})`);
                
                // Actually resize the image
                const resizedBlob = await resizeImageFile(file, width, height, maintainAspectCheckbox?.checked);
                const filename = file.name.replace(/\.[^/.]+$/, '') + '_resized.' + file.name.split('.').pop();
                
                processedFiles.push({
                    blob: resizedBlob,
                    name: filename,
                    originalSize: file.size,
                    newSize: resizedBlob.size
                });
                
                // Add result item
                if (resultsList) {
                    const item = document.createElement('div');
                    item.className = 'flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded mb-2';
                    item.innerHTML = `
                        <span>${file.name}</span>
                        <span>Resized to ${width}×${height} (${formatFileSize(file.size)} → ${formatFileSize(resizedBlob.size)})</span>
                    `;
                    resultsList.appendChild(item);
                }
            }
            
            showProgress(false);
            resultsDiv.classList.remove('hidden');
            downloadBtn.classList.remove('hidden');
            downloadBtn.disabled = false;
            
            // Setup download functionality with ZIP option
            downloadBtn.onclick = async function() {
                if (processedFiles.length > 3) {
                    // Create ZIP for multiple files
                    const zip = new JSZip();
                    processedFiles.forEach(file => {
                        zip.file(file.name, file.blob);
                    });
                    
                    showToast('📦 Creating ZIP archive...', 'info', 2000);
                    const zipBlob = await zip.generateAsync({type: 'blob'});
                    downloadFile(zipBlob, `resized_images_${Date.now()}.zip`);
                    showToast('✅ ZIP download started!', 'success', 2000);
                } else {
                    downloadAllFiles(processedFiles);
                    showToast('✅ Download started!', 'success', 2000);
                }
            };
            
            showToast('✅ Images resized successfully!', 'success', 3000);
        } catch (error) {
            showProgress(false);
            showToast('❌ Image resizing failed: ' + error.message, 'error', 3000);
        } finally {
            processBtn.disabled = false;
        }
    };
}

// ================================================================================
// [Start] FORMAT CONVERTER TOOL
// ================================================================================

// Format converter setup
function setupFormatConverter() {
    const processBtn = document.getElementById('process-btn');
    const formatSelect = document.getElementById('output-format');
    const qualitySlider = document.getElementById('convert-quality');
    const qualityValue = document.getElementById('convert-quality-value');
    const resultsDiv = document.getElementById('results');
    const resultsList = document.getElementById('results-list');
    const downloadBtn = document.getElementById('download-btn');

    if (!processBtn) return;

    if (qualitySlider && qualityValue) {
        qualitySlider.addEventListener('input', function() {
            qualityValue.textContent = qualitySlider.value;
        });
    }

    processBtn.onclick = async function() {
        if (!currentFiles.length) return;
        
        // Filter only image files
        const imageFiles = currentFiles.filter(file => file.type.startsWith('image/'));
        if (!imageFiles.length) {
            showToast('❌ Please select image files to convert', 'error', 3000);
            return;
        }

        const outputFormat = formatSelect?.value || 'jpeg';
        const quality = parseInt(qualitySlider?.value) || 90;

        processBtn.disabled = true;
        showProgress(true, 'Converting image formats...');
        processedFiles = [];
        if (resultsList) resultsList.innerHTML = '';

        try {
            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i];
                updateProgress(Math.round(((i + 1) / imageFiles.length) * 100), `Converting format... (${i + 1}/${imageFiles.length})`);
                
                // Actually convert the image format
                const convertedBlob = await convertImageFormat(file, outputFormat, quality);
                const filename = file.name.replace(/\.[^/.]+$/, '') + '.' + outputFormat;
                
                processedFiles.push({
                    blob: convertedBlob,
                    name: filename,
                    originalSize: file.size,
                    newSize: convertedBlob.size
                });
                
                // Add result item
                if (resultsList) {
                    const item = document.createElement('div');
                    item.className = 'flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded mb-2';
                    item.innerHTML = `
                        <span>${file.name}</span>
                        <span>Converted to ${outputFormat.toUpperCase()} (${formatFileSize(file.size)} → ${formatFileSize(convertedBlob.size)})</span>
                    `;
                    resultsList.appendChild(item);
                }
            }
            
            showProgress(false);
            resultsDiv.classList.remove('hidden');
            downloadBtn.classList.remove('hidden');
            downloadBtn.disabled = false;
            
            // Setup download functionality with ZIP option
            downloadBtn.onclick = async function() {
                if (processedFiles.length > 3) {
                    // Create ZIP for multiple files
                    const zip = new JSZip();
                    processedFiles.forEach(file => {
                        zip.file(file.name, file.blob);
                    });
                    
                    showToast('📦 Creating ZIP archive...', 'info', 2000);
                    const zipBlob = await zip.generateAsync({type: 'blob'});
                    downloadFile(zipBlob, `format_converted_${Date.now()}.zip`);
                    showToast('✅ ZIP download started!', 'success', 2000);
                } else {
                    downloadAllFiles(processedFiles);
                    showToast('✅ Download started!', 'success', 2000);
                }
            };
            
            showToast('✅ Format conversion completed!', 'success', 3000);
        } catch (error) {
            showProgress(false);
            showToast('❌ Format conversion failed: ' + error.message, 'error', 3000);
        } finally {
            processBtn.disabled = false;
        }
    };
}

// ================================================================================
// [Start] BATCH PROCESSOR TOOL
// ================================================================================

// Batch processor setup with advanced options
function setupBatchProcessor() {
    const processBtn = document.getElementById('process-btn');
    const resultsDiv = document.getElementById('results');
    const resultsList = document.getElementById('results-list');
    const downloadBtn = document.getElementById('download-btn');

    if (!processBtn) return;

    // Setup feature toggle handlers
    setupFeatureToggles();
    
    // Setup preset management
    setupPresetManagement();
    
    // Setup file sorting
    setupFileSorting();
    
    // Update sortable files when files change
    const originalSetupFileInput = window.setupFileInput;
    if (originalSetupFileInput) {
        window.setupFileInput = function() {
            originalSetupFileInput.call(this);
            // Add listener to update sortable list when files change
            const fileInput = document.getElementById('file-input');
            if (fileInput) {
                fileInput.addEventListener('change', function() {
                    setTimeout(() => updateSortableFilesList(), 100);
                });
            }
        };
    }

    processBtn.onclick = async function() {
        if (!currentFiles.length) return;
        
        // Filter only image files
        const imageFiles = currentFiles.filter(file => file.type.startsWith('image/'));
        if (!imageFiles.length) {
            showToast('❌ Please select image files for batch processing', 'error', 3000);
            return;
        }

        // Get processing configuration
        const config = getBatchProcessingConfig();
        
        processBtn.disabled = true;
        showProgress(true, 'Batch processing images...');
        processedFiles = [];
        if (resultsList) resultsList.innerHTML = '';

        try {
            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i];
                updateProgress(Math.round(((i + 1) / imageFiles.length) * 100), `Processing images... (${i + 1}/${imageFiles.length})`);
                
                let processedFile = file;
                
                // Apply resize if enabled
                if (config.resize.enabled) {
                    processedFile = await resizeImageFile(processedFile, config.resize.width, config.resize.height, config.resize.maintainAspect);
                }
                
                // Apply compression if enabled
                if (config.compress.enabled) {
                    processedFile = await compressImageFile(processedFile, config.compress.quality);
                }
                
                // Apply format conversion if enabled
                if (config.convert.enabled) {
                    processedFile = await convertImageFormat(processedFile, config.convert.format, 90);
                }
                
                // Apply watermark if enabled
                if (config.watermark.enabled && config.watermark.text.trim()) {
                    processedFile = await addWatermarkToImage(processedFile, config.watermark);
                }
                
                // Apply rotation/flip if enabled
                if (config.rotate.enabled) {
                    if (config.rotate.angle !== 0) {
                        processedFile = await rotateImage(processedFile, config.rotate.angle);
                    }
                    if (config.rotate.flipHorizontal || config.rotate.flipVertical) {
                        processedFile = await flipImage(processedFile, config.rotate.flipHorizontal, config.rotate.flipVertical);
                    }
                }
                
                // Generate filename
                const filename = generateFileName(file.name, config, i);
                
                processedFiles.push({
                    blob: processedFile,
                    name: filename,
                    originalSize: file.size,
                    newSize: processedFile.size
                });
                
                // Add result item
                if (resultsList) {
                    const listItem = document.createElement('div');
                    listItem.className = 'flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg';
                    listItem.innerHTML = `
                        <div class="flex items-center">
                            <svg class="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                            <span class="font-medium">${filename}</span>
                        </div>
                        <div class="text-sm text-gray-500">
                            ${(processedFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                    `;
                    resultsList.appendChild(listItem);
                }
            }
            
            showProgress(false);
            resultsDiv.classList.remove('hidden');
            downloadBtn.classList.remove('hidden');
            downloadBtn.disabled = false;
            
            // Calculate total savings
            const totalOriginal = processedFiles.reduce((sum, f) => sum + f.originalSize, 0);
            const totalProcessed = processedFiles.reduce((sum, f) => sum + f.newSize, 0);
            const totalSavings = ((totalOriginal - totalProcessed) / totalOriginal * 100).toFixed(1);
            
            // Setup download functionality with ZIP
            downloadBtn.onclick = async function() {
                if (processedFiles.length > 3) {
                    // Create ZIP for multiple files
                    const zip = new JSZip();
                    processedFiles.forEach(file => {
                        zip.file(file.name, file.blob);
                    });
                    
                    showToast('📦 Creating ZIP archive...', 'info', 2000);
                    const zipBlob = await zip.generateAsync({type: 'blob'});
                    downloadFile(zipBlob, `batch_processed_${Date.now()}.zip`);
                    showToast('✅ ZIP download started!', 'success', 2000);
                } else {
                    downloadAllFiles(processedFiles);
                    showToast('✅ Download started!', 'success', 2000);
                }
            };
            
            showToast(`✅ Batch processing completed! Processed ${processedFiles.length} images`, 'success', 4000);
        } catch (error) {
            showProgress(false);
            showToast('❌ Batch processing failed: ' + error.message, 'error', 3000);
            console.error('Batch processing error:', error);
        } finally {
            processBtn.disabled = false;
        }
    };
}

// Setup feature toggle handlers
function setupFeatureToggles() {
    // Resize toggle
    const enableResize = document.getElementById('enable-resize');
    const resizeOptions = document.getElementById('resize-options');
    if (enableResize && resizeOptions) {
        enableResize.addEventListener('change', function() {
            if (this.checked) {
                resizeOptions.style.opacity = '1';
                resizeOptions.style.pointerEvents = 'auto';
                resizeOptions.style.background = 'rgba(59, 130, 246, 0.05)';
            } else {
                resizeOptions.style.opacity = '0.5';
                resizeOptions.style.pointerEvents = 'none';
                resizeOptions.style.background = 'transparent';
            }
        });
    }
    
    // Compress toggle
    const enableCompress = document.getElementById('enable-compress');
    const compressOptions = document.getElementById('compress-options');
    if (enableCompress && compressOptions) {
        enableCompress.addEventListener('change', function() {
            if (this.checked) {
                compressOptions.style.opacity = '1';
                compressOptions.style.pointerEvents = 'auto';
                compressOptions.style.background = 'rgba(34, 197, 94, 0.05)';
            } else {
                compressOptions.style.opacity = '0.5';
                compressOptions.style.pointerEvents = 'none';
                compressOptions.style.background = 'transparent';
            }
        });
    }
    
    // Convert toggle
    const enableConvert = document.getElementById('enable-convert');
    const convertOptions = document.getElementById('convert-options');
    if (enableConvert && convertOptions) {
        enableConvert.addEventListener('change', function() {
            if (this.checked) {
                convertOptions.style.opacity = '1';
                convertOptions.style.pointerEvents = 'auto';
                convertOptions.style.background = 'rgba(168, 85, 247, 0.05)';
            } else {
                convertOptions.style.opacity = '0.5';
                convertOptions.style.pointerEvents = 'none';
                convertOptions.style.background = 'transparent';
            }
        });
    }
    
    // Watermark toggle
    const enableWatermark = document.getElementById('enable-watermark');
    const watermarkOptions = document.getElementById('watermark-options');
    if (enableWatermark && watermarkOptions) {
        enableWatermark.addEventListener('change', function() {
            if (this.checked) {
                watermarkOptions.style.opacity = '1';
                watermarkOptions.style.pointerEvents = 'auto';
                watermarkOptions.style.background = 'rgba(6, 182, 212, 0.05)';
            } else {
                watermarkOptions.style.opacity = '0.5';
                watermarkOptions.style.pointerEvents = 'none';
                watermarkOptions.style.background = 'transparent';
            }
        });
    }
    
    // Rotate toggle
    const enableRotate = document.getElementById('enable-rotate');
    const rotateOptions = document.getElementById('rotate-options');
    if (enableRotate && rotateOptions) {
        enableRotate.addEventListener('change', function() {
            if (this.checked) {
                rotateOptions.style.opacity = '1';
                rotateOptions.style.pointerEvents = 'auto';
                rotateOptions.style.background = 'rgba(245, 158, 11, 0.05)';
            } else {
                rotateOptions.style.opacity = '0.5';
                rotateOptions.style.pointerEvents = 'none';
                rotateOptions.style.background = 'transparent';
            }
        });
    }
    
    // Rename toggle
    const enableRename = document.getElementById('enable-rename');
    const renameOptions = document.getElementById('rename-options');
    if (enableRename && renameOptions) {
        enableRename.addEventListener('change', function() {
            if (this.checked) {
                renameOptions.style.opacity = '1';
                renameOptions.style.pointerEvents = 'auto';
                renameOptions.style.background = 'rgba(239, 68, 68, 0.05)';
            } else {
                renameOptions.style.opacity = '0.5';
                renameOptions.style.pointerEvents = 'none';
                renameOptions.style.background = 'transparent';
            }
        });
    }
    
    // Quality slider updates
    const compressQuality = document.getElementById('compress-quality');
    const compressQualityValue = document.getElementById('compress-quality-value');
    if (compressQuality && compressQualityValue) {
        compressQuality.addEventListener('input', function() {
            compressQualityValue.textContent = this.value;
        });
    }
}

// Get batch processing configuration
function getBatchProcessingConfig() {
    return {
        resize: {
            enabled: document.getElementById('enable-resize')?.checked || false,
            width: parseInt(document.getElementById('resize-width')?.value) || 1200,
            height: parseInt(document.getElementById('resize-height')?.value) || 800,
            maintainAspect: document.getElementById('maintain-aspect-batch')?.checked || true
        },
        compress: {
            enabled: document.getElementById('enable-compress')?.checked || false,
            quality: parseInt(document.getElementById('compress-quality')?.value) || 85
        },
        convert: {
            enabled: document.getElementById('enable-convert')?.checked || false,
            format: document.getElementById('convert-format')?.value || 'jpeg'
        },
        watermark: {
            enabled: document.getElementById('enable-watermark')?.checked || false,
            text: document.getElementById('watermark-text')?.value || '',
            position: document.getElementById('watermark-position')?.value || 'bottom-right',
            opacity: parseFloat(document.getElementById('watermark-opacity')?.value) || 0.5,
            fontSize: parseInt(document.getElementById('watermark-size')?.value) || 24
        },
        rotate: {
            enabled: document.getElementById('enable-rotate')?.checked || false,
            angle: parseInt(document.getElementById('rotate-angle')?.value) || 0,
            flipHorizontal: document.getElementById('flip-horizontal')?.checked || false,
            flipVertical: document.getElementById('flip-vertical')?.checked || false
        },
        rename: {
            enabled: document.getElementById('enable-rename')?.checked || false,
            prefix: document.getElementById('rename-prefix')?.value || '',
            suffix: document.getElementById('rename-suffix')?.value || '',
            numbering: document.getElementById('enable-numbering')?.checked || true
        }
    };
}

// Setup preset management
function setupPresetManagement() {
    const presetSelect = document.getElementById('preset-select');
    const savePresetBtn = document.getElementById('save-preset');
    const deletePresetBtn = document.getElementById('delete-preset');
    const presetNameInput = document.getElementById('preset-name');
    
    if (!presetSelect) return;
    
    // Load saved presets
    loadPresets();
    
    // Save preset
    savePresetBtn?.addEventListener('click', function() {
        const presetName = presetNameInput.value.trim();
        if (!presetName) {
            showToast('❌ Please enter a preset name', 'error', 2000);
            return;
        }
        
        const config = getBatchProcessingConfig();
        const presets = JSON.parse(localStorage.getItem('batchPresets') || '{}');
        presets[presetName] = config;
        
        localStorage.setItem('batchPresets', JSON.stringify(presets));
        loadPresets();
        presetSelect.value = presetName;
        presetNameInput.value = '';
        
        showToast(`✅ Preset "${presetName}" saved successfully!`, 'success', 3000);
    });
    
    // Load preset
    presetSelect.addEventListener('change', function() {
        if (!this.value) return;
        
        const presets = JSON.parse(localStorage.getItem('batchPresets') || '{}');
        const config = presets[this.value];
        
        if (config) {
            loadPresetConfig(config);
            showToast(`📋 Preset "${this.value}" loaded!`, 'info', 2000);
        }
    });
    
    // Delete preset
    deletePresetBtn?.addEventListener('click', function() {
        const selectedPreset = presetSelect.value;
        if (!selectedPreset) {
            showToast('❌ Please select a preset to delete', 'error', 2000);
            return;
        }
        
        const presets = JSON.parse(localStorage.getItem('batchPresets') || '{}');
        delete presets[selectedPreset];
        localStorage.setItem('batchPresets', JSON.stringify(presets));
        
        loadPresets();
        showToast(`🗑️ Preset "${selectedPreset}" deleted`, 'success', 2000);
    });
}

function loadPresets() {
    const presetSelect = document.getElementById('preset-select');
    if (!presetSelect) return;
    
    const presets = JSON.parse(localStorage.getItem('batchPresets') || '{}');
    presetSelect.innerHTML = '<option value="">Select Preset...</option>';
    
    Object.keys(presets).forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        presetSelect.appendChild(option);
    });
}

function loadPresetConfig(config) {
    // Load resize settings
    document.getElementById('enable-resize').checked = config.resize.enabled;
    document.getElementById('resize-width').value = config.resize.width;
    document.getElementById('resize-height').value = config.resize.height;
    document.getElementById('maintain-aspect-batch').checked = config.resize.maintainAspect;
    
    // Load compress settings
    document.getElementById('enable-compress').checked = config.compress.enabled;
    document.getElementById('compress-quality').value = config.compress.quality;
    document.getElementById('compress-quality-value').textContent = config.compress.quality;
    
    // Load convert settings
    document.getElementById('enable-convert').checked = config.convert.enabled;
    document.getElementById('convert-format').value = config.convert.format;
    
    // Load watermark settings
    document.getElementById('enable-watermark').checked = config.watermark.enabled;
    document.getElementById('watermark-text').value = config.watermark.text;
    document.getElementById('watermark-position').value = config.watermark.position;
    document.getElementById('watermark-opacity').value = config.watermark.opacity;
    document.getElementById('watermark-size').value = config.watermark.fontSize;
    
    // Load rotate settings
    document.getElementById('enable-rotate').checked = config.rotate.enabled;
    document.getElementById('rotate-angle').value = config.rotate.angle;
    document.getElementById('flip-horizontal').checked = config.rotate.flipHorizontal;
    document.getElementById('flip-vertical').checked = config.rotate.flipVertical;
    
    // Load rename settings
    document.getElementById('enable-rename').checked = config.rename.enabled;
    document.getElementById('rename-prefix').value = config.rename.prefix;
    document.getElementById('rename-suffix').value = config.rename.suffix;
    document.getElementById('enable-numbering').checked = config.rename.numbering;
    
    // Trigger change events to update UI
    setupFeatureToggles();
}

// Setup file sorting
function setupFileSorting() {
    const sortNameBtn = document.getElementById('sort-name');
    const sortSizeBtn = document.getElementById('sort-size');
    const sortTypeBtn = document.getElementById('sort-type');
    const reverseBtn = document.getElementById('reverse-order');
    const sortableFiles = document.getElementById('sortable-files');
    
    if (!sortNameBtn) return;
    
    let currentSortOrder = 'original';
    
    // Sort by name
    sortNameBtn.addEventListener('click', function() {
        if (currentFiles.length === 0) {
            showToast('❌ No files to sort', 'error', 2000);
            return;
        }
        
        currentFiles.sort((a, b) => a.name.localeCompare(b.name));
        currentSortOrder = 'name';
        updateSortableFilesList();
        showToast('🔤 Files sorted by name', 'success', 2000);
    });
    
    // Sort by size
    sortSizeBtn.addEventListener('click', function() {
        if (currentFiles.length === 0) {
            showToast('❌ No files to sort', 'error', 2000);
            return;
        }
        
        currentFiles.sort((a, b) => a.size - b.size);
        currentSortOrder = 'size';
        updateSortableFilesList();
        showToast('📊 Files sorted by size (smallest first)', 'success', 2000);
    });
    
    // Sort by type
    sortTypeBtn.addEventListener('click', function() {
        if (currentFiles.length === 0) {
            showToast('❌ No files to sort', 'error', 2000);
            return;
        }
        
        currentFiles.sort((a, b) => {
            const typeA = a.type.split('/')[1] || '';
            const typeB = b.type.split('/')[1] || '';
            return typeA.localeCompare(typeB);
        });
        currentSortOrder = 'type';
        updateSortableFilesList();
        showToast('🏷️ Files sorted by type', 'success', 2000);
    });
    
    // Reverse order
    reverseBtn.addEventListener('click', function() {
        if (currentFiles.length === 0) {
            showToast('❌ No files to reverse', 'error', 2000);
            return;
        }
        
        currentFiles.reverse();
        updateSortableFilesList();
        showToast('🔄 File order reversed', 'success', 2000);
    });
    
    // Initial load
    updateSortableFilesList();
}

function updateSortableFilesList() {
    const sortableFiles = document.getElementById('sortable-files');
    if (!sortableFiles) return;
    
    sortableFiles.innerHTML = '';
    
    if (currentFiles.length === 0) {
        sortableFiles.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">No files selected</p>';
        return;
    }
    
    currentFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border hover:shadow-sm transition-shadow';
        fileItem.draggable = true;
        fileItem.dataset.index = index;
        
        const fileIcon = getFileTypeIcon(file.type);
        const fileSize = formatFileSize(file.size);
        const fileName = file.name.length > 25 ? file.name.substring(0, 25) + '...' : file.name;
        
        fileItem.innerHTML = `
            <div class="flex items-center flex-1">
                <span class="text-lg mr-2">${fileIcon}</span>
                <div class="flex-1 min-w-0">
                    <div class="font-medium text-sm text-gray-900 dark:text-white truncate" title="${file.name}">${fileName}</div>
                    <div class="text-xs text-gray-500">${fileSize} • ${file.type.split('/')[1]?.toUpperCase()}</div>
                </div>
            </div>
            <div class="flex items-center">
                <span class="text-gray-400 cursor-move">⋮⋮</span>
            </div>
        `;
        
        // Add drag and drop functionality
        fileItem.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', index);
            this.style.opacity = '0.5';
        });
        
        fileItem.addEventListener('dragend', function() {
            this.style.opacity = '1';
        });
        
        fileItem.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.style.borderTop = '2px solid #3b82f6';
        });
        
        fileItem.addEventListener('dragleave', function() {
            this.style.borderTop = 'none';
        });
        
        fileItem.addEventListener('drop', function(e) {
            e.preventDefault();
            this.style.borderTop = 'none';
            
            const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const targetIndex = parseInt(this.dataset.index);
            
            if (draggedIndex !== targetIndex) {
                // Reorder files array
                const draggedFile = currentFiles[draggedIndex];
                currentFiles.splice(draggedIndex, 1);
                currentFiles.splice(targetIndex, 0, draggedFile);
                
                updateSortableFilesList();
                showToast('📁 Files reordered', 'success', 1500);
            }
        });
        
        sortableFiles.appendChild(fileItem);
    });
}

function getFileTypeIcon(mimeType) {
    if (mimeType.startsWith('image/')) {
        if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return '🖼️';
        if (mimeType.includes('png')) return '🖼️';
        if (mimeType.includes('gif')) return '🎞️';
        if (mimeType.includes('webp')) return '🖼️';
        if (mimeType.includes('svg')) return '🎨';
        return '🖼️';
    }
    if (mimeType === 'application/pdf') return '📄';
    return '📁';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Enhanced Batch Processing Functions
async function addWatermarkToImage(file, watermarkConfig) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // Add watermark
            ctx.globalAlpha = watermarkConfig.opacity;
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.font = `bold ${watermarkConfig.fontSize}px Arial`;
            
            let x, y;
            const metrics = ctx.measureText(watermarkConfig.text);
            const textWidth = metrics.width;
            const textHeight = watermarkConfig.fontSize;
            
            switch (watermarkConfig.position) {
                case 'top-left':
                    x = 20;
                    y = textHeight + 20;
                    break;
                case 'top-right':
                    x = canvas.width - textWidth - 20;
                    y = textHeight + 20;
                    break;
                case 'bottom-left':
                    x = 20;
                    y = canvas.height - 20;
                    break;
                case 'bottom-right':
                    x = canvas.width - textWidth - 20;
                    y = canvas.height - 20;
                    break;
                case 'center':
                    x = (canvas.width - textWidth) / 2;
                    y = canvas.height / 2;
                    break;
                default:
                    x = canvas.width - textWidth - 20;
                    y = canvas.height - 20;
            }
            
            ctx.strokeText(watermarkConfig.text, x, y);
            ctx.fillText(watermarkConfig.text, x, y);
            
            canvas.toBlob(resolve, file.type, 0.95);
        };
        img.onerror = () => reject(new Error('Failed to load image for watermark'));
        img.src = URL.createObjectURL(file);
    });
}

async function rotateImage(file, angle) {
    if (angle === 0) return file;
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate new dimensions after rotation
            const radians = (angle * Math.PI) / 180;
            const sin = Math.abs(Math.sin(radians));
            const cos = Math.abs(Math.cos(radians));
            
            canvas.width = img.width * cos + img.height * sin;
            canvas.height = img.width * sin + img.height * cos;
            
            // Move to center and rotate
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(radians);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            
            canvas.toBlob(resolve, file.type, 0.95);
        };
        img.onerror = () => reject(new Error('Failed to load image for rotation'));
        img.src = URL.createObjectURL(file);
    });
}

async function flipImage(file, horizontal, vertical) {
    if (!horizontal && !vertical) return file;
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            
            // Apply transformations
            ctx.scale(horizontal ? -1 : 1, vertical ? -1 : 1);
            
            const x = horizontal ? -canvas.width : 0;
            const y = vertical ? -canvas.height : 0;
            
            ctx.drawImage(img, x, y);
            
            canvas.toBlob(resolve, file.type, 0.95);
        };
        img.onerror = () => reject(new Error('Failed to load image for flipping'));
        img.src = URL.createObjectURL(file);
    });
}

async function cropImage(file, cropConfig) {
    if (!cropConfig.enabled) return file;
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            
            // Calculate crop dimensions (percentages to pixels)
            const cropX = (cropConfig.x / 100) * img.width;
            const cropY = (cropConfig.y / 100) * img.height;
            const cropWidth = (cropConfig.width / 100) * img.width;
            const cropHeight = (cropConfig.height / 100) * img.height;
            
            canvas.width = cropWidth;
            canvas.height = cropHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            
            canvas.toBlob(resolve, file.type, 0.95);
        };
        img.onerror = () => reject(new Error('Failed to load image for cropping'));
        img.src = URL.createObjectURL(file);
    });
}

// Simulated background removal (in real app, this would use AI API)
async function removeBackground(file) {
    // This is a placeholder - in production you'd integrate with services like:
    // - Remove.bg API
    // - Adobe Photoshop API
    // - Custom AI model
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // Simple edge detection simulation (not real background removal)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Very basic background simulation - make white/light pixels transparent
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const brightness = (r + g + b) / 3;
                
                if (brightness > 200) {
                    data[i + 3] = 0; // Make transparent
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            canvas.toBlob(resolve, 'image/png', 1.0);
        };
        img.onerror = () => reject(new Error('Failed to load image for background removal'));
        img.src = URL.createObjectURL(file);
    });
}

function generateFileName(originalName, config, index) {
    const extension = originalName.split('.').pop();
    const nameWithoutExt = originalName.replace(`.${extension}`, '');
    
    let newName = nameWithoutExt;
    
    if (config.rename.enabled) {
        newName = '';
        if (config.rename.prefix) newName += config.rename.prefix;
        if (config.rename.numbering) {
            const paddedIndex = String(index + 1).padStart(3, '0');
            newName += newName ? `_${paddedIndex}` : paddedIndex;
        }
        if (config.rename.suffix) newName += config.rename.suffix;
        if (!newName) newName = nameWithoutExt; // Fallback
    }
    
    // Update extension based on conversion
    let finalExtension = extension;
    if (config.convert.enabled) {
        finalExtension = config.convert.format === 'jpeg' ? 'jpg' : config.convert.format;
    }
    if (config.removeBackground.enabled) {
        finalExtension = 'png'; // Background removal outputs PNG
    }
    
    return `${newName}.${finalExtension}`;
}

function initializeTool(toolName) {
    if (toolName === 'image-compressor') {
        setupImageCompressor();
    } else if (toolName === 'image-to-pdf') {
        setupImageToPdf();
    } else if (toolName === 'pdf-to-images') {
        setupPdfToImages();
    } else if (toolName === 'image-resizer') {
        setupImageResizer();
    } else if (toolName === 'format-converter') {
        setupFormatConverter();
    } else if (toolName === 'batch-processor') {
        setupBatchProcessor();
    }
}

function openTool(toolName) {
    currentTool = toolName;
    const modal = document.getElementById('tool-modal');
    const title = document.getElementById('tool-title');
    const content = document.getElementById('tool-content');
    
    // Set title
    const titles = {
        'image-to-pdf': 'Image to PDF Converter',
        'pdf-to-images': 'PDF to Images Converter',
        'image-compressor': 'Image Compressor',
        'image-resizer': 'Image Resizer',
        'format-converter': 'Format Converter',
        'batch-processor': 'Batch Processor'
    };
    
    title.textContent = titles[toolName] || 'Tool Workspace';
    
    // Load tool content
    content.innerHTML = getToolContent(toolName);
    
    // Show modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Initialize tool
    setTimeout(() => {
        initializeTool(toolName);
        setupFileInput();
    }, 100);
    
    // Show enhanced success toast with premium animations
    setTimeout(() => {
        showToast(`🚀 ${titles[toolName]} loaded successfully!`, 'success', 4000);
    }, 200);
    
    // Show info toast after success for demo
    setTimeout(() => {
        showToast(`💡 Ready to process your files with advanced features`, 'info', 3000);
    }, 1500);
}

function closeTool() {
    const modal = document.getElementById('tool-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    
    // Reset state
    currentFiles = [];
    processedFiles = [];
    currentTool = '';
    currentSlideIndex = 0;
    imageDataUrls = [];
}

function getToolContent(toolName) {
    const commonFileInput = `
        <div class="file-drop-zone rounded-xl p-8 text-center mb-6">
            <div class="file-input-wrapper">
                <svg class="w-12 h-12 text-gray-400 mb-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
                <p class="text-lg font-medium mb-2">Drag & drop files here</p>
                <p class="text-gray-500 mb-4">or click to browse</p>
                <button type="button" onclick="document.getElementById('file-input').click()" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Choose Files
                </button>
                <input type="file" id="file-input" multiple accept="image/*,.pdf" class="hidden">
            </div>
        </div>
        <div id="file-preview" class="hidden mb-6">
            <h3 class="text-lg font-semibold mb-4">Selected Files</h3>
            <div id="file-list" class="space-y-2 mb-4"></div>
        </div>
    `;
    
    const controls = {
        'batch-processor': `
            <!-- Preset Management -->
            <div class="preset-section mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-lg">
                <h3 class="text-lg font-semibold mb-3 text-gray-800 dark:text-white">📋 Preset Management</h3>
                <div class="space-y-3">
                    <select id="preset-select" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                        <option value="">Select Preset...</option>
                    </select>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button id="save-preset" class="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2">
                            <span class="text-sm">💾</span>
                            <span class="text-sm font-medium">Save</span>
                        </button>
                        <button id="delete-preset" class="px-4 py-2.5 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:from-red-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2">
                            <span class="text-sm">🗑️</span>
                            <span class="text-sm font-medium">Delete</span>
                        </button>
                        <input id="preset-name" type="text" placeholder="Preset name..." class="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400">
                    </div>
                </div>
            </div>

            <!-- File Sorting & Management -->
            <div class="file-management mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-lg">
                <h3 class="text-lg font-semibold mb-3 text-gray-800 dark:text-white">📁 File Management</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <button id="sort-name" class="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2">
                        <span class="text-sm">🔤</span>
                        <span class="text-sm font-medium">Name</span>
                    </button>
                    <button id="sort-size" class="px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2">
                        <span class="text-sm">📊</span>
                        <span class="text-sm font-medium">Size</span>
                    </button>
                    <button id="sort-type" class="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2">
                        <span class="text-sm">🏷️</span>
                        <span class="text-sm font-medium">Type</span>
                    </button>
                    <button id="reverse-order" class="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2">
                        <span class="text-sm">🔄</span>
                        <span class="text-sm font-medium">Reverse</span>
                    </button>
                </div>
                <div id="sortable-files" class="space-y-2 max-h-40 overflow-y-auto bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-600"></div>
            </div>

            <!-- Processing Options Grid -->
            <div class="processing-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                
                <!-- Resize Options -->
                <div class="option-card p-4 border rounded-lg bg-white dark:bg-gray-800">
                    <label class="flex items-center mb-3">
                        <input type="checkbox" id="enable-resize" class="mr-2">
                        <span class="font-semibold text-gray-800 dark:text-white">📏 Resize Images</span>
                    </label>
                    <div id="resize-options" class="space-y-2 opacity-50">
                        <div class="flex gap-2">
                            <input type="number" id="resize-width" placeholder="Width" class="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <select id="resize-unit" class="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                <option value="px">px</option>
                                <option value="%">%</option>
                            </select>
                        </div>
                        <input type="number" id="resize-height" placeholder="Height" class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <label class="flex items-center">
                            <input type="checkbox" id="maintain-aspect-batch" checked class="mr-2">
                            <span class="text-sm text-gray-600 dark:text-gray-300">Maintain aspect ratio</span>
                        </label>
                    </div>
                </div>

                <!-- Compression Options -->
                <div class="option-card p-4 border rounded-lg bg-white dark:bg-gray-800">
                    <label class="flex items-center mb-3">
                        <input type="checkbox" id="enable-compress" class="mr-2">
                        <span class="font-semibold text-gray-800 dark:text-white">🗜️ Compress Images</span>
                    </label>
                    <div id="compress-options" class="space-y-2 opacity-50">
                        <label class="block text-sm text-gray-600 dark:text-gray-300">Quality: <span id="compress-quality-value">85</span>%</label>
                        <input type="range" id="compress-quality" min="10" max="100" value="85" class="w-full">
                        <div class="text-xs text-gray-500">Lower = Smaller file, Higher = Better quality</div>
                    </div>
                </div>

                <!-- Format Conversion -->
                <div class="option-card p-4 border rounded-lg bg-white dark:bg-gray-800">
                    <label class="flex items-center mb-3">
                        <input type="checkbox" id="enable-convert" class="mr-2">
                        <span class="font-semibold text-gray-800 dark:text-white">🔄 Convert Format</span>
                    </label>
                    <div id="convert-options" class="space-y-2 opacity-50">
                        <select id="convert-format" class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <option value="jpeg">JPEG</option>
                            <option value="png">PNG</option>
                            <option value="webp">WebP</option>
                            <option value="avif">AVIF</option>
                        </select>
                    </div>
                </div>

                <!-- Watermark Options -->
                <div class="option-card p-4 border rounded-lg bg-white dark:bg-gray-800">
                    <label class="flex items-center mb-3">
                        <input type="checkbox" id="enable-watermark" class="mr-2">
                        <span class="font-semibold text-gray-800 dark:text-white">💧 Add Watermark</span>
                    </label>
                    <div id="watermark-options" class="space-y-2 opacity-50">
                        <input type="text" id="watermark-text" placeholder="Watermark text" class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <select id="watermark-position" class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <option value="top-left">Top Left</option>
                            <option value="top-right">Top Right</option>
                            <option value="bottom-left">Bottom Left</option>
                            <option value="bottom-right">Bottom Right</option>
                            <option value="center">Center</option>
                        </select>
                        <div class="flex gap-2">
                            <input type="range" id="watermark-opacity" min="0.1" max="1" step="0.1" value="0.5" class="flex-1">
                            <input type="number" id="watermark-size" min="12" max="72" value="24" placeholder="Size" class="w-16 p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        </div>
                    </div>
                </div>

                <!-- Rotate & Flip -->
                <div class="option-card p-4 border rounded-lg bg-white dark:bg-gray-800">
                    <label class="flex items-center mb-3">
                        <input type="checkbox" id="enable-rotate" class="mr-2">
                        <span class="font-semibold text-gray-800 dark:text-white">🔄 Rotate & Flip</span>
                    </label>
                    <div id="rotate-options" class="space-y-2 opacity-50">
                        <select id="rotate-angle" class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            <option value="0">No Rotation</option>
                            <option value="90">90° Right</option>
                            <option value="180">180°</option>
                            <option value="270">270° (90° Left)</option>
                        </select>
                        <div class="flex gap-2">
                            <label class="flex items-center flex-1">
                                <input type="checkbox" id="flip-horizontal" class="mr-1">
                                <span class="text-sm">↔️ Horizontal</span>
                            </label>
                            <label class="flex items-center flex-1">
                                <input type="checkbox" id="flip-vertical" class="mr-1">
                                <span class="text-sm">↕️ Vertical</span>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Bulk Rename -->
                <div class="option-card p-4 border rounded-lg bg-white dark:bg-gray-800">
                    <label class="flex items-center mb-3">
                        <input type="checkbox" id="enable-rename" class="mr-2">
                        <span class="font-semibold text-gray-800 dark:text-white">📝 Bulk Rename</span>
                    </label>
                    <div id="rename-options" class="space-y-2 opacity-50">
                        <input type="text" id="rename-prefix" placeholder="Prefix" class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <input type="text" id="rename-suffix" placeholder="Suffix" class="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <label class="flex items-center">
                            <input type="checkbox" id="enable-numbering" checked class="mr-2">
                            <span class="text-sm text-gray-600 dark:text-gray-300">Add numbering (001, 002...)</span>
                        </label>
                    </div>
                </div>

            </div>

            <!-- Processing Summary & Privacy Notice -->
            <div class="processing-summary mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 rounded-lg">
                <h3 class="text-lg font-semibold mb-2 text-gray-800 dark:text-white">📊 Processing Summary</h3>
                <div id="processing-preview" class="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    Configure options above to see processing preview...
                </div>
                <div class="privacy-notice p-2 bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-900 dark:to-blue-900 rounded-lg border border-green-200 dark:border-green-700">
                    <div class="flex items-center justify-center">
                        <svg class="w-4 h-4 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path>
                        </svg>
                        <span class="text-sm font-medium text-green-800 dark:text-green-200">🔒 100% Client-Side • Your files stay private</span>
                    </div>
                </div>
            </div>

            <!-- Progress Section -->
            <div id="batch-progress" class="hidden mb-6">
                <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                    <h3 class="font-semibold mb-2 text-gray-800 dark:text-white">Processing Files...</h3>
                    <div class="space-y-2">
                        <div class="flex justify-between text-sm">
                            <span id="current-file-name" class="text-gray-600 dark:text-gray-300">Preparing...</span>
                            <span id="file-progress" class="text-gray-500">0/0</span>
                        </div>
                        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div id="batch-progress-bar" class="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                        </div>
                        <div id="processing-status" class="text-xs text-gray-500 space-y-1"></div>
                    </div>
                </div>
            </div>
        `,
        'pdf-to-images': `
            <div class="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label class="block text-sm font-medium mb-2">Output Format</label>
                    <select id="pdf-extract-format" class="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700">
                        <option value="jpeg">JPEG</option>
                        <option value="png">PNG</option>
                        <option value="webp">WebP</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Quality</label>
                    <input type="range" id="pdf-extract-quality" min="10" max="100" value="90" class="w-full">
                    <div class="text-center text-sm text-gray-500 mt-1">
                        <span id="pdf-extract-quality-value">90</span>%
                    </div>
                </div>
            </div>
            <div class="mb-6">
                <label class="block text-sm font-medium mb-2">DPI (Resolution)</label>
                <select id="pdf-extract-dpi" class="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700">
                    <option value="96">96 DPI (Screen Resolution)</option>
                    <option value="150">150 DPI (Medium Quality)</option>
                    <option value="300">300 DPI (High Quality)</option>
                </select>
            </div>
        `,
        'image-to-pdf': `
            <div class="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label class="block text-sm font-medium mb-2">Page Layout</label>
                    <select id="pdf-layout" class="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700">
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Page Size</label>
                    <select id="pdf-size" class="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700">
                        <option value="a4">A4</option>
                        <option value="letter">Letter</option>
                        <option value="legal">Legal</option>
                    </select>
                </div>
            </div>
            <div class="mb-6">
                <label class="block text-sm font-medium mb-2">Margin (px)</label>
                <input type="range" id="pdf-margin" min="0" max="50" value="10" class="w-full">
                <div class="text-center text-sm text-gray-500 mt-1">
                    <span id="margin-value">10</span>px
                </div>
            </div>
        `,
        'image-compressor': `
            <div class="mb-6">
                <label class="block text-sm font-medium mb-2">Quality</label>
                <input type="range" id="quality-slider" min="10" max="100" value="80" class="w-full">
                <div class="text-center text-sm text-gray-500 mt-1">
                    <span id="quality-value">80</span>%
                </div>
            </div>
            <div id="compression-stats" class="hidden bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                <div class="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div class="text-sm text-gray-500">Original</div>
                        <div id="original-size" class="font-bold">-</div>
                    </div>
                    <div>
                        <div class="text-sm text-gray-500">Compressed</div>
                        <div id="compressed-size" class="font-bold">-</div>
                    </div>
                    <div>
                        <div class="text-sm text-gray-500">Saved</div>
                        <div id="saved-percentage" class="font-bold text-green-600">-</div>
                    </div>
                </div>
            </div>
        `,
        'image-resizer': `
            <div class="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label class="block text-sm font-medium mb-2">Width (px)</label>
                    <input type="number" id="resize-width" placeholder="800" class="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Height (px)</label>
                    <input type="number" id="resize-height" placeholder="600" class="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700">
                </div>
            </div>
            <div class="mb-6">
                <label class="flex items-center">
                    <input type="checkbox" id="maintain-aspect" checked class="mr-2">
                    <span class="text-sm">Maintain aspect ratio</span>
                </label>
            </div>
        `,
        'format-converter': `
            <div class="mb-6">
                <label class="block text-sm font-medium mb-2">Output Format</label>
                <select id="output-format" class="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700">
                    <option value="jpeg">JPEG</option>
                    <option value="png">PNG</option>
                    <option value="webp">WebP</option>
                    <option value="avif">AVIF</option>
                    <option value="bmp">BMP</option>
                    <option value="tiff">TIFF</option>
                </select>
            </div>
            <div class="mb-6">
                <label class="block text-sm font-medium mb-2">Quality</label>
                <input type="range" id="convert-quality" min="10" max="100" value="90" class="w-full">
                <div class="text-center text-sm text-gray-500 mt-1">
                    <span id="convert-quality-value">90</span>%
                </div>
            </div>
        `
    };
    
    return `
        ${commonFileInput}
        ${controls[toolName] || ''}
        <div class="flex space-x-6 gap-4">
            <button id="process-btn" class="flex items-center justify-center flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                <svg class="w-5 h-5 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                <span>Process Files</span>
            </button>
            <button id="download-btn" class="flex items-center justify-center flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hidden" disabled>
                <svg class="w-5 h-5 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                <span>Download All</span>
            </button>
        </div>
        <div id="results" class="mt-6 hidden">
            <h3 class="text-lg font-semibold mb-4">Processed Files</h3>
            <div id="results-list" class="space-y-2"></div>
        </div>
    `;
}

// Global functions for PDF to Images tool
window.downloadAllImagesIndividual = function() {
    console.log(`🔽 downloadAllImagesIndividual called with ${processedFiles.length} processed files:`, processedFiles.map(f => f.name));
    
    if (!processedFiles || processedFiles.length === 0) {
        showToast('No images to download', 'error');
        return;
    }
    
    processedFiles.forEach((file, index) => {
        const link = document.createElement('a');
        link.href = file.blob;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`🔽 Downloaded individual image ${index + 1}/${processedFiles.length}: ${file.name}`);
        
        // Small delay between downloads to prevent browser blocking
        setTimeout(() => {}, index * 100);
    });
    
    showToast(`Downloaded ${processedFiles.length} images individually`, 'success');
};

window.downloadAllImagesZip = async function() {
    console.log(`🔽 downloadAllImagesZip called with ${processedFiles.length} processed files:`, processedFiles.map(f => f.name));
    
    if (!processedFiles || processedFiles.length === 0) {
        showToast('No images to download', 'error');
        return;
    }
    
    try {
        showProgress(true, 'Creating ZIP archive...');
        
        const zip = new JSZip();
        
        for (let i = 0; i < processedFiles.length; i++) {
            const file = processedFiles[i];
            updateProgress(Math.round(((i + 1) / processedFiles.length) * 100), `Adding to ZIP... (${i + 1}/${processedFiles.length})`);
            
            // Convert blob URL to actual blob data
            const response = await fetch(file.blob);
            const arrayBuffer = await response.arrayBuffer();
            
            zip.file(file.name, arrayBuffer);
            console.log(`🔽 Added to ZIP: ${file.name}`);
        }
        
        updateProgress(100, 'Generating ZIP file...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = 'extracted-images.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        hideProgress();
        showToast(`Downloaded ${processedFiles.length} images as ZIP`, 'success');
        console.log(`🔽 ZIP download completed with ${processedFiles.length} files`);
        
    } catch (error) {
        console.error('❌ Error creating ZIP:', error);
        showToast('Error creating ZIP file: ' + error.message, 'error');
        hideProgress();
    }
};

// ================================================================================
// [End] IMAGEPDF TOOLKIT - MAIN JAVASCRIPT FILE
// ================================================================================