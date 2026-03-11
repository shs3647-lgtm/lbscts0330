#!/usr/bin/env python3
"""
Remove INLINE console.log/warn/error statements from TypeScript/TSX files.
Handles patterns like:
  if (x) console.log(...)        -> (remove entire line)
  .catch(e => console.warn(...)) -> .catch(() => {})
  .forEach(s => console.warn...) -> (remove entire statement)
  try { ...; console.log(...) } catch (e) { console.error(...) }
"""
import os
import re
import sys

DRY_RUN = '--dry-run' in sys.argv
TARGET_DIR = 'src'
EXTENSIONS = {'.ts', '.tsx'}
SKIP_DIRS = {'node_modules', '.next', 'dist', '.git'}

# Skip lines that are just comments mentioning console
COMMENT_PATTERN = re.compile(r'^\s*(\*|//|/\*)')

changes = []


def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except (UnicodeDecodeError, PermissionError):
        return

    original = content

    # Pattern 1: if (condition) console.log/warn/error(...);\n
    # Remove entire line
    content = re.sub(
        r'^[ \t]*if\s*\([^)]*\)\s*console\.(log|warn|error)\([^;]*;\s*\n',
        '',
        content,
        flags=re.MULTILINE
    )

    # Pattern 2: else console.warn/log/error(...);\n
    # Remove entire line
    content = re.sub(
        r'^[ \t]*else\s+console\.(log|warn|error)\([^;]*;\s*\n',
        '',
        content,
        flags=re.MULTILINE
    )

    # Pattern 3: .catch((e: any) => console.warn(...));
    # -> .catch(() => {})
    content = re.sub(
        r'\.catch\(\([^)]*\)\s*=>\s*console\.(log|warn|error)\([^)]*\)\)',
        '.catch(() => {})',
        content
    )

    # Pattern 4: } catch (pe) { console.warn(...); }
    # -> } catch { /* ignored */ }
    content = re.sub(
        r'\}\s*catch\s*\([^)]*\)\s*\{\s*console\.(log|warn|error)\([^;]*;\s*\}',
        '} catch { /* ignored */ }',
        content
    )

    # Pattern 5: .forEach((s, i) => console.warn(...));
    # Remove entire statement
    content = re.sub(
        r'^\s*\w+(?:\.\w+)*\.forEach\(\([^)]*\)\s*=>\s*console\.(log|warn|error)\([^)]*\)\);\s*\n',
        '',
        content,
        flags=re.MULTILINE
    )

    # Pattern 6: .forEach(s => console.warn(...));
    content = re.sub(
        r'^\s*\w+(?:\.\w+)*\.forEach\(\w+\s*=>\s*console\.(log|warn|error)\([^)]*\)\);\s*\n',
        '',
        content,
        flags=re.MULTILINE
    )

    # Pattern 7: inline console.log after semicolon: save(); console.log(...)
    # Remove the console.log part
    content = re.sub(
        r';\s*console\.(log|warn)\([^;]*;',
        ';',
        content
    )

    # Pattern 8: } catch (e) { console.error(...) }  on same line
    content = re.sub(
        r'\}\s*catch\s*\(\w+\)\s*\{\s*console\.error\([^}]*\}',
        '} catch { /* error ignored */ }',
        content
    )

    if content != original:
        changes.append(filepath)
        if not DRY_RUN:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)


def main():
    for root, dirs, files in os.walk(TARGET_DIR):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fname in files:
            if os.path.splitext(fname)[1] in EXTENSIONS:
                process_file(os.path.join(root, fname))

    mode = "DRY-RUN" if DRY_RUN else "FIXED"
    print(f"\nInline console removal - {mode}")
    print(f"Files changed: {len(changes)}")
    for f in changes:
        print(f"  {f}")


if __name__ == '__main__':
    main()
