import os

file_path = r'f:\Ai Project\Antigravity Project\test\style.css'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """.recurring-card-badge {
  background: var(--primary-light);
  color: var(--primary);
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}"""

replacement = """.recurring-card-badge {
  background: var(--accent-light);
  color: var(--accent);
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s;
}

.recurring-card-badge.paused {
  background: #E2E8F0;
  color: #64748B;
}

.recurring-card.paused {
  opacity: 0.8;
}

.recurring-card.paused .recurring-card-title {
  color: var(--text-secondary);
}"""

# Try to find target with flexible whitespace
if target in content:
    new_content = content.replace(target, replacement)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Success")
else:
    # Try normalized match
    import re
    def normalize(s):
        return re.sub(r'\s+', ' ', s).strip()
    
    normalized_target = normalize(target)
    # This is more complex because we need to preserve whitespace around the replacement
    print("Target not found exactly. Trying normalized search...")
    # I'll just look for a part of it
    parts = target.split('\n')
    if parts[0] in content:
        print(f"Found first line: {parts[0]}")
    else:
        print("First line not found either.")
