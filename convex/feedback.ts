import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const reportIncorrect = mutation({
  args: {
    role: v.string(),
    city: v.string(),
    verdict: v.union(
      v.literal("underpaid"),
      v.literal("fair"),
      v.literal("above"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("resultFeedback", {
      role: args.role.trim().slice(0, 80),
      city: args.city.trim().slice(0, 80),
      verdict: args.verdict,
      reason: "incorrect",
    });
    const stats = await ctx.db
      .query("resultFeedbackStats")
      .withIndex("by_key", (q) => q.eq("key", "incorrect"))
      .unique();
    if (stats) {
      await ctx.db.patch(stats._id, { count: stats.count + 1 });
    } else {
      await ctx.db.insert("resultFeedbackStats", { key: "incorrect", count: 1 });
    }
    return { ok: true };
  },
});

// Useful for a lightweight internal counter. Keep the UI itself focused on
// submitting feedback rather than exposing this aggregate publicly.
export const incorrectCount = query({
  args: {},
  handler: async (ctx) => {
    const stats = await ctx.db
      .query("resultFeedbackStats")
      .withIndex("by_key", (q) => q.eq("key", "incorrect"))
      .unique();
    return stats?.count ?? 0;
  },
});
