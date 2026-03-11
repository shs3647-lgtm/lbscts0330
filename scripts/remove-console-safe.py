#!/usr/bin/env python3
"""
Safe console.log/warn removal for TypeScript/TSX files.
NEVER touches console.error (required by CLAUDE.md coding rules).

Strategy:
  Pass 1: Remove statement-level console.log/warn (lines starting with console.log/warn)
          including multi-line via parenthesis depth tracking
  Pass 2: Remove inline patterns (if/else/forEach/.catch with console.log/warn ONLY)

Usage: python3 scripts/remove-console-safe.py [--dry-run]
"""
import os
import sys
import re

DRY_RUN = '--dry-run' in sys.argv
TARGET_DIR = 'src'
EXTENSIONS = {'.ts', '.tsx'}
SKIP_DIRS = {'node_modules', '.next', 'dist', '.git'}

total_removed = 0
total_files = 0
file_details = []


def count_parens(line):
    depth = 0
    in_single = False
    in_double = False
    in_template = False
    escape = False
    for ch in line:
        if escape:
            escape = False
            continue
        if ch == '\\':
            escape = True
            continue
        if ch == "'" and not in_double and not in_template:
            in_single = not in_single
        elif ch == '"' and not in_single and not in_template:
            in_double = not in_double
        elif ch == '`' and not in_single and not in_double:
            in_template = not in_template
        elif not in_single and not in_double and not in_template:
            if ch == '(':
                depth += 1
            elif ch == ')':
                depth -= 1
    return depth


def pass1_statement_level(lines):
    """Remove lines that START with console.log/warn (after whitespace)."""
    new_lines = []
    removed = 0
    skip_depth = 0
    for line in lines:
        if skip_depth > 0:
            skip_depth += count_parens(line)
            if skip_depth <= 0:
                skip_depth = 0
            continue
        stripped = line.lstrip()
        if stripped.startswith('console.log(') or stripped.startswith('console.warn('):
            depth = count_parens(line)
            removed += 1
            if depth > 0:
                skip_depth = depth
            continue
        new_lines.append(line)
    return new_lines, removed


def pass2_inline(content):
    """Remove inline console.log/warn patterns. NEVER touches console.error."""
    original = content

    # 1. if (condition) console.log/warn(...);
    content = re.sub(
        r'^([ \t]*)if\s*\([^)]*\)\s*console\.(log|warn)\([^;]*;\s*\n',
        '',
        content,
        flags=re.MULTILINE
    )

    # 2. else console.log/warn(...);
    content = re.sub(
        r'^([ \t]*)else\s+console\.(log|warn)\([^;]*;\s*\n',
        '',
        content,
        flags=re.MULTILINE
    )

    # 3. .catch((e) => console.log/warn(...)) — only log/warn, NOT error
    content = re.sub(
        r'\.catch\(\([^)]*\)\s*=>\s*console\.(log|warn)\([^)]*\)\)',
        '.catch(() => {})',
        content
    )

    # 4. } catch (x) { console.log/warn(...); } — only log/warn
    content = re.sub(
        r'\}\s*catch\s*\([^)]*\)\s*\{\s*console\.(log|warn)\([^;]*;\s*\}',
        '} catch { /* ignored */ }',
        content
    )

    # 5. .forEach((s, i) => console.log/warn(...));
    content = re.sub(
        r'^[ \t]*[A-Za-z_]\w*(?:\.\w+)*\.forEach\(\([^)]*\)\s*=>\s*console\.(log|warn)\([^)]*\)\);\s*\n',
        '',
        content,
        flags=re.MULTILINE
    )

    # 6. .forEach(s => console.log/warn(...));
    content = re.sub(
        r'^[ \t]*[A-Za-z_]\w*(?:\.\w+)*\.forEach\(\w+\s*=>\s*console\.(log|warn)\([^)]*\)\);\s*\n',
        '',
        content,
        flags=re.MULTILINE
    )

    # 7. ; console.log/warn(...)  inline after semicolon
    content = re.sub(
        r';\s*console\.(log|warn)\([^;]*;',
        ';',
        content
    )

    changed = content != original
    return content, changed


def cleanup_blank_lines(lines):
    """Remove excessive blank lines (3+ consecutive -> 2)."""
    result = []
    blank_count = 0
    for line in lines:
        if line.strip() == '':
            blank_count += 1
            if blank_count <= 2:
                result.append(line)
        else:
            blank_count = 0
            result.append(line)
    return result


def process_file(filepath):
    global total_removed, total_files
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except (UnicodeDecodeError, PermissionError):
        return

    # Pass 1: statement-level removal
    new_lines, removed = pass1_statement_level(lines)

    # Pass 2: inline removal
    content = ''.join(new_lines)
    content, inline_changed = pass2_inline(content)

    if removed > 0 or inline_changed:
        total_removed += removed
        total_files += 1
        file_details.append((filepath, removed))

        if not DRY_RUN:
            final_lines = cleanup_blank_lines(content.splitlines(keepends=True))
            with open(filepath, 'w', encoding='utf-8') as f:
                f.writelines(final_lines)


def main():
    for root, dirs, files in os.walk(TARGET_DIR):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fname in files:
            if os.path.splitext(fname)[1] in EXTENSIONS:
                process_file(os.path.join(root, fname))

    mode = "DRY-RUN" if DRY_RUN else "REMOVED"
    print(f"\nconsole.log/warn safe removal - {mode}")
    print(f"  Statement-level removed: {total_removed}")
    print(f"  Files modified: {total_files}")

    file_details.sort(key=lambda x: -x[1])
    for fp, cnt in file_details[:20]:
        print(f"    {cnt:4d}  {fp}")
    if len(file_details) > 20:
        print(f"    ... and {len(file_details) - 20} more files")


if __name__ == '__main__':
    main()
