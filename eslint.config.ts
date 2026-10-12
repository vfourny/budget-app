import reactConfig from '@vfourny/node-toolkit/eslint/react'

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
