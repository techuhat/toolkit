/**
 * Enhanced Activity Tracker - Real-time processing queue and activity management
 */

class EnhancedActivityTracker {
    constructor() {
        this.activities = JSON.parse(localStorage.getItem('imageToolkitActivities') || '[]');
        this.stats = JSON.parse(localStorage.getItem('imageToolkitStats') || '{"processed": 0, "savedSpace": 0}');
        this.sessionStats = { processed: 0, savedSpace: 0 };
        this.processingQueue = [];
        this.isProcessing = false;
    }

    addToProcessingQueue(files, toolType, options = {}) {
        const queueItems = files.map(file => ({
            id: Date.now() + Math.random(),
            file,
            toolType,
            options,
            status: 'queued', // queued, processing, completed, failed
            progress: 0,
            result: null,
            error: null,
            startTime: null,
            endTime: null
        }));

        this.processingQueue.push(...queueItems);
        this.updateQueueUI();
        return queueItems;
    }

    async processQueue(progressCallback) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        const results = [];

        try {
            for (let i = 0; i < this.processingQueue.length; i++) {
                const item = this.processingQueue[i];
                if (item.status !== 'queued') continue;

                item.status = 'processing';
                item.startTime = Date.now();
                item.progress = 0;
                this.updateQueueItemUI(item);

                // Simulate progress updates for UI smoothness (can be removed if not desired)
                for (let progress = 0; progress <= 100; progress += 10) {
                    item.progress = progress;
                    this.updateQueueItemUI(item);
                    if (progressCallback) progressCallback(i + 1, this.processingQueue.length, progress);
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                try {
                    // Real processing
                    let processedBlob;
                    switch (item.toolType) {
                        case 'compress': {
                            const supported = (window.imageProcessor && window.imageProcessor.supportedFormats) || ['jpeg','jpg','png','webp','avif','bmp'];
                            let fmt = item.options.format || 'webp';
                            if (fmt === 'original') {
                                const typePart = (item.file.type || '').split('/')[1] || '';
                                let normalized = typePart.toLowerCase();
                                if (normalized === 'jpg') normalized = 'jpeg';
                                // Keep lossy formats; otherwise switch to webp for actual compression
                                const keepSet = new Set(['jpeg', 'webp', 'avif']);
                                fmt = keepSet.has(normalized) ? normalized : 'webp';
                            } else {
                                let normalized = fmt.toLowerCase();
                                if (normalized === 'jpg') normalized = 'jpeg';
                                fmt = supported.includes(normalized) ? normalized : 'webp';
                            }
                            processedBlob = await window.imageProcessor.compressImage(
                                item.file,
                                item.options.quality || 0.8,
                                fmt
                            );
                            // Persist chosen output format for consistent filename
                            item._chosenFormat = fmt;
                            break;
                        }
                        case 'resize':
                            processedBlob = await window.imageProcessor.resizeImage(
                                item.file,
                                item.options.width || 800,
                                item.options.height || 600,
                                item.options.maintainAspectRatio !== false,
                                item.options.highQuality !== false
                            );
                            break;
                        case 'convert': {
                            const supported = (window.imageProcessor && window.imageProcessor.supportedFormats) || ['jpeg','jpg','png','webp','avif','bmp'];
                            let tf = (item.options.targetFormat || 'webp').toLowerCase();
                            if (tf === 'jpg') tf = 'jpeg';
                            if (!supported.includes(tf)) tf = 'webp';
                            processedBlob = await window.imageProcessor.convertFormat(
                                item.file,
                                tf,
                                item.options.quality || 0.9
                            );
                            item._chosenFormat = tf;
                            break;
                        }
                        case 'pdf_compress': {
                            if (!window.pdfProcessor) throw new Error('PDF processor not initialized');
                            const pdfBytes = await window.pdfProcessor.compressPDF(item.file, item.options || {});
                            processedBlob = new Blob([pdfBytes], { type: 'application/pdf' });
                            break;
                        }
                        case 'pdf_merge': {
                            if (!window.pdfProcessor) throw new Error('PDF processor not initialized');
                            const files = (item.options && item.options.files) ? item.options.files : [item.file];
                            const mergedBytes = await window.pdfProcessor.mergePDFs(files);
                            // Optional compress step for merged output
                            let finalBytes = mergedBytes;
                            if (item.options && item.options.compressAfterMerge) {
                                try {
                                    const tmpFile = new File([mergedBytes], 'merged.pdf', { type: 'application/pdf' });
                                    finalBytes = await window.pdfProcessor.compressPDF(tmpFile, item.options.compressOptions || {});
                                } catch (_) { /* no-op if compression fails */ }
                            }
                            processedBlob = new Blob([finalBytes], { type: 'application/pdf' });
                            break;
                        }
                        default:
                            throw new Error('Unknown processing type: ' + item.toolType);
                    }

                    item.result = {
                        blob: processedBlob,
                        originalSize: item.file.size,
                        processedSize: processedBlob.size,
                        savedBytes: Math.max(0, item.file.size - processedBlob.size),
                        filename: this.generateFilename(item)
                    };

                    item.status = 'completed';
                    item.endTime = Date.now();
                    item.progress = 100;
                    results.push(item);

                    // Update session stats
                    this.sessionStats.processed++;
                    this.sessionStats.savedSpace += item.result.savedBytes;
                } catch (error) {
                    item.status = 'failed';
                    item.error = error.message;
                    item.endTime = Date.now();
                    console.error(`Processing failed for ${item.file.name}:`, error);
                }

                this.updateQueueItemUI(item);
            }

            // Add to activity history
            const successful = results.filter(r => r.status === 'completed');
            if (successful.length > 0) {
                const totalSaved = successful.reduce((sum, it) => sum + it.result.savedBytes, 0);
                this.addActivity(successful[0].toolType, {
                    title: `${successful.length} images processed`,
                    description: `Saved ${this.formatFileSize(totalSaved)} of storage space`,
                    filesProcessed: successful.length,
                    spaceSaved: totalSaved
                });
            }

            return results;
        } finally {
            this.isProcessing = false;
        }
    }

    updateQueueUI() {
        const queue = document.getElementById('processing-queue');
        if (!queue) return;

        if (this.processingQueue.length === 0) {
            queue.innerHTML = `
                <div class="text-center py-12">
                    <div class="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                        </svg>
                    </div>
                    <p class="text-text-secondary font-medium">Ready to Process</p>
                    <p class="text-text-secondary text-sm mt-1">Upload images to begin</p>
                </div>
            `;
            return;
        }

        queue.innerHTML = this.processingQueue.map(item => this.renderQueueItem(item)).join('');
    }

    renderQueueItem(item) {
        const statusIcons = {
            queued: '<div class="w-2 h-2 bg-primary rounded-full animate-pulse"></div>',
            processing: '<div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>',
            completed: '<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
            failed: '<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>'
        };

        const statusColors = {
            queued: 'bg-primary',
            processing: 'bg-accent',
            completed: 'bg-green-500',
            failed: 'bg-red-500'
        };

        const statusText = {
            queued: 'Queued for processing',
            processing: `Processing... ${item.progress}%`,
            completed: item.result ? `Saved ${this.formatFileSize(item.result.savedBytes)}` : 'Completed',
            failed: `Error: ${item.error || 'Unknown error'}`
        };

        const processingTime = item.endTime && item.startTime ?
            `${((item.endTime - item.startTime) / 1000).toFixed(1)}s` : '';

        const isImage = (item.file && typeof item.file.type === 'string' && item.file.type.startsWith('image/'));
        const previewHTML = isImage
            ? `<img src="${URL.createObjectURL(item.file)}" class="w-full h-full object-cover" alt="${item.file.name}">`
            : `
                <div class="w-full h-full flex items-center justify-center bg-surface-light">
                    <svg class="w-5 h-5 ${item.file && item.file.type === 'application/pdf' ? 'text-accent' : 'text-text-secondary'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>`;

        return `
            <div class="bg-surface rounded-lg p-4 border border-border animate-fade-in" data-queue-id="${item.id}">
                <div class="flex items-center space-x-3 mb-3">
                    <div class="w-10 h-10 bg-surface-light rounded-lg overflow-hidden">
                        ${previewHTML}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium truncate">${item.file.name}</p>
                        <p class="text-xs text-text-secondary" data-role="meta">
                            ${this.formatFileSize(item.file.size)} • ${item.toolType}
                            ${processingTime ? ` • ${processingTime}` : ''}
                        </p>
                    </div>
                    <div class="w-6 h-6 flex items-center justify-center" data-role="status-icon">
                        ${statusIcons[item.status]}
                    </div>
                </div>
                <div class="space-y-2">
                    <div class="bg-surface-light rounded-full h-2">
                        <div class="${statusColors[item.status]} h-2 rounded-full transition-all duration-300" 
                             data-role="progress" style="width: ${item.progress}%"></div>
                    </div>
                    <div class="flex items-center justify-between">
                        <p class="text-xs text-text-secondary" data-role="status-text">${statusText[item.status]}</p>
                        ${item.status === 'completed' && item.result ? `
                            <button onclick="downloadProcessedFile('${item.id}')" 
                                    class="text-xs text-primary hover:text-accent transition-colors">
                                Download
                            </button>
                        ` : ''}
                    </div>
                </div>
                ${item.status === 'completed' && item.result ? `
                    <button onclick="downloadProcessedFile('${item.id}')" 
                            class="btn-primary text-xs py-2 px-4 mt-3 w-full" data-role="download-btn">
                        <svg class="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        Download ${this.formatFileSize(item.result.processedSize)}
                    </button>
                ` : ''}
            </div>
        `;
    }

    updateQueueItemUI(item) {
        const element = document.querySelector(`[data-queue-id="${item.id}"]`);
        if (!element) {
            this.updateQueueUI();
            return;
        }

        // Progress bar
        const progressEl = element.querySelector('[data-role="progress"]');
        if (progressEl) {
            progressEl.style.width = `${item.progress}%`;
            ['bg-primary','bg-accent','bg-green-500','bg-red-500'].forEach(c => progressEl.classList.remove(c));
            const statusColors = { queued: 'bg-primary', processing: 'bg-accent', completed: 'bg-green-500', failed: 'bg-red-500' };
            progressEl.classList.add(statusColors[item.status] || 'bg-primary');
        }

        // Status text
        const statusTextEl = element.querySelector('[data-role="status-text"]');
        if (statusTextEl) {
            const statusText = {
                queued: 'Queued for processing',
                processing: `Processing... ${item.progress}%`,
                completed: item.result ? `Saved ${this.formatFileSize(item.result.savedBytes)}` : 'Completed',
                failed: `Error: ${item.error || 'Unknown error'}`
            };
            statusTextEl.textContent = statusText[item.status] || '';
        }

        // Status icon
        const statusIconEl = element.querySelector('[data-role="status-icon"]');
        if (statusIconEl) {
            const statusIcons = {
                queued: '<div class="w-2 h-2 bg-primary rounded-full animate-pulse"></div>',
                processing: '<div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>',
                completed: '<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
                failed: '<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>'
            };
            statusIconEl.innerHTML = statusIcons[item.status] || '';
        }

        // Meta (processing time)
        const metaEl = element.querySelector('[data-role="meta"]');
        if (metaEl) {
            const processingTime = item.endTime && item.startTime ? `${((item.endTime - item.startTime) / 1000).toFixed(1)}s` : '';
            metaEl.textContent = `${this.formatFileSize(item.file.size)} • ${item.toolType}${processingTime ? ` • ${processingTime}` : ''}`;
        }

        // Download button toggle
        const existingBtn = element.querySelector('[data-role="download-btn"]');
        if (item.status === 'completed' && item.result) {
            if (!existingBtn) {
                const btn = document.createElement('button');
                btn.setAttribute('data-role', 'download-btn');
                btn.className = 'btn-primary text-xs py-2 px-4 mt-3 w-full';
                btn.innerHTML = `
                    <svg class="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    Download ${this.formatFileSize(item.result.processedSize)}
                `;
                btn.addEventListener('click', () => window.downloadProcessedFile(String(item.id)));
                element.appendChild(btn);
            }
        } else if (existingBtn) {
            existingBtn.remove();
        }
    }

    generateFilename(item) {
        const name = item.file.name.split('.')[0];
        const timestamp = Date.now();
        let suffix = item.toolType;
        let extension = 'jpg';
        switch (item.toolType) {
            case 'compress': {
                const supported = (window.imageProcessor && window.imageProcessor.supportedFormats) || ['jpeg','jpg','png','webp','avif','bmp'];
                let ext;
                if (item._chosenFormat) {
                    ext = item._chosenFormat;
                } else {
                    ext = item.options.format === 'original' ? (item.file.type.split('/')[1] || '').toLowerCase() : (item.options.format || '').toLowerCase();
                    if (ext === 'jpg') ext = 'jpeg';
                    if (!supported.includes(ext)) ext = 'webp';
                }
                extension = ext || 'webp';
                break;
            }
            case 'resize':
                suffix = `resized_${item.options.width}x${item.options.height}`;
                extension = item.file.type.split('/')[1] || 'jpg';
                break;
            case 'convert':
                extension = (item._chosenFormat || item.options.targetFormat || 'webp').toLowerCase();
                if (extension === 'jpg') extension = 'jpeg';
                break;
            case 'pdf_compress':
                suffix = 'compressed';
                extension = 'pdf';
                break;
            case 'pdf_merge':
                // Use group label if provided, else base on first file name
                const base = (item.options && item.options.outputName) ? item.options.outputName : `${name}_merged`;
                return `${base}_${timestamp}.pdf`;
        }
        return `${name}_${suffix}_${timestamp}.${extension}`;
    }

    clearQueue() {
        this.processingQueue = [];
        this.updateQueueUI();
    }

    getQueueItem(id) {
        // Robust matching (onclick passes string)
        const key = String(id);
        return this.processingQueue.find(item => String(item.id) === key);
    }

    // Activity feed and stats
    addActivity(type, details) {
        const activity = {
            id: Date.now(),
            type,
            details,
            timestamp: new Date().toISOString(),
            session: true
        };
        this.activities.unshift(activity);
        this.activities = this.activities.slice(0, 50);
        if (details.filesProcessed) this.stats.processed += details.filesProcessed;
        if (details.spaceSaved) this.stats.savedSpace += details.spaceSaved;
        this.saveToStorage();
        this.updateUI();
    }

    saveToStorage() {
        localStorage.setItem('imageToolkitActivities', JSON.stringify(this.activities));
        localStorage.setItem('imageToolkitStats', JSON.stringify(this.stats));
    }

    updateUI() {
        this.updateActivityFeed();
        this.updateStats();
    }

    updateActivityFeed() {
        const feed = document.getElementById('activity-feed');
        if (!feed) return;
        const recentActivities = this.activities.slice(0, 8);
        if (recentActivities.length === 0) {
            feed.innerHTML = `
                <div class="text-center py-8">
                    <div class="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg class="w-6 h-6 text-accent/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                    </div>
                    <p class="text-text-secondary text-sm">No recent activity</p>
                </div>
            `;
            return;
        }

        feed.innerHTML = recentActivities.map(activity => {
            const timeAgo = this.getTimeAgo(new Date(activity.timestamp));
            const icon = this.getActivityIcon(activity.type);
            return `
                <div class="flex items-start space-x-3 p-3 bg-surface/50 rounded-lg border border-border hover:bg-surface/80 transition-colors">
                    <div class="w-8 h-8 ${icon.bgColor} rounded-full flex items-center justify-center flex-shrink-0">
                        ${icon.svg}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium">${activity.details.title}</p>
                        <p class="text-xs text-text-secondary">${activity.details.description}</p>
                        <p class="text-xs text-text-secondary mt-1">${timeAgo}</p>
                    </div>
                    ${activity.session ? '<div class="w-2 h-2 bg-accent rounded-full flex-shrink-0 mt-2"></div>' : ''}
                </div>
            `;
        }).join('');
    }

    updateStats() {
        const processedElement = document.getElementById('processed-count');
        const savedSpaceElement = document.getElementById('saved-space');
        const sessionProcessedElement = document.getElementById('session-processed');
        const sessionSavedElement = document.getElementById('session-saved');

        if (processedElement) this.animateCounter(processedElement, this.stats.processed);
        if (savedSpaceElement) savedSpaceElement.textContent = this.formatFileSize(this.stats.savedSpace);
        if (sessionProcessedElement) sessionProcessedElement.textContent = this.sessionStats.processed;
        if (sessionSavedElement) sessionSavedElement.textContent = this.formatFileSize(this.sessionStats.savedSpace);
    }

    getActivityIcon(type) {
        const icons = {
            compress: {
                bgColor: 'bg-primary/20',
                svg: '<svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7"/></svg>'
            },
            resize: {
                bgColor: 'bg-accent/20',
                svg: '<svg class="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>'
            },
            convert: {
                bgColor: 'bg-warning/20',
                svg: '<svg class="w-4 h-4 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>'
            }
        };
        return icons[type] || icons.compress;
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0MB';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
    }

    animateCounter(element, target) {
        const start = parseInt(element.textContent) || 0;
        const increment = Math.ceil((target - start) / 20);
        let current = start;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = current.toLocaleString();
        }, 50);
    }
}

// Global function for downloading processed files
window.downloadProcessedFile = function(itemId) {
    const item = window.enhancedActivityTracker.getQueueItem(itemId);
    if (item && item.result) {
        window.fileHandler.downloadFile(item.result.blob, item.result.filename);
    }
};

// Export for global use
if (typeof window !== 'undefined') {
    window.EnhancedActivityTracker = EnhancedActivityTracker;
}
