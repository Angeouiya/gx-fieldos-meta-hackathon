# GX FieldOS — dossier multi-scan

FONCTIONNALITÉ : synthèse de plusieurs scans d'une même parcelle.

OBJECTIF : l'utilisateur répète le cycle « enregistrer un scan, ajouter jusqu'à quatre vues, analyser », puis lit les comparaisons entre zones et un parcours de préparation à vente dans un dossier unique.

FICHIERS MODIFIÉS : `packages/ui/src/pages/FieldOS.tsx`, `packages/ui/src/pages/FieldOSPlan.tsx`, `packages/ui/src/styles.css`, test d'interface et registre de régression. La synthèse et ses contrôles serveur résident dans le projet AGRIX associé.

CONNEXIONS ARCHITECTURALES : UI FieldOS → proxy `/api/field` avec session AGRIX → routes de projets, scans et plans AGRIX → analyses enregistrées et plan versionné. Aucun secret fournisseur ni photo n'est copié dans le navigateur hors du flux d'envoi autorisé.

TESTS EFFECTUÉS : `corepack pnpm --filter @gx/ui test`, `corepack pnpm --filter @gx/ui typecheck`, `corepack pnpm lint`, `corepack pnpm build:web`, `corepack pnpm test`.

RÉSULTATS : 43 tests d'interface passent, dont `GX-FIELD-MULTISCAN-001/002`. Les contrôles de types, lint, build web et régressions cumulatives passent. Sur le compte AGRIX connecté, un second scan a été enregistré, sa vue illustrative a été transférée et analysée par Meta, puis la synthèse de deux scans a été créée et relue sur GX et AGRIX. Le modèle a refusé toute conclusion agricole à partir des images abstraites et a produit les huit étapes en brouillon. Ce plan d'essai n'a pas été approuvé.

RÉGRESSIONS : le proxy terrain, les droits, le chat, les scans Meta et les tests Desktop restent couverts par `corepack pnpm test`.

PROBLÈMES RESTANTS : l'essai réel portait sur des images illustratives, pas sur une parcelle agricole réelle. Le navigateur Codex a refusé la localisation pour AGRIX ; aucun point GPS réel n'a été inventé ni enregistré. Les propositions de culture exigent des mesures et sources locales ; l'interface les marque comme hypothèses.

STATUT : GX VERIFIED pour le parcours multi-scan avec images d'essai ; GPS terrain et aptitude culturale réelle non vérifiés.
