require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { initDB } = require("./config/db");
const { generalLimiter } = require("./middleware/rateLimit");
const authRoutes = require("./routes/auth");
const imagesRoutes = require("./routes/images");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(generalLimiter);

app.use("/auth", authRoutes);
app.use("/images", imagesRoutes);

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ error: err.message || "Error interno del servidor" });
});

async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  });
}

start();
