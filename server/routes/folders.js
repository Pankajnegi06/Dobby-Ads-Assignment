const express = require('express');
const Folder = require('../models/Folder');
const Image = require('../models/Image');
const protect = require('../middleware/auth');

const router = express.Router();

// all routes are protected
router.use(protect);

// GET /api/folders?parent=<id|null>
// list folders for the current user in a given parent
router.get('/', async (req, res) => {
  try {
    const parentId = req.query.parent || null;
    const folders = await Folder.find({
      owner: req.user._id,
      parent: parentId,
    }).sort({ createdAt: -1 });

    res.json(folders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/folders
router.post('/', async (req, res) => {
  try {
    const { name, parent } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Folder name is required' });
    }

    // if parent is provided, make sure it belongs to this user
    if (parent) {
      const parentFolder = await Folder.findOne({ _id: parent, owner: req.user._id });
      if (!parentFolder) {
        return res.status(404).json({ message: 'Parent folder not found' });
      }
    }

    const folder = await Folder.create({
      name: name.trim(),
      parent: parent || null,
      owner: req.user._id,
    });

    res.status(201).json(folder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/folders/:id
router.get('/:id', async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, owner: req.user._id });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    res.json(folder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/folders/:id/size
// recursively calculate total size of all images in folder + subfolders
router.get('/:id/size', async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, owner: req.user._id });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    const totalSize = await calcFolderSize(req.params.id, req.user._id);
    res.json({ size: totalSize });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// recursively sum image sizes
async function calcFolderSize(folderId, ownerId) {
  // sum images in this folder
  const images = await Image.find({ folder: folderId, owner: ownerId });
  let total = images.reduce((sum, img) => sum + img.size, 0);

  // get subfolders and recurse
  const subfolders = await Folder.find({ parent: folderId, owner: ownerId });
  for (const sub of subfolders) {
    total += await calcFolderSize(sub._id, ownerId);
  }

  return total;
}

// GET /api/folders/:id/path
// get the breadcrumb path from root to this folder
router.get('/:id/path', async (req, res) => {
  try {
    const path = [];
    let current = await Folder.findOne({ _id: req.params.id, owner: req.user._id });

    if (!current) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    while (current) {
      path.unshift({ _id: current._id, name: current.name });
      if (current.parent) {
        current = await Folder.findOne({ _id: current.parent, owner: req.user._id });
      } else {
        current = null;
      }
    }

    res.json(path);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/folders/:id
// cascade deletes subfolders and their images
router.delete('/:id', async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, owner: req.user._id });
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    await deleteFolderRecursive(req.params.id, req.user._id);
    res.json({ message: 'Folder deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function deleteFolderRecursive(folderId, ownerId) {
  // delete images in this folder
  await Image.deleteMany({ folder: folderId, owner: ownerId });

  // find and delete subfolders
  const subfolders = await Folder.find({ parent: folderId, owner: ownerId });
  for (const sub of subfolders) {
    await deleteFolderRecursive(sub._id, ownerId);
  }

  // delete the folder itself
  await Folder.findByIdAndDelete(folderId);
}

module.exports = router;
