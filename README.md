# Écran de la maison

Tableau de bord du foyer pour l'iPad de l'entrée (iPad Air 1, Safari 12), utilisable aussi sur téléphone et ordinateur.

## Fichiers
- `index.html` : mise en page et styles (thème sombre, pages Accueil / Cuisine / Maison / Infos / Réglages).
- `app.js` : toute la logique, en ES5 pour rester compatible avec Safari 12.
- `data.json` : agenda du calendrier partagé, menu de la semaine, plat du soir, vigilance. Mis à jour chaque matin.
- `manifest.json`, `icon.png` : installation sur l'écran d'accueil (plein écran).

## Données (Firebase Realtime Database, `foyers/<code>/`)
| Clé | Contenu |
|---|---|
| `courses/<id>` | `{name, done, at, doneAt}` |
| `taches/<id>` | `{name, done, at, doneAt, rep?, qui?, prio?}` (`rep` = jour de la semaine 0–6 pour une tâche récurrente) |
| `mot` | `{texte, at, de?}` |
| `dates/<id>` | `{titre, date}` |
| `config` | `{ville, wifi {ssid, pass, type}, membres?}` |
| `freq`, `favoris`, `menuOverride/<AAAA-MM-JJ>` | articles fréquents, recettes favorites, plats changés à la main |

Les champs `qui`, `prio`, `de` et `membres` sont facultatifs. Les anciennes données restent valables sans migration.

Réglages propres à chaque appareil (localStorage) : `ecran-veille`, `ecran-raccourcis`, copie automatique `ecran-sauvegarde` (+ `ecran-sauvegarde-veille`, `ecran-avant-restauration`).

## Sauvegarde
- Copie automatique locale toutes les 6 h au plus (jamais écrasée par des données vides).
- Réglages → Sauvegarde : télécharger un fichier JSON, restaurer la copie automatique ou un fichier. Avant chaque restauration, les données actuelles sont gardées en copie.
- Suppressions avec « Annuler » pendant 7 secondes.

## Ajouter un module plus tard (domotique, etc.)
Rien n'est simulé. Pour brancher un vrai module, il suffit de déclarer un raccourci de l'accueil :

```js
EcranMaison.addShortcut('lumiere-entree', {
  nom: 'Entrée', ic: 'home', k: 'k-ye',
  sub: function(){ return 'Allumée'; },
  go: function(){ /* appel réel à l'API de l'appareil */ }
});
```
Le raccourci devient alors sélectionnable dans Réglages → Raccourcis de l'accueil.
