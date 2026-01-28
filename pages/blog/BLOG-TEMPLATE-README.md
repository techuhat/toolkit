# Blog Post Template - Usage Guide

## 📝 How to Create a New Blog Post

Follow these simple steps to create a new blog post using the template:

### Step 1: Copy the Template
```bash
# Navigate to blog directory
cd d:\imagetoolkit_pro\toolkit\pages\blog

# Copy template with new filename
copy blog-post-template.html your-new-post-slug.html
```

### Step 2: Update Meta Tags
Open your new file and replace all placeholders:

**Required Replacements:**
- `[POST TITLE]` - Your blog post title
- `[POST DESCRIPTION]` - Brief description (under 160 characters)
- `[POST-SLUG]` - URL-friendly slug (e.g., "my-awesome-post")
- `[CATEGORY]` - Post category (e.g., "Images", "PDFs", "QR")
- `[READ TIME]` - Estimated read time in minutes
- `[YYYY-MM-DD]` - Publication date (e.g., "2025-01-24")
- `[Month DD, YYYY]` - Human-readable date (e.g., "January 24, 2025")

### Step 3: Add Your Content
Replace the placeholder content sections with your actual blog post content:
- Introduction
- Main sections with H2 headings
- Subsections with H3 headings where needed
- Conclusion
- Related posts (optional but recommended)

### Step 4: Update Related Posts (Optional)
In the "Related Posts" section at the bottom, link to 2-3 related articles:
```html
<a href="related-post-slug.html" class="card p-4 hover:shadow-lg transition-shadow">
  <h4 class="font-semibold text-lg mb-2">Related Post Title</h4>
  <p class="text-text-secondary text-sm">Brief description...</p>
</a>
```

### Step 5: Preview and Publish
- Open your file in a browser to preview
- Check all links work correctly
- Verify header and footer appear
- Publish when satisfied!

## ✨ What's Included in the Template

### Header
- Full navigation bar with logo
- Desktop and mobile menus  
- All links pre-configured with correct paths

### Blog Post Structure
- SEO-optimized meta tags
- Open Graph tags for social media
- Article metadata (category, read time, date)
- Clean content area with proper typography
- Related posts section

### Footer
- Logo and description
- Tools quick links
- Resources section
- Social media icons (GitHub, LinkedIn)
- Copyright notice

## 🎯 Best Practices

1. **Keep titles concise** - Aim for 60 characters or less for SEO
2. **Write compelling descriptions** - These appear in search results
3. **Use proper heading hierarchy** - H1 for title, H2 for main sections, H3 for subsections
4. **Add related posts** - Increases user engagement and time on site
5. **Update meta dates** - Keep publication dates accurate
6. **Check all links** - Test navigation and related post links before publishing

## 🔧 Customization

All design elements use Tailwind CSS classes defined in `../../css/styles.css`. Header and footer match the main site for consistency.

## 📂 File Structure

```
blog/
├── blog-post-template.html  ← Template file (don't modify directly)
├── index.html               ← Blog listing page
├── your-post-1.html         ← Your blog posts
├── your-post-2.html
└── ...
```

## Need Help?

If you encounter issues:
1. Check that all `[PLACEHOLDERS]` are replaced
2. Verify relative paths are correct (`../` for pages, `../../` for root files)
3. Ensure you copied the template, not modified it directly
4. Test in a browser to see actual appearance

---

**Happy blogging! 🚀**
