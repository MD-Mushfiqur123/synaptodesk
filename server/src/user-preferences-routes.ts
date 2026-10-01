import { Hono, type MiddlewareHandler } from "hono";
import { z } from "zod";
import type { AppVariables } from "./auth/guards";
import type { UserPreferencesStore } from "./user-preferences";

const preferencesPatch = z.strictObject({
  messageListEmphasis: z.enum(["agent", "thread"]),
});

export function userPreferencesRoutes(
  requireUser: MiddlewareHandler<{ Variables: AppVariables }>,
  store?: UserPreferencesStore,
) {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use("*", requireUser);
  app.get("/", async (context) => {
    if (!store)
      return context.json(
        { error: "User preferences are not available." },
        503,
      );
    return context.json({
      preferences: await store.read(context.var.actor.id),
    });
  });
  app.patch("/", async (context) => {
    if (!store)
      return context.json(
        { error: "User preferences are not available." },
        503,
      );
    const parsed = preferencesPatch.safeParse(
      await context.req.json().catch(() => undefined),
    );
    if (!parsed.success) {
      return context.json(
        { error: "Choose agent or thread for message list emphasis." },
        400,
      );
    }
    return context.json({
      preferences: await store.patch(context.var.actor.id, parsed.data),
    });
  });
  return app;
}
