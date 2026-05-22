# ⚡ TaskFlow — Team Task Manager

A full-stack task management app with role-based access control, Kanban boards, real-time dashboards, and team collaboration features.

---

## 🚀 Live Demo

> **URL**: `https://your-app.railway.app`  
> **Admin**: `admin@taskflow.com` / `Admin@123`

---

## ✨ Features

### Authentication
- JWT-based signup/login
- Role selection (Admin / Member) at registration
- Secure password hashing (bcrypt)
- Token persistence with auto-refresh

### Projects
- Create, edit, delete projects with custom colors
- Assign due dates and descriptions
- Progress tracking (task completion %)
- Team membership management per project

### Tasks (Kanban Board)
- **4 columns**: To Do → In Progress → In Review → Done
- Drag-and-drop between columns
- Priority levels: Low, Medium, High, Urgent
- Assign tasks to project members
- Due dates with overdue detection
- Tags / labels per task
- Comments on tasks

### Dashboard
- Overview stats (active projects, tasks in progress, completed, overdue)
- Overdue tasks panel
- Upcoming tasks (due within 7 days)
- Active projects with progress bars
- Global activity feed

### Role-Based Access Control
| Feature | Admin | Member |
|---|---|---|
| Create project | ✅ | ✅ |
| Delete project | Own only | Own only |
| Add members | Project admins | ❌ |
| Remove members | Project admins | ❌ |
| Create/edit tasks | ✅ | ✅ |
| Delete tasks | Creator / Project admin | Creator only |
| View all users | ✅ | ❌ |
| Change user roles | ✅ | ❌ |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router v6, Axios, Lucide Icons |
| **Backend** | Node.js, Express.js |
| **Database** | SQLite (via better-sqlite3) |
| **Auth** | JWT + bcryptjs |
| **Deployment** | Railway |
| **Fonts** | Syne + JetBrains Mono |

---

## 📁 Project Structure

```
taskflow/
├── server/
│   ├── index.js           # Express app entry point
│   ├── database.js        # SQLite setup + schema
│   ├── middleware/
│   │   └── auth.js        # JWT + RBAC middleware
│   └── routes/
│       ├── auth.js        # /api/auth/*
│       ├── projects.js    # /api/projects/*
│       ├── tasks.js       # /api/tasks/* & /api/projects/:id/tasks
│       └── dashboard.js   # /api/dashboard, /api/users
├── client/
│   └── src/
│       ├── App.js
│       ├── context/AuthContext.js
│       ├── utils/api.js
│       ├── components/Layout.js
│       └── pages/
│           ├── Login.js
│           ├── Signup.js
│           ├── Dashboard.js
│           ├── Projects.js
│           ├── ProjectDetail.js
│           ├── TaskBoard.js
│           ├── AdminUsers.js
│           └── Profile.js
├── railway.toml
└── package.json
```

---

## 🔌 REST API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/password` | Change password |

### Projects
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project + members + stats |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/members` | Add member |
| DELETE | `/api/projects/:id/members/:userId` | Remove member |

### Tasks
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects/:id/tasks` | List tasks (filterable) |
| POST | `/api/projects/:id/tasks` | Create task |
| GET | `/api/tasks/:id` | Get task + comments |
| PUT | `/api/tasks/:id` | Update task / move status |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/comments` | Add comment |

### Dashboard & Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard` | Get dashboard stats |
| GET | `/api/users` | List all users (admin) |
| PUT | `/api/users/:id/role` | Change user role (admin) |
| DELETE | `/api/users/:id` | Delete user (admin) |

---

## 🚢 Deploy to Railway

### Prerequisites
- [Railway account](https://railway.app)
- [Railway CLI](https://docs.railway.app/develop/cli) or GitHub integration

### Steps

1. **Clone and push to GitHub**
```bash
git clone <your-repo>
cd taskflow
git push origin main
```

2. **Create Railway project**
   - Go to [railway.app/new](https://railway.app/new)
   - Connect your GitHub repo
   - Railway auto-detects the `railway.toml`

3. **Set environment variables** in Railway dashboard:
```
JWT_SECRET=your-long-random-secret-string
NODE_ENV=production
DB_PATH=/app/data/taskflow.db
```

4. **Add a volume** (for SQLite persistence):
   - In Railway: go to your service → Volumes
   - Mount path: `/app/data`

5. **Deploy** — Railway builds and starts automatically

### Railway build note
- This repo includes [nixpacks.toml](nixpacks.toml) to make Railway install the native build prerequisites required by `better-sqlite3`.
- The app is pinned to Node 20 in [package.json](package.json), which avoids the Node 24 build mismatch seen in the Railway logs.
- If Railway reuses an old cached build, trigger a fresh redeploy from the deployment page after pushing these files.

### Default Admin
The app creates a default admin on first run:
- **Email**: `admin@taskflow.com`  
- **Password**: `Admin@123`

> ⚠️ Change the admin password immediately after first login!

---

## 💻 Local Development

```bash
# Install all dependencies
npm run install-all

# Start dev servers (backend + frontend)
npm run dev
```

- Backend: http://localhost:5000
- Frontend: http://localhost:3000

### Environment
Create `.env` in the project root:
```env
PORT=5000
JWT_SECRET=dev-secret-key
DB_PATH=./data/taskflow.db
```

---

## 📊 Database Schema

- **users** — id, name, email, password (hashed), role, avatar
- **projects** — id, name, description, status, color, owner_id, due_date
- **project_members** — project_id, user_id, role (admin/member)
- **tasks** — id, title, description, status, priority, project_id, assignee_id, creator_id, due_date, tags, position
- **comments** — id, task_id, user_id, content
- **activity_log** — id, user_id, action, entity_type, entity_id, metadata

---

## 👤 Author

Built as a full-stack assignment showcasing:
- RESTful API design with Express.js
- JWT authentication with role-based access control
- Relational database design with SQLite
- Modern React with hooks and context
- Railway deployment with persistent storage
