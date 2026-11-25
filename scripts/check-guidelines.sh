#!/usr/bin/env bash
# Automatic checks of docs/DIRECTRICES.md. Exits with a non-zero code if any
# check fails. Portable between macOS/BSD and Linux/GNU userlands (bash 3.2+,
# POSIX character classes instead of \b, \s or grep -P).
set -u

cd "$(dirname "$0")/.." || exit 2

failed_ids=""
ok_count=0
fail_count=0
info_count=0

ok() {
  printf 'OK   %s\n' "$1"
  ok_count=$((ok_count + 1))
}

# fail <ID> <reason> [matches]
fail() {
  printf 'FAIL %s — %s\n' "$1" "$2"
  if [ -n "${3:-}" ]; then
    printf '%s\n' "$3" | sed 's/^/     /'
  fi
  fail_count=$((fail_count + 1))
  failed_ids="$failed_ids $1"
}

# info <ID> <reason> [matches] — reported for manual review, never fails.
info() {
  printf 'INFO %s — %s\n' "$1" "$2"
  if [ -n "${3:-}" ]; then
    printf '%s\n' "$3" | sed 's/^/     /'
  fi
  info_count=$((info_count + 1))
}

# search <extended-regex> <path>... — grep -rnE over the paths that exist,
# skipping binary files. Missing paths are ignored (the check passes).
search() {
  pattern=$1
  shift
  for path in "$@"; do
    if [ -e "$path" ]; then
      grep -rnIE -- "$pattern" "$path" 2>/dev/null
    fi
  done
  return 0
}

# check_absent <ID> <reason> <extended-regex> <path>...
check_absent() {
  id=$1
  reason=$2
  pattern=$3
  shift 3
  matches=$(search "$pattern" "$@")
  if [ -z "$matches" ]; then
    ok "$id"
  else
    fail "$id" "$reason" "$matches"
  fi
}

# source_files <path>... — TS/JS source files under the existing paths.
source_files() {
  for path in "$@"; do
    if [ -e "$path" ]; then
      find "$path" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' \
        -o -name '*.jsx' -o -name '*.mjs' -o -name '*.cjs' \)
    fi
  done
  return 0
}

is_test_file() {
  case "$1" in
    e2e/* | *.test.ts | *.test.tsx | *.spec.ts | *.spec.tsx) return 0 ;;
    *) return 1 ;;
  esac
}

# Word boundaries without \b (not guaranteed in POSIX ERE).
B_START='(^|[^[:alnum:]_])'
B_END='([^[:alnum:]_]|$)'

is_git_repo=0
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  is_git_repo=1
fi

echo "Comprobaciones automáticas de docs/DIRECTRICES.md"
echo

# --- QA ----------------------------------------------------------------------

check_absent "QA-04" "tests desactivados o exclusivos (.skip/.only/xit/xdescribe)" \
  "\.(skip|only)\(|${B_START}xit\(|${B_START}xdescribe\(" src e2e

qa06=$(search 'eslint-disable|@ts-ignore|@ts-nocheck' src e2e)
qa06_expect=""
while IFS= read -r file; do
  [ -n "$file" ] || continue
  if ! is_test_file "$file"; then
    hits=$(grep -nE -- '@ts-expect-error' "$file" 2>/dev/null | sed "s|^|$file:|")
    if [ -n "$hits" ]; then
      qa06_expect="${qa06_expect}${hits} (fuera de un test)
"
    fi
  else
    # In tests it needs an explanation: text after the directive on the same
    # line, or a comment on the line right above.
    hits=$(awk -v f="$file" '
      /@ts-expect-error/ {
        rest = $0
        sub(/.*@ts-expect-error/, "", rest)
        gsub(/[[:space:]]|\*\/|-/, "", rest)
        if (rest == "" && prev !~ /^[[:space:]]*(\/\/|\/\*|\*)/) {
          print f ":" FNR ":" $0 " (sin comentario explicativo)"
        }
      }
      { prev = $0 }
    ' "$file")
    if [ -n "$hits" ]; then
      qa06_expect="${qa06_expect}${hits}
"
    fi
  fi
done <<EOF
$(source_files src e2e)
EOF
qa06_all=$(printf '%s\n%s' "$qa06" "$qa06_expect" | sed '/^$/d')
if [ -z "$qa06_all" ]; then
  ok "QA-06"
else
  fail "QA-06" "reglas desactivadas (eslint-disable, @ts-ignore, @ts-nocheck o @ts-expect-error no permitido)" "$qa06_all"
fi

# --- TS ----------------------------------------------------------------------

check_absent "TS-02" "uso de any" \
  ":[[:space:]]*any${B_END}|<any>|${B_START}as any${B_END}|${B_START}any\[\]" src e2e

check_absent "TS-03" "aserción 'as unknown as'" 'as unknown as' src

# --- A11Y --------------------------------------------------------------------

check_absent "A11Y-02" "onClick en <div> (usar <button> o control nativo)" \
  '<div[^>]*onClick' src

a11y05=$(search 'outline-none' src | grep -v 'focus-visible:')
if [ -z "$a11y05" ]; then
  ok "A11Y-05"
else
  fail "A11Y-05" "outline-none sin focus-visible: en la misma línea" "$a11y05"
fi

# --- DB ----------------------------------------------------------------------

migrations_dir="supabase/migrations"

db01=""
# The diff runs even if the directory is gone, so deleting every committed
# migration is also detected.
if [ "$is_git_repo" -eq 1 ]; then
  if git rev-parse --verify -q HEAD >/dev/null 2>&1; then
    changed=$(git diff --name-status HEAD -- "$migrations_dir" | grep -vE '^A[[:space:]]' \
      | sed 's/$/ (migración commiteada modificada, borrada o renombrada)/')
    if [ -n "$changed" ]; then
      db01="${changed}
"
    fi
  fi
elif [ -d "$migrations_dir" ]; then
  db01="no es un repositorio git: no se puede comprobar el diff de migraciones
"
fi
if [ -d "$migrations_dir" ]; then
  for file in "$migrations_dir"/*; do
    [ -e "$file" ] || continue
    name=$(basename "$file")
    if ! printf '%s\n' "$name" | grep -qE '^[0-9]{14}_[a-z0-9_-]+\.sql$'; then
      db01="${db01}${file} (nombre no sigue YYYYMMDDHHMMSS_nombre.sql)
"
    fi
  done
fi
db01=$(printf '%s' "$db01" | sed '/^$/d')
if [ -z "$db01" ]; then
  ok "DB-01"
else
  fail "DB-01" "migraciones modificadas o mal nombradas" "$db01"
fi

# DB-02: script from DIRECTRICES, guarded so an empty directory passes.
db02=""
sql_present=0
for file in "$migrations_dir"/*.sql; do
  [ -e "$file" ] && sql_present=1 && break
done
if [ "$sql_present" -eq 1 ]; then
  db02=$(
    for t in $(grep -hoiE 'create table (if not exists )?(public\.)?[a-z_]+' "$migrations_dir"/*.sql \
      | awk '{print $NF}' | sed 's/^public\.//'); do
      grep -qiE "alter table (public\.)?$t enable row level security" "$migrations_dir"/*.sql \
        || echo "SIN RLS: $t"
    done
  )
fi
if [ -z "$db02" ]; then
  ok "DB-02"
else
  fail "DB-02" "tablas sin RLS activado" "$db02"
fi

db05=$(search 'user_id' src)
if [ -z "$db05" ]; then
  ok "DB-05"
else
  info "DB-05" "revisión manual: user_id solo en tipos y lecturas, nunca en datos de formularios" "$db05"
fi

# --- SEC ---------------------------------------------------------------------

# SEC-01: command from DIRECTRICES. Literals are split so this script does not
# match itself; -z/-0 handles paths with spaces and -H keeps the file prefix
# when xargs passes a single file (otherwise the docs/ and lockfile filters
# would not apply).
sec01_pattern='eyJ[A-Za-z0-9_-]{20,}|sb_''secret_|sb_publishable_[A-Za-z0-9]|service''_role|SUPABASE_SERVICE''_ROLE'
if [ "$is_git_repo" -eq 1 ]; then
  sec01=$(git ls-files -z -co --exclude-standard \
    | xargs -0 grep -HnE -- "$sec01_pattern" 2>/dev/null \
    | grep -v '^docs/' \
    | grep -vE '^package-lock\.json:[0-9]+:[[:space:]]*"integrity": "sha')
  if [ -z "$sec01" ]; then
    ok "SEC-01"
  else
    fail "SEC-01" "posibles claves o tokens en ficheros versionados" "$sec01"
  fi
else
  fail "SEC-01" "no es un repositorio git: no se puede listar los ficheros versionados"
fi

sec02=""
if [ "$is_git_repo" -eq 1 ]; then
  for env_file in .env.local .env.development.local .env.production.local; do
    if ! git check-ignore -q "$env_file"; then
      sec02="${sec02}${env_file} no está en .gitignore
"
    fi
  done
fi
if [ ! -f .env.example ]; then
  sec02="${sec02}.env.example no existe
"
else
  if [ "$is_git_repo" -eq 1 ] && git check-ignore -q .env.example; then
    sec02="${sec02}.env.example está ignorado por .gitignore (no se versionaría)
"
  fi
  # Names only: every assignment must have an empty value.
  with_value=$(grep -nE '^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*[[:space:]]*=[[:space:]]*[^[:space:]]' .env.example)
  if [ -n "$with_value" ]; then
    sec02="${sec02}.env.example contiene valores (solo deben ir los nombres):
$(printf '%s\n' "$with_value" | sed 's/=.*/=…/')
"
  fi
  # NODE_ENV is set by Next.js/Node itself, not by the project.
  used_vars=$(search "process\.env(\.[A-Z0-9_]+|\[[\"'][A-Z0-9_]+[\"']\])" src e2e \
    | grep -oE "process\.env(\.[A-Z0-9_]+|\[[\"'][A-Z0-9_]+[\"']\])" \
    | sed -E "s/^process\.env\.?//; s/[][\"']//g" \
    | grep -vx 'NODE_ENV' | sort -u)
  for var in $used_vars; do
    if ! grep -qE "^[[:space:]]*${var}[[:space:]]*=" .env.example; then
      sec02="${sec02}${var} se usa en el código pero no está en .env.example
"
    fi
  done
fi
sec02=$(printf '%s' "$sec02" | sed '/^$/d')
if [ -z "$sec02" ]; then
  ok "SEC-02"
else
  fail "SEC-02" "configuración de variables de entorno incompleta" "$sec02"
fi

check_absent "SEC-03" "uso de la service role key en la app" 'SERVICE_ROLE' src

check_absent "SEC-05" "emails literales en e2e (usar E2E_USER_EMAIL/E2E_USER_PASSWORD)" \
  '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}' e2e

# --- TEST --------------------------------------------------------------------

# getByTestId is allowed only with a justifying comment on the same line or
# on the line right above.
test04_bad=""
test04_ok=""
while IFS= read -r file; do
  [ -n "$file" ] || continue
  result=$(awk -v f="$file" '
    /getByTestId/ {
      if ($0 ~ /\/\/|\/\*/ || prev ~ /^[[:space:]]*(\/\/|\/\*|\*)/) {
        print "OK\t" f ":" FNR ":" $0
      } else {
        print "BAD\t" f ":" FNR ":" $0
      }
    }
    { prev = $0 }
  ' "$file")
  if [ -n "$result" ]; then
    bad=$(printf '%s\n' "$result" | grep '^BAD' | cut -f2-)
    good=$(printf '%s\n' "$result" | grep '^OK' | cut -f2-)
    [ -n "$bad" ] && test04_bad="${test04_bad}${bad}
"
    [ -n "$good" ] && test04_ok="${test04_ok}${good}
"
  fi
done <<EOF
$(source_files src)
EOF
test04_bad=$(printf '%s' "$test04_bad" | sed '/^$/d')
test04_ok=$(printf '%s' "$test04_ok" | sed '/^$/d')
if [ -n "$test04_bad" ]; then
  fail "TEST-04" "getByTestId sin comentario que lo justifique" "$test04_bad"
elif [ -n "$test04_ok" ]; then
  info "TEST-04" "revisión manual: getByTestId justificado en comentario" "$test04_ok"
else
  ok "TEST-04"
fi

# --- ARQ ---------------------------------------------------------------------

check_absent "ARQ-04" "console.log en el código de la app" 'console\.log' src

# --- UI ----------------------------------------------------------------------

ui01=$(search 'style=\{\{' src)
if [ -z "$ui01" ]; then
  ok "UI-01"
else
  info "UI-01" "revisión manual: estilos inline solo para valores dinámicos" "$ui01"
fi

# --- Summary -----------------------------------------------------------------

echo
printf 'Resumen: %d OK, %d FAIL, %d INFO (revisión manual)\n' \
  "$ok_count" "$fail_count" "$info_count"
if [ "$fail_count" -gt 0 ]; then
  printf 'Fallan:%s\n' "$failed_ids"
  exit 1
fi
exit 0
