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
- Enregistrement des signalements dans MongoDB Atlas, PostgreSQL ou SQLite local.
- Interface bilingue français/anglais.

## Base de données

L'application choisit la base dans cet ordre:

1. `MONGODB_URI`: MongoDB Atlas, recommandé pour une DB persistante gratuite de MVP.
2. `DATABASE_URL`: PostgreSQL.
3. SQLite local dans `data/air-observatoire.sqlite`.

MongoDB Atlas Free/M0 est adapté au MVP parce que le cluster gratuit n'expire pas. Définir dans Render:

```bash
MONGODB_URI="mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority"
MONGODB_DB="aircomplain"
```

La collection utilisée est `reports`. Les index sont créés automatiquement au démarrage.

Pour utiliser PostgreSQL à la place, définir `DATABASE_URL`:

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
- `MONGODB_URI`: à renseigner dans Render avec l'URI MongoDB Atlas persistante.
- `MONGODB_DB`: `aircomplain` par défaut.
- `DATABASE_URL`: option PostgreSQL si vous migrez ensuite.

Sans `MONGODB_URI` ni `DATABASE_URL`, Render retombe sur SQLite dans le filesystem de l'instance. Ce mode n'est pas adapté à la production parce que les données peuvent être perdues lors d'un redéploiement ou d'un redémarrage.
