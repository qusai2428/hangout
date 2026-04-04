const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static frontend (works locally and in Docker)
const fs = require('fs');
const buildPath = fs.existsSync(path.join(__dirname, 'build'))
  ? path.join(__dirname, 'build')
  : path.join(__dirname, '../client/build');
app.use(express.static(buildPath));

// Init DB
const db = new Database(path.join(__dirname, 'hangout.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_color TEXT NOT NULL,
    avatar_emoji TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS friendships (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (friend_id) REFERENCES users(id),
    UNIQUE(user_id, friend_id)
  );

  CREATE TABLE IF NOT EXISTS hangout_posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    message TEXT,
    timing TEXT NOT NULL,
    activity TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    expires_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    response_type TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (post_id) REFERENCES hangout_posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(post_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    related_id TEXT,
    read INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );
`);

function uid() { return crypto.randomUUID(); }

const AVATAR_EMOJIS = ['😎','🤙','🌟','🔥','⚡','🎯','🌈','🎸','🏄','🎮','🌺','🦋','🚀','🎨','🌙'];
const AVATAR_COLORS = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE','#85C1E9'];

// ─── AUTH ──────────────────────────────────────────────────────────────────
app.post('/api/register', (req, res) => {
  const { username, display_name } = req.body;
  if (!username || !display_name) return res.status(400).json({ error: 'Missing fields' });

  const id = uid();
  const avatar_color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const avatar_emoji = AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];

  try {
    db.prepare(`INSERT INTO users (id, username, display_name, avatar_color, avatar_emoji) VALUES (?, ?, ?, ?, ?)`)
      .run(id, username.toLowerCase().trim(), display_name.trim(), avatar_color, avatar_emoji);
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
    res.json({ success: true, user });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username taken' });
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/login', (req, res) => {
  const { username } = req.body;
  const user = db.prepare(`SELECT * FROM users WHERE username = ?`).get(username?.toLowerCase().trim());
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true, user });
});

// ─── USERS ─────────────────────────────────────────────────────────────────
app.get('/api/users/search', (req, res) => {
  const { q, current_user_id } = req.query;
  if (!q) return res.json([]);
  const users = db.prepare(`
    SELECT * FROM users 
    WHERE (username LIKE ? OR display_name LIKE ?) AND id != ?
    LIMIT 10
  `).all(`%${q}%`, `%${q}%`, current_user_id || '');
  res.json(users);
});

app.get('/api/users/:id', (req, res) => {
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

// ─── FRIENDS ───────────────────────────────────────────────────────────────
app.get('/api/friends/:user_id', (req, res) => {
  const { user_id } = req.params;
  const friends = db.prepare(`
    SELECT u.*, f.status, f.id as friendship_id,
      CASE WHEN f.user_id = ? THEN 'sent' ELSE 'received' END as direction
    FROM friendships f
    JOIN users u ON (
      CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END = u.id
    )
    WHERE (f.user_id = ? OR f.friend_id = ?)
  `).all(user_id, user_id, user_id, user_id);
  res.json(friends);
});

app.post('/api/friends/request', (req, res) => {
  const { user_id, friend_id } = req.body;
  if (user_id === friend_id) return res.status(400).json({ error: "Can't friend yourself" });

  // Check if already exists
  const existing = db.prepare(`
    SELECT * FROM friendships WHERE (user_id=? AND friend_id=?) OR (user_id=? AND friend_id=?)
  `).get(user_id, friend_id, friend_id, user_id);
  if (existing) return res.status(409).json({ error: 'Already connected' });

  const id = uid();
  db.prepare(`INSERT INTO friendships (id, user_id, friend_id, status) VALUES (?, ?, ?, 'pending')`).run(id, user_id, friend_id);
  
  // Notify
  const sender = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user_id);
  db.prepare(`INSERT INTO notifications (id, user_id, type, content, related_id) VALUES (?, ?, ?, ?, ?)`)
    .run(uid(), friend_id, 'friend_request', `${sender.display_name} wants to be your friend!`, id);

  res.json({ success: true });
});

app.post('/api/friends/respond', (req, res) => {
  const { friendship_id, action, user_id } = req.body;
  if (action === 'accept') {
    db.prepare(`UPDATE friendships SET status = 'accepted' WHERE id = ?`).run(friendship_id);
    const friendship = db.prepare(`SELECT * FROM friendships WHERE id = ?`).get(friendship_id);
    const accepter = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user_id);
    db.prepare(`INSERT INTO notifications (id, user_id, type, content, related_id) VALUES (?, ?, ?, ?, ?)`)
      .run(uid(), friendship.user_id, 'friend_accepted', `${accepter.display_name} accepted your friend request!`, friendship_id);
  } else {
    db.prepare(`DELETE FROM friendships WHERE id = ?`).run(friendship_id);
  }
  res.json({ success: true });
});

// ─── HANGOUT POSTS ─────────────────────────────────────────────────────────
app.post('/api/posts', (req, res) => {
  const { user_id, message, timing, activity } = req.body;
  if (!user_id || !timing || !activity) return res.status(400).json({ error: 'Missing fields' });

  // Expire old active posts by this user
  db.prepare(`UPDATE hangout_posts SET status='expired' WHERE user_id=? AND status='active'`).run(user_id);

  const id = uid();
  const expires_at = Math.floor(Date.now() / 1000) + (timing === 'now' ? 3600 : timing === 'tonight' ? 14400 : 86400);
  db.prepare(`INSERT INTO hangout_posts (id, user_id, message, timing, activity, expires_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, user_id, message || '', timing, activity, expires_at);

  // Notify all accepted friends
  const friends = db.prepare(`
    SELECT CASE WHEN user_id=? THEN friend_id ELSE user_id END as friend_id
    FROM friendships WHERE (user_id=? OR friend_id=?) AND status='accepted'
  `).all(user_id, user_id, user_id);

  const poster = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user_id);
  friends.forEach(f => {
    db.prepare(`INSERT INTO notifications (id, user_id, type, content, related_id) VALUES (?, ?, ?, ?, ?)`)
      .run(uid(), f.friend_id, 'hangout_post', `${poster.display_name} wants to hang out! (${activity})`, id);
  });

  res.json({ success: true, post_id: id });
});

app.get('/api/feed/:user_id', (req, res) => {
  const { user_id } = req.params;
  const now = Math.floor(Date.now() / 1000);
  
  // Auto-expire old posts
  db.prepare(`UPDATE hangout_posts SET status='expired' WHERE expires_at < ? AND status='active'`).run(now);

  const posts = db.prepare(`
    SELECT p.*, u.display_name, u.username, u.avatar_color, u.avatar_emoji,
      (SELECT COUNT(*) FROM responses r WHERE r.post_id=p.id AND r.response_type='in') as in_count,
      (SELECT COUNT(*) FROM responses r WHERE r.post_id=p.id AND r.response_type='maybe') as maybe_count,
      (SELECT response_type FROM responses r WHERE r.post_id=p.id AND r.user_id=?) as my_response
    FROM hangout_posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.status = 'active' AND p.user_id IN (
      SELECT CASE WHEN user_id=? THEN friend_id ELSE user_id END
      FROM friendships WHERE (user_id=? OR friend_id=?) AND status='accepted'
    )
    ORDER BY p.created_at DESC
  `).all(user_id, user_id, user_id, user_id);

  res.json(posts);
});

app.get('/api/posts/my/:user_id', (req, res) => {
  const { user_id } = req.params;
  const now = Math.floor(Date.now() / 1000);
  db.prepare(`UPDATE hangout_posts SET status='expired' WHERE expires_at < ? AND status='active'`).run(now);

  const post = db.prepare(`
    SELECT p.*, 
      (SELECT COUNT(*) FROM responses r WHERE r.post_id=p.id AND r.response_type='in') as in_count,
      (SELECT COUNT(*) FROM responses r WHERE r.post_id=p.id AND r.response_type='maybe') as maybe_count,
      (SELECT COUNT(*) FROM responses r WHERE r.post_id=p.id AND r.response_type='busy') as busy_count
    FROM hangout_posts p WHERE p.user_id=? AND p.status='active'
  `).get(user_id);

  if (!post) return res.json(null);

  const responders = db.prepare(`
    SELECT r.response_type, u.display_name, u.avatar_color, u.avatar_emoji, u.username
    FROM responses r JOIN users u ON r.user_id=u.id WHERE r.post_id=?
  `).all(post.id);

  res.json({ ...post, responders });
});

app.delete('/api/posts/:post_id', (req, res) => {
  db.prepare(`UPDATE hangout_posts SET status='cancelled' WHERE id=?`).run(req.params.post_id);
  res.json({ success: true });
});

// ─── RESPONSES ─────────────────────────────────────────────────────────────
app.post('/api/respond', (req, res) => {
  const { post_id, user_id, response_type } = req.body;
  const id = uid();
  
  try {
    db.prepare(`
      INSERT INTO responses (id, post_id, user_id, response_type) VALUES (?, ?, ?, ?)
      ON CONFLICT(post_id, user_id) DO UPDATE SET response_type=excluded.response_type
    `).run(id, post_id, user_id, response_type);

    // Notify post owner
    const post = db.prepare(`SELECT * FROM hangout_posts WHERE id=?`).get(post_id);
    const responder = db.prepare(`SELECT * FROM users WHERE id=?`).get(user_id);
    const emoji = response_type === 'in' ? '🙌' : response_type === 'maybe' ? '🤔' : '😔';
    
    if (post && post.user_id !== user_id) {
      db.prepare(`INSERT INTO notifications (id, user_id, type, content, related_id) VALUES (?, ?, ?, ?, ?)`)
        .run(uid(), post.user_id, 'response', `${responder.display_name} said ${emoji} ${response_type === 'in' ? "I'm in!" : response_type === 'maybe' ? 'Maybe' : 'Busy'} to your hangout`, post_id);
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────
app.get('/api/notifications/:user_id', (req, res) => {
  const notifs = db.prepare(`
    SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 30
  `).all(req.params.user_id);
  res.json(notifs);
});

app.post('/api/notifications/read/:user_id', (req, res) => {
  db.prepare(`UPDATE notifications SET read=1 WHERE user_id=?`).run(req.params.user_id);
  res.json({ success: true });
});

// ─── CATCH ALL ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

app.listen(PORT, () => console.log(`🚀 Wanna Hangout? server running on port ${PORT}`));
