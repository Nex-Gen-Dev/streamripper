"""
Run this before pushing a new release:
  python scripts/bump_version.py 1.2.0

It updates the version string in updater.py automatically.
"""
import sys, re
from pathlib import Path

if len(sys.argv) < 2:
    print("Usage: python scripts/bump_version.py <new_version>")
    sys.exit(1)

new_ver = sys.argv[1].strip().lstrip("v")
target  = Path(__file__).parent.parent / "backend" / "updater.py"
content = target.read_text()
updated = re.sub(r'CURRENT_VERSION\s*=\s*"[^"]+"', f'CURRENT_VERSION = "{new_ver}"', content)
target.write_text(updated)
print(f"✓ Version bumped to {new_ver} in updater.py")
