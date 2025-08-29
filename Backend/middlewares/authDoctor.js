
import jwt from "jsonwebtoken";

const authDoctor = (req, res, next) => {
  try {
    // token header me "dtoken" name se bhejna hai
    const dToken = req.headers.dtoken;
    console.log("🔑 Doctor Token:", dToken);

    if (!dToken) {
      return res.status(401).json({ success: false, message: "Not Authorized, Login Again" });
    }

    // verify token
    const token_decode = jwt.verify(dToken, process.env.JWT_SECRET);
     console.log("token_decode",token_decode);
    // doctor id ko request object me store kar do
    req.docId = token_decode.id;

    next();
  } catch (error) {
    console.log("❌ authDoctor error:", error.message);
    return res.status(401).json({ success: false, message: "Not Authorized, Invalid Token" });
  }
};

export default authDoctor;



