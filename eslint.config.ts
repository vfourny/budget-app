import path from 'node:path'

import reactConfig from '@vfourny/node-toolkit/eslint/react'
import type { Rule } from 'eslint'

/**
 * Côté front et `shared/`, le serveur ne s'importe qu'en `import type`, et seulement son contrat : le
 * type du routeur tRPC et les types Prisma générés. Prisma, secrets… ne partent jamais dans le bundle.
 * Exception : `@server/generated/prisma/enums` (des constantes pures) s'importe normalement, pour
 * parcourir un enum (`Object.values(AccountType)`) sans passer par les clés d'un dictionnaire i18n.
 */
const SERVER_CONTRACT_TYPES_ONLY = {
  allowTypeImports: true,
  message:
    "Côté front et shared, `server/` ne s'importe qu'en `import type`. Code commun : `shared/` (@shared/…).",
  regex: '^@server/(trpc/app\\.router|generated/prisma/(?!enums$).+)$',
}

/**
 * Le reste du serveur, même en `import type` : un type d'API (code d'erreur, résultat d'un calcul…) se
 * range dans `shared/`, ou se déduit du routeur (`RouterOutputs`, `@/lib/trpc`).
 */
const SERVER_INTERNALS = {
  message:
    "Contrat d'API seulement : `@server/trpc/app.router` ou `@server/generated/prisma/*` (en `import type`). Type partagé : `shared/` ; réponse d'une route : `RouterOutputs`.",
  regex: '^(@server/(?!trpc/app\\.router$|generated/prisma/)|.*/server/)',
}

/** Le front (React, i18n…) ne s'importe ni côté serveur ni dans `shared/`. */
const NO_FRONT = {
  group: ['@/*', '**/src/*'],
  message:
    "`src/` est le front : ne pas l'importer ici. Code commun : `shared/` (@shared/…).",
}

/**
 * Suffixe de rôle obligatoire (`xxx.service.ts`, `xxx.router.ts`…) pour savoir ce que contient
 * un fichier sans l'ouvrir (voir CLAUDE.md › Conventions). Option : la liste des suffixes admis.
 */
const fileSuffixRule: Rule.RuleModule = {
  create(context) {
    const suffixes = (context.options[0] as { suffixes: string[] }).suffixes
    const name = path.basename(context.filename)
    const pattern = new RegExp(`^[a-z0-9-]+\\.(${suffixes.join('|')})\\.ts$`)
    return {
      Program(node) {
        if (name === 'index.ts' || pattern.test(name)) return
        context.report({
          data: { name, suffixes: suffixes.map((s) => `.${s}.ts`).join(', ') },
          messageId: 'suffix',
          node,
        })
      },
    }
  },
  meta: {
    messages: {
      suffix: '« {{name}} » doit finir par un suffixe de rôle : {{suffixes}}.',
    },
    schema: [
      {
        additionalProperties: false,
        properties: { suffixes: { items: { type: 'string' }, type: 'array' } },
        type: 'object',
      },
    ],
    type: 'suggestion',
  },
}

const SERVER_LIB_SUFFIXES = [
  'service',
  'util',
  'type',
  'rules',
  'schema',
  'client',
  'config',
]

/**
 * `shared/` est pur (ni base ni réseau) : pas de `.service`. Donnée (constantes, barèmes, régimes) = `.rules`,
 * fonction (helper ou calcul métier) = `.util`.
 */
const SHARED_SUFFIXES = ['type', 'schema', 'rules', 'util']

export default [
  ...reactConfig,
  {
    // Style « du haut vers le bas » : le composant exporté d'abord, ses sous-composants et
    // helpers en dessous. Les déclarations `function` sont hissées, donc sans risque.
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-use-before-define': [
        'error',
        { functions: false },
      ],
    },
  },
  // Frontière front / back / shared (voir CLAUDE.md › Conventions) : seuls les `import type` passent.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { patterns: [SERVER_CONTRACT_TYPES_ONLY, SERVER_INTERNALS] },
      ],
    },
  },
  {
    files: ['shared/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { patterns: [SERVER_CONTRACT_TYPES_ONLY, SERVER_INTERNALS, NO_FRONT] },
      ],
    },
  },
  {
    files: ['server/**/*.ts', 'prisma/**/*.ts', 'scripts/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { patterns: [NO_FRONT] },
      ],
    },
  },
  {
    // Routes Nitro : un fichier = un handler en export par défaut
    files: ['server/api/**/*.ts'],
    rules: { 'import/no-default-export': 'off' },
  },
  {
    // Scripts du seed : logs de progression
    files: ['prisma/**'],
    rules: { 'no-console': 'off' },
  },
  // Suffixes de rôle (voir CLAUDE.md › Conventions)
  {
    plugins: { local: { rules: { 'file-suffix': fileSuffixRule } } },
  },
  {
    files: ['server/lib/**/*.ts'],
    rules: {
      'local/file-suffix': ['error', { suffixes: SERVER_LIB_SUFFIXES }],
    },
  },
  {
    files: ['shared/**/*.ts'],
    rules: { 'local/file-suffix': ['error', { suffixes: SHARED_SUFFIXES }] },
  },
  {
    files: ['server/trpc/*.ts'],
    rules: {
      'local/file-suffix': ['error', { suffixes: ['config', 'router'] }],
    },
  },
  {
    files: ['server/trpc/routers/**/*.ts'],
    rules: { 'local/file-suffix': ['error', { suffixes: ['router'] }] },
  },
  {
    files: ['prisma/seeds/**/*.ts'],
    rules: { 'local/file-suffix': ['error', { suffixes: ['seed', 'config'] }] },
  },
  {
    ignores: [
      'server/generated/**',
      'prisma/migrations/**',
      '.vercel/**',
      '.pnpm-store/**',
      'Claude outputs/**',
      'coverage/**',
    ],
  },
]
