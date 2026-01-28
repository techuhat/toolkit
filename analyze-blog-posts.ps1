# PowerShell Script to Identify Short Blog Posts
# Scans all blog post HTML files and reports word counts

$blogDir = "d:\imagetoolkit_pro\toolkit\pages\blog"
$threshold = 2000

Write-Host "`n=== Blog Post Word Count Analysis ===" -ForegroundColor Cyan
Write-Host "Threshold: $threshold words" -ForegroundColor Yellow
Write-Host "Directory: $blogDir`n" -ForegroundColor Gray

# Get all HTML files except index and template
$files = Get-ChildItem "$blogDir\*.html" -Exclude "index.html","blog-post-template.html"

$results = @()

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw
        
        # Remove header, footer, scripts
        $mainContent = $content -replace '(?s)<head>.*?</head>',''
        $mainContent = $mainContent -replace '(?s)<header.*?</header>',''
        $mainContent = $mainContent -replace '(?s)<footer.*?</footer>',''
        $mainContent = $mainContent -replace '(?s)<script.*?</script>',''
        
        # Strip HTML tags
        $textOnly = $mainContent -replace '<[^>]+>',''
        $textOnly = $textOnly -replace '\s+',' '
        
        # Count words
        $words = ($textOnly.Trim() -split '\s+').Count
        
        # Determine status
        $status = if ($words -lt $threshold) { "SHORT" } elseif ($words -lt 2500) { "OK" } else { "GOOD" }
        $color = if ($status -eq "SHORT") { "Red" } elseif ($status -eq "OK") { "Yellow" } else { "Green" }
        
        $results += [PSCustomObject]@{
            File = $file.Name
            Words = $words
            Status = $status
            Color = $color
        }
    }
    catch {
        Write-Host "  [ERROR] $($file.Name) - $_" -ForegroundColor Red
    }
}

# Sort by word count (shortest first)
$results = $results | Sort-Object Words

# Display results
Write-Host "Results (sorted by word count):`n" -ForegroundColor Cyan

foreach ($result in $results) {
    $paddedWords = $result.Words.ToString().PadLeft(5)
    $statusBadge = "[$($result.Status)]".PadRight(8)
    Write-Host "$paddedWords words $statusBadge $($result.File)" -ForegroundColor $result.Color
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
$shortCount = ($results | Where-Object { $_.Status -eq "SHORT" }).Count
$okCount = ($results | Where-Object { $_.Status -eq "OK" }).Count
$goodCount = ($results | Where-Object { $_.Status -eq "GOOD" }).Count

Write-Host "SHORT (< 2000 words): $shortCount files" -ForegroundColor Red
Write-Host "OK (2000-2500 words): $okCount files" -ForegroundColor Yellow
Write-Host "GOOD (2500+ words): $goodCount files" -ForegroundColor Green
Write-Host "Total files analyzed: $($results.Count)" -ForegroundColor White

# Export to CSV for reference
$csvPath = "$blogDir\word-count-analysis.csv"
$results | Select-Object File, Words, Status | Export-Csv $csvPath -NoTypeInformation
Write-Host "`nResults exported to: $csvPath" -ForegroundColor Gray

# List short posts for immediate action
if ($shortCount -gt 0) {
    Write-Host "`n=== Short Posts Needing Expansion ===" -ForegroundColor Red
    $results | Where-Object { $_.Status -eq "SHORT" } | ForEach-Object {
        Write-Host "  - $($_.File) ($($_.Words) words)" -ForegroundColor Red
    }
}

Write-Host "`nDone!`n" -ForegroundColor Cyan
