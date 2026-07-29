-- users table
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  user_name TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  last_logged_in TIMESTAMPTZ
);

-- seed user (password: Sanjay@2004, stored as bcrypt)
INSERT INTO users (id, name, user_name, password, last_logged_in)
VALUES (
  1,
  'Sanjay',
  'sanjay',
  '$2y$10$krtYF1H2Z7Y/1tb9ScRVJ.MSj8ciPGRD3GF27b2Xw2skErawiY.Uy',
  NULL
);
