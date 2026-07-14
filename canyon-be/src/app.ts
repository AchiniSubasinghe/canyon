import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { errorHandler } from "./middleware/errorHandler.js";
import agentRouter from "./routes/agent.js";
import authRouter from "./routes/auth.js";
import projectsRouter from "./routes/projects.js";
import tasksRouter from "./routes/tasks.js";
import usersRouter from "./routes/users.js";

export function createApp() {
  const app = express();

  // CORP same-origin blocks credentialed cross-origin fetch in some browsers when
  // the frontend and API are on different hosts. cross-origin keeps CORS usable.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json());

  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/projects", projectsRouter);
  app.use("/api/v1/tasks", tasksRouter);
  app.use("/api/v1/agent", agentRouter);

  app.use(errorHandler);

  return app;
}