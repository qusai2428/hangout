# 🤙 Wanna Hangout?

A real-time social app that lets you instantly find which friends are free to hang out — no texting required.

## Features

- **Post your availability** — pick a time (now/tonight/later) and activity (coffee, food, walk, etc.)
- **See who's free** — live feed of friends' hangout posts
- **Respond instantly** — "I'm in", "Maybe", or "Busy" with one tap
- **Friend system** — search users, send/accept requests
- **Notifications** — real-time updates for responses and friend requests
- **Auto-expiry** — posts expire automatically based on timing

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 |
| Backend | Node.js + Express |
| Database | SQLite (via better-sqlite3) |
| Fonts | Syne + DM Sans (Google Fonts) |

## Setup & Run

### Prerequisites
- Node.js 18+ installed

### 1. Install dependencies

```bash
# Install server deps
cd server && npm install && cd ..

# Install client deps
cd client && npm install && cd ..
```

### 2. Development mode (two terminals)

**Terminal 1 — Backend:**
```bash
cd server
node index.js
# Runs on http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd client
npm start
# Runs on http://localhost:3000
```

Open http://localhost:3000 in your browser.

### 3. Production build

```bash
# Build the React app
cd client && npm run build && cd ..

# Start the server (serves the built frontend too)
cd server && node index.js
# Open http://localhost:3001
```

## Usage

1. **Register** with a username and display name — you'll get a random avatar color & emoji
2. **Find friends** using the 👥 button — search by name or username
3. **Post a hangout** — tap the big "Wanna hang out?" button
4. **See who's free** in your feed — tap "I'm in!" to commit
5. **Get notifications** 🔔 when friends respond

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | /api/register | Create account |
| POST | /api/login | Sign in |
| GET | /api/users/search | Search users |
| GET | /api/friends/:user_id | Get friends list |
| POST | /api/friends/request | Send friend request |
| POST | /api/friends/respond | Accept/decline request |
| POST | /api/posts | Create hangout post |
| GET | /api/feed/:user_id | Get friends' posts |
| GET | /api/posts/my/:user_id | Get your active post |
| DELETE | /api/posts/:id | Cancel your post |
| POST | /api/respond | Respond to a post |
| GET | /api/notifications/:user_id | Get notifications |

## Database

SQLite file is created automatically at `server/hangout.db` on first run. Tables: `users`, `friendships`, `hangout_posts`, `responses`, `notifications`.
