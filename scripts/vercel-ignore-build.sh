#!/usr/bin/env bash
# Vercel « Ignored Build Step » (vercel.json › ignoreCommand) : exit 0 = build ignoré, exit 1 = build.
# Production Branch = main, mais la prod ne part qu'au merge de la PR de release (release-please),
# reconnu au titre de son commit de squash : « chore(main): release X.Y.Z (#N) ».
# Les autres pushes sur main sont ignorés ; les previews de PR sont toujours buildées.
# Voir docs/environnements.md › Release.
if [ "$VERCEL_ENV" = "production" ]; then
  case "$VERCEL_GIT_COMMIT_MESSAGE" in
    "chore(main): release"*)
      echo "Release commit: deploying to production"
      exit 1
      ;;
    *)
      echo "Not a release commit: production unchanged"
      exit 0
      ;;
  esac
fi
exit 1
