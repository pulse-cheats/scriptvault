const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const db = require('../db');

// --- Local (email/username + password) ---
passport.use(new LocalStrategy(
  { usernameField: 'identifier', passwordField: 'password' },
  (identifier, password, done) => {
    try {
      const cleanIdent = (identifier || '').toLowerCase().trim();
      const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?').get(cleanIdent, cleanIdent);

      if (!user) {
        return done(null, false, { message: 'No account found with those credentials.' });
      }
      if (!user.password_hash) {
        return done(null, false, { message: 'This account was created with Google. Please use "Sign in with Google".' });
      }

      const match = bcrypt.compareSync(password, user.password_hash);
      if (!match) {
        return done(null, false, { message: 'Incorrect password.' });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// --- Google OAuth ---
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: (process.env.BASE_URL || 'http://localhost:3000') + '/auth/google/callback',
    },
    (accessToken, refreshToken, profile, done) => {
      try {
        const email = (profile.emails && profile.emails[0] && profile.emails[0].value || '').toLowerCase();
        const name = profile.displayName || email;

        let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(profile.id);

        if (!user && email) {
          user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
          if (user) {
            db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(profile.id, user.id);
            user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
          }
        }

        if (!user) {
          let baseUsername = (profile.username || (email ? email.split('@')[0] : 'user'))
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '');
          if (!baseUsername) baseUsername = 'user';

          let username = baseUsername;
          let counter = 1;
          while (db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(username.toLowerCase())) {
            username = baseUsername + counter;
            counter++;
          }

          const info = db.prepare(
            'INSERT INTO users (username, email, google_id, name) VALUES (?, ?, ?, ?)'
          ).run(username, email, profile.id, name);
          user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));
} else {
  console.warn('[ScriptVault] Google OAuth is not configured. Google Sign-in disabled.');
}

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
