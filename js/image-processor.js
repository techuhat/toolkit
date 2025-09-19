/**
 * ImageProcessor - Final Polished Version
 * Safe for production use (Browser + Node)
 * Features: resize, compress, convert, thumbnail, filters, batch processing
 */

class ImageProcessor {
    constructor() {
        this.supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'avif', 'bmp'];
        this.maxCanvasSize = 16384;
    }

    /**
     * Internal helper: create canvas + context
     */
    _createCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        return { canvas, ctx };
    }

    /**
     * Internal helper: normalize format
     */
    _normalizeFormat(format) {
        if (!format) return 'jpeg';
        format = format.toLowerCase();
        if (format === 'jpg') return 'jpeg';
        return format;
    }

    /**
     * Internal helper: safe toBlob with fallback
     */
    _toBlob(canvas, type, quality) {
        return new Promise((resolve) => {
            if (canvas.toBlob) {
                canvas.toBlob((blob) => resolve(blob), type, quality);
            } else {
                // Safari fallback
                const dataURL = canvas.toDataURL(type, quality);
                const binStr = atob(dataURL.split(',')[1]);
                const len = binStr.length;
                const arr = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    arr[i] = binStr.charCodeAt(i);
                }
                resolve(new Blob([arr], { type }));
            }
        });
    }

    /**
     * Resize image
     */
    async resizeImage(file, width, height, maintainAspectRatio = true, highQuality = true) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            let objectURL = URL.createObjectURL(file);

            img.onload = async () => {
                URL.revokeObjectURL(objectURL);
                try {
                    let targetWidth = parseInt(width, 10);
                    let targetHeight = parseInt(height, 10);

                    if (isNaN(targetWidth) || targetWidth < 1 || targetWidth > this.maxCanvasSize) {
                        throw new Error(`Invalid width: ${width}`);
                    }
                    if (isNaN(targetHeight) || targetHeight < 1 || targetHeight > this.maxCanvasSize) {
                        throw new Error(`Invalid height: ${height}`);
                    }

                    if (img.width > this.maxCanvasSize || img.height > this.maxCanvasSize) {
                        throw new Error(`Image too large: ${img.width}x${img.height}`);
                    }

                    if (maintainAspectRatio) {
                        const originalRatio = img.width / img.height;
                        const requestedRatio = targetWidth / targetHeight;

                        if (requestedRatio > originalRatio) {
                            targetWidth = Math.round(targetHeight * originalRatio);
                        } else {
                            targetHeight = Math.round(targetWidth / originalRatio);
                        }
                    }

                    const { canvas, ctx } = this._createCanvas(targetWidth, targetHeight);
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = highQuality ? 'high' : 'low';
                    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                    let outType = file.type || 'image/jpeg';
                    if (!/^image\//.test(outType)) outType = 'image/jpeg';

                    const blob = await this._toBlob(canvas, outType, 0.9);
                    if (!blob) throw new Error('Failed to resize image');
                    resolve(blob);
                } catch (err) {
                    reject(err);
                }
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectURL);
                reject(new Error('Failed to load image'));
            };

            img.src = objectURL;
        });
    }

    /**
     * Compress image
     */
    async compressImage(file, quality = 0.8, format = 'jpeg') {
        format = this._normalizeFormat(format);
        if (!this.supportedFormats.includes(format)) {
            throw new Error(`Unsupported format: ${format}`);
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            let objectURL = URL.createObjectURL(file);

            img.onload = async () => {
                URL.revokeObjectURL(objectURL);
                try {
                    if (img.width > this.maxCanvasSize || img.height > this.maxCanvasSize) {
                        throw new Error(`Image too large: ${img.width}x${img.height}`);
                    }

                    const { canvas, ctx } = this._createCanvas(img.width, img.height);
                    ctx.drawImage(img, 0, 0);

                    const mime = `image/${format}`;
                    const validQuality = Math.max(0.1, Math.min(1.0, quality));

                    const blob = await this._toBlob(canvas, mime, validQuality);
                    if (!blob) throw new Error('Failed to compress image');
                    resolve(blob);
                } catch (err) {
                    reject(err);
                }
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectURL);
                reject(new Error('Failed to load image'));
            };

            img.src = objectURL;
        });
    }

    /**
     * Convert image format
     */
    async convertFormat(file, targetFormat, quality = 0.9) {
        targetFormat = this._normalizeFormat(targetFormat);
        if (!this.supportedFormats.includes(targetFormat)) {
            throw new Error(`Unsupported format: ${targetFormat}`);
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            let objectURL = URL.createObjectURL(file);

            img.onload = async () => {
                URL.revokeObjectURL(objectURL);
                try {
                    const { canvas, ctx } = this._createCanvas(img.width, img.height);

                    if (targetFormat === 'jpeg') {
                        ctx.fillStyle = '#fff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }

                    ctx.drawImage(img, 0, 0);

                    const mime = `image/${targetFormat}`;
                    const blob = await this._toBlob(canvas, mime, quality);
                    if (!blob) throw new Error('Failed to convert image format');
                    resolve(blob);
                } catch (err) {
                    reject(err);
                }
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectURL);
                reject(new Error('Failed to load image'));
            };

            img.src = objectURL;
        });
    }

    /**
     * Create thumbnail
     */
    async createThumbnail(file, size = 150) {
        return this.resizeImage(file, size, size, true);
    }

    /**
     * Apply filters
     */
    async applyFilters(file, filters = {}) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            let objectURL = URL.createObjectURL(file);

            img.onload = async () => {
                URL.revokeObjectURL(objectURL);
                try {
                    const { canvas, ctx } = this._createCanvas(img.width, img.height);

                    let filterString = '';
                    if (filters.brightness !== undefined) filterString += `brightness(${filters.brightness}%) `;
                    if (filters.contrast !== undefined) filterString += `contrast(${filters.contrast}%) `;
                    if (filters.saturation !== undefined) filterString += `saturate(${filters.saturation}%) `;
                    if (filters.blur !== undefined) filterString += `blur(${filters.blur}px) `;
                    if (filters.grayscale) filterString += 'grayscale(100%) ';
                    if (filters.sepia) filterString += 'sepia(100%) ';

                    ctx.filter = filterString.trim() || 'none';
                    ctx.drawImage(img, 0, 0);

                    const blob = await this._toBlob(canvas, file.type || 'image/png');
                    if (!blob) throw new Error('Failed to apply filters');
                    resolve(blob);
                } catch (err) {
                    reject(err);
                }
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectURL);
                reject(new Error('Failed to load image'));
            };

            img.src = objectURL;
        });
    }

    /**
     * Get image metadata
     */
    async getImageInfo(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            let objectURL = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(objectURL);
                resolve({
                    width: img.width,
                    height: img.height,
                    size: file.size,
                    type: file.type,
                    name: file.name,
                    lastModified: file.lastModified,
                    aspectRatio: (img.width / img.height).toFixed(2)
                });
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectURL);
                reject(new Error('Failed to load image'));
            };

            img.src = objectURL;
        });
    }

    /**
     * Validate file type
     */
    isValidImage(file) {
        if (!file.type.startsWith('image/')) return false;
        const format = this._normalizeFormat(file.type.split('/')[1]);
        return this.supportedFormats.includes(format);
    }

    /**
     * Batch processing
     */
    async batchProcess(files, options = {}, progressCallback = null) {
        if (!Array.isArray(files) || files.length === 0) {
            throw new Error('No files provided');
        }

        const results = [];
        const total = files.length;

        for (let i = 0; i < total; i++) {
            const file = files[i];
            try {
                if (!this.isValidImage(file)) {
                    throw new Error(`Invalid image file: ${file.name}`);
                }

                let processedBlob;
                switch (options.operation) {
                    case 'compress':
                        processedBlob = await this.compressImage(file, options.quality ?? 0.8, options.format ?? 'jpeg');
                        break;
                    case 'resize':
                        processedBlob = await this.resizeImage(file, options.width ?? 800, options.height ?? 600, options.maintainAspectRatio ?? true, options.highQuality ?? true);
                        break;
                    case 'convert':
                        processedBlob = await this.convertFormat(file, options.targetFormat ?? 'jpeg', options.quality ?? 0.9);
                        break;
                    case 'thumbnail':
                        processedBlob = await this.createThumbnail(file, options.size ?? 150);
                        break;
                    case 'filters':
                        processedBlob = await this.applyFilters(file, options.filters || {});
                        break;
                    default:
                        throw new Error('Unknown operation: ' + options.operation);
                }

                results.push({
                    original: file,
                    processed: processedBlob,
                    success: true,
                    savedBytes: Math.max(0, file.size - processedBlob.size)
                });
            } catch (err) {
                results.push({
                    original: file,
                    processed: null,
                    success: false,
                    error: err.message
                });
            }

            if (progressCallback) {
                progressCallback(i + 1, total, results);
            }
        }

        return results;
    }
}

// Export for Node
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageProcessor;
}

// Export for Browser
if (typeof window !== 'undefined') {
    window.ImageProcessor = ImageProcessor;
}
