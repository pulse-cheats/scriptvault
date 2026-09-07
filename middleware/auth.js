function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'Πρέπει να συνδεθείς πρώτα.');
  res.redirect('/login');
}

module.exports = { ensureAuthenticated };
