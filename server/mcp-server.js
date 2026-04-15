// ── CRITICAL: redirect console.log to stderr ──────────────────────────
// MCP uses stdout exclusively for JSON-RPC messages. Any stray console.log
// (e.g. "MongoDB connected: ...") would corrupt the stream and crash the
// connection. This must be the VERY FIRST thing in the file.
const originalLog = console.log;
console.log = (...args) => process.stderr.write(args.join(' ') + '\n');

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const User = require('./models/User');
const Folder = require('./models/Folder');
const Image = require('./models/Image');
const jwt = require('jsonwebtoken');
const fs = require('fs');

// ── session state ──────────────────────────────────────────────────────
let currentUser = null; // populated after login tool is called

// helper: require authentication
function requireAuth() {
  if (!currentUser) {
    throw new Error('Not authenticated. Please call the "login" tool first.');
  }
  return currentUser;
}

// helper: format bytes into human-readable string
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

// helper: recursive folder size
async function calcFolderSize(folderId, ownerId) {
  const images = await Image.find({ folder: folderId, owner: ownerId });
  let total = images.reduce((sum, img) => sum + img.size, 0);
  const subfolders = await Folder.find({ parent: folderId, owner: ownerId });
  for (const sub of subfolders) {
    total += await calcFolderSize(sub._id, ownerId);
  }
  return total;
}

// helper: recursive folder delete
async function deleteFolderRecursive(folderId, ownerId) {
  // delete images on disk
  const images = await Image.find({ folder: folderId, owner: ownerId });
  for (const img of images) {
    const filePath = path.join(__dirname, 'uploads', img.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  await Image.deleteMany({ folder: folderId, owner: ownerId });

  const subfolders = await Folder.find({ parent: folderId, owner: ownerId });
  for (const sub of subfolders) {
    await deleteFolderRecursive(sub._id, ownerId);
  }
  await Folder.findByIdAndDelete(folderId);
}

// ── create MCP server ──────────────────────────────────────────────────
const server = new McpServer({
  name: 'dobby-vault',
  version: '1.0.0',
});

// ── Tool: login ────────────────────────────────────────────────────────
server.tool(
  'login',
  'Authenticate with email and password to access the file manager. Must be called before using any other tool.',
  {
    email: z.string().email().describe('User email address'),
    password: z.string().describe('User password'),
  },
  async ({ email, password }) => {
    const user = await User.findOne({ email });
    if (!user) {
      return { content: [{ type: 'text', text: '❌ Login failed: Invalid credentials.' }] };
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return { content: [{ type: 'text', text: '❌ Login failed: Invalid credentials.' }] };
    }
    currentUser = user;
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return {
      content: [{
        type: 'text',
        text: `✅ Logged in as ${user.name} (${user.email}).\nJWT token: ${token}\nYou can now use all other tools.`,
      }],
    };
  }
);

// ── Tool: list_folders ─────────────────────────────────────────────────
server.tool(
  'list_folders',
  'List folders in a given parent folder. Pass no parent_id to list root-level folders.',
  {
    parent_id: z.string().optional().describe('Parent folder ID. Omit or leave empty for root folders.'),
  },
  async ({ parent_id }) => {
    const user = requireAuth();
    const parentId = parent_id || null;
    const folders = await Folder.find({ owner: user._id, parent: parentId }).sort({ createdAt: -1 });

    if (folders.length === 0) {
      return { content: [{ type: 'text', text: parentId ? 'No subfolders found in this folder.' : 'No root folders found.' }] };
    }

    const lines = folders.map((f) => `📁 ${f.name}  (id: ${f._id})`);
    return { content: [{ type: 'text', text: `Found ${folders.length} folder(s):\n${lines.join('\n')}` }] };
  }
);

// ── Tool: create_folder ────────────────────────────────────────────────
server.tool(
  'create_folder',
  'Create a new folder. Optionally nest it inside an existing parent folder.',
  {
    name: z.string().describe('Name of the new folder'),
    parent_id: z.string().optional().describe('ID of the parent folder. Omit for a root-level folder.'),
  },
  async ({ name, parent_id }) => {
    const user = requireAuth();

    if (parent_id) {
      const parentFolder = await Folder.findOne({ _id: parent_id, owner: user._id });
      if (!parentFolder) {
        return { content: [{ type: 'text', text: '❌ Parent folder not found.' }] };
      }
    }

    const folder = await Folder.create({
      name: name.trim(),
      parent: parent_id || null,
      owner: user._id,
    });

    return {
      content: [{ type: 'text', text: `✅ Folder "${folder.name}" created successfully.\nID: ${folder._id}` }],
    };
  }
);

// ── Tool: delete_folder ────────────────────────────────────────────────
server.tool(
  'delete_folder',
  'Delete a folder and all its contents (subfolders and images) recursively.',
  {
    folder_id: z.string().describe('ID of the folder to delete'),
  },
  async ({ folder_id }) => {
    const user = requireAuth();
    const folder = await Folder.findOne({ _id: folder_id, owner: user._id });
    if (!folder) {
      return { content: [{ type: 'text', text: '❌ Folder not found.' }] };
    }

    const folderName = folder.name;
    await deleteFolderRecursive(folder_id, user._id);
    return { content: [{ type: 'text', text: `✅ Folder "${folderName}" and all its contents deleted.` }] };
  }
);

// ── Tool: get_folder_size ──────────────────────────────────────────────
server.tool(
  'get_folder_size',
  'Calculate the total size of all images inside a folder and its subfolders.',
  {
    folder_id: z.string().describe('ID of the folder'),
  },
  async ({ folder_id }) => {
    const user = requireAuth();
    const folder = await Folder.findOne({ _id: folder_id, owner: user._id });
    if (!folder) {
      return { content: [{ type: 'text', text: '❌ Folder not found.' }] };
    }

    const size = await calcFolderSize(folder_id, user._id);
    return {
      content: [{
        type: 'text',
        text: `📊 Folder "${folder.name}" total size: ${formatBytes(size)} (${size} bytes)`,
      }],
    };
  }
);

// ── Tool: list_images ──────────────────────────────────────────────────
server.tool(
  'list_images',
  'List all images inside a specific folder.',
  {
    folder_id: z.string().describe('ID of the folder to list images from'),
  },
  async ({ folder_id }) => {
    const user = requireAuth();
    const folder = await Folder.findOne({ _id: folder_id, owner: user._id });
    if (!folder) {
      return { content: [{ type: 'text', text: '❌ Folder not found.' }] };
    }

    const images = await Image.find({ folder: folder_id, owner: user._id }).sort({ createdAt: -1 });
    if (images.length === 0) {
      return { content: [{ type: 'text', text: `No images found in folder "${folder.name}".` }] };
    }

    const lines = images.map((img) =>
      `🖼️  ${img.name} — ${formatBytes(img.size)} (${img.mimetype})  id: ${img._id}`
    );
    return {
      content: [{
        type: 'text',
        text: `Found ${images.length} image(s) in "${folder.name}":\n${lines.join('\n')}`,
      }],
    };
  }
);

// ── Tool: delete_image ─────────────────────────────────────────────────
server.tool(
  'delete_image',
  'Delete a single image by its ID.',
  {
    image_id: z.string().describe('ID of the image to delete'),
  },
  async ({ image_id }) => {
    const user = requireAuth();
    const image = await Image.findOne({ _id: image_id, owner: user._id });
    if (!image) {
      return { content: [{ type: 'text', text: '❌ Image not found.' }] };
    }

    // remove file from disk
    const filePath = path.join(__dirname, 'uploads', image.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await Image.findByIdAndDelete(image_id);
    return { content: [{ type: 'text', text: `✅ Image "${image.name}" deleted.` }] };
  }
);

// ── start ──────────────────────────────────────────────────────────────
async function main() {
  await connectDB();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // MCP server is now listening on stdio — ready for AI assistant connections
}

main().catch((err) => {
  console.error('MCP server failed to start:', err);
  process.exit(1);
});
