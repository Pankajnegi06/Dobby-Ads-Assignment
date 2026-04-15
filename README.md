# Dobby Vault — File Manager

A secure, full-stack file manager with nested folders, image uploads, and AI integration via MCP.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT + bcrypt |
| AI Integration | MCP (Model Context Protocol) |

## Project Structure

```
dobby ads/
├── client/                  # React frontend
│   └── src/
│       ├── pages/           # Login, Register, Dashboard
│       └── components/      # FolderBrowser, Sidebar, Modals
├── server/                  # Express backend
│   ├── config/db.js         # MongoDB connection
│   ├── middleware/auth.js   # JWT auth middleware
│   ├── models/              # User, Folder, Image schemas
│   ├── routes/              # auth, folders, images API
│   ├── uploads/             # Uploaded image files
│   ├── mcp-server.js        # MCP server for AI assistants
│   └── server.js            # Express entry point
└── .gitignore
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### 1. Clone & Install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment

Create `server/.env`:

```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
JWT_SECRET=your_secret_key_here
PORT=5000
```

### 3. Run the App

```bash
# Terminal 1 — Start backend
cd server
npm run dev

# Terminal 2 — Start frontend
cd client
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:5000](http://localhost:5000)

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user (protected) |

### Folders (protected)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/folders?parent=<id>` | List folders in parent |
| POST | `/api/folders` | Create folder |
| GET | `/api/folders/:id` | Get folder details |
| GET | `/api/folders/:id/size` | Get recursive folder size |
| GET | `/api/folders/:id/path` | Get breadcrumb path |
| DELETE | `/api/folders/:id` | Delete folder recursively |

### Images (protected)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/images?folder=<id>` | List images in folder |
| POST | `/api/images` | Upload image (multipart) |
| DELETE | `/api/images/:id` | Delete image |

## Features

- 🔐 **User authentication** — Register/login with JWT tokens
- 📁 **Nested folders** — Create folders inside folders, unlimited depth
- 🖼️ **Image uploads** — Upload JPEG, PNG, GIF, WebP, SVG (10MB max)
- 📊 **Folder size** — Recursive size calculation across subfolders
- 🗑️ **Cascade delete** — Deleting a folder removes all contents
- 🧭 **Breadcrumb navigation** — Full path from root to current folder

---

## MCP Integration (Bonus)

The app includes an MCP server that lets AI assistants (like Claude Desktop) interact with your file manager through natural language.

### Available MCP Tools

| Tool | Description |
|---|---|
| `login` | Authenticate with email/password |
| `list_folders` | List folders in a parent (or root) |
| `create_folder` | Create a new folder |
| `delete_folder` | Delete folder + contents recursively |
| `get_folder_size` | Calculate total size of folder tree |
| `list_images` | List images in a folder |
| `delete_image` | Delete an image by ID |

### Setup with Claude Desktop

1. Open Claude Desktop → **Settings** → **Developer** → **Edit Config**

2. Add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dobby-vault": {
      "command": "node",
      "args": ["<full-path-to>/server/mcp-server.js"]
    }
  }
}
```

3. Restart Claude Desktop — the 🔌 tools icon should appear.

4. Try it:
   - *"Log in with email user@example.com and password mypass123"*
   - *"Show me my root folders"*
   - *"Create a folder called Campaigns"*

> **Note:** The MCP server connects directly to MongoDB. It works independently — no need to start the Express server.

---

## License

MIT
