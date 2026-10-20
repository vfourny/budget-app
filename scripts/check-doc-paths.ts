/**
 * Vérifie que chaque chemin cité entre backticks dans la doc et les commentaires existe encore
 * (`shared/professional/compute-month.util.ts`, `@server/lib/db.client`, `load-year.service.ts`…).
 * Un renommage qui oublie la doc casse `pnpm check` et la CI au lieu de laisser une référence morte.
 *
 * - Chemin avec `/` : doit exister depuis la racine, ou être la fin d'un chemin existant
 *   (`features/layout/components/app-layout.tsx`).
 * - Nom de fichier seul (`load-year.service.ts`) : un fichier de ce nom doit exister.
 * - Alias `@/`, `@server/`, `@shared/` : résolus vers `src/`, `server/`, `shared/` (extension facultative).
 * - Ignorés : URL, routes (`/api/…`), gabarits (`<domaine>`, `xxx`, `*`, `…`), suffixes seuls
 *   (`.service.ts`), client Prisma généré (gitignoré) et `NOT_IN_REPO`.
 *
 * Usage : `pnpm docs:check`
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const EXTENSIONS = [
  'ts',
  'tsx',
  'md',
  'prisma',
  'css',
  'json',
  'yml',
  'yaml',
  'sh',
]
const ALIASES: Record<string, string> = {
  '@/': 'src/',
  '@server/': 'server/',
  '@shared/': 'shared/',
}
/** Cités exprès mais absents du repo. */
const NOT_IN_REPO = new Set([
  // Workflows réutilisables de vfourny/.github
  'build.yml',
  'pr-checks.yml',
  'prisma-check.yml',
  // Créé par release-please à la première release
  'docs/CHANGELOG.md',
  // Projet Vitest décrit, pas encore créé
  'tests/src/',
])

/** Fichiers du repo, nouveaux compris (suivis + non ignorés) ; le généré et les migrations ne sont pas relus. */
const files = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard'],
  { encoding: 'utf8' },
)
  .split('\n')
  .filter(Boolean)
const dirs = new Set(
  files.flatMap((file) =>
    file
      .split('/')
      .slice(0, -1)
      .map((_, index, parts) => `${parts.slice(0, index + 1).join('/')}/`),
  ),
)
const basenames = new Set(files.map((file) => file.split('/').at(-1)))

const scanned = files.filter(
  (file) =>
    /\.(md|ts|tsx|prisma)$/.test(file) &&
    !file.startsWith('server/generated/') &&
    !file.startsWith('prisma/migrations/') &&
    !file.endsWith('CHANGELOG.md'),
)

const TOKEN = /`([^`\s]+)`/g
const IGNORED =
  /:\/\/|^\/|^\.|[<>*…]|xxx|\bx\.|\$\{|^@?server\/generated\/|^@\/$|^@\w+\/$/

function looksLikePath(token: string): boolean {
  if (Object.keys(ALIASES).some((alias) => token.startsWith(alias))) return true
  return (
    new RegExp(
      `^[\\w@.\\[\\]-]+(/[\\w.\\[\\]-]+)*\\.(${EXTENSIONS.join('|')})$`,
    ).test(token) || /^[\w.-]+(\/[\w.[\]-]+)+\/$/.test(token)
  )
}

function exists(token: string): boolean {
  const alias = Object.keys(ALIASES).find((prefix) => token.startsWith(prefix))
  if (alias) {
    const path = `${ALIASES[alias]}${token.slice(alias.length)}`
    return ['', '.ts', '.tsx', '/index.ts'].some(
      (suffix) => files.includes(path + suffix) || dirs.has(`${path}/`),
    )
  }
  if (token.endsWith('/')) {
    return [...dirs].some((dir) => dir === token || dir.endsWith(`/${token}`))
  }
  if (!token.includes('/')) return basenames.has(token)
  return (
    existsSync(token) ||
    files.some((file) => file === token || file.endsWith(`/${token}`))
  )
}

const missing: string[] = []
for (const file of scanned) {
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, index) => {
    for (const [, token = ''] of line.matchAll(TOKEN)) {
      if (IGNORED.test(token) || NOT_IN_REPO.has(token)) continue
      if (!looksLikePath(token)) continue
      if (!exists(token)) missing.push(`${file}:${index + 1}  ${token}`)
    }
  })
}

if (missing.length > 0) {
  console.error(`Chemins cités introuvables (${missing.length}) :\n`)
  console.error(missing.join('\n'))
  process.exit(1)
}
console.warn(`Doc : ${scanned.length} fichiers relus, aucun chemin mort.`)
