# Air Afrique Observatoire

MVP statique d'une plateforme citoyenne d'observation de la qualité des services aériens Afrique-Europe.

## Lancer le site

npm start
```

Ouvrir ensuite `http://localhost:4173`.

## Ce que couvre le MVP

- Page d'accueil éditoriale avec positionnement non conflictuel.
- Tableau de bord de démonstration filtrable par route.
- Témoignages publics anonymisés.
- Formulaire de signalement avec email ou téléphone obligatoire.
- Enregistrement des signalements dans une base SQLite locale.
- Base visuelle et structure prête pour une future API avec base de données.

## Base de données

La base SQLite est créée automatiquement dans `data/air-observatoire.sqlite`.

La page publique des témoignages est disponible sur `http://localhost:4173/temoignages.html`.

La page d'administration est disponible sur `http://localhost:4173/admin.html`.
En production, ajoutez `?token=VALEUR_ADMIN_TOKEN` à l'URL si `ADMIN_TOKEN` est défini.

Voir les signalements enregistrés:

```bash
sqlite3 data/air-observatoire.sqlite "SELECT id, route, incident, email, phone, status, created_at FROM reports;"
```
