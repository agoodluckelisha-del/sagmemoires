# Cloudflare D1 — Base de données des mémoires académiques

Ce dossier contient **tout le nécessaire pour créer une base Cloudflare D1**
équivalente au schéma de la plateforme, dans un projet **Cloudflare Workers autonome**.

---

## ⚠️ À lire avant de commencer

Ta plateforme telle qu'elle tourne **actuellement dans l'aperçu Lovable** utilise
**Lovable Cloud (PostgreSQL)** pour la base, l'authentification, le stockage de
fichiers et la sécurité RLS. **Ces fichiers D1 ne remplacent PAS** ce backend et
ne sont **pas branchés** sur l'app en cours d'exécution : ils constituent un
**export** utilisable si tu déploies une version **100 % autonome sur ton propre
compte Cloudflare**.

Différences techniques importantes (D1 = SQLite) :

| PostgreSQL (actuel) | Cloudflare D1 (SQLite) | Solution appliquée ici |
|---|---|---|
| Types `ENUM` | non supportés | colonnes `TEXT` + `CHECK (... IN (...))` |
| `RLS` (Row Level Security) | **inexistant** | sécurité à coder dans le Worker (`d1-helpers.ts`) |
| Fonctions `SECURITY DEFINER` | inexistantes | helpers TypeScript (`hasRole`, `setupNewUser`) |
| Trigger `update_updated_at_column` | triggers SQLite | inclus dans `0001_init.sql` |
| `gen_random_uuid()` | inexistant | `lower(hex(randomblob(16)))` |
| booléens `true/false` | inexistants | entiers `0/1` |

> D1 n'a pas non plus d'authentification ni de stockage intégrés : il faudrait
> ajouter un système d'auth (JWT) et **Cloudflare R2** pour les fichiers PDF.

---

## 📁 Contenu

```
cloudflare-d1/
├── wrangler.jsonc            # config Worker + binding D1 (à copier à la racine)
├── d1-helpers.ts             # has_role / setup_new_user / RLS applicative
├── migrations/
│   ├── 0001_init.sql         # tables, contraintes, index, triggers
│   └── 0002_seed.sql         # données de démo (optionnel)
└── README.md
```

---

## 🚀 Commandes Wrangler

Prérequis : `npm i -g wrangler` puis `wrangler login`.

### 1. Créer la base D1
```bash
wrangler d1 create memoires_db
```
Copie l'`database_id` renvoyé dans `wrangler.jsonc` (champ `database_id`).

### 2. Appliquer les migrations
```bash
# En local (base de dev locale)
wrangler d1 migrations apply memoires_db --local

# En production (base D1 distante)
wrangler d1 migrations apply memoires_db --remote
```

> Alternative directe (sans le système de migrations) :
> ```bash
> wrangler d1 execute memoires_db --remote --file=cloudflare-d1/migrations/0001_init.sql
> ```

### 3. Vérifier que la connexion fonctionne
```bash
# Lister les tables créées
wrangler d1 execute memoires_db --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table';"

# Tester une insertion + lecture
wrangler d1 execute memoires_db --remote \
  --command "INSERT INTO profiles (id, full_name) VALUES ('test-1','Test'); SELECT * FROM profiles;"
```

### 4. Utiliser la base dans le Worker
```ts
import { hasRole, setupNewUser, type Env } from "./cloudflare-d1/d1-helpers";

export default {
  async fetch(req: Request, env: Env) {
    const isAdmin = await hasRole(env.DB, "user-id", "admin");
    return new Response(JSON.stringify({ isAdmin }));
  },
};
```

Lance en local avec :
```bash
wrangler dev
```
