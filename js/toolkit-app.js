/**
 * ToolkitApp - Main Application Controller
 * Coordinates all processing tools and provides unified interface
 */

class ToolkitApp {
    constructor() {
        this.imageProcessor = new ImageProcessor();
        this.pdfProcessor = new PDFProcessor();
        this.qrGenerator = new QRCodeGenerator();
        this.fileHandler = new FileHandler();
        
        this.currentTool = null;
        this.isProcessing = false;
        this.progressCallback = null;
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.setupEventListeners();
        this.setupFileHandler();
        this.updateUI();
    }

    /**
     * Set up file handler events
     */
    setupFileHandler() {
        this.fileHandler.on('filesChanged', (data) => {
            this.updateFileList(data);
            this.updateProcessingButtons();
        });

        this.fileHandler.on('fileRemoved', (data) => {
            this.updateFileList({ allFiles: data.remaining });
            this.updateProcessingButtons();
        });

        this.fileHandler.on('filesCleared', () => {
            this.updateFileList({ allFiles: [] });
            this.updateProcessingButtons();
        });
    }

    /**
     * Set up global event listeners
     */
    setupEventListeners() {
        // Mobile menu toggle (guarded to avoid double-binding if nav.js is present)
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        const navAlreadyInit = typeof window !== 'undefined' && window.__NAV_INIT_DONE;
        if (!navAlreadyInit && mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });

            // Close mobile menu when clicking outside
            document.addEventListener('click', (e) => {
                if (mobileMenu && !mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                    mobileMenu.classList.add('hidden');
                }
            });
        }

        // Tool tab switching
        document.querySelectorAll('[data-tool-tab]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const toolName = tab.getAttribute('data-tool-tab');
                this.switchTool(toolName);
            });
        });

        // Process buttons
        document.querySelectorAll('[data-process-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.getAttribute('data-process-action');
                this.handleProcessAction(action, btn);
            });
        });

        // Clear files button
        const clearBtn = document.getElementById('clear-files-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.fileHandler.clearFiles();
                this.showToast('Files cleared', 'success');
            });
        }

        // Settings and quality controls
        this.setupQualityControls();
        this.setupDimensionControls();
    }

    /**
     * Set up quality control sliders and inputs
     */
    setupQualityControls() {
        const qualitySlider = document.getElementById('quality-slider');
        const qualityValue = document.getElementById('quality-value');
        
        if (qualitySlider && qualityValue) {
            qualitySlider.addEventListener('input', (e) => {
                const value = e.target.value;
                qualityValue.textContent = value + '%';
                this.updateProcessingOptions();
            });
        }

        // Compression level controls
        document.querySelectorAll('[name="compression-level"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateProcessingOptions();
            });
        });
    }

    /**
     * Update internal processing options when UI controls change
     * (no-op for now; pages with live previews may override or extend)
     */
    updateProcessingOptions() {
        // Intentionally left minimal – compute on demand in getProcessingOptions()
    }

    /**
     * Set up dimension control inputs
     */
    setupDimensionControls() {
        const widthInput = document.getElementById('width-input');
        const heightInput = document.getElementById('height-input');
        const maintainRatio = document.getElementById('maintain-aspect-ratio');
        
        if (widthInput && heightInput && maintainRatio) {
            let lastChanged = 'width';
            
            widthInput.addEventListener('input', (e) => {
                if (maintainRatio.checked) {
                    this.updateDimensionsWithRatio('width', e.target.value);
                }
                lastChanged = 'width';
            });

            heightInput.addEventListener('input', (e) => {
                if (maintainRatio.checked) {
                    this.updateDimensionsWithRatio('height', e.target.value);
                }
                lastChanged = 'height';
            });

            maintainRatio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.updateDimensionsWithRatio(lastChanged, lastChanged === 'width' ? widthInput.value : heightInput.value);
                }
            });
        }
    }

    /**
     * Update dimensions while maintaining aspect ratio
     */
    updateDimensionsWithRatio(changedDimension, value) {
        const widthInput = document.getElementById('width-input');
        const heightInput = document.getElementById('height-input');
        
        if (!widthInput || !heightInput || !value) return;

        // Get aspect ratio from first selected image
        const files = this.fileHandler.getFiles();
        const firstImageFile = files.find(f => f.type.startsWith('image/'));
        
        if (!firstImageFile) return;

        // This is a simplified approach - in reality, you'd get the actual image dimensions
        const defaultRatio = 16 / 9; // Fallback ratio

        if (changedDimension === 'width') {
            const newHeight = Math.round(value / defaultRatio);
            heightInput.value = newHeight;
        } else {
            const newWidth = Math.round(value * defaultRatio);
            widthInput.value = newWidth;
        }
    }

    /**
     * Switch to a different tool
     */
    switchTool(toolName) {
        // Update tab active states
        document.querySelectorAll('[data-tool-tab]').forEach(tab => {
            tab.classList.remove('active', 'bg-primary', 'text-white');
            tab.classList.add('text-text-secondary');
        });

        const activeTab = document.querySelector(`[data-tool-tab="${toolName}"]`);
        if (activeTab) {
            activeTab.classList.add('active', 'bg-primary', 'text-white');
            activeTab.classList.remove('text-text-secondary');
        }

        // Show/hide tool panels
        document.querySelectorAll('.tool-panel').forEach(panel => {
            panel.classList.add('hidden');
        });

        const activePanel = document.getElementById(`${toolName}-panel`);
        if (activePanel) {
            activePanel.classList.remove('hidden');
        }

        this.currentTool = toolName;
        this.updateProcessingButtons();
        this.updateFileDropArea();
    }

    /**
     * Update file drop area based on current tool
     */
    updateFileDropArea() {
        const dropArea = document.getElementById('file-drop-area');
        if (!dropArea) return;

        let acceptedTypes = [];
        let dropText = 'Drop files here or click to browse';

        switch (this.currentTool) {
            case 'compress':
            case 'resize':
            case 'convert':
                acceptedTypes = this.fileHandler.acceptedImageTypes;
                dropText = 'Drop images here or click to browse';
                break;
            case 'pdf-merge':
            case 'pdf-split':
            case 'pdf-compress':
                acceptedTypes = this.fileHandler.acceptedPDFTypes;
                dropText = 'Drop PDF files here or click to browse';
                break;
            case 'image-to-pdf':
                acceptedTypes = this.fileHandler.acceptedImageTypes;
                dropText = 'Drop images to convert to PDF';
                break;
            case 'qr-generate':
                // QR generation doesn't use file drops
                dropText = 'Enter text or data to generate QR code';
                break;
            default:
                acceptedTypes = [...this.fileHandler.acceptedImageTypes, ...this.fileHandler.acceptedPDFTypes];
        }

        // Update drop area text
        const dropTextElement = dropArea.querySelector('.drop-text');
        if (dropTextElement) {
            dropTextElement.textContent = dropText;
        }

        // Setup drag and drop with appropriate file types
        this.fileHandler.setupDragAndDrop(dropArea, {
            acceptedTypes,
            multiple: this.currentTool !== 'pdf-merge', // PDF merge might want multiple files
            onFilesAdded: (data) => {
                if (data.errors.length > 0) {
                    data.errors.forEach(error => this.showToast(error, 'error'));
                }
                if (data.validFiles.length > 0) {
                    this.showToast(`${data.validFiles.length} file(s) added successfully`, 'success');
                }
            },
            onDragEnter: () => {
                dropArea.classList.add('drag-over');
            },
            onDragLeave: () => {
                dropArea.classList.remove('drag-over');
            }
        });
    }

    /**
     * Handle process actions
     */
    async handleProcessAction(action, button) {
        if (this.isProcessing) return;

        const files = this.fileHandler.getFiles();
        if (files.length === 0 && action !== 'qr-generate') {
            this.showToast('Please select files first', 'warning');
            return;
        }

        this.isProcessing = true;
        this.updateProcessButton(button, true);

        try {
            let results;
            const options = this.getProcessingOptions();

            switch (action) {
                case 'compress-images':
                    results = await this.processImages('compress', files, options);
                    break;
                case 'resize-images':
                    results = await this.processImages('resize', files, options);
                    break;
                case 'convert-images':
                    results = await this.processImages('convert', files, options);
                    break;
                case 'merge-pdfs':
                    results = await this.processPDFs('merge', files, options);
                    break;
                case 'split-pdf':
                    results = await this.processPDFs('split', files, options);
                    break;
                case 'compress-pdf':
                    results = await this.processPDFs('compress', files, options);
                    break;
                case 'images-to-pdf':
                    results = await this.convertImagesToPDF(files, options);
                    break;
                case 'generate-qr':
                    results = await this.generateQRCode(options);
                    break;
                default:
                    throw new Error('Unknown action: ' + action);
            }

            this.handleProcessingResults(results, action);

        } catch (error) {
            console.error('Processing error:', error);
            this.showToast(`Processing failed: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
            this.updateProcessButton(button, false);
        }
    }

    /**
     * Process images with specified operation
     */
    async processImages(operation, files, options) {
        const imageFiles = files.filter(f => f.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            throw new Error('No image files found');
        }

        const processingOptions = {
            operation,
            ...options
        };

        return await this.imageProcessor.batchProcess(
            imageFiles, 
            processingOptions, 
            (current, total, results) => {
                this.updateProgress(current, total, 'Processing images...');
            }
        );
    }

    /**
     * Process PDFs with specified operation
     */
    async processPDFs(operation, files, options) {
        const pdfFiles = files.filter(f => f.type === 'application/pdf');
        
        if (pdfFiles.length === 0) {
            throw new Error('No PDF files found');
        }

        switch (operation) {
            case 'merge':
                const mergedPDF = await this.pdfProcessor.mergePDFs(pdfFiles);
                return [{ processed: new Blob([mergedPDF], { type: 'application/pdf' }), success: true }];
            
            case 'split':
                if (pdfFiles.length > 1) {
                    throw new Error('Please select only one PDF file for splitting');
                }
                const splitPages = await this.pdfProcessor.splitPDF(pdfFiles[0]);
                return splitPages.map(page => ({
                    processed: new Blob([page], { type: 'application/pdf' }),
                    success: true
                }));
            
            case 'compress':
                return await this.pdfProcessor.batchProcess(
                    pdfFiles,
                    'compress',
                    options,
                    (current, total) => {
                        this.updateProgress(current, total, 'Compressing PDFs...');
                    }
                );
            
            default:
                throw new Error('Unknown PDF operation: ' + operation);
        }
    }

    /**
     * Convert images to PDF
     */
    async convertImagesToPDF(files, options) {
        const imageFiles = files.filter(f => f.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            throw new Error('No image files found');
        }

        this.updateProgress(0, 1, 'Converting images to PDF...');
        
        const pdfBytes = await this.pdfProcessor.imagesToPDF(imageFiles, options);
        
        this.updateProgress(1, 1, 'Conversion complete');
        
        return [{
            processed: new Blob([pdfBytes], { type: 'application/pdf' }),
            success: true,
            filename: `images_${Date.now()}.pdf`
        }];
    }

    /**
     * Generate QR code
     */
    async generateQRCode(options) {
        const qrText = document.getElementById('qr-text-input')?.value;
        const qrType = document.querySelector('[name="qr-type"]:checked')?.value || 'text';
        
        if (!qrText && qrType === 'text') {
            throw new Error('Please enter text for QR code generation');
        }

        this.updateProgress(0, 1, 'Generating QR code...');

        let qrDataURL;
        
        switch (qrType) {
            case 'text':
                qrDataURL = await this.qrGenerator.generateQRDataURL(qrText, options);
                break;
            case 'url':
                qrDataURL = await this.qrGenerator.generateURLQR(qrText, options);
                break;
            case 'wifi':
                // Get WiFi config from form
                const wifiConfig = this.getWiFiConfig();
                qrDataURL = await this.qrGenerator.generateWiFiQR(wifiConfig, options);
                break;
            case 'contact':
                // Get contact info from form
                const contactInfo = this.getContactInfo();
                qrDataURL = await this.qrGenerator.generateContactQR(contactInfo, options);
                break;
            default:
                qrDataURL = await this.qrGenerator.generateQRDataURL(qrText, options);
        }

        this.updateProgress(1, 1, 'QR code generated');

        // Convert data URL to blob
        const response = await fetch(qrDataURL);
        const blob = await response.blob();

        return [{
            processed: blob,
            success: true,
            filename: `qr_code_${Date.now()}.png`,
            preview: qrDataURL
        }];
    }

    /**
     * Get WiFi configuration from form
     */
    getWiFiConfig() {
        return {
            ssid: document.getElementById('wifi-ssid')?.value || '',
            password: document.getElementById('wifi-password')?.value || '',
            security: document.getElementById('wifi-security')?.value || 'WPA',
            hidden: document.getElementById('wifi-hidden')?.checked || false
        };
    }

    /**
     * Get contact information from form
     */
    getContactInfo() {
        return {
            firstName: document.getElementById('contact-first-name')?.value || '',
            lastName: document.getElementById('contact-last-name')?.value || '',
            organization: document.getElementById('contact-organization')?.value || '',
            title: document.getElementById('contact-title')?.value || '',
            phone: document.getElementById('contact-phone')?.value || '',
            email: document.getElementById('contact-email')?.value || '',
            url: document.getElementById('contact-url')?.value || '',
            address: document.getElementById('contact-address')?.value || ''
        };
    }

    /**
     * Get current processing options
     */
    getProcessingOptions() {
        const options = {};

        // Quality settings
        const qualitySlider = document.getElementById('quality-slider');
        if (qualitySlider) {
            options.quality = parseFloat(qualitySlider.value) / 100;
        }

        // Compression level
        const compressionLevel = document.querySelector('[name="compression-level"]:checked');
        if (compressionLevel) {
            options.compressionLevel = compressionLevel.value;
        }

        // Resize dimensions
        const widthInput = document.getElementById('width-input');
        const heightInput = document.getElementById('height-input');
        const maintainRatio = document.getElementById('maintain-aspect-ratio');
        
        if (widthInput && heightInput) {
            options.width = parseInt(widthInput.value) || 800;
            options.height = parseInt(heightInput.value) || 600;
            options.maintainAspectRatio = maintainRatio ? maintainRatio.checked : true;
        }

        // Format conversion
        const targetFormat = document.getElementById('target-format');
        if (targetFormat) {
            options.targetFormat = targetFormat.value;
        }

        // QR code options
        const qrSize = document.getElementById('qr-size');
        const qrErrorCorrection = document.getElementById('qr-error-correction');
        const qrDarkColor = document.getElementById('qr-dark-color');
        const qrLightColor = document.getElementById('qr-light-color');
        
        if (qrSize) options.width = parseInt(qrSize.value) || 256;
        if (qrErrorCorrection) options.errorCorrectionLevel = qrErrorCorrection.value;
        if (qrDarkColor) options.darkColor = qrDarkColor.value;
        if (qrLightColor) options.lightColor = qrLightColor.value;

        return options;
    }

    /**
     * Handle processing results
     */
    handleProcessingResults(results, action) {
        if (!results || results.length === 0) {
            this.showToast('No results generated', 'warning');
            return;
        }

        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        if (failed.length > 0) {
            this.showToast(`${failed.length} file(s) failed to process`, 'warning');
        }

        if (successful.length > 0) {
            this.showToast(`${successful.length} file(s) processed successfully`, 'success');
            
            // Auto-download results
            if (successful.length === 1) {
                const result = successful[0];
                const filename = result.filename || this.generateFilename(action, result);
                this.fileHandler.downloadFile(result.processed, filename);
            } else {
                // Download as ZIP for multiple files
                const files = successful.map((result, index) => ({
                    blob: result.processed,
                    filename: result.filename || this.generateFilename(action, result, index)
                }));
                
                this.fileHandler.downloadAsZip(files, `processed_files_${Date.now()}.zip`);
            }

            // Show preview for QR codes
            if (action === 'generate-qr' && successful[0].preview) {
                this.showQRPreview(successful[0].preview);
            }

            // Update statistics
            this.updateStatistics(successful.length, action);
        }

        this.hideProgress();
    }

    /**
     * Generate filename for processed file
     */
    generateFilename(action, result, index = 0) {
        const timestamp = Date.now();
        const extension = this.getFileExtension(action);
        
        if (result.original && result.original.name) {
            const originalName = result.original.name.split('.').slice(0, -1).join('.');
            return `${originalName}_${action}_${timestamp}.${extension}`;
        }
        
        return `processed_${action}_${index + 1}_${timestamp}.${extension}`;
    }

    /**
     * Get appropriate file extension for action
     */
    getFileExtension(action) {
        const extensions = {
            'compress-images': 'jpg',
            'resize-images': 'jpg',
            'convert-images': 'jpg',
            'merge-pdfs': 'pdf',
            'split-pdf': 'pdf',
            'compress-pdf': 'pdf',
            'images-to-pdf': 'pdf',
            'generate-qr': 'png'
        };
        
        return extensions[action] || 'bin';
    }

    /**
     * Update file list display
     */
    updateFileList(data) {
        const fileList = document.getElementById('file-list');
        if (!fileList) return;

        const files = data.allFiles || [];
        
        if (files.length === 0) {
            fileList.innerHTML = '<div class="text-text-secondary text-center py-4">No files selected</div>';
            return;
        }

        fileList.innerHTML = files.map((file, index) => `
            <div class="flex items-center justify-between p-3 bg-surface rounded-lg border border-border">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                        <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            ${this.getFileIcon(file.type)}
                        </svg>
                    </div>
                    <div>
                        <div class="font-medium text-sm truncate max-w-48" title="${file.name}">${file.name}</div>
                        <div class="text-xs text-text-secondary">${this.fileHandler.formatFileSize(file.size)}</div>
                    </div>
                </div>
                <button 
                    onclick="app.removeFile(${index})"
                    class="p-1 text-text-secondary hover:text-error transition-colors"
                    title="Remove file"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `).join('');
    }

    /**
     * Remove file by index
     */
    removeFile(index) {
        this.fileHandler.removeFile(index);
    }

    /**
     * Get appropriate icon for file type
     */
    getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) {
            return '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>';
        } else if (mimeType === 'application/pdf') {
            return '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>';
        }
        return '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>';
    }

    /**
     * Update processing buttons state
     */
    updateProcessingButtons() {
        const files = this.fileHandler.getFiles();
        const hasFiles = files.length > 0;
        
        document.querySelectorAll('[data-process-action]').forEach(btn => {
            const action = btn.getAttribute('data-process-action');
            
            // QR generation doesn't need files
            if (action === 'generate-qr') {
                btn.disabled = false;
                return;
            }
            
            btn.disabled = !hasFiles || this.isProcessing;
            
            if (hasFiles && !this.isProcessing) {
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                btn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        });
    }

    /**
     * Update process button during processing
     */
    updateProcessButton(button, processing) {
        const originalText = button.getAttribute('data-original-text') || button.textContent;
        
        if (!button.getAttribute('data-original-text')) {
            button.setAttribute('data-original-text', button.textContent);
        }
        
        if (processing) {
            button.disabled = true;
            button.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
            `;
        } else {
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    /**
     * Update progress display
     */
    updateProgress(current, total, message) {
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        const progressContainer = document.getElementById('progress-container');
        
        if (progressContainer) {
            progressContainer.classList.remove('hidden');
        }
        
        if (progressBar) {
            const percentage = Math.round((current / total) * 100);
            progressBar.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${message} (${current}/${total})`;
        }
    }

    /**
     * Hide progress display
     */
    hideProgress() {
        const progressContainer = document.getElementById('progress-container');
        if (progressContainer) {
            progressContainer.classList.add('hidden');
        }
    }

    /**
     * Show QR code preview
     */
    showQRPreview(dataURL) {
        const previewContainer = document.getElementById('qr-preview-container');
        const previewImage = document.getElementById('qr-preview-image');
        
        if (previewContainer && previewImage) {
            previewImage.src = dataURL;
            previewContainer.classList.remove('hidden');
        }
    }

    /**
     * Update statistics
     */
    updateStatistics(processedCount, action) {
        // Update live counters if they exist
        const processedCounter = document.getElementById('processed-count');
        const savedSpaceCounter = document.getElementById('saved-space');
        
        if (processedCounter) {
            const current = parseInt(processedCounter.textContent.replace(/,/g, '')) || 0;
            processedCounter.textContent = (current + processedCount).toLocaleString();
        }
        
        // Estimate space saved (simplified calculation)
        if (savedSpaceCounter && action.includes('compress')) {
            const currentSaved = parseFloat(savedSpaceCounter.textContent.replace(/[^\d.]/g, '')) || 0;
            const estimatedSaved = processedCount * 0.5; // Estimate 0.5MB saved per file
            savedSpaceCounter.textContent = (currentSaved + estimatedSaved).toFixed(1) + 'MB';
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 4000) {
        // Prefer global toast if available for consistent styling across pages
        if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
            window.showToast(message, type, duration);
            return;
        }
        // Fallback: create a local toast (in case toast.js isn't loaded)
        const toast = document.createElement('div');
        toast.className = `
            toast fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg border
            transform translate-x-full transition-transform duration-300 ease-out
            ${type === 'success' ? 'bg-green-500 border-green-400 text-white' : ''}
            ${type === 'error' ? 'bg-red-500 border-red-400 text-white' : ''}
            ${type === 'warning' ? 'bg-yellow-500 border-yellow-400 text-white' : ''}
            ${type === 'info' ? 'bg-blue-500 border-blue-400 text-white' : ''}
        `;
        
        toast.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <div class="flex-shrink-0">
                        ${this.getToastIcon(type)}
                    </div>
                    <div class="font-medium">${message}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto-remove after duration
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    /**
     * Get toast icon based on type
     */
    getToastIcon(type) {
        const icons = {
            success: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
            error: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
            warning: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>',
            info: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
        };
        return icons[type] || icons.info;
    }

    /**
     * Update UI elements
     */
    updateUI() {
        // Update current tool if specified in URL
        const urlParams = new URLSearchParams(window.location.search);
        const tool = urlParams.get('tool');
        
        if (tool) {
            this.switchTool(tool);
        } else if (this.currentTool === null) {
            // Default to first available tool
            const firstTab = document.querySelector('[data-tool-tab]');
            if (firstTab) {
                this.switchTool(firstTab.getAttribute('data-tool-tab'));
            }
        }

        this.updateProcessingButtons();
    }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ToolkitApp();
});

// Export for global access
if (typeof window !== 'undefined') {
    window.ToolkitApp = ToolkitApp;
}
