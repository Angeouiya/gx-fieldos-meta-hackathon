# GX FieldOS — parcours vérifiable pour le hackathon Meta

> Notes historiques du développement. Pour le périmètre publié et son état
> vérifié au 3 novembre 2026, voir [l'architecture](ARCHITECTURE.md) et
> [le périmètre source](../SOURCE_SCOPE.md).

## Périmètre et provenance

Ce dépôt `GX` contient l'application autonome Web/Desktop. Les fonctions GX Scan,
projets durables et GX Code aujourd'hui visibles sur `agrix.africa` vivent dans
le dépôt AGRIX distinct. Une démonstration ne doit pas présenter un simple lien
vers AGRIX comme une fonction déjà implémentée ici. Les composants repris seront
identifiés et testés dans ce dépôt avant une publication de son code source.

## Parcours cible

Un projet de terrain reçoit des vues datées, une surface mesurée par GPS ou
déclarée avec sa méthode, l'historique culturel et des observations vocales.
GX conserve les preuves séparément des hypothèses, demande les mesures
manquantes, prépare un plan versionné et assigne des contrôles humains.
Une nouvelle observation peut proposer une révision. La démonstration se termine
sur une application full-stack produite par GX Code, inspectable et exportable.

Les données de démonstration seront fictives et reproductibles. Une image seule
ne prouve ni la surface ni un diagnostic. SAM 3.1, la dictée et les autres
modèles Meta seront cités dans la démo seulement après des appels réels vérifiés.

## Tranche 1 — discussion GX sur Meta Model API

Chaîne : interface Web/Desktop → `POST /api/chat` → session et quota AGRIX
→ sélection d'un modèle Meta Standard → API Responses Meta → rapprochement
des jetons et du modèle réellement utilisé → réponse affichée.

`GX_MODEL_PROVIDER=meta` sélectionne `MODEL_API_KEY` côté serveur et
`https://api.meta.ai/v1`. Une clé OpenAI ne remplace jamais une clé Meta
manquante. L'ancien fournisseur reste sélectionnable explicitement pour la
compatibilité. Les labels de forfait AGRIX sont mappés sur Muse Spark 1.3 ou
Muse Wonder 1.0 ; le mode Contributor n'est pas sélectionné. L'identité,
l'autorisation et les quotas restent gérés par AGRIX.

Critères de sortie : tests du routage, de l'authentification, des quotas et du
rapprochement ; typecheck, lint, régressions et build ; réponse réelle Meta dans
GX Web avec une session et sans secret côté client. Un test simulé ne constitue
pas la preuve de l'appel réel.

Contrôle du 30 octobre 2026 : tests, typecheck, lint et build Web passent.
Une clé Meta dédiée au test est placée dans `apps/web/.env.local` (ignoré par
Git) ; `corepack pnpm verify:meta-live` a démarré GX Web localement et obtenu
une réponse HTTP 200 non vide de Meta à travers `/api/chat`. Un échange dans
le Browser Codex a aussi affiché une réponse dans l'interface. Ne jamais
publier cette clé ni le fichier.

L'application Tauri Windows s'est lancée. Une requête réelle depuis son origine
`http://127.0.0.1:1420` a obtenu HTTP 200 via GX puis Meta ; le preflight CORS
a répondu 204 avec cette origine autorisée. Le contrôle Windows n'a pas permis
de cliquer dans la fenêtre Desktop, donc son parcours visuel n'est pas validé.

Le Web GX est maintenant servi sur `https://gx.agrix.africa` et reçoit la
session AGRIX de l'utilisateur. Le 31 octobre, un échange réel dans le Browser
Codex a reçu une réponse de Meta en français. Le contrôle interactif Desktop
sur cette route reste à faire ; il ne doit pas être confondu avec le Web validé.
La clé du projet Vercel AGRIX est marquée sensible et non exportable ; le test
local a donc utilisé une clé distincte.

## Tranche 1b — analyse des dossiers et scan via Meta

La route `/api/work` sélectionne maintenant le même fournisseur que `/api/chat`.
En mode Meta, elle utilise uniquement `MODEL_API_KEY` sur le serveur et envoie
le texte, les mesures calculées et les images dans la requête Responses Muse.
La session et le quota AGRIX sont contrôlés avant l'appel au modèle ; le résultat
et les jetons sont rapprochés via `/api/gx/access`. Une clé OpenAI présente ne
remplace jamais une clé Meta absente. Le scan ne certifie ni diagnostic ni
surface à partir d'une photo.

Contrôle du 31 octobre 2026 : test de route avec image et isolation des clés,
typecheck, lint, régressions et build Web passent. `corepack pnpm
verify:meta-work-live` a envoyé une image **synthétique** à travers GX Web
vers Meta Model API et obtenu HTTP 200 avec un rapport non vide. Le même parcours
a été observé dans GX Web local par le Browser Codex : l'image envoyée et la
réponse Meta apparaissent dans la conversation. Cette image n'est ni une parcelle
ni une preuve agronomique. La dictée reste sur OpenAI et n'est pas revendiquée
comme fonction Meta. Le parcours de production a ensuite créé un projet de
contrôle sur le compte AGRIX, enregistré une image synthétique, reçu une analyse
Meta, ajouté une observation, un document et une tâche, puis exporté le dossier
JSON. Le GPS réel du Browser Codex n'a pas fourni de position malgré
l'autorisation déclarée par l'utilisateur ; ce contrôle n'est pas validé.
Le 31 octobre, le navigateur indiquait encore une permission `prompt` pour
`gx.agrix.africa` et la demande de position a expiré. L'interface distingue
maintenant refus, délai et absence de position et réessaie en précision réduite
quand l'accès n'est pas refusé. Sur le nouveau déploiement, le même navigateur
a ensuite signalé un refus d'accès. Aucun point fictif n'est enregistré.

AGRIX émet `agrix_user_token` pour `.agrix.africa` ; le sous-domaine GX reçoit
ce cookie et son proxy limite les routes terrain, vérifie l'origine des
mutations et relaie les droits du serveur AGRIX. Le Desktop demande toujours
une connexion explicite.

Le Web GX charge désormais les conversations du compte AGRIX et écrit chaque
message avant l'appel au modèle, puis la réponse. Un rechargement du Browser
Codex a retrouvé les deux messages d'une discussion de contrôle. Le proxy
n'accepte que la route d'archive AGRIX, le cookie de session et les mutations
de même origine ; il interdit la suppression globale via son entrée. Les
photos ne sont pas copiées en base64 dans l'archive des conversations. La
navigation expose renommage, épinglage, archivage et une carte d'avertissement
avant suppression. La politique de rétention de 90 jours est appliquée par
l'archive AGRIX.

## État du parcours de soumission

1. Les preuves terrain multi-vues, mesures et plans versionnés sont gérés par
   les routes AGRIX du dépôt distinct `agapp`, exposées dans GX FieldOS.
2. La segmentation SAM 3.1 n'est pas intégrée ; la démonstration ne doit pas la
   présenter comme une fonction active.
3. Le suivi à plusieurs rôles, le guide technique et les exports passent aussi
   par AGRIX. Un clone du seul dépôt GX ne reproduit pas ce parcours connecté.
4. Le scénario reproductible, l'audit des fichiers à publier, la licence et la
   vidéo finale restent à valider avant une soumission ou une ouverture du code.
   La soumission attend la validation du propriétaire.
