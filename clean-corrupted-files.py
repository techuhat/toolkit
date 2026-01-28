import re
from pathlib import Path

blog_dir = Path(r"d:\imagetoolkit_pro\toolkit\pages\blog")

def clean_corrupted_files(content):
    """Remove corrupted PowerShell script code from HTML files"""
    
    # Pattern to match the corrupted PowerShell code blocks
    # Looking for lines between "param($match)" and "@"
    pattern = r'\s*param\(\$match\).*?@"\s*'
    
    # Remove corrupted blocks
    cleaned = re.sub(pattern, '', content, flags=re.DOTALL)
    
    # Also remove standalone PowerShell variable references
    cleaned = re.sub(r'\$question|\$answer', '', cleaned)
    
    return cleaned

def main():
    print("\n=== Cleaning Corrupted Blog Post Files ===\n")
    
    cleaned_count = 0
    
    html_files = [f for f in blog_dir.glob("*.html") 
                  if f.name not in ["index.html", "blog-post-template.html"]]
    
    for html_file in html_files:
        try:
            with open(html_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if file is corrupted (contains PowerShell code)
            if 'param($match)' not in content and '$question' not in content:
                continue
            
            # Clean the file
            cleaned_content = clean_corrupted_files(content)
            
            # Write back
            with open(html_file, 'w', encoding='utf-8') as f:
                f.write(cleaned_content)
            
            print(f"  [CLEANED] {html_file.name}")
            cleaned_count += 1
            
        except Exception as e:
            print(f"  [ERROR] {html_file.name} - {e}")
    
    print(f"\n=== Summary ===")
    print(f"Cleaned: {cleaned_count} files")
    print(f"\nDone!\n")

if __name__ == "__main__":
    main()
