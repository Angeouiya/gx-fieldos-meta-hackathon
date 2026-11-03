# Mesures GX pour les dossiers agricoles et gastronomiques

Dans le prototype GX Web/Desktop, les dossiers Transformation, Gastronomie, Culture et Élevage acceptent des paires de mesures structurées. L'utilisateur peut laisser les deux champs vides. S'il remplit une seule mesure ou une valeur incohérente, l'interface explique le problème et refuse l'analyse spécialisée jusqu'à correction.

| Dossier | Champs à renseigner | Résultat calculé |
| --- | --- | --- |
| Transformation | Masse du lot entrant et masse du produit sortant, réellement pesées en kg. Exemple : 100 et 15. | Rendement massique apparent : 15 / 100 × 100 = 15 %. Ce n'est pas un bilan complet si d'autres ingrédients ont été ajoutés. |
| Gastronomie | Portions de la recette de base et portions visées. Exemple : 20 et 30. Les ingrédients mesurés sont facultatifs, avec un nom, une quantité et une unité par ligne, par exemple `Mangue 2 kg ; lait 1,5 L`. | Facteur de portions : 30 / 20 = 1,5 ×. Pour les lignes mesurées, GX calcule aussi la quantité visée. Les ingrédients, temps, équipements et contrôles doivent être revus lors d'un essai. |
| Culture | Plants examinés et plants présentant le signe, dans le même échantillon. Exemple : 120 et 5. | Proportion observée : 5 / 120 × 100 ≈ 4,167 % de l'échantillon. |
| Élevage | Animaux examinés et animaux présentant le signe, dans la même tournée. Exemple : 40 et 5. | Proportion observée : 5 / 40 × 100 = 12,5 % des animaux examinés. |

L'aperçu utilise le calcul partagé du paquet `@gx/contracts`. Lorsqu'une tâche GX est lancée, le navigateur envoie les valeurs numériques structurées à `/api/work`. Cette route les valide et **recalcule** le résultat avant l'appel OpenAI. Le résultat, sa formule et sa limite sont présents dans le livrable même si la réponse du modèle les omet. L'appel garde `store: false` et le quota d'analyse Agrix existant ; il n'ajoute aucun aller-retour au modèle.

Les nombres sont déclarés par l'utilisateur, sans preuve de pesée, d'échantillonnage ou de représentativité. La proportion ne diagnostique aucune maladie et n'est pas extrapolée à toute la ferme. Aucun taux de traitement, dose d'intrant, conservation ni certification sanitaire n'est déduit de ces calculs. Les dossiers restent locaux au prototype GX tant que leur stockage serveur et leur synchronisation Agrix ne sont pas réalisés.

La mise à l'échelle accepte au plus douze ingrédients mesurés en g, kg, ml, L ou pièce. Un nom dupliqué ou une quantité invalide arrête l'analyse spécialisée avec une explication ; GX ne calcule pas les quantités d'ingrédients décrits sans mesure. Les chiffres sont arrondis pour l'affichage. Un essai reste indispensable, car le chauffage, l'eau, les pertes et les temps ne suivent pas forcément le facteur de portions.

Contrôles : `corepack pnpm test:contracts`, `corepack pnpm test:work`, `corepack pnpm test:ui`, `corepack pnpm typecheck`, `corepack pnpm lint` et `corepack pnpm build:web`. Un appel OpenAI réel attend la clé serveur que le développeur fournira plus tard.
