import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const API = process.env.REACT_APP_API_URL || '';

async function api(path, options = {}) {
  const res = await fetch(`${API}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json();
}

// ─── CONSTANTS ─────────────────────────────────────────────────────────────
const TIMINGS = [
  { key: 'now', label: 'Right now', emoji: '⚡', desc: 'Within the hour' },
  { key: 'tonight', label: 'Tonight', emoji: '🌙', desc: 'This evening' },
  { key: 'later', label: 'Later today', emoji: '☀️', desc: 'Later on' },
];

const ACTIVITIES = [
  { key: 'coffee', label: 'Coffee', emoji: '☕' },
  { key: 'food', label: 'Food', emoji: '🍕' },
  { key: 'walk', label: 'Walk', emoji: '🚶' },
  { key: 'drinks', label: 'Drinks', emoji: '🍺' },
  { key: 'cinema', label: 'Cinema', emoji: '🎬' },
  { key: 'chill', label: 'Chill', emoji: '🛋️' },
  { key: 'sport', label: 'Sport', emoji: '⚽' },
  { key: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { key: 'drive', label: 'Drive', emoji: '🚗' },
  { key: 'gaming', label: 'Gaming', emoji: '🎮' },
];

// ─── AVATAR ────────────────────────────────────────────────────────────────
function Avatar({ user, size = 40 }) {
  return (
    <div className="avatar" style={{
      width: size, height: size, borderRadius: '50%',
      background: user?.avatar_color || '#4ECDC4',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.45, flexShrink: 0,
      border: '2px solid rgba(255,255,255,0.2)'
    }}>
      {user?.avatar_emoji || '😊'}
    </div>
  );
}

// ─── TIME AGO ──────────────────────────────────────────────────────────────
function timeAgo(ts) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── TOAST ─────────────────────────────────────────────────────────────────
function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return <div className="toast">{message}</div>;
}

// ─── AUTH SCREEN ───────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'register') {
        if (password !== confirmPassword) { setError('Passwords do not match'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
        const res = await api('/register', {
          method: 'POST',
          body: JSON.stringify({ username, display_name: displayName, password })
        });
        if (res.error) { setError(res.error); return; }
        localStorage.setItem('wh_user', JSON.stringify(res.user));
        onAuth(res.user);
      } else {
        const res = await api('/login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        });
        if (res.error) { setError(res.error); return; }
        localStorage.setItem('wh_user', JSON.stringify(res.user));
        onAuth(res.user);
      }
    } finally { setLoading(false); }
  }

  function switchMode(m) {
    setMode(m); setError(''); setPassword(''); setConfirmPassword('');
  }

  return (
    <div className="auth-screen">
      <div className="auth-glow" />
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-emoji">🤙</span>
          <h1>Wanna Hangout?</h1>
          <p>Find who's free, right now.</p>
        </div>

        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Sign In</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>Join</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="field">
              <label>Your Name</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                placeholder="What do your friends call you?" required />
            </div>
          )}
          <div className="field">
            <label>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              placeholder="@username" required autoComplete="username" />
          </div>
          <div className="field">
            <label>Password</label>
            <div className="password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'}
                required
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPassword(s => !s)}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          {mode === 'register' && (
            <div className="field">
              <label>Confirm Password</label>
              <div className="password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}
          {error && <div className="error-msg">⚠️ {error}</div>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '...' : mode === 'login' ? "Let's go 🚀" : "Create account ✨"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── POST CARD ─────────────────────────────────────────────────────────────
function PostCard({ post, currentUser, onRespond, isOwn }) {
  const timing = TIMINGS.find(t => t.key === post.timing);
  const activity = ACTIVITIES.find(a => a.key === post.activity);
  const [responding, setResponding] = useState(false);

  async function respond(type) {
    setResponding(true);
    await onRespond(post.id, type);
    setResponding(false);
  }

  return (
    <div className={`post-card ${isOwn ? 'own-post' : ''}`}>
      <div className="post-header">
        <Avatar user={isOwn ? currentUser : post} size={44} />
        <div className="post-meta">
          <span className="post-name">{isOwn ? 'You' : post.display_name}</span>
          <span className="post-time">{timeAgo(post.created_at)}</span>
        </div>
        <div className="timing-badge">
          <span>{timing?.emoji}</span>
          <span>{timing?.label}</span>
        </div>
      </div>

      <div className="post-body">
        <div className="activity-tag">
          <span className="act-emoji">{activity?.emoji}</span>
          <span>{activity?.label}</span>
        </div>
        {post.message && <p className="post-message">"{post.message}"</p>}
      </div>

      <div className="post-footer">
        <div className="response-counts">
          {post.in_count > 0 && <span className="count in">🙌 {post.in_count} in</span>}
          {post.maybe_count > 0 && <span className="count maybe">🤔 {post.maybe_count} maybe</span>}
        </div>

        {!isOwn && (
          <div className="response-btns">
            <button
              className={`resp-btn in ${post.my_response === 'in' ? 'active' : ''}`}
              onClick={() => respond('in')} disabled={responding}>
              {post.my_response === 'in' ? '🙌 In!' : "I'm in"}
            </button>
            <button
              className={`resp-btn maybe ${post.my_response === 'maybe' ? 'active' : ''}`}
              onClick={() => respond('maybe')} disabled={responding}>
              {post.my_response === 'maybe' ? '🤔 Maybe' : 'Maybe'}
            </button>
            <button
              className={`resp-btn busy ${post.my_response === 'busy' ? 'active' : ''}`}
              onClick={() => respond('busy')} disabled={responding}>
              {post.my_response === 'busy' ? '😔 Busy' : 'Busy'}
            </button>
          </div>
        )}

        {isOwn && post.responders && post.responders.length > 0 && (
          <div className="responders-list">
            {post.responders.map((r, i) => (
              <div key={i} className={`responder ${r.response_type}`}>
                <Avatar user={r} size={28} />
                <span>{r.display_name}</span>
                <span className="resp-emoji">
                  {r.response_type === 'in' ? '🙌' : r.response_type === 'maybe' ? '🤔' : '😔'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── POST COMPOSER ─────────────────────────────────────────────────────────
function Composer({ user, onPost, onClose, existingPost }) {
  const [timing, setTiming] = useState('now');
  const [activity, setActivity] = useState('coffee');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handlePost() {
    setLoading(true);
    await onPost({ timing, activity, message });
    setLoading(false);
    onClose();
  }

  async function handleCancel() {
    if (!existingPost) return;
    await api(`/posts/${existingPost.id}`, { method: 'DELETE' });
    onClose();
    window.location.reload();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="composer" onClick={e => e.stopPropagation()}>
        <div className="composer-header">
          <Avatar user={user} size={40} />
          <div>
            <div className="comp-name">{user.display_name}</div>
            <div className="comp-sub">is posting a hangout</div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="comp-section">
          <label>When?</label>
          <div className="timing-grid">
            {TIMINGS.map(t => (
              <button key={t.key} className={`timing-opt ${timing === t.key ? 'selected' : ''}`}
                onClick={() => setTiming(t.key)}>
                <span className="t-emoji">{t.emoji}</span>
                <span className="t-label">{t.label}</span>
                <span className="t-desc">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="comp-section">
          <label>What?</label>
          <div className="activity-grid">
            {ACTIVITIES.map(a => (
              <button key={a.key} className={`activity-opt ${activity === a.key ? 'selected' : ''}`}
                onClick={() => setActivity(a.key)}>
                <span>{a.emoji}</span>
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="comp-section">
          <label>Add a note <span style={{opacity:0.5}}>(optional)</span></label>
          <textarea value={message} onChange={e => setMessage(e.target.value)}
            placeholder="e.g. anyone down for ramen near downtown?"
            rows={2} maxLength={120} />
          <div className="char-count">{message.length}/120</div>
        </div>

        <div className="comp-actions">
          {existingPost && (
            <button className="btn-danger" onClick={handleCancel}>Cancel post</button>
          )}
          <button className="btn-primary" onClick={handlePost} disabled={loading}>
            {loading ? '...' : '🤙 Post it!'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FRIENDS PANEL ─────────────────────────────────────────────────────────
function FriendsPanel({ user, onClose }) {
  const [friends, setFriends] = useState([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('friends');

  const loadFriends = useCallback(async () => {
    const data = await api(`/friends/${user.id}`);
    setFriends(data);
  }, [user.id]);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const data = await api(`/users/search?q=${encodeURIComponent(search)}&current_user_id=${user.id}`);
      setResults(data);
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [search, user.id]);

  async function sendRequest(friend_id) {
    await api('/friends/request', { method: 'POST', body: JSON.stringify({ user_id: user.id, friend_id }) });
    setSearch(''); setResults([]);
    loadFriends();
  }

  async function respond(friendship_id, action) {
    await api('/friends/respond', { method: 'POST', body: JSON.stringify({ friendship_id, action, user_id: user.id }) });
    loadFriends();
  }

  const accepted = friends.filter(f => f.status === 'accepted');
  const pending = friends.filter(f => f.status === 'pending');
  const incoming = pending.filter(f => f.direction === 'received');
  const outgoing = pending.filter(f => f.direction === 'sent');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="friends-panel" onClick={e => e.stopPropagation()}>
        <div className="panel-header">
          <h2>👥 Friends</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="search-box">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search for friends..." />
        </div>

        {search && (
          <div className="search-results">
            {loading && <div className="loading-hint">Searching...</div>}
            {results.map(u => {
              const alreadyFriend = friends.some(f => f.id === u.id);
              return (
                <div key={u.id} className="user-row">
                  <Avatar user={u} size={36} />
                  <div className="user-info">
                    <span className="u-name">{u.display_name}</span>
                    <span className="u-user">@{u.username}</span>
                  </div>
                  {!alreadyFriend && (
                    <button className="btn-sm" onClick={() => sendRequest(u.id)}>Add</button>
                  )}
                  {alreadyFriend && <span className="badge-sm">Friends</span>}
                </div>
              );
            })}
            {!loading && results.length === 0 && search && (
              <div className="loading-hint">No users found</div>
            )}
          </div>
        )}

        <div className="friend-tabs">
          <button className={tab === 'friends' ? 'active' : ''} onClick={() => setTab('friends')}>
            Friends {accepted.length > 0 && <span className="count-badge">{accepted.length}</span>}
          </button>
          <button className={tab === 'pending' ? 'active' : ''} onClick={() => setTab('pending')}>
            Requests {incoming.length > 0 && <span className="count-badge red">{incoming.length}</span>}
          </button>
        </div>

        {tab === 'friends' && (
          <div className="friends-list">
            {accepted.length === 0 && <div className="empty-state">No friends yet — search above to find people!</div>}
            {accepted.map(f => (
              <div key={f.id} className="user-row">
                <Avatar user={f} size={36} />
                <div className="user-info">
                  <span className="u-name">{f.display_name}</span>
                  <span className="u-user">@{f.username}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'pending' && (
          <div className="friends-list">
            {incoming.length > 0 && <div className="section-label">Incoming</div>}
            {incoming.map(f => (
              <div key={f.id} className="user-row">
                <Avatar user={f} size={36} />
                <div className="user-info">
                  <span className="u-name">{f.display_name}</span>
                  <span className="u-user">@{f.username}</span>
                </div>
                <div className="resp-pair">
                  <button className="btn-sm green" onClick={() => respond(f.friendship_id, 'accept')}>✓</button>
                  <button className="btn-sm red" onClick={() => respond(f.friendship_id, 'decline')}>✕</button>
                </div>
              </div>
            ))}
            {outgoing.length > 0 && <div className="section-label">Sent</div>}
            {outgoing.map(f => (
              <div key={f.id} className="user-row">
                <Avatar user={f} size={36} />
                <div className="user-info">
                  <span className="u-name">{f.display_name}</span>
                </div>
                <span className="badge-sm muted">Pending</span>
              </div>
            ))}
            {incoming.length === 0 && outgoing.length === 0 && (
              <div className="empty-state">No pending requests</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────
function NotificationsPanel({ user, onClose }) {
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    api(`/notifications/${user.id}`).then(setNotifs);
    api(`/notifications/read/${user.id}`, { method: 'POST' });
  }, [user.id]);

  const iconMap = { friend_request: '👋', friend_accepted: '🎉', hangout_post: '🤙', response: '💬' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="friends-panel" onClick={e => e.stopPropagation()}>
        <div className="panel-header">
          <h2>🔔 Notifications</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="friends-list">
          {notifs.length === 0 && <div className="empty-state">No notifications yet</div>}
          {notifs.map(n => (
            <div key={n.id} className={`notif-row ${!n.read ? 'unread' : ''}`}>
              <span className="notif-icon">{iconMap[n.type] || '📣'}</span>
              <div className="notif-body">
                <p>{n.content}</p>
                <span className="notif-time">{timeAgo(n.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wh_user')); } catch { return null; }
  });
  const [feed, setFeed] = useState([]);
  const [myPost, setMyPost] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [feedData, myPostData, notifs] = await Promise.all([
      api(`/feed/${user.id}`),
      api(`/posts/my/${user.id}`),
      api(`/notifications/${user.id}`)
    ]);
    setFeed(feedData);
    setMyPost(myPostData);
    setUnreadCount(notifs.filter(n => !n.read).length);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, [loadData]);

  async function handlePost({ timing, activity, message }) {
    await api('/posts', {
      method: 'POST',
      body: JSON.stringify({ user_id: user.id, timing, activity, message })
    });
    setToast('🤙 Your hangout is live!');
    await loadData();
  }

  async function handleRespond(post_id, response_type) {
    await api('/respond', {
      method: 'POST',
      body: JSON.stringify({ post_id, user_id: user.id, response_type })
    });
    setToast(response_type === 'in' ? "🙌 You're in!" : response_type === 'maybe' ? '🤔 Maybe noted!' : '😔 Got it');
    await loadData();
  }

  function logout() {
    localStorage.removeItem('wh_user');
    setUser(null);
  }

  if (!user) return <AuthScreen onAuth={setUser} />;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <span className="logo-mark">🤙</span>
          <span className="app-name">Wanna Hangout?</span>
        </div>
        <div className="header-right">
          <button className="icon-btn" onClick={() => { setShowNotifs(true); }}>
            🔔
            {unreadCount > 0 && <span className="notif-dot">{unreadCount}</span>}
          </button>
          <button className="icon-btn" onClick={() => setShowFriends(true)}>👥</button>
          <button className="avatar-btn" onClick={logout}>
            <Avatar user={user} size={32} />
          </button>
        </div>
      </header>

      <main className="app-main">
        {/* My Status */}
        <div className="my-status-section">
          {myPost ? (
            <div className="my-status-card active">
              <div className="status-live-badge">● Live</div>
              <div className="my-status-info">
                <span className="my-act-emoji">
                  {ACTIVITIES.find(a => a.key === myPost.activity)?.emoji}
                </span>
                <div>
                  <div className="my-act-name">{ACTIVITIES.find(a => a.key === myPost.activity)?.label}</div>
                  <div className="my-timing">{TIMINGS.find(t => t.key === myPost.timing)?.label}</div>
                </div>
              </div>
              {myPost.message && <p className="my-note">"{myPost.message}"</p>}
              <div className="my-responses">
                <span>🙌 {myPost.in_count} in</span>
                <span>🤔 {myPost.maybe_count} maybe</span>
                <span>😔 {myPost.busy_count} busy</span>
              </div>
              {myPost.responders?.length > 0 && (
                <div className="responders-mini">
                  {myPost.responders.map((r, i) => (
                    <div key={i} className={`resp-mini ${r.response_type}`}>
                      <Avatar user={r} size={24} />
                      <span>{r.display_name.split(' ')[0]}</span>
                      <span>{r.response_type === 'in' ? '🙌' : r.response_type === 'maybe' ? '🤔' : '😔'}</span>
                    </div>
                  ))}
                </div>
              )}
              <button className="btn-edit" onClick={() => setShowComposer(true)}>Edit / Cancel</button>
            </div>
          ) : (
            <button className="cta-post-btn" onClick={() => setShowComposer(true)}>
              <span className="cta-emoji">🤙</span>
              <div>
                <div className="cta-title">Wanna hang out?</div>
                <div className="cta-sub">Let your friends know you're free</div>
              </div>
              <span className="cta-arrow">→</span>
            </button>
          )}
        </div>

        {/* Feed */}
        <div className="feed-section">
          <div className="feed-label">
            {feed.length > 0 ? `${feed.length} friend${feed.length !== 1 ? 's' : ''} available` : "Friends' activity"}
          </div>

          {loading && (
            <div className="loading-screen-mini">
              <div className="pulse-dot" />
            </div>
          )}

          {!loading && feed.length === 0 && (
            <div className="empty-feed">
              <span className="empty-emoji">😴</span>
              <p>None of your friends are out right now</p>
              <span>Add friends to see when they're available</span>
              <button className="btn-secondary" onClick={() => setShowFriends(true)}>Find Friends</button>
            </div>
          )}

          {feed.map(post => (
            <PostCard key={post.id} post={post} currentUser={user}
              onRespond={handleRespond} isOwn={false} />
          ))}
        </div>
      </main>

      {showComposer && (
        <Composer user={user} existingPost={myPost}
          onPost={handlePost} onClose={() => { setShowComposer(false); loadData(); }} />
      )}
      {showFriends && <FriendsPanel user={user} onClose={() => { setShowFriends(false); loadData(); }} />}
      {showNotifs && <NotificationsPanel user={user} onClose={() => { setShowNotifs(false); setUnreadCount(0); }} />}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
