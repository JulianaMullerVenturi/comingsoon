import re

print("Running fix_gcp.py...")

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Remove class="st0" from the GCP shape paths so CSS `<use fill="...">` resolves correctly!
html = re.sub(r'<path class="st0"', '<path', html)

# 2. Fix filter bounds for GCP filters so the mathematically large SVG offsets don't get clipped
# Find the start of GCP defs
if '<g id="gcp-shape">' in html:
    # Split to only affect GCP filters
    parts = html.split('<g id="gcp-shape">')
    gcp_section = parts[1]
    
    # We only want to replace filter attributes up to the closing </svg> of GCP container
    gcp_end_index = gcp_section.find('</defs>')
    
    if gcp_end_index != -1:
        gcp_defs = gcp_section[:gcp_end_index]
        
        # Replace objectBoundingBox with userSpaceOnUse and expand limits massively
        new_gcp_defs = re.sub(
            r'<filter([^>]+?)filterUnits="objectBoundingBox"([^>]*?)>',
            r'<filter\1filterUnits="userSpaceOnUse" x="-15000" y="-15000" width="35000" height="35000"\2>',
            gcp_defs
        )
        # Some might not have filterUnits yet or different layout
        # Also clean up any lingering x="-150%" overrides
        new_gcp_defs = re.sub(r'x="-150%" y="-150%" width="400%" height="400%" ', '', new_gcp_defs)
        
        parts[1] = new_gcp_defs + gcp_section[gcp_end_index:]
        html = parts[0] + '<g id="gcp-shape">' + parts[1]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("index.html fixed.")
