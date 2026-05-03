const { v4: uuidv4 } = require("uuid");
const cloudinary = require("../config/cloudinary");
const { pool } = require("../config/db");

async function uploadImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "No se envió ninguna imagen" });
  }

  try {
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `ani-gallery/${req.user.id}`,
          transformation: [
            { quality: "auto", fetch_format: "auto" },
            { width: 2048, height: 2048, crop: "limit" },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      stream.end(req.file.buffer);
    });

    const thumbUrl = cloudinary.url(uploadResult.public_id, {
      width: 300,
      height: 300,
      crop: "fill",
      quality: "auto",
      fetch_format: "auto",
      secure: true,
    });

    const imageId = uuidv4();
    await pool.query(
      `INSERT INTO images (id, user_id, cloudinary_id, url, thumb_url, name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        imageId,
        req.user.id,
        uploadResult.public_id,
        uploadResult.secure_url,
        thumbUrl,
        req.file.originalname,
      ],
    );

    res.status(201).json({
      id: imageId,
      url: uploadResult.secure_url,
      thumb_url: thumbUrl,
      name: req.file.originalname,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("upload error:", err);
    res.status(500).json({ error: "Error al subir la imagen" });
  }
}

async function getImages(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, cloudinary_id, url, thumb_url, name, created_at
       FROM images
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id],
    );

    res.json({ images: rows });
  } catch (err) {
    console.error("getImages error:", err);
    res.status(500).json({ error: "Error al obtener imágenes" });
  }
}

async function deleteImage(req, res) {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT * FROM images WHERE id = ? AND user_id = ?",
      [id, req.user.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Imagen no encontrada" });
    }

    const image = rows[0];
    await cloudinary.uploader.destroy(image.cloudinary_id);
    await pool.query("DELETE FROM images WHERE id = ?", [id]);

    res.json({ message: "Imagen eliminada correctamente" });
  } catch (err) {
    console.error("deleteImage error:", err);
    res.status(500).json({ error: "Error al eliminar la imagen" });
  }
}

module.exports = { uploadImage, getImages, deleteImage };
