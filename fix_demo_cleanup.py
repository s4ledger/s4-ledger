#!/usr/bin/env python3
"""Fix the corrupted demo.html — remove duplicate sample content."""

with open('demo-app/demo.html', 'r') as f:
    content = f.read()

# Find the start of var samples = {
start = content.find("var samples = {")
if start == -1:
    print('ERROR: var samples not found')
    exit(1)

# Find the textarea line that should follow samples
textarea_marker = "var textarea = document.getElementById('demoContent');"
textarea_pos = content.find(textarea_marker)
if textarea_pos == -1:
    textarea_marker = "textarea.value"
    textarea_pos = content.find(textarea_marker, start)

if textarea_pos == -1:
    print("ERROR: Could not find textarea marker after samples")
    exit(1)

print(f'samples start: {start}')
print(f'textarea pos: {textarea_pos}')

# Find the FIRST properly balanced }; that closes var samples
search_region = content[start:textarea_pos]
brace_depth = 0
close_pos = None
for i, ch in enumerate(search_region):
    if ch == '{':
        brace_depth += 1
    elif ch == '}':
        brace_depth -= 1
        if brace_depth == 0:
            # Check if next char is ;
            if i + 1 < len(search_region) and search_region[i+1] == ';':
                close_pos = start + i + 2  # position after };
                break

if close_pos is None:
    print('ERROR: Could not find proper close of samples dict')
    exit(1)

print(f'close_pos: {close_pos}')
print(f'Chars at close: {repr(content[close_pos:close_pos+50])}')

# Cut out everything between close_pos and textarea_pos (this is the duplicate junk)
junk = content[close_pos:textarea_pos]
print(f'Removing {len(junk)} chars of duplicate content')

content = content[:close_pos] + '\n    ' + content[textarea_pos:]

with open('demo-app/demo.html', 'w') as f:
    f.write(content)

lines = content.count('\n') + 1
print(f'Fixed! New file: {len(content)} chars, {lines} lines')
