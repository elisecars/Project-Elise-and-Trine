// Middleware som skyddar routes, används för att kräva inloggning
function requireLogin(req, res, next) {
  // Kollar om det finns en aktiv session och om användaren är inloggad
  if (req.session && req.session.user) {
    next(); // Användaren är inloggad, gå vidare
  } else {
    res.status(403).json({ error: "Access denied. Not authenticated." });
  }
}

/* Nytt för att skilja mellan assistenter och lärare */
// Middleware som kräver att användaren har en roll
function requireRole(role) {
  return function (req, res, next) {
    // Kollar att användaren är inloggad och att rollen matchar
    if (req.session && req.session.user && req.session.user.role === role) {
      next(); // Användaren har rätt roll, gå vidare
    } else {
      res.status(403).json({ error: `Access denied. Requires ${role} role.` });
    }
  };
}

export { requireLogin, requireRole };
