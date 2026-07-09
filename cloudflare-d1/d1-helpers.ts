/**
 * Helpers d'accès à Cloudflare D1 — équivalents des fonctions PostgreSQL.
 *
 * SQLite/D1 n'a PAS de fonctions SQL SECURITY DEFINER ni de RLS.
 * La sécurité (RLS) doit donc être appliquée ICI, dans le code du Worker,
 * après avoir authentifié l'utilisateur (JWT / session).
 *
 * `env.DB` est le binding D1 déclaré dans wrangler.jsonc.
 */

export interface Env {
  DB: D1Database;
}

export type AppRole = "admin" | "student" | "visitor";

/** Équivalent de has_role(_user_id, _role). */
export async function hasRole(
  db: D1Database,
  userId: string,
  role: AppRole,
): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 FROM user_roles WHERE user_id = ? AND role = ? LIMIT 1")
    .bind(userId, role)
    .first();
  return row != null;
}

/**
 * Équivalent de setup_new_user(...) : crée le profil, le rôle "student"
 * et un abonnement "free" en une seule transaction batch.
 */
export async function setupNewUser(
  db: D1Database,
  params: {
    userId: string;
    fullName: string;
    university: string;
    faculty: string;
    studyYear: string;
  },
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `INSERT INTO profiles (id, full_name, university, faculty, study_year)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           full_name = excluded.full_name,
           university = excluded.university,
           faculty = excluded.faculty,
           study_year = excluded.study_year`,
      )
      .bind(
        params.userId,
        params.fullName,
        params.university,
        params.faculty,
        params.studyYear,
      ),
    db
      .prepare(
        `INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, 'student')`,
      )
      .bind(params.userId),
    db
      .prepare(
        `INSERT OR IGNORE INTO subscriptions (user_id, plan, status)
         VALUES (?, 'free', 'active')`,
      )
      .bind(params.userId),
  ]);
}

/**
 * Exemple de "RLS applicative" : un utilisateur ne peut lire QUE ses
 * propres mémoires OU les mémoires publics/approuvés. Les admins voient tout.
 */
export async function listVisibleTheses(
  db: D1Database,
  currentUserId: string,
): Promise<unknown[]> {
  const admin = await hasRole(db, currentUserId, "admin");
  if (admin) {
    const { results } = await db.prepare("SELECT * FROM theses").all();
    return results;
  }
  const { results } = await db
    .prepare(
      `SELECT * FROM theses
       WHERE author_id = ?
          OR (is_public = 1 AND status = 'approved')`,
    )
    .bind(currentUserId)
    .all();
  return results;
}
