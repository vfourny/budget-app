import baseConfig from '@vfourny/node-toolkit/vitest'
import { defineConfig, mergeConfig } from 'vitest/config'

/*
 * Tests unitaires : un projet Vitest par couche, chacun dans `tests/<couche>/` (même arborescence
 * que le code testé : `shared/professional/x.util.ts` → `tests/shared/professional/x.util.test.ts`).
 * Config indépendante de `vite.config.ts` : on ne charge ni Nitro ni le plugin React pour rien.
 * Les alias `@/`, `@server/`, `@shared/` viennent de `tsconfig.json` (une seule source).
 *
 * Pour ajouter une couche, ajouter son projet dans `projects` :
 * - server : `{ extends: true, test: { name: 'server', include: ['tests/server/**\/*.test.ts'] } }`
 *   (environnement node par défaut ; mocker Prisma/Gemini, pas de vraie base).
 * - front : `pnpm add -D -E jsdom @testing-library/react @testing-library/user-event`, puis
 *   `{ extends: true, plugins: [react()], test: { name: 'front', environment: 'jsdom',
 *   include: ['tests/src/**\/*.test.{ts,tsx}'] } }` (`react` = `@vitejs/plugin-react`, déjà installé).
 * Et élargir `coverage.include` à la couche.
 */
export default mergeConfig(
  baseConfig,
  defineConfig({
    resolve: { tsconfigPaths: true },
    test: {
      // Couverture à chaque lancement (`pnpm test` et l'onglet Coverage de `pnpm test:watch`)
      coverage: {
        enabled: true,
        include: ['shared/**/*.ts'],
        reportsDirectory: 'coverage',
      },
      projects: [
        {
          extends: true,
          test: { include: ['tests/shared/**/*.test.ts'], name: 'shared' },
        },
      ],
    },
  }),
)
