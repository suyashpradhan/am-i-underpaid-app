import { query } from "./_generated/server";
import { v } from "convex/values";
import {
  buildCacheKey,
  yearsBucket,
  HIGH_VALUE_SKILLS,
  skillCoverage,
  fairPoint,
} from "./lib/verdict";

// Curated candidate sets. THESE ARE JUDGMENT CALLS — tune freely.
const CANDIDATE_CITIES = [
  "Bangalore",
  "Gurgaon",
  "Hyderabad",
  "Pune",
  "Mumbai",
  "Remote",
];

// Which disciplines a role could realistically pivot to (only ones we can price).
const ROLE_PIVOTS: Record<string, string[]> = {
  Frontend: ["Solution Engineer", "Backend"],
  Backend: ["SRE/Devops", "Solution Engineer"],
  "Product Designer": ["Product Manager"],
  "Solution Engineer": ["Product Manager"],
  "React Native Engineer": ["Frontend", "Android Engineer"],
  "Android Engineer": ["React Native Engineer"],
  "iOS Engineer": ["React Native Engineer"],
  "SRE/Devops": ["Backend"],
  "Product Manager": [],
};

const NEXT_BUCKET: Record<string, string> = {
  "0-1": "2-3",
  "2-3": "4-6",
  "4-6": "7-10",
  "7-10": "10+",
  "10+": "",
};

type Lever = {
  title: string;
  delta: string;
  newBand: string;
  source: { label: string; url: string } | null;
};

export const getLevers = query({
  args: {
    discipline: v.string(),
    city: v.string(),
    yearsExperience: v.number(),
    skills: v.array(v.string()),
    workMode: v.union(v.literal("ic"), v.literal("manager")),
    workDescription: v.string(),
  },
  handler: async (ctx, args) => {
    // Helper: read a cached band by its parts. Returns null if cold.
    async function band(discipline: string, city: string, years: number) {
      const key = buildCacheKey(
        discipline,
        city,
        years,
        args.workMode,
        discipline === args.discipline ? args.workDescription : "",
      );
      return await ctx.db
        .query("rateCache")
        .withIndex("by_cacheKey", (q) => q.eq("cacheKey", key))
        .first();
    }

    const mine = await band(args.discipline, args.city, args.yearsExperience);
    // No band cached for the user yet → no levers we can trust. Return empty.
    if (!mine) return { skills: [], cities: [], seniority: [], roles: [] };

    const src = (b: any): { label: string; url: string } | null =>
      b.sources?.[0]
        ? { label: b.sources[0].name, url: b.sources[0].url }
        : null;

    // --- Skills levers (local, always available) ---
    const hv = HIGH_VALUE_SKILLS[args.discipline] ?? [];
    const missing = hv.filter((s) => !args.skills.includes(s));
    const cov = skillCoverage(args.discipline, args.skills);
    const curFair = fairPoint(mine.bandLow, mine.bandHigh, cov);
    const skills: Lever[] = missing
      .slice(0, 3)
      .map((skill) => {
        const newCov = Math.min(1, cov + 1 / (hv.length || 1));
        const newFair = fairPoint(mine.bandLow, mine.bandHigh, newCov);
        const delta = Math.max(0, Math.round(newFair - curFair));
        return {
          title: `Add ${skill}`,
          delta: `+₹${delta}L`,
          newBand: `→ ₹${Math.round(newFair)}L`,
          source: src(mine), // derived from the same band → same sources
        };
      })
      .filter((l) => l.delta !== "+₹0L");

    // --- City levers (cache reads only) ---
    const cities: Lever[] = [];
    for (const c of CANDIDATE_CITIES) {
      if (c.toLowerCase() === args.city.trim().toLowerCase()) continue;
      const b = await band(args.discipline, c, args.yearsExperience);
      if (!b) continue; // cold cache → skip, never fake
      const delta = Math.round(b.median - mine.median);
      if (delta <= 0) continue; // only show upside
      cities.push({
        title: c,
        delta: `+₹${delta}L`,
        newBand: `→ ₹${b.bandLow}–${b.bandHigh}L`,
        source: src(b),
      });
    }

    // --- Seniority lever (next experience bucket, same role+city) ---
    const seniority: Lever[] = [];
    const nb = NEXT_BUCKET[yearsBucket(args.yearsExperience)];
    if (nb) {
      // Probe a representative year inside the next bucket.
      const probeYears =
        { "2-3": 3, "4-6": 5, "7-10": 8, "10+": 12 }[nb] ??
        args.yearsExperience + 2;
      const b = await band(args.discipline, args.city, probeYears);
      if (b) {
        const delta = Math.round(b.median - mine.median);
        if (delta > 0)
          seniority.push({
            title: `Next level · ${nb} yrs`,
            delta: `+₹${delta}L`,
            newBand: `→ ₹${b.bandLow}–${b.bandHigh}L`,
            source: src(b),
          });
      }
    }

    // --- Role levers (adjacent disciplines, same city+years) ---
    const roles: Lever[] = [];
    for (const r of ROLE_PIVOTS[args.discipline] ?? []) {
      const b = await band(r, args.city, args.yearsExperience);
      if (!b) continue;
      const delta = Math.round(b.median - mine.median);
      if (delta <= 0) continue;
      roles.push({
        title: r,
        delta: `+₹${delta}L`,
        newBand: `→ ₹${b.bandLow}–${b.bandHigh}L`,
        source: src(b),
      });
    }

    return { skills, cities, seniority, roles };
  },
});
