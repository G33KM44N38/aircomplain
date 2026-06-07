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
- Enregistrement des signalements dans une base locale SQLite ou PostgreSQL via `DATABASE_URL`.
- Interface bilingue français/anglais.

## Base de données

Par défaut, l'application utilise SQLite en local et crée automatiquement `data/air-observatoire.sqlite`.

En production, définir `DATABASE_URL` pour utiliser PostgreSQL:

```bash
DATABASE_URL="postgres://USER:PASSWORD@HOST:PORT/DATABASE" npm start
```

Pour les bases hébergées type Neon, Supabase ou Render Postgres, SSL est activé par défaut. Pour un PostgreSQL local Docker, désactiver SSL:

```bash
DATABASE_URL="postgres://airtest:airtest@localhost:55432/aircomplain" DATABASE_SSL=false npm start
```

Le schéma est créé automatiquement au démarrage:

```sql
CREATE TABLE IF NOT EXISTS reports (
  id BIGSERIAL PRIMARY KEY,
  route TEXT NOT NULL,
  incident TEXT NOT NULL,
  flight_date DATE NOT NULL,
  email TEXT,
  phone TEXT,
  message TEXT NOT NULL,
  consent BOOLEAN NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

La page publique des témoignages est disponible sur `http://localhost:4173/temoignages.html`.

La page d'administration est disponible sur `http://localhost:4173/admin.html`.
En production, ajoutez `?token=VALEUR_ADMIN_TOKEN` à l'URL si `ADMIN_TOKEN` est défini.

Voir les signalements enregistrés en SQLite local:

```bash
sqlite3 data/air-observatoire.sqlite "SELECT id, route, incident, email, phone, status, created_at FROM reports;"
```

## Configuration Render

Le blueprint `render.yaml` attend:

- `ADMIN_TOKEN`: généré automatiquement par Render.
- `DATABASE_URL`: à renseigner dans Render avec l'URL PostgreSQL persistante.

Sans `DATABASE_URL`, Render retombe sur SQLite dans le filesystem de l'instance. Ce mode n'est pas adapté à la production parce que les données peuvent être perdues lors d'un redéploiement ou d'un redémarrage.
