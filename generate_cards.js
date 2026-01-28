const fs = require('fs');
const path = require('path');

// Premium card template function
function createPremiumCard(title, link, description, time, category, icon) {
  const icons = {
    'Images': `<svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>`,
    'PDFs': `<svg class="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>`,
    'QR': `<svg class="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
          </svg>`,
    'Productivity': `<svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>`,
    'Privacy': `<svg class="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>`,
    'SEO': `<svg class="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
           </svg>`
  };

  const categoryColor = category === 'Images' ? 'primary' : 
                        category === 'PDFs' ? 'accent' :
                        category === 'QR' ? 'warning' :
                        category === 'Privacy' ? 'accent' :
                        category === 'SEO' ? 'warning' : 'primary';

  return `        <article class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface/50 to-background/50 backdrop-blur-sm border border-border/50 hover:border-${categoryColor}/30 transition-all duration-500 hover:shadow-2xl hover:shadow-${categoryColor}/10 hover:-translate-y-1">
          <div class="absolute inset-0 bg-gradient-to-br from-${categoryColor}/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <a href="${link}" class="block p-6 relative z-10">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-${categoryColor}/20 to-${categoryColor}/40 flex items-center justify-center group-hover:from-${categoryColor}/40 group-hover:to-${categoryColor}/60 transition-all duration-300">
                ${icons[category] || icons['Images']}
              </div>
              <span class="text-xs font-medium text-${categoryColor} bg-${categoryColor}/10 px-3 py-1 rounded-full">${category}</span>
            </div>
            <h2 class="text-xl font-bold mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-${categoryColor} group-hover:to-accent transition-all duration-300">${title}</h2>
            <p class="text-text-secondary leading-relaxed mb-4">${description}</p>
            <div class="flex items-center justify-between">
              <p class="text-xs text-text-tertiary flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                ${time} min read
              </p>
              <span class="inline-flex items-center gap-2 text-${categoryColor} font-medium text-sm group-hover:gap-3 transition-all duration-300">
                Read more
                <svg class="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </span>
            </div>
          </a>
        </article>`;
}

// Blog posts data
const posts = [
  {title: 'PDF Merge Workflows for Creators', link: '../blog/pdf-merge-workflows-for-creators.html', desc: 'Client deliverables, portfolios, ya invoices — neat merging tricks jo aapke flow ko simple banaye.', time: 7, category: 'PDFs'},
  {title: 'Resize Images Without Losing Quality', link: '../blog/resize-images-without-losing-quality.html', desc: 'Web, social, ya print — har use-case ke liye perfect dimensions aur sharpness ka balance.', time: 9, category: 'Images'},
  {title: 'Batch Processing Power Hacks', link: '../blog/batch-processing-power-hacks.html', desc: 'Hundreds of files? No stress. Presets, automation, aur time-saving tips that actually work.', time: 10, category: 'Productivity'},
  {title: 'QR Codes that Actually Convert', link: '../blog/qr-codes-that-convert.html', desc: 'Design, contrast, size, aur placement — QR codes ko sirf pretty nahi, effective banayein.', time: 6, category: 'QR'},
  {title: 'Privacy-First Client-Side Processing', link: '../blog/privacy-first-client-side-processing.html', desc: 'No upload, no wait. Client-side tools kyun business aur creators dono ke liye better hain.', time: 8, category: 'Privacy'},
  {title: 'WebP vs AVIF (2025)', link: '../blog/webp-vs-avif-2025.html', desc: 'Kaun sa format kab use karein? Speed, quality, aur browser support ka clear breakdown.', time: 7, category: 'Images'},
  {title: 'Smart PDF Splitting Techniques', link: '../blog/smart-pdf-splitting-techniques.html', desc: 'Large docs ko logically split karna — by chapters, bookmarks, ya page ranges.', time: 6, category: 'PDFs'},
  {title: 'Brand-Consistent QR Codes', link: '../blog/brand-consistent-qr-codes.html', desc: 'Colors, logos, aur safe contrast — broken scans avoid karte hue brand feel intact rakhein.', time: 5, category: 'QR'},
  {title: 'Faster Workflows with Presets', link: '../blog/faster-workflows-with-presets.html', desc: 'Repeat kaam ko one-click bana dijiye — naming rules, export sets, aur batching tips.', time: 6, category: 'Productivity'},
  {title: 'Optimize Images for SEO (2025)', link: '../blog/optimize-images-for-seo-2025.html', desc: 'Alt text, dimensions, CLS, aur lazy loading — simple steps jo search me impact dikhate hain.', time: 9, category: 'SEO'},
  {title: 'PDF to Image: Pro Tips', link: '../blog/pdf-to-image-pro-tips.html', desc: 'Resolution, anti-aliasing, aur formats — crisp exports for web aur print.', time: 7, category: 'PDFs'},
  {title: 'Image Conversion Best Practices', link: '../blog/image-conversion-best-practices.html', desc: 'PNG→WebP, JPG→AVIF — kab convert karna chahiye aur kis setting pe.', time: 8, category: 'Images'},
  {title: 'Local Processing vs Cloud', link: '../blog/local-processing-vs-cloud.html', desc: 'Privacy, speed, cost — realistic comparison with use-case guidance.', time: 10, category: 'Privacy'},
  {title: 'Avoid Over-Compression', link: '../blog/how-to-avoid-over-compression.html', desc: 'Artifacts aur banding ko identify karke perfect balance kaise set karein.', time: 6, category: 'Images'},
  {title: 'Social Media Image Sizes (2025)', link: '../blog/social-media-image-sizes-2025.html', desc: 'IG, X, LinkedIn, YouTube — latest sizes aur safe areas, ek hi place par.', time: 5, category: 'Images'},
  {title: 'Efficient File Naming for Batches', link: '../blog/efficient-file-naming-for-batches.html', desc: 'Patterns jo sort-friendly ho, duplicates avoid karein, aur automation ko feed dein.', time: 5, category: 'Productivity'},
  {title: 'Memory-Friendly Image Processing', link: '../blog/memory-friendly-image-processing.html', desc: 'Large files handle karte waqt browser crashes avoid karne ke practical hacks.', time: 9, category: 'Images'},
  {title: 'Choosing the Right DPI', link: '../blog/choosing-right-dpi-for-exports.html', desc: 'Print vs web confusion khatam — pixels, DPI, aur PPI ko seedha tareeke se samjhein.', time: 6, category: 'Images'},
  {title: 'AI Upscaling: When to Use', link: '../blog/ai-upscaling-when-to-use.html', desc: 'Jab low-res assets hi available hon — realistic expectations and crisp outputs.', time: 8, category: 'Images'}
];

// Generate all cards
let allCards = '';
posts.forEach(post => {
  allCards += createPremiumCard(post.title, post.link, post.desc, post.time, post.category);
  allCards += '\n';
});

console.log('Premium cards generated successfully!');
console.log('Total cards:', posts.length);
fs.writeFileSync('premium_cards.html', allCards);
console.log('Saved to premium_cards.html');
