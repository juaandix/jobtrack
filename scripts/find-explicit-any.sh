#!/usr/bin/env bash
# TS-02: prints `file:line:text` for every use of `any` as a type (`: any`,
# `as any`, `<any>`, `any[]`) in the TS/JS sources under the given paths.
# Comments (`// …`, `/* … */`, JSX `{/* … */}`) are ignored, so the English
# word "any" in a comment is not reported. Missing paths are skipped. Always
# exits with 0: the caller decides from the output. Portable between
# macOS/BSD and Linux/GNU (POSIX awk and character classes, no \b or \s).
set -u

for path in "$@"; do
  [ -e "$path" ] || continue
  find "$path" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' \
    -o -name '*.jsx' -o -name '*.mjs' -o -name '*.cjs' \) -print
done | sort | while IFS= read -r file; do
  awk -v file="$file" '
    BEGIN {
      # Word boundaries as in check-guidelines.sh; [[] and []] are "[" and
      # "]" without backslashes (awk -v and BSD awk handle those differently).
      start = "(^|[^[:alnum:]_])"
      end = "([^[:alnum:]_]|$)"
      pattern = ":[[:space:]]*any" end "|<any>|" start "as any" end "|" start "any[[][]]"
      in_block = 0
    }
    {
      rest = $0
      code = ""
      while (rest != "") {
        if (in_block) {
          close_at = index(rest, "*/")
          if (close_at == 0) { rest = ""; break }
          rest = substr(rest, close_at + 2)
          in_block = 0
          continue
        }
        block_at = index(rest, "/*")
        line_at = 0
        # "//" starts a comment unless it follows ":" (as in "https://").
        search = rest
        offset = 0
        while ((found = index(search, "//")) > 0) {
          position = offset + found
          if (position == 1 || substr(rest, position - 1, 1) != ":") {
            line_at = position
            break
          }
          offset = position + 1
          search = substr(rest, offset + 1)
        }
        if (block_at > 0 && (line_at == 0 || block_at < line_at)) {
          code = code substr(rest, 1, block_at - 1) " "
          rest = substr(rest, block_at + 2)
          in_block = 1
        } else if (line_at > 0) {
          code = code substr(rest, 1, line_at - 1)
          rest = ""
        } else {
          code = code rest
          rest = ""
        }
      }
      if (code ~ pattern) print file ":" FNR ":" $0
    }
  ' "$file"
done
exit 0
