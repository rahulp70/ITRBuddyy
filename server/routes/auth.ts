import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

const router = Router();

// In-memory mock users
interface UserRec {
  id: string;
  email: string;
  password: string; // Plain for mock only
  fullName?: string;
}

const users = new Map<string, UserRec>(); // key: email

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_EXPIRES_IN = "2h";

router.post("/register", (req: Request, res: Response) => {
  const { email, password, fullName } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  if (users.has(email)) {
    return res.status(409).json({ error: "User already exists" });
  }
  const rec: UserRec = { id: randomUUID(), email, password, fullName };
  users.set(email, rec);
  const token = jwt.sign({ sub: rec.id, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return res.status(201).json({ token, user: { id: rec.id, email: rec.email, fullName: rec.fullName } });
});

router.post("/login", (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  const rec = users.get(email);
  if (!rec || rec.password !== password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ sub: rec.id, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return res.json({ token, user: { id: rec.id, email: rec.email, fullName: rec.fullName } });
});

export function requireAuth(req: Request, res: Response, next: Function) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; email: string };
    // @ts-ignore attach user
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export default router;
