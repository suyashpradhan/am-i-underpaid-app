import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// How long a cached band is trusted before we treat it as a miss and re-query.
// 30 days balances budget protection against staleness.
const FRESH_MS = 1000 * 60 * 60 * 24 * 30;

export const get = internalQuery({
  args: { cacheKey: v.string() },
  handler: async (ctx, { cacheKey }) => {
    const row = await ctx.db
      .query("rateCache")
      .withIndex("by_cacheKey", (q) => q.eq("cacheKey", cacheKey))
      .first();
    if (!row) return null;
    if (Date.now() - row.fetchedAt > FRESH_MS) return null; // stale → miss
    return row;
  },
});

export const set = internalMutation({
  args: {
    cacheKey: v.string(),
    discipline: v.string(),
    city: v.string(),
    yearsBucket: v.string(),
    bandLow: v.number(),
    bandHigh: v.number(),
    median: v.number(),
    confidence: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
    ),
    sources: v.array(v.object({ name: v.string(), url: v.string() })),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("rateCache")
      .withIndex("by_cacheKey", (q) => q.eq("cacheKey", args.cacheKey))
      .first();
    const doc = { ...args, fetchedAt: Date.now() };
    if (existing) {
      await ctx.db.replace(existing._id, doc);
    } else {
      await ctx.db.insert("rateCache", doc);
    }
  },
});
