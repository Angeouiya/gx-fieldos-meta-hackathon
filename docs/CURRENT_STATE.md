# État actuel de GX.ai Ultimate

Date de l’audit : 10 octobre 2026. Source : `GX_AI_ULTIMATE_Cahier_Fonctionnel_Complet.pdf` fourni par l’utilisateur. Le [catalogue des 459 exigences](REQUIREMENTS.csv) reprend leurs identifiants stables et leur page. Une exigence reste « NON IMPLÉMENTÉ » tant que **toute** sa portée n’est pas réalisée et vérifiée, même lorsqu’un socle partiel existe.

## Signification des statuts

| Statut | Sens |
| --- | --- |
| RÉEL | Parcours fonctionnel vérifié dans sa portée annoncée. |
| CONFIGURATION | L’interface enregistre une intention ou un brouillon ; la ressource ou l’action réelle n’existe pas encore. |
| MOCK | Comportement déterministe de développement ou de test. |
| NON IMPLÉMENTÉ | Exigence complète absente, partielle ou non vérifiée. |

Au dernier inventaire : **1 RÉEL, 4 CONFIGURATION, 1 MOCK, 453 NON IMPLÉMENTÉ**. Ce décompte est volontairement strict ; il ne mesure pas le volume de code déjà écrit.

## État par section

| Section | Situation vérifiée et écart principal |
| --- | --- |
| 01 Identité produit | GX Web et Desktop existent ; identité GX autonome, sessions et synchronisation manquent. |
| 02 Interface | Le chat est la page initiale. Sur mobile, les espaces sont dans le panneau latéral ouvrable et la barre inférieure a été retirée ; historique durable, traduction complète, accessibilité exhaustive et états globaux restent à vérifier. |
| 03 Bureau | Dossiers de ressources locaux ; aucun compte, stockage ou ordinateur cloud effectivement connecté. |
| 04 Entreprise | Fiches d’organisation et d’employé locales ; ateliers de travail ciblés, mais pas d’employé actif, de hiérarchie serveur ni d’isolation multi-organisation. |
| 05 Paramètres | Préférences locales et diagnostics simples ; le code de test local est identifié comme réservé au prototype, tandis que l'accès des utilisateurs repose sur Agrix. Compte, sessions et gouvernance globale manquent. |
| 06 Création d’employé | Formulaire métier et brouillon ; génération structurée, validation atomique, readiness et activation manquent. |
| 07 GX Core | Moteur de tour, états et faux fournisseur en cours ; outils réels, persistance, vérification et orchestration complète manquent. |
| 08 Mémoire de travail | Historique chat en session seulement ; registre scoped et continuité manquent. |
| 09 Vérification | Avertissement d’erreur possible ; registre de preuves et contrôle des affirmations manquent. |
| 10 Planification | Plans générés en texte ; graphe de dépendances et vérificateur manquent. |
| 11 Missions | Étapes locales de dossier ; Agrix peut désormais préparer une tâche GX puis la créer après confirmation. Moteur durable de mission et reprise manquent. |
| 12 Exécution & appareil | Informations système sûres et permissions de base ; Device Agent contrôlé manque. |
| 13 Recherche Web | Non reliée au moteur GX. |
| 14 Documents | Chat et dossiers locaux lisent des extraits bornés de PDF textuels, DOCX, PPTX, XLSX et fichiers texte ; scan d’images séparé. Les réponses du chat, livrables et extraits de dossiers s’exportent en PDF, DOCX, PPTX, XLSX et TXT. Indexation, OCR, corpus durable, fichiers Office anciens et DWG natif manquent. |
| 15 Calculs & outils | Un premier calcul déterministe (rendement massique apparent, facteur de portions, proportion observée des plants ou animaux) est relié aux dossiers locaux et recalculé dans l’API de travail avant l’appel OpenAI. Aucun registre général d’outils, calcul de doses ni vérification terrain en production. |
| 16 Email & calendrier | Coordonnées et règles locales ; aucune boîte GX entrante/sortante. |
| 17 WhatsApp & messageries | Numéro et journal manuel ; aucun connecteur officiel ni webhook. |
| 18 Voix | Dictée OpenAI et lecture navigateur sous configuration ; conversation temps réel et téléphone manquent. |
| 19 Réunions | Aucun connecteur ni participation. |
| 20 Multimodalité | Analyse d’images via route OpenAI sous configuration ; autres modalités et vérification manquent. |
| 21 Applications Office | Aucun contrôle profond des applications. |
| 22 Mémoire longue durée | Aucun stockage mémoire durable. |
| 23 Expertises | Prompts spécialisés agricoles ; registre d’expertise et évaluations manquent. |
| 24 Équipes multi-agent | Aucune orchestration d’employés GX. |
| 25 Autonomie & événements | Aucun Scheduler ni Event Engine. |
| 26 Cloud Computer | Dossier de configuration seulement. |
| 27 Connecteurs | Liens Agrix et API OpenAI ; registre de connecteurs authentifiés manque. |
| 28 Sécurité & gouvernance | Session Agrix vérifiable côté serveur et quotas gratuits dans Agrix ; le code partagé reste réservé au développement. Identité GX persistée, organisations et audit serveur manquent. |
| 29 Routage de modèles | OpenAI est le fournisseur configuré ; le niveau gratuit Agrix utilise Luna et le catalogue prévoit Sol/Astra pour les niveaux futurs. Coûts réels et évaluations de modèles manquent. |
| 30 Apprentissage organisationnel | Aucun mécanisme approuvé de mise à jour. |
| 31 Auto-évaluation | Tests unitaires et UI limités ; benchmarks produit manquent. |
| 32 Infrastructure | Build Web et Desktop ; déploiement, observabilité, stockage et disponibilité de production restent à vérifier. |
| 33 Qualité finale | Aucun contrôle complet de lancement Ultimate. |
| 34 Méthode de développement | Tests et documentation en place ; gates Ultimate non satisfaits. |
| 35 Invariants | Plusieurs garde-fous locaux ; preuve de leur application à tous les canaux manque. |

## Chemin critique vers la cible

1. Identité GX, organisations isolées, persistance serveur, migrations et synchronisation Web/Desktop.
2. GX Core relié à un registre d’outils OpenAI, autorisations structurées, résultats vérifiés et journal d’audit.
3. Projets, employés, plans et missions durables reliés aux données Agrix réelles.
4. Connecteurs officiels email, WhatsApp, stockage et appareils avec réception, envoi, pièces jointes et gouvernance.
5. Mémoire, vérification, autonomie, voix, réunions, cloud computer, tests de sécurité et exploitation de production.

Les secrets et connexions externes sont absents du dépôt. Aucun brouillon local ne doit être présenté comme un employé activé, un message envoyé ou une action réalisée dans Agrix.

Les documents sont traités dans le navigateur : PDF textuel jusqu’à 4 Mo et 12 pages, DOCX/PPTX/XLSX jusqu’à 8 Mo, fichiers TXT/MD/CSV/JSON jusqu’à 512 Ko. GX limite l’extrait à 6 000 caractères par document (3 000 dans le chat), avec 10 documents maximum par dossier. PowerPoint est limité aux 20 premières diapositives ; Excel aux 40 premières lignes de cinq feuilles et les formules ne sont pas recalculées. Les exports de chat et de dossier sont de nouveaux documents composés à partir du texte enregistré, pas des conversions fidèles à la mise en page, aux images, aux objets CAD ou aux formules. Les fichiers DWG demandent un moteur CAO distinct ; le prototype ne les lit ni ne les génère.

Les premiers parcours d’écriture existent dans l’aperçu GX d’Agrix : appels de fonction pour proposer une tâche, une ferme ou une culture, formulaires éditables, confirmation humaine, API de création authentifiée et journal d’audit. Les dossiers GX de Terrain ouvrent les formulaires spécialisés. Sans clé fournisseur et session de test, les appels réels et l’écriture en base ne sont pas encore vérifiés de bout en bout. Le décompte strict des exigences ci-dessus reste donc inchangé.

Le raccord d'accès Agrix repose sur `GX_AGRIX_SESSION_MODE`, `GX_AGRIX_ACCESS_URL` et un secret partagé côté serveur. Il exige un déploiement sous un domaine recevant le cookie `.agrix.africa` et un test de bout en bout avec session réelle. Le paiement, les droits payants et le plafond monétaire interne restent à implémenter avant la vente des offres GX.

Lorsque GX Web reçoit une session Agrix, le chat, l'analyse et la transcription réservent désormais le quota seulement après les contrôles locaux, puis retournent à Agrix l'état de la demande, le modèle et les jetons disponibles dans la réponse OpenAI. Le retour n'inclut pas le texte de la réponse. La transcription vérifie le fichier audio avant de réserver ; elle ne dispose pas d'un décompte de jetons fourni par cette route. Si la confirmation d'usage échoue, le service le journalise, mais une réconciliation serveur reste à construire. Les tests simulent la passerelle ; aucun coût réel n'a été vérifié avec une clé OpenAI et une session Agrix connectée.
