import jwt from "jsonwebtoken";

const authUser = (req, res, next) => {
  try {
    let rawToken = null;

    if (req.headers.token) {
      // agar headers me token direct bheja
      rawToken = req.headers.token;
    } else if (req.headers.authorization?.startsWith("Bearer ")) {
      // agar Bearer format bheja
      rawToken = req.headers.authorization.split(" ")[1];
    }

    if (!rawToken) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(rawToken, process.env.JWT_SECRET);

    // ✅ ab userId safely assign ho jayega
    req.user = { userId: decoded.id };

    console.log("Middleware se userId:", req.user.userId);

    next();
  } catch (error) {
    console.log("Auth error:", error.message);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

export default authUser;
