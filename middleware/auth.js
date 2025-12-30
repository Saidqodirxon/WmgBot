const jwt = require("jsonwebtoken");

// JWT token yaratish
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "7d" } // 7 kun
  );
}

// JWT token tekshirish middleware
function authenticateToken(req, res, next) {
  // Cookie dan token olish
  const token = req.cookies?.token || req.session?.token;

  if (!token) {
    return res.redirect("/admin/login");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Token tekshirish xatosi:", error);
    res.clearCookie("token");
    delete req.session.token;
    res.redirect("/admin/login");
  }
}

module.exports = { generateToken, authenticateToken };
