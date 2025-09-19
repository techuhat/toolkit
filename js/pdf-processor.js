/**
 * PDFProcessor - Professional PDF Processing Library
 * Supports PDF creation, manipulation, and processing
 */

class PDFProcessor {
    constructor() {
        this.loadPDFLib();
    }

    /**
     * Load PDF-lib dynamically
     */
    async loadPDFLib() {
        if (typeof window !== 'undefined' && !window.PDFLib) {
            try {
                // Load PDF-lib from CDN
                await this.loadScript('https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js');
                this.PDFLib = window.PDFLib;
            } catch (error) {
                console.error('Failed to load PDF-lib:', error);
                throw new Error('PDF processing library failed to load');
            }
        } else if (window.PDFLib) {
            this.PDFLib = window.PDFLib;
        }
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
     * Convert images to PDF
     * @param {File[]} imageFiles - Array of image files
     * @param {Object} options - PDF creation options
     * @returns {Promise<Uint8Array>}
     */
    async imagesToPDF(imageFiles, options = {}) {
        await this.loadPDFLib();
        
        const pdfDoc = await this.PDFLib.PDFDocument.create();
        const pageSize = options.pageSize || 'A4';
        
        // Define page dimensions
        const pageDimensions = {
            A4: [595.28, 841.89],
            Letter: [612, 792],
            Legal: [612, 1008],
            A3: [841.89, 1190.55]
        };
        
        const [pageWidth, pageHeight] = pageDimensions[pageSize] || pageDimensions.A4;

        for (const imageFile of imageFiles) {
            try {
                const imageBytes = await imageFile.arrayBuffer();
                let image;

                // Embed image based on type
                if (imageFile.type === 'image/jpeg' || imageFile.type === 'image/jpg') {
                    image = await pdfDoc.embedJpg(imageBytes);
                } else if (imageFile.type === 'image/png') {
                    image = await pdfDoc.embedPng(imageBytes);
                } else {
                    // Convert other formats to PNG first
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                        img.src = URL.createObjectURL(imageFile);
                    });

                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    const pngBlob = await new Promise(resolve => {
                        canvas.toBlob(resolve, 'image/png');
                    });
                    
                    const pngBytes = await pngBlob.arrayBuffer();
                    image = await pdfDoc.embedPng(pngBytes);
                }

                // Calculate scaling to fit page while maintaining aspect ratio
                const imageAspectRatio = image.width / image.height;
                const pageAspectRatio = pageWidth / pageHeight;
                
                let scaledWidth, scaledHeight;
                const margin = options.margin || 20;
                const availableWidth = pageWidth - (margin * 2);
                const availableHeight = pageHeight - (margin * 2);

                if (imageAspectRatio > pageAspectRatio) {
                    // Image is wider than page
                    scaledWidth = Math.min(availableWidth, image.width);
                    scaledHeight = scaledWidth / imageAspectRatio;
                } else {
                    // Image is taller than page
                    scaledHeight = Math.min(availableHeight, image.height);
                    scaledWidth = scaledHeight * imageAspectRatio;
                }

                // Center the image on the page
                const x = (pageWidth - scaledWidth) / 2;
                const y = (pageHeight - scaledHeight) / 2;

                // Add page and draw image
                const page = pdfDoc.addPage([pageWidth, pageHeight]);
                page.drawImage(image, {
                    x: x,
                    y: y,
                    width: scaledWidth,
                    height: scaledHeight,
                });

            } catch (error) {
                console.warn(`Failed to process image ${imageFile.name}:`, error);
            }
        }

        return await pdfDoc.save();
    }

    /**
     * Merge multiple PDF files
     * @param {File[]} pdfFiles - Array of PDF files
     * @returns {Promise<Uint8Array>}
     */
    async mergePDFs(pdfFiles) {
        await this.loadPDFLib();
        
        const mergedPdf = await this.PDFLib.PDFDocument.create();

        for (const pdfFile of pdfFiles) {
            try {
                const pdfBytes = await pdfFile.arrayBuffer();
                const pdf = await this.PDFLib.PDFDocument.load(pdfBytes);
                const pageIndices = pdf.getPageIndices();

                const copiedPages = await mergedPdf.copyPages(pdf, pageIndices);
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            } catch (error) {
                console.warn(`Failed to merge PDF ${pdfFile.name}:`, error);
            }
        }

        return await mergedPdf.save();
    }

    /**
     * Split PDF into individual pages
     * @param {File} pdfFile - PDF file to split
     * @returns {Promise<Uint8Array[]>}
     */
    async splitPDF(pdfFile) {
        await this.loadPDFLib();
        
        const pdfBytes = await pdfFile.arrayBuffer();
        const pdfDoc = await this.PDFLib.PDFDocument.load(pdfBytes);
        const pageCount = pdfDoc.getPageCount();
        const splitPdfs = [];

        for (let i = 0; i < pageCount; i++) {
            const newPdf = await this.PDFLib.PDFDocument.create();
            const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
            newPdf.addPage(copiedPage);
            
            const pdfBytes = await newPdf.save();
            splitPdfs.push(pdfBytes);
        }

        return splitPdfs;
    }

    /**
     * Extract specific pages from PDF
     * @param {File} pdfFile - PDF file
     * @param {number[]} pageNumbers - Array of page numbers (1-indexed)
     * @returns {Promise<Uint8Array>}
     */
    async extractPages(pdfFile, pageNumbers) {
        await this.loadPDFLib();
        
        const pdfBytes = await pdfFile.arrayBuffer();
        const pdfDoc = await this.PDFLib.PDFDocument.load(pdfBytes);
        const newPdf = await this.PDFLib.PDFDocument.create();

        // Convert to 0-indexed and validate
        const pageIndices = pageNumbers
            .map(num => num - 1)
            .filter(index => index >= 0 && index < pdfDoc.getPageCount());

        const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
        copiedPages.forEach(page => newPdf.addPage(page));

        return await newPdf.save();
    }

    /**
     * Compress PDF
     * @param {File} pdfFile - PDF file to compress
     * @param {Object} options - Compression options
     * @returns {Promise<Uint8Array>}
     */
    async compressPDF(pdfFile, options = {}) {
        await this.loadPDFLib();
        
        const pdfBytes = await pdfFile.arrayBuffer();
        const pdfDoc = await this.PDFLib.PDFDocument.load(pdfBytes);

        // Basic compression by removing unused objects and optimizing
        const compressedBytes = await pdfDoc.save({
            useObjectStreams: true,
            addDefaultPage: false,
            objectsPerTick: options.objectsPerTick || 50
        });

        return compressedBytes;
    }

    /**
     * Get PDF information
     * @param {File} pdfFile - PDF file
     * @returns {Promise<Object>}
     */
    async getPDFInfo(pdfFile) {
        await this.loadPDFLib();
        
        try {
            const pdfBytes = await pdfFile.arrayBuffer();
            const pdfDoc = await this.PDFLib.PDFDocument.load(pdfBytes);
            
            const info = {
                pageCount: pdfDoc.getPageCount(),
                title: pdfDoc.getTitle() || 'Unknown',
                author: pdfDoc.getAuthor() || 'Unknown',
                subject: pdfDoc.getSubject() || '',
                creator: pdfDoc.getCreator() || 'Unknown',
                producer: pdfDoc.getProducer() || 'Unknown',
                creationDate: pdfDoc.getCreationDate(),
                modificationDate: pdfDoc.getModificationDate(),
                size: pdfFile.size,
                name: pdfFile.name
            };

            return info;
        } catch (error) {
            throw new Error('Failed to read PDF information: ' + error.message);
        }
    }

    /**
     * Add watermark to PDF
     * @param {File} pdfFile - PDF file
     * @param {string} watermarkText - Watermark text
     * @param {Object} options - Watermark options
     * @returns {Promise<Uint8Array>}
     */
    async addWatermark(pdfFile, watermarkText, options = {}) {
        await this.loadPDFLib();
        
        const pdfBytes = await pdfFile.arrayBuffer();
        const pdfDoc = await this.PDFLib.PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        const font = await pdfDoc.embedFont(this.PDFLib.StandardFonts.Helvetica);
        const fontSize = options.fontSize || 50;
        const opacity = options.opacity || 0.3;
        const rotation = options.rotation || -45;

        pages.forEach(page => {
            const { width, height } = page.getSize();
            const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
            const textHeight = font.heightAtSize(fontSize);

            // Center the watermark
            const x = (width - textWidth) / 2;
            const y = (height - textHeight) / 2;

            page.drawText(watermarkText, {
                x: x,
                y: y,
                size: fontSize,
                font: font,
                color: this.PDFLib.rgb(0.5, 0.5, 0.5),
                opacity: opacity,
                rotate: this.PDFLib.degrees(rotation)
            });
        });

        return await pdfDoc.save();
    }

    /**
     * Convert PDF to images
     * @param {File} pdfFile - PDF file
     * @param {Object} options - Conversion options
     * @returns {Promise<Blob[]>}
     */
    async pdfToImages(pdfFile, options = {}) {
        // This would require PDF.js for client-side PDF to image conversion
        // For now, we'll provide a basic implementation that requires PDF.js
        
        if (!window.pdfjsLib) {
            await this.loadScript('https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js');
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
        }

        const pdfBytes = await pdfFile.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: pdfBytes }).promise;
        const images = [];

        const scale = options.scale || 2.0;
        const format = options.format || 'png';
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;
            
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, `image/${format}`);
            });
            
            images.push(blob);
        }

        return images;
    }

    /**
     * Create PDF from HTML content
     * @param {string} htmlContent - HTML content
     * @param {Object} options - PDF options
     * @returns {Promise<Uint8Array>}
     */
    async htmlToPDF(htmlContent, options = {}) {
        // This would require additional libraries like Puppeteer or similar
        // For client-side generation, we'll use a simpler approach with jsPDF
        
        if (!window.jsPDF) {
            await this.loadScript('https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js');
        }

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF(options.orientation || 'portrait', 'pt', options.format || 'a4');
        
        // Simple text extraction from HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = options.margin || 40;
        const maxWidth = pageWidth - (margin * 2);
        
        // Split text into lines that fit the page width
        const lines = pdf.splitTextToSize(textContent, maxWidth);
        let y = margin + 20;
        
        lines.forEach(line => {
            if (y > pdf.internal.pageSize.getHeight() - margin) {
                pdf.addPage();
                y = margin + 20;
            }
            pdf.text(line, margin, y);
            y += 15;
        });

        return pdf.output('arraybuffer');
    }

    /**
     * Batch process PDFs
     * @param {File[]} files - Array of PDF files
     * @param {string} operation - Operation to perform
     * @param {Object} options - Operation options
     * @param {Function} progressCallback - Progress callback
     * @returns {Promise<Array>}
     */
    async batchProcess(files, operation, options = {}, progressCallback = null) {
        const results = [];
        const total = files.length;

        for (let i = 0; i < total; i++) {
            const file = files[i];
            
            try {
                let processedData;
                
                switch (operation) {
                    case 'compress':
                        processedData = await this.compressPDF(file, options);
                        break;
                    case 'split':
                        processedData = await this.splitPDF(file);
                        break;
                    case 'watermark':
                        processedData = await this.addWatermark(file, options.text, options);
                        break;
                    case 'extract':
                        processedData = await this.extractPages(file, options.pages);
                        break;
                    default:
                        throw new Error('Unknown operation: ' + operation);
                }

                results.push({
                    original: file,
                    processed: processedData,
                    success: true
                });
            } catch (error) {
                results.push({
                    original: file,
                    processed: null,
                    success: false,
                    error: error.message
                });
            }

            if (progressCallback) {
                progressCallback(i + 1, total, results);
            }
        }

        return results;
    }

    /**
     * Validate PDF file
     * @param {File} file - File to validate
     * @returns {boolean}
     */
    isValidPDF(file) {
        return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFProcessor;
}

// Global availability
window.PDFProcessor = PDFProcessor;
