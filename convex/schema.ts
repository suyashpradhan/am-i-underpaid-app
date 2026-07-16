import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Anonymous pool. No name/email here, ever. Also the usage counter.
  checks: defineTable({
    isFreelancer: v.boolean(),
    discipline: v.string(),
    skills: v.array(v.string()), // full array logged for post-launch tuning
    coverage: v.number(), // 0..1, what drove placement
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
  }).index("by_discipline_city", ["discipline", "city"]),

  // Singleton aggregate. This avoids scanning every anonymous check whenever
  // the result screen wants to show real usage.
  salaryCheckStats: defineTable({
    key: v.literal("all"),
    count: v.number(),
  }).index("by_key", ["key"]),

  // Cache layer. Band keyed by discipline+city+yearsBucket ONLY (no skills).
  rateCache: defineTable({
    cacheKey: v.string(), // `${discipline}|${city}|${yearsBucket}` lowercased
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
    fetchedAt: v.number(), // Date.now() at fetch; drives staleness
  }).index("by_cacheKey", ["cacheKey"]),

  tips: defineTable({
    amount: v.number(),
    currency: v.string(),
    dodoRef: v.string(),
  }).index("by_dodoRef", ["dodoRef"]), // idempotency, wired in Phase 4

  // Anonymous trust signal. One row per click keeps the data auditable and
  // lets the product owner inspect problem roles directly in Convex.
  resultFeedback: defineTable({
    role: v.string(),
    city: v.string(),
    verdict: v.union(
      v.literal("underpaid"),
      v.literal("fair"),
      v.literal("above"),
    ),
    reason: v.literal("incorrect"),
  }).index("by_reason", ["reason"]),
  resultFeedbackStats: defineTable({
    key: v.literal("incorrect"),
    count: v.number(),
  }).index("by_key", ["key"]),
});
