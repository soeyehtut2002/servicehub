const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ── Generic storage factory ───────────────────────────────────────────────────
const makeStorage = (prefix) =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${prefix}-${uniqueSuffix}${ext}`);
    },
  });

// ── File filter — images only ─────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extOk  = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowedTypes.test(file.mimetype);
  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpg, jpeg, png, webp, gif) are allowed'), false);
  }
};

// ── Single service image (used by serviceRoutes) ──────────────────────────────
const uploadService = multer({
  storage: makeStorage('service'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ── Multiple service images — up to 7 ────────────────────────────────────────
const uploadServiceImages = multer({
  storage: makeStorage('service'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 7 },
});

// ── Single avatar image ───────────────────────────────────────────────────────
const uploadAvatar = multer({
  storage: makeStorage('avatar'),
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
});

// ── Gallery: up to 10 images ──────────────────────────────────────────────────
const uploadGallery = multer({
  storage: makeStorage('gallery'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ── Review images: up to 4 ───────────────────────────────────────────────────
const uploadReview = multer({
  storage: makeStorage('review'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Legacy default export so existing `require('../middleware/uploadMiddleware')`
// calls still work without changes (serviceRoutes uses upload.single)
const upload = uploadService;

module.exports = upload;                                  // backward-compatible default
module.exports.uploadService       = uploadService;
module.exports.uploadServiceImages = uploadServiceImages;
module.exports.uploadAvatar        = uploadAvatar;
module.exports.uploadGallery       = uploadGallery;
module.exports.uploadReview        = uploadReview;
