# Air Afrique Observatoire

MVP statique d'une plateforme citoyenne d'observation de la qualité des services aériens Afrique-Europe.

## Lancer le site

```bash
npm start
```

Ouvrir ensuite `http://localhost:4173`.

## Ce que couvre le MVP

- Page d'accueil éditoriale avec positionnement non conflictuel.
- Tableau de bord de démonstration filtrable par route.
- Témoignages publics anonymisés.
- Formulaire de signalement avec email ou téléphone obligatoire.
- Enregistrement des signalements dans MongoDB Atlas.
- Interface bilingue français/anglais.

## Base de données

L'application utilise MongoDB Atlas. `MONGODB_URI` est obligatoire au démarrage.

MongoDB Atlas Free/M0 est adapté au MVP parce que le cluster gratuit n'expire pas. Définir en local ou dans Render:

```bash
MONGODB_URI="mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority"
MONGODB_DB="aircomplain"
```

La collection utilisée est `reports`. Les index sont créés automatiquement au démarrage.

## Autocomplétion des aéroports

Le fichier `airport-data.js` est généré depuis le CSV public OurAirports:

`https://davidmegginson.github.io/ourairports-data/airports.csv`

La base embarquée contient les aéroports ouverts avec code IATA. Le champ de départ cherche dans tous les aéroports disponibles, et le champ d'arrivée est filtré sur les aéroports du continent africain.

La page publique des témoignages est disponible sur `http://localhost:4173/temoignages.html`.

La page d'administration est disponible sur `http://localhost:4173/admin.html`.
En production, ajoutez `?token=VALEUR_ADMIN_TOKEN` à l'URL si `ADMIN_TOKEN` est défini.

## Configuration Render

Le blueprint `render.yaml` attend:

- `ADMIN_TOKEN`: généré automatiquement par Render.
- `MONGODB_URI`: à renseigner dans Render avec l'URI MongoDB Atlas persistante.
- `MONGODB_DB`: `aircomplain` par défaut.

Sans `MONGODB_URI`, l'application refuse de démarrer. Cela évite d'enregistrer des témoignages dans une base non persistante.
