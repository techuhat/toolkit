// Global variables are declared in the HTML file
// currentFiles, processedFiles, currentTool, currentSlideIndex, imageDataUrls

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

async function updateFileList(files) {
    currentFiles = files;
    const filePreview = document.getElementById('file-preview');
    const fileList = document.getElementById('file-list');
    const processBtn = document.getElementById('process-btn');
    
    if (files.length > 0) {
        filePreview.classList.remove('hidden');
        fileList.innerHTML = '';
        
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
        
        processBtn.disabled = false;
        
        // Show enhanced file upload success toast
        if (files.length === 1) {
            setTimeout(() => {
                showToast(`✅ File "${files[0].name}" uploaded successfully!`, 'success', 3000);
            }, 100);
        } else {
            setTimeout(() => {
                showToast(`🎉 ${files.length} files uploaded successfully!`, 'success', 3000);
            }, 100);
        }
    } else {
        filePreview.classList.add('hidden');
        processBtn.disabled = true;
    }
}

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    
    if (isDark) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
}

// Initialize theme on page load
initTheme();

// Setup file input functionality
function setupFileInput() {
    const fileInput = document.getElementById('file-input');
    const fileDropZone = document.querySelector('.file-drop-zone');
    
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                updateFileList(files);
            }
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
            updateFileList(files);
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
    const toggle = document.getElementById('dn');
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        toggle.checked = savedTheme === 'dark';
        // Apply theme based on saved preference
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    } else {
        // Set toggle based on current theme
        toggle.checked = document.documentElement.classList.contains('dark');
    }
    
    // Listen for toggle changes
    toggle.addEventListener('change', function() {
        const theme = this.checked ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    });
    
    // Initialize global drag and drop functionality
    setupGlobalDragDrop();
});

// Utility Functions
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

function showToast(message, type = 'success', duration = 3000) {
    // Determine which container to use based on whether the tool modal is open
    const isToolOpen = !document.getElementById('tool-modal').classList.contains('hidden');
    const containerId = isToolOpen ? 'tool-toast-container' : 'toast-container';
    const container = document.getElementById(containerId);
    
    const toast = document.createElement('div');
    const toastId = 'toast-' + Date.now();
    toast.id = toastId;
    toast.className = `toast ${type}-enhanced bg-white dark:bg-gray-800 border-l-4 ${
        type === 'success' ? 'border-green-500' : 
        type === 'error' ? 'border-red-500' : 
        type === 'warning' ? 'border-yellow-500' :
        'border-blue-500'
    } p-4 rounded-lg shadow-lg transform translate-x-full opacity-0 transition-all duration-300 ease-out relative overflow-hidden`;
    
    // Add custom toast styles based on type
    toast.style.backgroundImage = `linear-gradient(135deg, 
        ${type === 'success' ? 'rgba(16, 185, 129, 0.05) 0%, rgba(34, 197, 94, 0.03) 100%' : 
          type === 'error' ? 'rgba(239, 68, 68, 0.05) 0%, rgba(220, 38, 38, 0.03) 100%' : 
          type === 'warning' ? 'rgba(245, 158, 11, 0.05) 0%, rgba(217, 119, 6, 0.03) 100%' :
          'rgba(59, 130, 246, 0.05) 0%, rgba(37, 99, 235, 0.03) 100%'})`;
    toast.style.transition = 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    
    // Add sparkle effects for success toasts
    const sparkles = type === 'success' ? `
        <div class="toast-sparkle"></div>
        <div class="toast-sparkle"></div>
        <div class="toast-sparkle"></div>
    ` : '';
    
    // Add additional styles for better visibility
    if (isToolOpen) {
        toast.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
        toast.style.fontWeight = '500';
        toast.style.zIndex = '9999';
    }
    
    const icon = type === 'success' ? '<svg class="w-6 h-6 text-green-500 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>' :
                    type === 'error' ? '<svg class="w-6 h-6 text-red-500 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>' :
                    type === 'warning' ? '<svg class="w-6 h-6 text-yellow-500 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>' :
                    '<svg class="w-6 h-6 text-blue-500 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>';
    
    toast.innerHTML = `
        ${sparkles}
        <div class="flex items-center justify-between relative z-10">
            <div class="flex items-center flex-1">
                ${icon}
                <span class="text-sm font-medium text-gray-900 dark:text-white">${message}</span>
            </div>
            <button onclick="dismissToast('${toastId}')" class="ml-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <div class="toast-progress-container">
            <div class="toast-progress-bar bg-gradient-to-r ${
                type === 'success' ? 'from-green-500 via-green-400 to-emerald-400' :
                type === 'error' ? 'from-red-500 via-red-400 to-pink-400' :
                type === 'warning' ? 'from-yellow-500 via-amber-400 to-orange-400' :
                'from-blue-500 via-blue-400 to-cyan-400'
            }" style="width: 100%; animation: toast-progress ${duration}ms cubic-bezier(0.4, 0, 0.2, 1);">
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30" style="animation: shimmer 2s infinite linear;"></div>
                <div class="absolute inset-0 ${
                    type === 'success' ? 'bg-gradient-to-r from-green-400 to-emerald-300' :
                    type === 'error' ? 'bg-gradient-to-r from-red-400 to-pink-300' :
                    type === 'warning' ? 'bg-gradient-to-r from-yellow-400 to-orange-300' :
                    'bg-gradient-to-r from-blue-400 to-cyan-300'
                } opacity-50" style="animation: pulse-glow 1.5s ease-in-out infinite alternate;"></div>
                
                <!-- Add animated dots for loading effect -->
                <div class="absolute inset-0 flex items-center justify-center">
                    <div class="flex space-x-1 opacity-70">
                        <div class="w-1 h-1 bg-white rounded-full" style="animation: pulse-glow 0.6s ease-in-out infinite alternate; animation-delay: 0s;"></div>
                        <div class="w-1 h-1 bg-white rounded-full" style="animation: pulse-glow 0.6s ease-in-out infinite alternate; animation-delay: 0.2s;"></div>
                        <div class="w-1 h-1 bg-white rounded-full" style="animation: pulse-glow 0.6s ease-in-out infinite alternate; animation-delay: 0.4s;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Show toast with enhanced animation
    requestAnimationFrame(() => {
        if (window.innerWidth <= 640) {
            // Mobile devices - use opacity animation instead of transform
            toast.classList.remove('opacity-0');
            toast.classList.add('opacity-100');
            // Ensure toast is properly positioned on mobile
            toast.style.transform = 'translateX(0)';
            toast.style.left = '0';
            toast.style.right = '0';
            toast.style.width = '100%';
            toast.style.maxWidth = '100%';
        } else {
            // Desktop devices - use transform animation but ensure proper positioning
            toast.classList.remove('translate-x-full', 'opacity-0');
            toast.classList.add('translate-x-0', 'opacity-100');
            // Ensure toast is properly positioned on desktop
            toast.style.transform = 'translateX(0)';
            toast.style.left = '0';
            toast.style.right = '0';
            toast.style.width = '100%';
            toast.style.maxWidth = '100%';
        }
    });
    
    // Auto-remove toast
    const timeoutId = setTimeout(() => {
        dismissToast(toastId);
    }, duration);
    
    // Store timeout ID for manual dismissal
    toast.dataset.timeoutId = timeoutId;
}

function dismissToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        // Clear timeout if manually dismissed
        if (toast.dataset.timeoutId) {
            clearTimeout(toast.dataset.timeoutId);
        }
        
        if (window.innerWidth <= 640) {
            // Mobile devices - use opacity animation
            toast.classList.remove('opacity-100');
            toast.classList.add('opacity-0');
            // Ensure toast stays in position during dismissal
            toast.style.transform = 'translateX(0)';
        } else {
            // Desktop devices - use opacity animation to prevent sliding off-screen
            toast.classList.remove('opacity-100');
            toast.classList.add('opacity-0');
            // Ensure toast stays in position during dismissal
            toast.style.transform = 'translateX(0)';
        }
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
}

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

// Tool management functions

// Image compression logic
async function compressImageFile(file, quality) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
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
        processBtn.disabled = true;
        showProgress(true, 'Compressing images...');
        let totalOriginal = 0, totalCompressed = 0;
        processedFiles = [];
        resultsList.innerHTML = '';
        for (let i = 0; i < currentFiles.length; i++) {
            const file = currentFiles[i];
            if (!file.type.startsWith('image/')) continue;
            totalOriginal += file.size;
            try {
                const compressedBlob = await compressImageFile(file, parseInt(qualitySlider.value));
                totalCompressed += compressedBlob.size;
                processedFiles.push(compressedBlob);
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
        }
        resultsDiv.classList.remove('hidden');
        downloadBtn.classList.remove('hidden');
        downloadBtn.disabled = false;
        processBtn.disabled = false;
        showToast('Compression completed!', 'success', 2500);
    };
    // Download all compressed images as zip (optional, not implemented here)
}

function initializeTool(toolName) {
    if (toolName === 'image-compressor') {
        setupImageCompressor();
    }
    // Add other tool initializations here if needed
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
            <div class="mb-6">
                <h3 class="text-lg font-semibold mb-4">Individual Image Settings</h3>
                <div id="batch-images" class="grid gap-6 md:grid-cols-2">
                    <!-- Individual image controls will be added here -->
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
        <div class="flex space-x-4">
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