import path from 'node:path'

import reactConfig from '@vfourny/node-toolkit/eslint/react'
import type { Rule } from 'eslint'

/** `server/` (Prisma, secrets…) ne part jamais dans le bundle du front : types uniquement. */
const SERVER_TYPES_ONLY = {
  allowTypeImports: true,
  group: ['@server/*', '**/server/*'],
  message:
    "Côté front et shared, `server/` ne s'importe qu'en `import type`. Code commun : `shared/` (@shared/…).",
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
 * `shared/` est pur (ni base ni réseau) : pas de `.service`. `.calc` = calcul métier pur (dashboard
 * d'un mois…), `.regime` = un `ProfessionalRegime`.
 */
const SHARED_SUFFIXES = ['rules', 'util', 'schema', 'type', 'calc', 'regime']

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
        { patterns: [SERVER_TYPES_ONLY] },
      ],
    },
  },
  {
    files: ['shared/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { patterns: [SERVER_TYPES_ONLY, NO_FRONT] },
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
