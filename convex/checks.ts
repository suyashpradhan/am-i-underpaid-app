import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

export const record = internalMutation({
  args: {
    isFreelancer: v.boolean(),
    discipline: v.string(),
    skills: v.array(v.string()),
    coverage: v.number(),
    city: v.string(),
    yearsExperience: v.number(),
    currentPay: v.number(),
    rateUnit: v.union(
      v.literal("lpa"),
      v.literal("hour"),
      v.literal("project"),
    ),
    bandLow: v.number(),
    bandHigh: v.number(),
    fairPoint: v.number(),
    percentile: v.number(),
    verdict: v.union(
      v.literal("underpaid"),
      v.literal("fair"),
      v.literal("above"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("checks", args);
    const stats = await ctx.db
      .query("salaryCheckStats")
      .withIndex("by_key", (q) => q.eq("key", "all"))
      .unique();
    if (stats) {
      await ctx.db.patch(stats._id, { count: stats.count + 1 });
    } else {
      // Seed from historical rows the first time this version records a check.
      const historicalRows = await ctx.db.query("checks").collect();
      await ctx.db.insert("salaryCheckStats", {
        key: "all",
        count: historicalRows.length,
      });
    }
  },
});

export const count = query({
  args: {},
  handler: async (ctx) => {
    const stats = await ctx.db
      .query("salaryCheckStats")
      .withIndex("by_key", (q) => q.eq("key", "all"))
      .unique();
    return stats?.count ?? null;
  },
});
