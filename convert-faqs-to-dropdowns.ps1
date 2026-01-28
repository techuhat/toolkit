# PowerShell Script to Convert FAQ Sections to Professional Dropdown Style
# Finds FAQ sections and converts Q:/A: format to HTML details/summary

$blogDir = "d:\imagetoolkit_pro\toolkit\pages\blog"

Write-Host "`n=== Converting FAQs to Dropdown Style ===" -ForegroundColor Cyan

$files = Get-ChildItem "$blogDir\*.html" -Exclude "index.html","blog-post-template.html"

$converted = 0
$skipped = 0

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw
        
        # Check if FAQ section exists
        if ($content -notmatch '(?i)<h2[^>]*>[^<]*FAQ|<strong>Q:') {
            Write-Host "  [SKIP] $($file.Name) - No FAQ found" -ForegroundColor Gray
            $skipped++
            continue
        }
        
        # Convert simple bold Q:/A: format to dropdown
        # Pattern: <p><strong>Q: question</strong><br/>A: answer</p>
        $pattern = '<p><strong>Q:\s*([^<]+)</strong><br/>\s*A:\s*([^<]+)</p>'
        
        if ($content -match $pattern) {
            $newContent = $content -replace $pattern, {
                param($match)
                $question = $match.Groups[1].Value.Trim()
                $answer = $match.Groups[2].Value.Trim()
                
                @"
<details class="group bg-surface/30 border border-border rounded-lg overflow-hidden mb-4">
          <summary class="cursor-pointer px-6 py-4 font-semibold flex justify-between items-center hover:bg-surface/50 transition-colors">
            <span>$question</span>
            <svg class="w-5 h-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div class="px-6 py-4 text-text-secondary border-t border-border">
            <p>$answer</p>
          </div>
        </details>
"@
            }
            
            Set-Content -Path $file.FullName -Value $newContent -NoNewline
            Write-Host "  [OK] $($file.Name)" -ForegroundColor Green
            $converted++
        } else {
            Write-Host "  [SKIP] $($file.Name) - FAQ exists but format doesn't match pattern" -ForegroundColor Yellow
            $skipped++
        }
    }
    catch {
        Write-Host "  [ERROR] $($file.Name) - $_" -ForegroundColor Red
    }
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Converted: $converted files" -ForegroundColor Green
Write-Host "Skipped: $skipped files" -ForegroundColor Yellow
Write-Host "`nDone!`n" -ForegroundColor Cyan
