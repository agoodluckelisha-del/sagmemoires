-- =====================================================================
-- Seed optionnel — données de démonstration (à supprimer en production)
-- =====================================================================

INSERT OR IGNORE INTO profiles (id, full_name, university, faculty, study_year)
VALUES ('demo-admin-0000-0000-000000000001', 'Admin Démo', 'Université Démo', 'Informatique', 'M2');

INSERT OR IGNORE INTO user_roles (user_id, role)
VALUES ('demo-admin-0000-0000-000000000001', 'admin');

INSERT OR IGNORE INTO subscriptions (user_id, plan, status)
VALUES ('demo-admin-0000-0000-000000000001', 'premium', 'active');
