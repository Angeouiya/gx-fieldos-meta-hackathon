# Tests GX.ai

## Règle de passage

Aucune fonctionnalité suivante ne commence avant `GX VERIFIED`. Un échec place
la phase en `BLOCKED` jusqu’à correction et réexécution des contrôles concernés.

## Campagne automatisée

```powershell
corepack pnpm install
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

`corepack` impose la version pnpm 12.6.0 déclarée dans `package.json`.

## Registre cumulatif 3A-1

| ID | Attendu | Niveau |
| --- | --- | --- |
| `GX-UI-001` | GX.ai Desktop démarre et affiche une fenêtre exploitable. | Desktop réel |
| `GX-UI-002` | La sidebar et les quatre espaces sont visibles. | UI automatisé + réel |
| `GX-UI-003` | Bureau ouvre ses ressources et dossiers. | UI automatisé + réel |
| `GX-UI-004` | Entreprise ouvre la création d’employé GX. | UI automatisé + réel |
| `GX-UI-005` | Terrain ouvre ses domaines de production. | UI automatisé + réel |
| `GX-UI-008` | Paramètres affiche les préférences et le code d’accès GX.ai. | UI automatisé + réel |
| `GX-UI-009` | Les cinq onglets mobiles ouvrent Bureau, Entreprise, Projets, Terrain et GX.ai. | UI automatisé + mobile réel |
| `GX-UI-010` | Projets ouvre ses modules de planification. | UI automatisé + mobile réel |
| `GX-SET-001` | Confidentialité et Diagnostics décrivent les données locales et capacités effectives. | UI automatisé |
| `GX-AGRO-001` | Terrain filtre ses domaines et ouvre les liens Agrix prévus. | UI automatisé |
| `GX-AGRO-002` | Un plan s’ouvre en brouillon sans envoi automatique. | UI automatisé |
| `GX-AGRO-003` | Les préférences restent locales sans enregistrer le code d’accès. | UI automatisé |
| `GX-UI-006` | Une conversation de la session devient visuellement active. | UI automatisé + réel |
| `GX-UI-007` | Un message saisi s’affiche et demande un code d’accès si celui-ci manque. | UI automatisé + réel |
| `GX-CHAT-UI-001` | Après saisie du code, le chat envoie l’historique et affiche la réponse GX.ai. | UI automatisé + Web réel |
| `GX-CHAT-UI-002` | Une erreur serveur est affichée sans mention du fournisseur. | UI automatisé |
| `GX-CHAT-API-001` | La route protège la clé, valide l'historique, les origines et la limite de requêtes. | API automatisée |
| `GX-A11Y-001` | Les contrôles sont nommés, focalisables et activables au clavier. | UI automatisé + réel |
| `GX-RESP-001` | Le shell ne déborde pas à 1366×768. | Navigateur réel |
| `GX-RESP-002` | Le shell reste équilibré à 1600×900. | Navigateur réel |
| `GX-RESP-003` | À 390 px, la barre basse et les modules restent lisibles sans débordement. | Navigateur réel |
| `GX-CORE-001` | `get_system_info` retourne plateforme, architecture et version. | Rust + Desktop réel |
| `GX-CORE-UI-001` | Le résultat Rust apparaît dans le Bureau Desktop. | React + Desktop réel |
| `GX-PERM-001` | Une règle sûre retourne `ALLOW`. | Unitaire |
| `GX-PERM-002` | Une action externe retourne `ASK`. | Unitaire |
| `GX-PERM-003` | Une action interdite ou inconnue retourne `DENY`. | Unitaire |
| `GX-CONTRACT-001` | `PermissionDecision` ne contient que trois valeurs. | Unitaire |
| `GX-CONTRACT-002` | Les contrats de la chaîne fondatrice restent compatibles. | Unitaire |

## Vérification Desktop réelle

1. Construire `apps/desktop/src-tauri/target/debug/gx-desktop.exe`.
2. Lancer cet exécutable, sans serveur ni mock Desktop.
3. Vérifier la fenêtre GX, la sidebar, les quatre espaces, la
   conversation sélectionnée, le message local et le statut système dans Bureau.
4. Parcourir les commandes au clavier et confirmer le focus visible.
5. Capturer la fenêtre réelle à 1366×768 ou au format le plus proche exposé par
   Windows.

La capture de référence privée est exclue de cette copie Web.

## Vérification chat réel

Une fois `OPENAI_API_KEY` et `GX_CHAT_ACCESS_TOKEN` configurés sur le serveur,
ouvrir GX.ai Web, entrer le code d’accès dans Paramètres et envoyer un message.
Vérifier une réponse réelle, une réponse de suivi tenant compte du contexte,
l’absence de clé OpenAI dans le navigateur et les erreurs visibles si la
connexion est interrompue. Faire ensuite le même essai dans Desktop avec son
endpoint configuré et son origine autorisée. Sans clé fournie, cette vérification
reste en attente et la fonctionnalité ne peut pas être déclarée `GX VERIFIED`.
