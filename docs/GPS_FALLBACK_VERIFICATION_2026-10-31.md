# Contrôle GX-FIELD-GPS-001 — 31 octobre 2026

- **Fonctionnalité :** localisation d'une nouvelle inspection FieldOS.
- **Objectif :** obtenir une position avec précision connue ou un échec explicite, sans créer de point fictif.
- **Fichiers :** `packages/ui/src/field-position.ts`, son test, `packages/ui/src/pages/FieldOS.tsx`.
- **Connexions :** bouton Web → API de géolocalisation du navigateur → position locale → création du scan par le proxy AGRIX. Aucune coordonnée n'est transmise avant la création du scan.
- **Tests :** 4 cas unitaires, 41 tests UI cumulés, typecheck, lint et build Web. En production, le Browser Codex connecté à `gx.agrix.africa` a rendu d'abord « La localisation a dépassé le délai », puis « Localisation refusée » après rechargement ; la permission était encore `prompt` lors du premier essai et aucun point n'a été enregistré.
- **Résultats :** repli de précision et erreurs déterministes testés ; le message d'échec est observable sur la chaîne réelle.
- **Régressions :** projet, scan sans GPS et dossier conservés ; les vérifications antérieures de Meta et de l'archive restent applicables.
- **Problème restant :** le navigateur de test n'a pas fourni de position réelle. Le parcours avec un appareil dont le GPS et la permission du sous-domaine sont effectifs reste à valider ; il ne peut pas être revendiqué dans la démo.
- **Statut :** `GX VERIFIED` pour la gestion des échecs et le repli ; acquisition d'une vraie position non validée.
