const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Image = require('../models/Image');
const Folder = require('../models/Folder');
const protect = require('../middleware/auth');

const router = express.Router();

// multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// all routes protected
router.use(protect);

// GET /api/images?folder=<id>
router.get('/', async (req, res) => {
  try {
    const { folder } = req.query;
    if (!folder) {
      return res.status(400).json({ message: 'Folder ID is required' });
    }

    const images = await Image.find({
      folder,
      owner: req.user._id,
    }).sort({ createdAt: -1 });

    res.json(images);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/images
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    const { name, folder } = req.body;
    if (!name || !folder) {
      return res.status(400).json({ message: 'Name and folder are required' });
    }

    // verify folder belongs to user
    const parentFolder = await Folder.findOne({ _id: folder, owner: req.user._id });
    if (!parentFolder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    const image = await Image.create({
      name: name.trim(),
      folder,
      owner: req.user._id,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

    res.status(201).json(image);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/images/:id
router.delete('/:id', async (req, res) => {
  try {
    const image = await Image.findOne({ _id: req.params.id, owner: req.user._id });
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // delete file from disk
    const filePath = path.join(__dirname, '..', 'uploads', image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Image.findByIdAndDelete(req.params.id);
    res.json({ message: 'Image deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
