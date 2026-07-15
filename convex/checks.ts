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
  },
});

// collect().length is O(n); fine at hundreds/thousands of rows. If this becomes
// a hot path before Phase 6, switch to a counter document instead of scanning.
export const count = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("checks").collect();
    return rows.length;
  },
});
