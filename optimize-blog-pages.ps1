# Script to optimize all blog pages for performance

$blogFiles = Get-ChildItem -Path "pages\blog" -Filter "*.html" | Where-Object { $_.Name -ne "index.html" }

foreach ($file in $blogFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    # Skip if already optimized (has preconnect)
    if ($content -match 'rel="preconnect"') {
        Write-Host "Skipping $($file.Name) - already optimized"
        continue
    }
    
    Write-Host "Optimizing $($file.Name)..."
    
    # Add preconnect and preload for fonts/CSS
    $content = $content -replace '(<link rel="stylesheet" href="../../css/main.css")', 
        '<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/><link rel="preload" as="style" href="../../css/main.css"/><link rel="stylesheet" href="../../css/main.css"'
    
    # Add defer to nav.js if not present
    $content = $content -replace '<script src="../../js/nav.js">', '<script src="../../js/nav.js" defer>'
    
    # Add defer to dhws-data-injector.js if not present and not already deferred
    $content = $content -replace '<script id="dhws-dataInjector" src="../../public/dhws-data-injector.js">', '<script id="dhws-dataInjector" src="../../public/dhws-data-injector.js" defer>'
    $content = $content -replace '<script src="../../public/dhws-data-injector.js">', '<script src="../../public/dhws-data-injector.js" defer>'
    
    # Add defer to pwa.js if present and not already deferred
    $content = $content -replace '<script src="../../js/pwa.js">', '<script src="../../js/pwa.js" defer>'
    
    # Add defer to toast.js if present
    $content = $content -replace '<script src="../../js/toast.js">', '<script src="../../js/toast.js" defer>'
    
    # Save the optimized content
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
    
    Write-Host "  ✓ Optimized $($file.Name)"
}

Write-Host "`nOptimization complete! Files updated: $($blogFiles.Count - 1)"
Write-Host "Next: Run 'npm run build:css' and test in Lighthouse"
