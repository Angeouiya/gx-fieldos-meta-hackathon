# Portes de développement GX

Ce document est la règle de développement obligatoire de GX. Il s’applique à
toute nouvelle fonctionnalité, correction ou évolution architecturale.

## Principe non négociable

Une seule petite fonctionnalité intégrée est ouverte à la fois. La suivante ne
commence que lorsque la précédente a atteint `GX VERIFIED`.

Une fonctionnalité n’est pas terminée parce qu’elle compile ou parce qu’un mock
réussit. Son résultat doit être observé sur la chaîne réelle concernée.

## Cycle d’une fonctionnalité

1. Définir un objectif unique, concret et observable.
2. Cartographier la chaîne complète avant de coder : UI, contrats, permissions,
   backend, Desktop/Tauri, Rust, stockage éventuel, journaux, tests et sécurité.
3. Implémenter uniquement cette fonctionnalité.
4. Ajouter les tests unitaires, d’intégration et de bout en bout pertinents.
5. Exécuter les régressions cumulatives.
6. Vérifier les types, le lint, les builds, l’exécution réelle, les journaux,
   l’interface, les permissions et le comportement Desktop applicables.
7. Corriger entièrement tout échec, puis reprendre les validations concernées.
8. Produire le compte rendu de contrôle et seulement alors ouvrir la suite.

## Portes de validation

| Statut | Condition de sortie |
| --- | --- |
| `DEVELOPMENT` | Le périmètre et la chaîne architecturale sont définis. |
| `LOCAL TEST PASSED` | Les tests unitaires et contrôles statiques pertinents passent. |
| `INTEGRATION TEST PASSED` | Les frontières réellement touchées communiquent correctement. |
| `END-TO-END PASSED` | Le résultat observable fonctionne sur la chaîne réelle. |
| `REGRESSION TEST PASSED` | Tous les tests GX antérieurs passent encore. |
| `GX VERIFIED` | L’implémentation, l’UI, les permissions, les logs et les builds applicables sont cohérents. |
| `MERGED / ACCEPTED` | Le changement vérifié est intégré et accepté. |

Au premier échec, le statut devient `BLOCKED`. Aucune fonctionnalité majeure
suivante ne doit démarrer avant la correction et le retour à `GX VERIFIED`.

## Chaînes architecturales

L’UI ne contacte jamais directement Windows, le navigateur, les fichiers ou
une application locale. Une action système doit suivre les frontières officielles
de GX :

```text
Chat/UI → contrat → moteur de permissions → Desktop/Tauri
        → agent de périphérique/Rust → système réel
        → ActionResult → journal d’audit → UI
```

Seules les couches réellement nécessaires à une fonctionnalité sont ajoutées,
mais aucune couche requise ne peut être contournée. Les chemins de production
dupliqués, temporaires ou exclusivement simulés sont interdits.

## Stratégie de test

- **Unitaire** : logique pure, contrats, politiques et sérialisation.
- **Intégration** : communication entre chaque frontière touchée.
- **Bout en bout** : scénario utilisateur exécuté sur les composants réels.
- **Régression** : toutes les entrées actives du registre ci-dessous.
- **Observation** : résultat visible, erreurs et traces concordent avec l’action.

Les mocks peuvent accélérer un test ciblé, mais ne remplacent pas l’essai réel
d’une capacité Windows, navigateur, fichier ou application.

## Registre cumulatif des régressions

Un test ajouté reste actif. Il n’est retiré que si le comportement attendu a été
modifié volontairement et que cette décision est documentée ici.

| ID | Comportement protégé | Couche | Commande |
| --- | --- | --- | --- |
| `GX-CONTRACT-001` | Les décisions exposent uniquement `ALLOW`, `ASK`, `DENY`. | Contrats | `corepack pnpm test:contracts` |
| `GX-CONTRACT-002` | `Action`, `ActionResult` et `Device` décrivent la chaîne fondatrice. | Contrats | `corepack pnpm test:contracts` |
| `GX-PERM-001` | Une action sûre connue retourne `ALLOW`. | Permissions | `corepack pnpm test:permissions` |
| `GX-PERM-002` | Une communication externe retourne `ASK`. | Permissions | `corepack pnpm test:permissions` |
| `GX-PERM-003` | Une action interdite ou inconnue retourne `DENY`. | Permissions | `corepack pnpm test:permissions` |
| `GX-CORE-001` | `get_system_info` retourne uniquement plateforme, architecture et version. | Rust/Tauri | `corepack pnpm test:rust` |
| `GX-UI-002` à `GX-UI-007` | Shell, navigation, conversations et saisie restent fonctionnels. | React | `corepack pnpm test:ui` |
| `GX-CHAT-UI-001/002` | Réponse GX.ai et erreur visible après soumission. | React | `corepack pnpm test:ui` |
| `GX-CHAT-API-001` | Authentification, validation, origine, limite et réponse de la route chat. | Next.js | `corepack pnpm test:chat` |
| `GX-A11Y-001` | Les contrôles principaux sont nommés et activables au clavier. | React | `corepack pnpm test:ui` |
| `GX-AGRO-001/003` | Terrain ouvre ses domaines et les préférences restent locales sans secret. | React | `corepack pnpm test:ui` |
| `GX-AGRO-002` | Un plan est préparé en brouillon avant tout envoi. | React | `corepack pnpm test:ui` |
| `GX-WORK-001` | Une analyse de produit revient dans son dossier local. | React | `corepack pnpm test:ui` |
| `GX-COMMS-001` | Un employé conserve les coordonnées et un journal manuel sans afficher de connexion active. | React | `corepack pnpm test:ui` |
| `GX-WORK-API` | Authentification, validation des images et origine de la route d’analyse. | Next.js | `corepack pnpm test:work` |
| `GX-META-CHAT-001` | Le chat sélectionne seulement un modèle Meta Standard autorisé, sans utiliser la clé OpenAI, et rapproche le modèle réellement appelé. | Next.js | `corepack pnpm test:provider && corepack pnpm test:chat` |
| `GX-META-WORK-001` | Le scan et le dossier utilisent le fournisseur sélectionné ; une clé OpenAI ne remplace pas une clé Meta absente. | Next.js | `corepack pnpm test:work && corepack pnpm verify:meta-work-live` |
| `GX-FIELD-001` | Le proxy terrain refuse les routes hors liste, les requêtes sans session et les mutations hors origine ; les projets AGRIX restent isolés par leurs droits serveur. | Next.js | `corepack pnpm test:field` |
| `GX-ARCHIVE-001` | Les discussions GX Web chargent et enregistrent l'archive du compte AGRIX ; aucune photo en base64 n'est copiée dans cette archive. | React/Next.js | `corepack pnpm test:ui && corepack pnpm test:field` |
| `GX-ARCHIVE-002` | Une discussion chargée depuis AGRIX peut être renommée, épinglée, archivée et supprimée après une carte d'avertissement ; la liste reste défilable. | React/Next.js | `corepack pnpm test:ui && corepack pnpm test:field` |
| `GX-FIELD-GPS-001` | La localisation conserve sa précision, réessaie en mode approximatif si nécessaire, distingue refus et délai et n'invente jamais un point. | React | `corepack pnpm test:ui` |
| `GX-FIELD-MULTISCAN-001` | La synthèse du dossier indique les scans inclus, compare les zones et expose le parcours de préparation à vente sans présenter les données manquantes comme vérifiées. | React | `corepack pnpm test:ui` |
| `GX-FIELD-MULTISCAN-002` | Un nouveau scan met immédiatement à jour le dossier et le compteur de la liste des projets. | React | `corepack pnpm test:ui` |

Le précédent test `GX-002`, portant sur un employé GX et sa carte d’autorité,
a été retiré volontairement lors du recadrage 3A-1 : cette capacité appartient à
une phase Entreprise ultérieure. Son remplacement fondamental est
`GX-CONTRACT-002`. Les anciens contrôles `GX-001`, `GX-003`, `GX-004`, `GX-006`
et `GX-007` restent couverts par les identifiants canoniques ci-dessus. Le test
de wildcard `GX-005` est différé avec les règles avancées de permissions.

Chaque nouvelle fonctionnalité ajoute ses identifiants `GX-xxx` à cette table et
conserve tous les identifiants précédents dans la campagne de régression.

## Compte rendu obligatoire

Après chaque fonctionnalité, publier ce contrôle :

```text
FONCTIONNALITÉ :
OBJECTIF :
FICHIERS MODIFIÉS :
CONNEXIONS ARCHITECTURALES :
TESTS EFFECTUÉS :
RÉSULTATS :
RÉGRESSIONS :
PROBLÈMES RESTANTS :
STATUT :
```

La priorité reste, dans cet ordre : cohérence, fiabilité, intégration réelle,
testabilité, stabilité et traçabilité.
