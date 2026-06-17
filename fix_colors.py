import re

with open('program-schedule/index.html', 'r') as f:
    html = f.read()

before = html.count('2d1b5e') + html.count('8b5cf6') + html.count('1e1040')

html = html.replace('#2d1b5e', '#1c3a5f')
html = html.replace('#8b5cf6', '#C9A000')
html = html.replace('#1e1040', '#162e4a')

after = html.count('2d1b5e') + html.count('8b5cf6') + html.count('1e1040')

with open('program-schedule/index.html', 'w') as f:
    f.write(html)

print(f'Before: {before} purple refs, After: {after} purple refs')
print(f'navy #1c3a5f count: {html.count("1c3a5f")}')
