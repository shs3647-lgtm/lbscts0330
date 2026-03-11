#!/usr/bin/env python3
"""
Remove console.log / console.warn statements from TypeScript/TSX files.
Handles both single-line and multi-line calls safely by tracking parenthesis depth.

Usage: python3 scripts/remove-console-logs.py [--dry-run] [directory]
"""
import os
import sys
import re

DRY_RUN = '--dry-run' in sys.argv
TARGET_DIR = 'src'

# Parse optional directory arg
for arg in sys.argv[1:]:
    if not arg.startswith('--'):
        TARGET_DIR = arg

EXTENSIONS = {'.ts', '.tsx'}

# Patterns that indicate a console.log/warn statement start
CONSOLE_PATTERN = re.compile(r'^(\s*)console\.(log|warn)\s*\(')

# Files/dirs to skip
SKIP_DIRS = {'node_modules', '.next', 'dist', '.git'}


def should_remove_line(line: str) -> bool:
    """Check if line starts a console.log/warn call (ignoring leading whitespace)."""
    stripped = line.lstrip()
    return bool(stripped.startswith('console.log(') or stripped.startswith('console.warn('))


def count_parens(line: str) -> int:
    """Count net open parentheses in a line, ignoring those in strings."""
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


def process_file(filepath: str) -> int:
    """Remove console.log/warn from a file. Returns count of removed statements."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except (UnicodeDecodeError, PermissionError):
        return 0

    new_lines = []
    removed = 0
    skip_depth = 0  # When > 0, we're inside a multi-line console.log

    i = 0
    while i < len(lines):
        line = lines[i]

        if skip_depth > 0:
            # We're in a multi-line console.log continuation
            skip_depth += count_parens(line)
            i += 1
            removed_already = True  # Don't count continuations
            if skip_depth <= 0:
                skip_depth = 0
            continue

        if should_remove_line(line):
            depth = count_parens(line)
            removed += 1

            if depth > 0:
                # Multi-line: track paren depth
                skip_depth = depth
            # else: single-line, just skip this line

            i += 1
            continue

        new_lines.append(line)
        i += 1

    if removed > 0 and not DRY_RUN:
        # Remove excessive blank lines (3+ consecutive → 2)
        final_lines = []
        blank_count = 0
        for line in new_lines:
            if line.strip() == '':
                blank_count += 1
                if blank_count <= 2:
                    final_lines.append(line)
            else:
                blank_count = 0
                final_lines.append(line)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(final_lines)

    return removed


def main():
    total_removed = 0
    total_files = 0
    file_details = []

    for root, dirs, files in os.walk(TARGET_DIR):
        # Skip unwanted directories
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

        for fname in files:
            ext = os.path.splitext(fname)[1]
            if ext not in EXTENSIONS:
                continue

            filepath = os.path.join(root, fname)
            count = process_file(filepath)

            if count > 0:
                total_removed += count
                total_files += 1
                file_details.append((filepath, count))

    # Sort by count descending
    file_details.sort(key=lambda x: -x[1])

    mode = "DRY-RUN" if DRY_RUN else "REMOVED"
    print(f"\n{'='*60}")
    print(f"  console.log/warn removal - {mode}")
    print(f"{'='*60}")
    print(f"  Total statements removed: {total_removed}")
    print(f"  Files modified: {total_files}")
    print(f"{'='*60}")

    if file_details:
        print(f"\n  Top files:")
        for fp, cnt in file_details[:30]:
            print(f"    {cnt:4d}  {fp}")

    if len(file_details) > 30:
        print(f"    ... and {len(file_details) - 30} more files")

    print()


if __name__ == '__main__':
    main()
