import { Router } from "express";
import { z } from "zod";
import { runAgentLoop } from "../agent/loop.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      })
    )
    .min(1)
    .max(50),
});

router.use(requireAuth);

router.post("/chat", async (req, res, next) => {
  try {
    const { messages } = chatSchema.parse(req.body);
    const user = req.user!;

    await runAgentLoop(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
      },
      messages,
      res
    );
  } catch (err) {
    // If headers already sent (SSE started), loop handles errors itself.
    if (res.headersSent) return;
    next(err);
  }
});

export default router;
