#!/usr/bin/env bash
# PostToolUse hook (Edit/Write) : prettier + oxlint --fix sur le fichier touché,
# puis typecheck du projet. Exit 2 => l'erreur est renvoyée à Claude, qui corrige.
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0

file=$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const j=JSON.parse(d);process.stdout.write(j.tool_input?.file_path??"")}catch{}})')

[[ -z "$file" || ! -f "$file" ]] && exit 0
case "$file" in
  */node_modules/*|*/.output/*|*/.vercel/*|*/server/generated/*) exit 0 ;;
esac

errors=""

case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.md|*.css|*.yml|*.yaml)
    pnpm exec prettier --write --log-level warn "$file" >/dev/null 2>&1 || true ;;
esac

case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs)
    if ! out=$(pnpm exec oxlint --fix --deny-warnings "$file" 2>&1); then
      errors+=$'oxlint:\n'"$out"$'\n'
    fi
    if ! out=$(pnpm -s typecheck --pretty false 2>&1); then
      errors+=$'TypeScript:\n'"$(echo "$out" | head -40)"$'\n'
    fi
    ;;
esac

if [[ -n "$errors" ]]; then
  echo "$errors" >&2
  exit 2
fi
exit 0
