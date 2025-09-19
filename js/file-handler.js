/**
 * FileHandler - Professional File Management and Processing Library
 * Handles file operations, drag & drop, and batch processing
 */

class FileHandler {
    constructor() {
        this.acceptedImageTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
            'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml'
        ];
        this.acceptedPDFTypes = ['application/pdf'];
        this.maxFileSize = 50 * 1024 * 1024; // 50MB default
        this.files = [];
        this.callbacks = {};
    }

    /**
     * Set up drag and drop for an element
     * @param {HTMLElement} element - Element to set up drag and drop for
     * @param {Object} options - Configuration options
     */
    setupDragAndDrop(element, options = {}) {
        if (!element) return;

        const acceptedTypes = options.acceptedTypes || [...this.acceptedImageTypes, ...this.acceptedPDFTypes];
        const multiple = options.multiple !== false; // Default to true
        const maxFiles = options.maxFiles || 50;
        const clickToBrowse = options.clickToBrowse !== false; // default true

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            element.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            element.addEventListener(eventName, () => {
                element.classList.add('drag-over');
                if (options.onDragEnter) options.onDragEnter();
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            element.addEventListener(eventName, () => {
                element.classList.remove('drag-over');
                if (options.onDragLeave) options.onDragLeave();
            }, false);
        });

        // Handle dropped files
        element.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = Array.from(dt.files);
            
            this.handleFileSelection(files, {
                acceptedTypes,
                multiple,
                maxFiles,
                callback: options.onFilesAdded
            });
        }, false);

        // Handle click to browse (configurable)
        if (clickToBrowse) {
            element.addEventListener('click', () => {
                this.openFileBrowser({
                    acceptedTypes,
                    multiple,
                    maxFiles,
                    callback: options.onFilesAdded
                });
            });
        }

        return element;
    }

    /**
     * Open file browser dialog
     * @param {Object} options - File selection options
     */
    openFileBrowser(options = {}) {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = options.multiple !== false;
        
        // Set accepted file types
        if (options.acceptedTypes) {
            input.accept = options.acceptedTypes.join(',');
        }

        input.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handleFileSelection(files, options);
        });

        input.click();
    }

    /**
     * Handle file selection and validation
     * @param {File[]} files - Selected files
     * @param {Object} options - Processing options
     */
    handleFileSelection(files, options = {}) {
        const acceptedTypes = options.acceptedTypes || [...this.acceptedImageTypes, ...this.acceptedPDFTypes];
        const multiple = options.multiple !== false;
        const maxFiles = options.maxFiles || 50;
        const callback = options.callback;

        const validFiles = [];
        const errors = [];

        // Limit to single file if multiple is false
        if (!multiple && files.length > 1) {
            files = [files[0]];
        }

        // Check file count limit
        if (files.length > maxFiles) {
            errors.push(`Too many files selected. Maximum ${maxFiles} files allowed.`);
            files = files.slice(0, maxFiles);
        }

        // Validate each file
        files.forEach((file, index) => {
            const validation = this.validateFile(file, acceptedTypes);
            
            if (validation.valid) {
                validFiles.push(file);
            } else {
                errors.push(`File ${index + 1} (${file.name}): ${validation.error}`);
            }
        });

        // Add to internal file list
        if (multiple) {
            this.files.push(...validFiles);
        } else {
            this.files = validFiles;
        }

        // Call callback with results
        if (callback) {
            callback({
                validFiles,
                errors,
                allFiles: this.files
            });
        }

        // Trigger file change event
        this.triggerEvent('filesChanged', {
            validFiles,
            errors,
            allFiles: this.files
        });

        return { validFiles, errors };
    }

    /**
     * Validate a single file
     * @param {File} file - File to validate
     * @param {string[]} acceptedTypes - Accepted MIME types
     * @returns {Object}
     */
    validateFile(file, acceptedTypes = null) {
        const types = acceptedTypes || [...this.acceptedImageTypes, ...this.acceptedPDFTypes];
        
        if (!file) {
            return { valid: false, error: 'No file provided' };
        }

        // Check file type
        if (!types.includes(file.type)) {
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            const typesByExtension = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'webp': 'image/webp',
                'bmp': 'image/bmp',
                'tiff': 'image/tiff',
                'svg': 'image/svg+xml',
                'pdf': 'application/pdf'
            };
            
            const detectedType = typesByExtension[fileExtension];
            if (!detectedType || !types.includes(detectedType)) {
                return { 
                    valid: false, 
                    error: `Unsupported file type: ${file.type || 'unknown'}. Accepted types: ${types.join(', ')}` 
                };
            }
        }

        // Check file size
        if (file.size > this.maxFileSize) {
            return { 
                valid: false, 
                error: `File too large: ${this.formatFileSize(file.size)}. Maximum size: ${this.formatFileSize(this.maxFileSize)}` 
            };
        }

        // Check for empty files
        if (file.size === 0) {
            return { valid: false, error: 'File is empty' };
        }

        return { valid: true };
    }

    /**
     * Remove file from list
     * @param {number} index - File index to remove
     */
    removeFile(index) {
        if (index >= 0 && index < this.files.length) {
            const removedFile = this.files.splice(index, 1)[0];
            
            this.triggerEvent('fileRemoved', {
                file: removedFile,
                index,
                remaining: this.files
            });
            
            return removedFile;
        }
        return null;
    }

    /**
     * Clear all files
     */
    clearFiles() {
        const clearedFiles = [...this.files];
        this.files = [];
        
        this.triggerEvent('filesCleared', {
            clearedFiles
        });
    }

    /**
     * Get file information
     * @param {File} file - File to analyze
     * @returns {Promise<Object>}
     */
    async getFileInfo(file) {
        const info = {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            lastModifiedDate: new Date(file.lastModified),
            extension: file.name.split('.').pop()?.toLowerCase() || '',
            formattedSize: this.formatFileSize(file.size)
        };

        // Additional info for images
        if (file.type.startsWith('image/')) {
            try {
                const imageInfo = await this.getImageInfo(file);
                Object.assign(info, imageInfo);
            } catch (error) {
                console.warn('Failed to get image info:', error);
            }
        }

        return info;
    }

    /**
     * Get image information
     * @param {File} file - Image file
     * @returns {Promise<Object>}
     */
    getImageInfo(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height,
                    aspectRatio: (img.width / img.height).toFixed(2),
                    megapixels: ((img.width * img.height) / 1000000).toFixed(2)
                });
                URL.revokeObjectURL(img.src);
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
                URL.revokeObjectURL(img.src);
            };

            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Create file preview
     * @param {File} file - File to preview
     * @param {Object} options - Preview options
     * @returns {Promise<string|HTMLElement>}
     */
    async createPreview(file, options = {}) {
        const maxWidth = options.maxWidth || 200;
        const maxHeight = options.maxHeight || 200;
        const quality = options.quality || 0.8;

        if (file.type.startsWith('image/')) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Calculate dimensions while maintaining aspect ratio
                    let { width, height } = img;
                    const aspectRatio = width / height;
                    
                    if (width > maxWidth) {
                        width = maxWidth;
                        height = width / aspectRatio;
                    }
                    
                    if (height > maxHeight) {
                        height = maxHeight;
                        width = height * aspectRatio;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const previewDataURL = canvas.toDataURL('image/jpeg', quality);
                    URL.revokeObjectURL(img.src);
                    resolve(previewDataURL);
                };

                img.onerror = () => {
                    reject(new Error('Failed to create image preview'));
                    URL.revokeObjectURL(img.src);
                };

                img.src = URL.createObjectURL(file);
            });
        } else if (file.type === 'application/pdf') {
            // Return a PDF icon or placeholder
            return this.createPDFPreview(file, options);
        }

        return null;
    }

    /**
     * Create PDF preview placeholder
     * @param {File} file - PDF file
     * @param {Object} options - Preview options
     * @returns {string}
     */
    createPDFPreview(file, options = {}) {
        const width = options.maxWidth || 200;
        const height = options.maxHeight || 200;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw PDF icon placeholder
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#666666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PDF', width / 2, height / 2 - 10);
        ctx.fillText(file.name, width / 2, height / 2 + 10);
        
        return canvas.toDataURL();
    }

    /**
     * Download processed file
     * @param {Blob} blob - File blob to download
     * @param {string} filename - Download filename
     */
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up URL after download
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    /**
     * Download multiple files as ZIP
     * @param {Array} files - Array of {blob, filename} objects
     * @param {string} zipName - ZIP file name
     */
    async downloadAsZip(files, zipName = 'processed_files.zip') {
        // This would require JSZip library
        if (!window.JSZip) {
            try {
                await this.loadScript('https://unpkg.com/jszip@3.10.1/dist/jszip.min.js');
            } catch (error) {
                throw new Error('Failed to load ZIP library');
            }
        }

        const zip = new JSZip();
        
        // Add files to ZIP
        files.forEach(({ blob, filename }, index) => {
            const name = filename || `file_${index + 1}`;
            zip.file(name, blob);
        });

        // Generate ZIP blob
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        // Download ZIP
        this.downloadFile(zipBlob, zipName);
    }

    /**
     * Load external script
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string}
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Calculate processing time estimate
     * @param {File[]} files - Files to process
     * @param {string} operation - Operation type
     * @returns {number} Estimated time in seconds
     */
    estimateProcessingTime(files, operation) {
        const baseTimePerFile = {
            compress: 2,
            resize: 1.5,
            convert: 2.5,
            pdf_merge: 1,
            pdf_split: 0.5,
            qr_generate: 0.5
        };

        const baseTime = baseTimePerFile[operation] || 2;
        let totalTime = 0;

        files.forEach(file => {
            const sizeMultiplier = Math.max(1, file.size / (1024 * 1024)); // MB
            totalTime += baseTime * sizeMultiplier;
        });

        return Math.ceil(totalTime);
    }

    /**
     * Set event callback
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    /**
     * Remove event callback
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    off(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
        }
    }

    /**
     * Trigger event
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    triggerEvent(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in event callback:', error);
                }
            });
        }
    }

    /**
     * Get current file list
     * @returns {File[]}
     */
    getFiles() {
        return [...this.files];
    }

    /**
     * Set maximum file size
     * @param {number} bytes - Maximum file size in bytes
     */
    setMaxFileSize(bytes) {
        this.maxFileSize = bytes;
    }

    /**
     * Get file type category
     * @param {File} file - File to categorize
     * @returns {string}
     */
    getFileCategory(file) {
        if (this.acceptedImageTypes.includes(file.type)) {
            return 'image';
        } else if (this.acceptedPDFTypes.includes(file.type)) {
            return 'pdf';
        } else {
            return 'other';
        }
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileHandler;
}

// Global availability
window.FileHandler = FileHandler;
