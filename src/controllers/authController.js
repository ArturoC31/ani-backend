const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { pool } = require("../config/db");

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" },
  );
}

async function register(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Usuario y contraseña requeridos" });
  }
  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: "La contraseña debe tener mínimo 8 caracteres" });
  }

  try {
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE username = ?",
      [username],
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "El usuario ya existe" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    await pool.query(
      "INSERT INTO users (id, username, password) VALUES (?, ?, ?)",
      [userId, username, hashedPassword],
    );

    res.status(201).json({ message: "Usuario creado correctamente" });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Usuario y contraseña requeridos" });
  }

  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    if (rows.length === 0) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      "INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)",
      [tokenId, user.id, refreshToken, expiresAt],
    );

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username },
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

async function refresh(req, res) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token requerido" });
  }

  try {
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res
        .status(401)
        .json({ error: "Refresh token inválido o expirado" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM refresh_tokens WHERE token = ? AND user_id = ? AND expires_at > NOW()",
      [refreshToken, decoded.id],
    );

    if (rows.length === 0) {
      return res
        .status(401)
        .json({ error: "Refresh token revocado o expirado" });
    }

    await pool.query("DELETE FROM refresh_tokens WHERE token = ?", [
      refreshToken,
    ]);

    const [userRows] = await pool.query("SELECT * FROM users WHERE id = ?", [
      decoded.id,
    ]);
    const user = userRows[0];

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      "INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)",
      [tokenId, user.id, newRefreshToken, expiresAt],
    );

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error("refresh error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

async function logout(req, res) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await pool.query("DELETE FROM refresh_tokens WHERE token = ?", [
      refreshToken,
    ]);
  }
  res.json({ message: "Sesión cerrada correctamente" });
}

module.exports = { register, login, refresh, logout };
