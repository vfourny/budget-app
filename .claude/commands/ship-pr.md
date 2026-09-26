---
description: Self-review, checks verts, commit, push et ouverture de la PR de la branche courante
argument-hint: "[titre de PR optionnel]"
---

Prépare la branche courante pour review et ouvre la PR. Titre souhaité : $ARGUMENTS

1. Vérifie qu'on n'est PAS sur `main` (sinon stop et demande un nom de branche `feat/…`, `fix/…` ou `chore/…`).
2. `git diff main...HEAD --stat` + `git status` : le diff doit rester petit et ciblé sur UNE fonctionnalité.
   S'il mélange plusieurs sujets, propose un découpage au lieu de continuer.
3. Self-review du diff complet (`git diff main...HEAD`) : code mort, `console.log`, `any`, secrets,
   TODO non justifiés, import runtime de `server/**` depuis `src/**` (seul `import type` est
   autorisé), `useEffect` utilisé pour du fetch ou pour dériver un état. Corrige ce que tu trouves.
4. Lance `pnpm check` puis `pnpm build`. Corrige jusqu'à ce que tout soit vert. Ne passe à la suite
   que si c'est vert.
5. Commit (Conventional Commits, en anglais, ex. `feat(import): parse CSV rows`).
6. `git push -u origin HEAD`.
7. Ouvre la PR vers `main` (ou vers la branche parente si PR empilée) avec `gh pr create`, en suivant
   `.github/pull_request_template.md`. La section « Notes React » est obligatoire dès qu'un pattern
   React est introduit : pourquoi ce choix, et l'équivalent Vue/Nuxt.
   Si `gh` n'est pas dispo, affiche le lien `https://github.com/vfourny/budget-app/compare/main...<branche>?expand=1`
   et le corps de PR prêt à coller.
