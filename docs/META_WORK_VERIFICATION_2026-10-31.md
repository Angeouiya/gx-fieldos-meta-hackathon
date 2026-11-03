# Contrôle GX Meta — analyse et scan

FONCTIONNALITÉ : `GX-META-WORK-001`, analyse de dossier et image par le fournisseur sélectionné.

OBJECTIF : le mode Meta de GX Web produit un rapport à partir d'une image en passant par Muse Spark, sans utiliser la clé OpenAI.

FICHIERS MODIFIÉS : route `/api/work`, tests de route, script et image de test synthétique, documentation.

CONNEXIONS ARCHITECTURALES : interface GX Web → `/api/work` → vérification locale et accès/quota AGRIX → Meta Responses → rapport visible. GX Web est déployé sur `gx.agrix.africa` et utilise la session AGRIX ; la vérification d'une session réelle est décrite dans `FIELDOS_HACKATHON.md`.

TESTS EFFECTUÉS : `corepack pnpm test:work`, `corepack pnpm verify:meta-work-live`, `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm test`, `corepack pnpm build:web`. Le Browser Codex a chargé l'image de test dans GX Web local ; la route a répondu HTTP 200 et le rapport est apparu dans la conversation.

RÉSULTATS : la clé du fournisseur reste côté serveur ; le test Meta refuse de revenir à OpenAI lorsque `MODEL_API_KEY` manque. L'image synthétique n'a aucune valeur diagnostique. Les tests confirment le contrôle d'origine, le quota AGRIX avant l'appel fournisseur, la séparation des clés et le calcul serveur des mesures.

RÉGRESSIONS : campagne complète `corepack pnpm test` réussie, y compris UI et Rust.

PROBLÈMES RESTANTS : le mode de démonstration local n'est pas une preuve de l'analyse Meta en production. Le projet FieldOS multi-vues est géré par les routes AGRIX du dépôt `agapp`, distinct du scan simple de `/api/work`. Le GPS réel du Browser Codex n'a pas été confirmé. La transcription utilise encore OpenAI.

STATUT : `END-TO-END PASSED` en local pour cette route ; le contrôle multi-vues et les exports sont documentés séparément. Ce compte rendu historique ne vaut pas validation de la soumission au hackathon.
