import reactConfig from '@vfourny/node-toolkit/eslint/react'

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
  {
    ignores: [
      'server/generated/**',
      'prisma/migrations/**',
      '.vercel/**',
      '.pnpm-store/**',
      'Claude outputs/**',
    ],
  },
]
