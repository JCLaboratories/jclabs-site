/* ============================================================
   community.js — Firebase auth, directory, dead drop
   JC Laboratories
   ============================================================ */

import { initializeApp }            from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs,
         query, orderBy, where, Timestamp }
                                     from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth, signInWithEmailAndPassword,
         signOut, onAuthStateChanged }
                                     from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// ── Firebase config ───────────────────────────────────────────
const firebaseConfig = {
  apiKey:            'AIzaSyCqTT1rzA6nf4Gy9M65ZEaYUZMJkSuBFbM',
  authDomain:        'alephvault-e9322.firebaseapp.com',
  projectId:         'alephvault-e9322',
  storageBucket:     'alephvault-e9322.firebasestorage.app',
  messagingSenderId: '562769619657',
  appId:             '1:562769619657:android:3c82ce4ed2c0f3e6fb3b18',
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// ── Auth state ────────────────────────────────────────────────
let currentUser = null;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  updateAuthUI();
  loadDirectory();
  loadDeadDrop();
});

function updateAuthUI() {
  const authSection  = document.getElementById('auth-section');
  const userSection  = document.getElementById('user-section');
  const listingForm  = document.getElementById('listing-form');

  if (currentUser) {
    authSection.style.display  = 'none';
    userSection.style.display  = 'flex';
    document.getElementById('user-email').textContent = currentUser.email;
    if (listingForm) listingForm.style.display = 'block';
  } else {
    authSection.style.display  = 'flex';
    userSection.style.display  = 'none';
    if (listingForm) listingForm.style.display = 'none';
  }
}

// ── Sign in ───────────────────────────────────────────────────
window.signIn = async function () {
  const email = document.getElementById('auth-email').value.trim();
  const pass  = document.getElementById('auth-pass').value;
  const err   = document.getElementById('auth-error');
  err.textContent = '';
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    err.textContent = 'Sign in failed. Check your email and password.';
  }
};

window.signOutUser = async function () {
  await signOut(auth);
};

// ── Directory ─────────────────────────────────────────────────
window.loadDirectory = async function () {
  const list = document.getElementById('directory-list');
  if (!list) return;
  list.innerHTML = '<div class="loading">Loading directory...</div>';

  try {
    const q    = query(collection(db, 'community_directory'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    if (snap.empty) {
      list.innerHTML = '<div class="empty">No listings yet. Be the first to add yours.</div>';
      return;
    }

    list.innerHTML = '';
    snap.forEach(d => {
      const data = d.data();
      list.innerHTML += `
        <div class="dir-entry">
          <div class="dir-username">${esc(data.username)}</div>
          ${data.bio ? `<div class="dir-bio">${esc(data.bio)}</div>` : ''}
          <div class="dir-key">${esc(data.publicKey)}</div>
          <button class="btn-copy-small" onclick="copyText('${esc(data.publicKey)}', this)">Copy Key</button>
        </div>`;
    });
  } catch (e) {
    list.innerHTML = '<div class="empty">Could not load directory.</div>';
    console.error('Directory load error:', e);
  }
};

window.submitListing = async function () {
  if (!currentUser) { alert('Sign in to add a listing.'); return; }

  const username  = document.getElementById('listing-username').value.trim();
  const publicKey = document.getElementById('listing-key').value.trim();
  const bio       = document.getElementById('listing-bio').value.trim();
  const err       = document.getElementById('listing-error');
  const success   = document.getElementById('listing-success');
  err.textContent = '';

  if (!username || !publicKey) {
    err.textContent = 'Username and public key are required.';
    return;
  }
  if (publicKey.length < 50) {
    err.textContent = 'That does not look like a valid public key block.';
    return;
  }

  try {
    await addDoc(collection(db, 'community_directory'), {
      uid:       currentUser.uid,
      username,
      publicKey,
      bio:       bio || '',
      createdAt: Timestamp.now(),
    });
    document.getElementById('listing-username').value = '';
    document.getElementById('listing-key').value      = '';
    document.getElementById('listing-bio').value      = '';
    success.textContent = 'Listing added!';
    setTimeout(() => success.textContent = '', 3000);
    loadDirectory();
  } catch (e) {
    err.textContent = 'Failed to add listing. Try again.';
    console.error('Submit listing error:', e);
  }
};

// ── Dead Drop ─────────────────────────────────────────────────
window.loadDeadDrop = async function () {
  const list = document.getElementById('deadrop-list');
  if (!list) return;
  list.innerHTML = '<div class="loading">Loading messages...</div>';

  const now = Timestamp.now();
  try {
    const q    = query(
      collection(db, 'dead_drop'),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'desc')
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      list.innerHTML = '<div class="empty">No messages on the board. Post one below.</div>';
      return;
    }

    list.innerHTML = '';
    snap.forEach(d => {
      const data     = d.data();
      const timeLeft = getTimeLeft(data.expiresAt.toDate());
      list.innerHTML += `
        <div class="drop-entry">
          <div class="drop-header">
            <span class="drop-to">To: ${esc(data.to)}</span>
            ${data.from
              ? `<span class="drop-from">From: ${esc(data.from)}</span>`
              : '<span class="drop-from">Anonymous</span>'}
            <span class="drop-expiry">Expires: ${timeLeft}</span>
          </div>
          <div class="drop-message">${esc(data.message)}</div>
          <button class="btn-copy-small" onclick="copyText('${esc(data.message)}', this)">Copy Ciphertext</button>
        </div>`;
    });
  } catch (e) {
    list.innerHTML = '<div class="empty">Could not load messages.</div>';
    console.error('Dead drop load error:', e);
  }
};

window.postDeadDrop = async function () {
  const to      = document.getElementById('drop-to').value.trim();
  const from    = document.getElementById('drop-from').value.trim();
  const message = document.getElementById('drop-message').value.trim();
  const expiry  = parseInt(document.getElementById('drop-expiry').value);
  const err     = document.getElementById('drop-error');
  const success = document.getElementById('drop-success');
  err.textContent = '';

  if (!to || !message) {
    err.textContent = 'Recipient and message are required.';
    return;
  }
  if (message.length < 20) {
    err.textContent = 'Message too short — paste the full encrypted ciphertext.';
    return;
  }
  // Basic ciphertext sanity check
  if (!message.includes(':') && !message.includes('=') && !message.includes('{')) {
    err.textContent = 'This does not look like encrypted ciphertext. Encrypt your message in Aleph Vault first.';
    return;
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiry);

  try {
    await addDoc(collection(db, 'dead_drop'), {
      to,
      from:      from || null,
      message,
      expiresAt: Timestamp.fromDate(expiresAt),
      postedAt:  Timestamp.now(),
    });
    document.getElementById('drop-to').value      = '';
    document.getElementById('drop-from').value    = '';
    document.getElementById('drop-message').value = '';
    success.textContent = `Message posted. Expires in ${formatExpiry(expiry)}.`;
    setTimeout(() => success.textContent = '', 5000);
    loadDeadDrop();
  } catch (e) {
    err.textContent = 'Failed to post. Try again.';
    console.error('Post dead drop error:', e);
  }
};

// ── Helpers ───────────────────────────────────────────────────
window.copyText = function (text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = orig, 2000);
  });
};

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

function getTimeLeft(date) {
  const diff = date - new Date();
  if (diff <= 0) return 'expired';
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  return `${h}h`;
}

function formatExpiry(hours) {
  if (hours < 24) return `${hours} hours`;
  return `${hours / 24} days`;
}
