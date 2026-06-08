# TODO Production

## Priorité 1 - Avant exposition publique large

- [ ] Remplacer l'accès admin par un vrai login.
  - [ ] Page de connexion admin.
  - [ ] Mot de passe hashé côté serveur.
  - [ ] Session cookie `HttpOnly`, `Secure`, `SameSite=Lax`.
  - [ ] Déconnexion admin.
  - [ ] Expiration de session.
  - [ ] Retirer le token admin visible dans l'URL.

- [x] Ajouter les pages légales minimales.
  - [x] Politique de confidentialité.
  - [x] Mentions légales.
  - [x] Conditions de publication des témoignages.
  - [ ] Contact / demande de retrait.

- [ ] Durcir la modération admin.
  - [ ] Notes internes non publiques.
  - [ ] Motif de rejet ou de masquage.
  - [ ] Historique des changements de statut.
  - [ ] Afficher clairement `À vérifier`, `Publié`, `Masqué`, `Rejeté`.

- [ ] Vérifier la configuration MongoDB Atlas.
  - [ ] Backups activés.
  - [ ] Utilisateur DB avec permissions minimales nécessaires.
  - [ ] Accès réseau limité aux IP nécessaires quand possible.
  - [ ] Index pertinents pour recherche, statut, trajet, date.

## Priorité 2 - Observabilité et stabilité

- [ ] Brancher Sentry.
  - [ ] DSN côté serveur.
  - [ ] Capture des erreurs API.
  - [ ] Contexte utile: route, méthode, statut, sans données personnelles sensibles.
  - [ ] Alertes erreurs critiques.
  - [ ] Vérifier que les emails, téléphones et messages complets ne sont pas envoyés à Sentry.

- [ ] Ajouter un rate limiting simple.
  - [ ] Limite sur `POST /api/reports`.
  - [ ] Limite sur endpoints admin.
  - [ ] Réponse claire en cas d'abus.

- [ ] Ajouter des tests de non-régression supplémentaires.
  - [ ] Création témoignage invalide.
  - [ ] Accès admin non autorisé.
  - [ ] Publication/masquage sans token refusé.
  - [ ] Liste publique limitée aux témoignages publiés.

## Priorité 3 - Fin de MVP

- [ ] Rotater tous les secrets exposés pendant le développement.
  - [ ] Render API key.
  - [ ] Mot de passe utilisateur MongoDB `aircomplain`.
  - [ ] `MONGODB_URI` sur Render.
  - [ ] `ADMIN_PASSWORD_HASH` sur Render.
  - [ ] `ADMIN_SESSION_SECRET` sur Render.

- [ ] Notifications email admin.
  - [ ] Email envoyé quand un nouveau témoignage arrive.
  - [ ] Ne pas inclure de données personnelles excessives dans l'email.
  - [ ] Lien vers la page admin du dossier.

- [ ] Upload de preuves.
  - [ ] Choisir le stockage: S3, Cloudinary ou équivalent.
  - [ ] Limiter types et tailles de fichiers.
  - [ ] Scanner ou filtrer les fichiers dangereux.
  - [ ] Rendre les preuves privées par défaut.

- [ ] Améliorer la recherche.
  - [ ] Recherche plus tolérante aux accents.
  - [ ] Pagination admin et publique.
  - [ ] Tri par date de réception et date de vol.

## Plus tard

- [ ] Nom de domaine.
  - [ ] Acheter/configurer le domaine.
  - [ ] Configurer DNS Render.
  - [ ] Vérifier SSL.
  - [ ] Mettre à jour liens publics, mentions légales et emails.

## Hors scope pour l'instant

- [ ] Honeypot anti-spam.
- [ ] CAPTCHA.
