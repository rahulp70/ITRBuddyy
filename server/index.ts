import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import authRouter from "./routes/auth";
import documentsRouter from "./routes/documents";
import itrRouter from "./routes/itr";
import chatRouter from "./routes/chat";
import newsRouter from "./routes/news";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Application API
  app.use("/api/auth", authRouter);
  app.use("/api/documents", documentsRouter);
  app.use("/api/itr", itrRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/news", newsRouter);

  return app;
}
