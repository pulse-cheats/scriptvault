require('dotenv').config();

const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const passport = require('./config/passport');

const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 μέρες
    // secure: true, // ξεσχολίασέ το όταν τρέχεις πίσω από HTTPS
  },
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Κάνει διαθέσιμα σε όλα τα views: τον συνδεδεμένο χρήστη + τα flash μηνύματα
app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  res.locals.errorMessages = req.flash('error');
  res.locals.successMessages = req.flash('success');
  res.locals.googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  next();
});

app.get('/', (req, res) => {
  res.render('index');
});

app.use(authRoutes);
app.use(fileRoutes);

app.use((req, res) => {
  res.status(404).render('message', { title: '404', text: 'Η σελίδα δεν βρέθηκε.' });
});

app.listen(PORT, () => {
  console.log(`[ScriptVault] Τρέχει στο http://localhost:${PORT}`);
});
