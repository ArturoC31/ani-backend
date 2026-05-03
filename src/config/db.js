const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "Z",
});

async function initDB() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          VARCHAR(36)  PRIMARY KEY,
        username    VARCHAR(50)  NOT NULL UNIQUE,
        password    VARCHAR(255) NOT NULL,
        created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id          VARCHAR(36)  PRIMARY KEY,
        user_id     VARCHAR(36)  NOT NULL,
        token       TEXT         NOT NULL,
        expires_at  DATETIME     NOT NULL,
        created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS images (
        id              VARCHAR(36)  PRIMARY KEY,
        user_id         VARCHAR(36)  NOT NULL,
        cloudinary_id   VARCHAR(255) NOT NULL,
        url             TEXT         NOT NULL,
        thumb_url       TEXT         NOT NULL,
        name            VARCHAR(255),
        created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log("✅ Tablas verificadas/creadas correctamente");
  } finally {
    conn.release();
  }
}

module.exports = { pool, initDB };
