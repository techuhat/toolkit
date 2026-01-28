import re
import os
from pathlib import Path

blog_dir = Path(r"d:\imagetoolkit_pro\toolkit\pages\blog")

def convert_faq_to_dropdown(content):
    """Convert FAQ Q:/A: format to HTML dropdown"""
    
    # Pattern for Q:/A: format
    # Matches: <p><strong>Q: question</strong><br/>A: answer</p>
    pattern = r'<p><strong>Q:\s*([^<]+)</strong><br/>\s*(?:A:\s*)?([^<]+)</p>'
    
    def replacement(match):
        question = match.group(1).strip()
        answer = match.group(2).strip()
        
        return f'''<details class="group bg-surface/30 border border-border rounded-lg overflow-hidden mb-4">
          <summary class="cursor-pointer px-6 py-4 font-semibold flex justify-between items-center hover:bg-surface/50 transition-colors">
            <span>{question}</span>
            <svg class="w-5 h-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div class="px-6 py-4 text-text-secondary border-t border-border">
            <p>{answer}</p>
          </div>
        </details>'''
    
    # Replace all FAQ items
    converted_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
    
    return converted_content

def main():
    print("\n=== Converting FAQs to Dropdown Style ===\n")
    
    converted_count = 0
    skipped_count = 0
    error_count = 0
    
    # Get all HTML files except index and template
    html_files = [f for f in blog_dir.glob("*.html") 
                  if f.name not in ["index.html", "blog-post-template.html"]]
    
    for html_file in html_files:
        try:
            # Read file
            with open(html_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if has FAQ section
            if not re.search(r'<strong>Q:', content, re.IGNORECASE):
                print(f"  [SKIP] {html_file.name} - No FAQ found")
                skipped_count += 1
                continue
            
            # Convert FAQs
            new_content = convert_faq_to_dropdown(content)
            
            # Check if anything changed
            if new_content == content:
                print(f"  [SKIP] {html_file.name} - No changes made")
                skipped_count += 1
                continue
            
            # Write back
            with open(html_file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            print(f"  [OK] {html_file.name}")
            converted_count += 1
            
        except Exception as e:
            print(f"  [ERROR] {html_file.name} - {e}")
            error_count += 1
    
    print(f"\n=== Summary ===")
    print(f"Converted: {converted_count} files")
    print(f"Skipped: {skipped_count} files")
    print(f"Errors: {error_count} files")
    print(f"\nDone!\n")

if __name__ == "__main__":
    main()
