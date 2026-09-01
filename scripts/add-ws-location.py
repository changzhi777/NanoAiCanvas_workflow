#!/usr/bin/env python3
import re

content = open('/etc/nginx/sites-available/nanoai.conf').read()

ws_config = '''
    # WebSocket proxy for real-time task status
    location /ws/ {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache off;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
'''

# Find the last location inside the SSL server block and insert after it
# The SSL server block ends at the second to last }
lines = content.split('\n')
# Find the line with "location /nanoai/assets/"
insert_line = None
for i, line in enumerate(lines):
    if 'location /nanoai/assets/' in line:
        # Find the closing brace of this location block
        for j in range(i+1, len(lines)):
            if lines[j].strip() == '}':
                insert_line = j + 1
                break
        break

if insert_line:
    lines.insert(insert_line, ws_config)
    open('/etc/nginx/sites-available/nanoai.conf', 'w').write('\n'.join(lines))
    print(f'Done - WebSocket location added at line {insert_line}')
else:
    print('Could not find insertion point')
