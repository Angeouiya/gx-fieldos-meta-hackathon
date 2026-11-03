# GX.ai — Produit

## Promesse

GX.ai ouvre un espace de travail avec Bureau pour les ressources, Entreprise
pour les organisations et employés GX, Projets pour les plans durables, et
Terrain pour les opérations agricoles. La conversation aide à préparer le
travail à relire avant action.

## Périmètre livré

- shell identique dans les applications Web et Desktop ;
- accueil Bureau avec navigation vers Entreprise, Projets, Terrain et la conversation ;
- sidebar du design initial sur ordinateur, navigation basse compacte à cinq
  entrées sur mobile, conversations créées pendant la session et profil discret ;
- saisie et affichage d’un message utilisateur et d’une réponse GX.ai ;
- route serveur qui utilise OpenAI pour les réponses, sous code d’accès privé ;
- sous-onglets métier et modules compacts avec dossiers locaux configurables,
  étapes, collaborateurs, import texte et image, export JSON, actions spécialisées
  et livrables GX.ai enregistrés dans le dossier ;
- fiches de gastronomie, transformation, produits, cultures et employés avec
  données et tâches adaptées ; journal manuel des messages reçus et brouillons
  de réponse, sans envoi externe ;
- liens vers les formulaires Agrix disponibles pour fermes, cultures et tâches ;
- pièces jointes texte, dictée transcrite et discussion vocale avec réponse lue
  par le navigateur, sous réserve des accès et services configurés ;
- mention d’erreur possible, pages de confidentialité et conditions de travail ;
- préférences de travail enregistrées localement, export et effacement des
  brouillons, diagnostics honnêtes et code d’accès gardé en mémoire ;
- contrats fondamentaux et moteur de permissions mock minimal ;
- commande Tauri sûre pour lire plateforme, architecture et version de GX.

## Hors périmètre volontaire

Aucune synchronisation des dossiers avec Agrix, automatisation WhatsApp ou email,
activation d’un employé GX ou commande Windows n’est active. Les données des
fermes, cultures, tâches, ventes et messages s’ouvrent dans Agrix avec sa propre
session. La génération, l’analyse de dossiers et la transcription nécessitent
une clé OpenAI et un code
d’accès configurés sur le serveur. L’import PDF, le temps réel vocal, la
synchronisation cloud et la connexion WhatsApp restent à développer.

## Critère de validation

La Phase 3A-1 atteint `GX VERIFIED` uniquement après les contrôles décrits dans
[`TESTING.md`](TESTING.md), le build des deux applications et l’observation de la
fenêtre Desktop réelle.
