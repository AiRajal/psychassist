/**
 * JWT authentication and plan-gating middleware.
 */
const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    req.userPlan = payload.plan;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requirePlan(...allowedPlans) {
  return (req, res, next) => {
    if (!allowedPlans.includes(req.userPlan)) {
      return res.status(403).json({
        error: "Upgrade required",
        message: `This feature requires a ${allowedPlans.join(" or ")} plan.`,
        currentPlan: req.userPlan,
      });
    }
    next();
  };
}

function checkPatientLimit(req, res, next) {
  if (req.userPlan !== "starter") return next();

  const { getOne } = require("../db/connection");
  const count = getOne("SELECT COUNT(*) as c FROM patients WHERE user_id = ?", [req.userId]);
  if (count && count.c >= 5) {
    return res.status(403).json({
      error: "Patient limit reached",
      message: "Starter plan allows up to 5 patients. Upgrade to Professional for unlimited.",
      currentPlan: "starter",
    });
  }
  next();
}

module.exports = { authenticate, requirePlan, checkPatientLimit };
