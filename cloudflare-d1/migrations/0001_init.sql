-- =====================================================================
-- Cloudflare D1 (SQLite) schema — Plateforme de gestion des mémoires
-- =====================================================================
-- IMPORTANT : D1 est basé sur SQLite. SQLite ne supporte NI les types
-- ENUM, NI le Row Level Security (RLS), NI les fonctions SQL
-- SECURITY DEFINER de PostgreSQL. On les remplace ici par :
--   * ENUM      -> colonnes TEXT + contraintes CHECK
--   * RLS       -> à appliquer dans le code du Worker (voir README)
--   * fonctions -> triggers SQLite (updated_at) + helpers TypeScript
-- =====================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id          TEXT PRIMARY KEY,                       -- = auth user id
  full_name   TEXT,
  university  TEXT,
  faculty     TEXT,
  study_year  TEXT,
  avatar_url  TEXT,
  bio         TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- user_roles  (app_role: admin | student | visitor)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id    TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('admin','student','visitor')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, role),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

-- ---------------------------------------------------------------------
-- theses  (thesis_status: pending | approved | rejected)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS theses (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title            TEXT NOT NULL,
  abstract         TEXT NOT NULL,
  keywords         TEXT NOT NULL DEFAULT '[]',   -- JSON array stocké en texte
  author_id        TEXT NOT NULL,
  author_name      TEXT,
  university       TEXT,
  faculty          TEXT,
  year             INTEGER,
  file_path        TEXT NOT NULL,
  file_size        INTEGER,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','rejected')),
  is_public        INTEGER NOT NULL DEFAULT 0,   -- booléen 0/1
  is_premium       INTEGER NOT NULL DEFAULT 0,   -- booléen 0/1
  downloads        INTEGER NOT NULL DEFAULT 0,
  rejection_reason TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_theses_author ON theses(author_id);
CREATE INDEX IF NOT EXISTS idx_theses_status ON theses(status);

-- ---------------------------------------------------------------------
-- notifications  (type: info | success | warning | error)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'info'
               CHECK (type IN ('info','success','warning','error')),
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  read       INTEGER NOT NULL DEFAULT 0,          -- booléen 0/1
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- ---------------------------------------------------------------------
-- subscriptions  (plan: free|premium ; status: active|expired|canceled)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id                 TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id            TEXT NOT NULL,
  plan               TEXT NOT NULL DEFAULT 'free'
                       CHECK (plan IN ('free','premium')),
  status             TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','expired','canceled')),
  current_period_end TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

-- ---------------------------------------------------------------------
-- payments  (status: pending|paid|failed|expired ; plan: free|premium)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id     TEXT NOT NULL,
  amount      REAL NOT NULL DEFAULT 0,
  currency    TEXT NOT NULL DEFAULT 'EUR',
  description TEXT,
  plan        TEXT CHECK (plan IN ('free','premium')),
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','paid','failed','expired')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

-- ---------------------------------------------------------------------
-- Triggers : équivalent de update_updated_at_column()
-- ---------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_profiles_updated
AFTER UPDATE ON profiles FOR EACH ROW
BEGIN
  UPDATE profiles SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_theses_updated
AFTER UPDATE ON theses FOR EACH ROW
BEGIN
  UPDATE theses SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_subscriptions_updated
AFTER UPDATE ON subscriptions FOR EACH ROW
BEGIN
  UPDATE subscriptions SET updated_at = datetime('now') WHERE id = OLD.id;
END;
