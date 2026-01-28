# PowerShell Script to Add Header and Footer to All Blog Posts
# This script reads the template, extracts header and footer, and adds them to existing blog posts

$blogDir = "d:\imagetoolkit_pro\toolkit\pages\blog"
$templateFile = Join-Path $blogDir "blog-post-template.html"

# Blog posts to update (excluding index and template)
$blogPosts = @(
    "ai-upscaling-when-to-use.html",
    "batch-processing-power-hacks.html",
    "brand-consistent-qr-codes.html",
    "choosing-right-dpi-for-exports.html",
    "efficient-file-naming-for-batches.html",
    "faster-workflows-with-presets.html",
    "handle-transparent-backgrounds-correctly.html",
    "how-to-avoid-over-compression.html",
    "image-conversion-best-practices.html",
    "local-processing-vs-cloud.html",
    "memory-friendly-image-processing.html",
    "optimize-images-for-seo-2025.html",
    "pdf-merge-workflows-for-creators.html",
    "pdf-to-image-pro-tips.html",
    "print-ready-pdfs-from-browser.html",
    "privacy-first-client-side-processing.html",
    "qr-codes-that-convert.html",
    "resize-images-without-losing-quality.html",
    "scan-to-pdf-cleanup-guide.html",
    "smart-pdf-splitting-techniques.html",
    "social-media-image-sizes-2025.html",
    "ultimate-image-compression-guide-2025.html",
    "webp-vs-avif-2025.html"
)

Write-Host "Reading template file..." -ForegroundColor Cyan
$template = Get-Content $templateFile -Raw

# Extract header (from <body> to end of </header>)
$headerStart = $template.IndexOf('<body')
$headerEnd = $template.IndexOf('</header>') + 9
$header = $template.Substring($headerStart, $headerEnd - $headerStart)

# Extract footer (from <footer to </footer>)
$footerStart = $template.IndexOf('  <footer')
$footerEnd = $template.IndexOf('  </footer>') + 11
$footer = $template.Substring($footerStart, $footerEnd - $footerStart)

# Extract scripts
$scriptsStart = $template.IndexOf('  <script src="../../js/nav.js"')
$scriptsEnd = $template.IndexOf('</body>')
$scripts = $template.Substring($scriptsStart, $scriptsEnd - $scriptsStart).Trim()

Write-Host "`nProcessing $($blogPosts.Count) blog posts..." -ForegroundColor Yellow

$updated = 0
$failed = 0

foreach ($post in $blogPosts) {
    $postPath = Join-Path $blogDir $post
    
    if (-not (Test-Path $postPath)) {
        Write-Host "  [SKIP] $post - File not found" -ForegroundColor Red
        $failed++
        continue
    }
    
    try {
        $content = Get-Content $postPath -Raw
        
        # Check if header already exists
        if ($content -match 'sticky top-0 z-50') {
            Write-Host "  [SKIP] $post - Header already exists" -ForegroundColor Yellow
            continue
        }
        
        # Find main content (after <body> tag)
        $bodyStart = $content.IndexOf('<body')
        if ($bodyStart -eq -1) {
            Write-Host "  [FAIL] $post - No <body> tag found" -ForegroundColor Red
            $failed++
            continue
        }
        
        $bodyEnd = $content.IndexOf('>', $bodyStart) + 1
        $bodyTag = $content.Substring($bodyStart, $bodyEnd - $bodyStart)
        
        # Find existing footer or end of main content
        $footerPos = $content.IndexOf('<footer')
        if ($footerPos -eq -1) {
            $footerPos = $content.IndexOf('</body>')
        }
        
        if ($footerPos -eq -1) {
            Write-Host "  [FAIL] $post - Cannot find insertion point" -ForegroundColor Red
            $failed++
            continue
        }
        
        # Get content before footer
        $mainContent = $content.Substring($bodyEnd, $footerPos - $bodyEnd).Trim()
        
        # Build new content
        $newContent = $content.Substring(0, $bodyStart)  # Everything before <body>
        $newContent += $header + "`r`n`r`n"  # Header
        $newContent += "  " + $mainContent + "`r`n`r`n"  # Main content
        $newContent += $footer + "`r`n"  # Footer
        $newContent += $scripts + "`r`n"  # Scripts
        $newContent += "</body>`r`n`r`n</html>"  # Close tags
        
        # Save updated file
        Set-Content -Path $postPath -Value $newContent -NoNewline
        Write-Host "  [OK] $post" -ForegroundColor Green
        $updated++
    }
    catch {
        Write-Host "  [ERROR] $post - $_" -ForegroundColor Red
        $failed++
    }
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Updated: $updated files" -ForegroundColor Green
Write-Host "Failed: $failed files" -ForegroundColor Red
Write-Host "Total: $($blogPosts.Count) files" -ForegroundColor White
Write-Host "`nDone!" -ForegroundColor Cyan
