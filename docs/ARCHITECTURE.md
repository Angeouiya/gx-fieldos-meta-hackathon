# Architecture — GX.ai

## Monorepo

Le workspace pnpm 12.6.0 sépare les responsabilités fondatrices :

1. `apps/web` : conteneur Next.js App Router.
2. `apps/desktop` : conteneur Vite/Tauri et frontière native Rust.
3. `packages/ui` : shell React et design system partagés.
4. `packages/contracts` : `PermissionDecision`, `Action`, `ActionResult`, `Device`.
5. `packages/permissions` : décision mock `ALLOW`, `ASK` ou `DENY`.
6. `packages/config` : configuration TypeScript commune.

## Interconnexions réelles

```text
Web ────────────────→ @gx/ui

Desktop React ──────→ @gx/ui
       │
       └─ readSystemInfo()
          └─ invoke("get_system_info")
             └─ Tauri/Rust
                └─ { platform, architecture, appVersion }
                   └─ statut local affiché dans Bureau

@gx/permissions ───→ @gx/contracts
@gx/ui ────────────→ Device (type partagé)

Web/Desktop UI ────→ POST /api/chat (code d’accès GX.ai)
                      └─ serveur Next.js ──→ API OpenAI Responses
                         (OPENAI_API_KEY uniquement côté serveur)

Web/Desktop UI ────→ POST /api/transcribe (même code d’accès)
                      └─ serveur Next.js ──→ API OpenAI Audio

Workbench métier ──→ POST /api/work (même code d’accès)
                     └─ serveur Next.js ──→ API OpenAI Responses
                        (dossier + jusqu’à 3 images, livrable local)

Dossiers Bureau/Entreprise/Projets/Terrain ──→ localStorage de cet appareil
Cartes Terrain/Projets ──→ liens vers Agrix.africa
                           └─ session et API Agrix existantes
```

La commande Rust n’expose ni hostname, ni utilisateur, ni fichier, ni identifiant
matériel. Une erreur d’invocation retourne `null` côté React et n’accorde aucun
accès supplémentaire.

## Chat GX.ai

L’interface transmet uniquement les messages `user` et `assistant` et affiche
la réponse, l’attente ou une erreur. La route valide la taille de l’historique,
exige le code d’accès serveur et appelle le modèle défini par
`GX_OPENAI_MODEL` (`gpt-6-astra` par défaut). Le Desktop utilise le même service
HTTP, avec une origine explicitement autorisée par le serveur. Le code d’accès
partagé est destiné à un usage privé. Le serveur limite à 10 requêtes par minute
et par code sur chaque instance ; une diffusion publique demanderait une
authentification par utilisateur et des quotas globaux.

## Limites de sécurité

- conversations en mémoire de session ; dossiers métier, images réduites et
  livrables dans localStorage,
  sans synchronisation serveur ;
- préférences de travail locales versionnées, sans code d’accès ni clé ;
- aucune session Agrix partagée avec GX : les liens ouvrent Agrix séparément ;
- clé OpenAI conservée sur le serveur, jamais dans le navigateur ou le binaire Desktop ;
- historique transmis au fournisseur pour la génération, sans stockage des réponses demandé (`store: false`) ;
- aucune boîte email ni webhook WhatsApp relié aux employés GX ; les coordonnées
  et règles de communication sont des configurations locales seulement ;
- aucune commande permettant de contrôler Windows ;
- aucune UI ne contourne Tauri pour atteindre le système ;
- toute action inconnue est refusée par le moteur de permissions.

Les services Memory, Communication et Scheduler ne sont pas créés. Le chat ne
déclenche aucune action système et ne contourne pas le moteur de permissions.
