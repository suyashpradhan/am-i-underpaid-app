export type Verdict = "underpaid" | "fair" | "above";
export type Confidence = "high" | "medium" | "low";

// Buckets experience so nearby years share a cached band (2 vs 3 yrs shouldn't
// both burn an API call). Tune boundaries once real data is in.
export function yearsBucket(years: number): string {
  if (years <= 1) return "0-1";
  if (years <= 3) return "2-3";
  if (years <= 6) return "4-6";
  if (years <= 10) return "7-10";
  return "10+";
}

export function seniorityLabel(years: number): string {
  if (years <= 2) return "junior / entry-level";
  if (years <= 5) return "mid-level";
  if (years <= 9) return "senior";
  return "staff or principal level";
}

// NO skills in the key — that's what keeps the budget bounded (Option 3).
export function buildCacheKey(
  discipline: string,
  city: string,
  years: number,
  workMode = "ic",
  workDescription = "",
): string {
  const context = workDescription.trim().toLowerCase().replace(/\s+/g, " ");
  let contextHash = 2166136261;
  for (let i = 0; i < context.length; i++) {
    contextHash ^= context.charCodeAt(i);
    contextHash = Math.imul(contextHash, 16777619);
  }
  const fingerprint = context ? (contextHash >>> 0).toString(36) : "none";
  return `${discipline.trim().toLowerCase()}|${city.trim().toLowerCase()}|${yearsBucket(years)}|${workMode}|${fingerprint}`;
}

// HAND-CURATED, LABELED AS ESTIMATES. Only the differentiator skills — the ones
// that actually separate strong from baseline. Refine with real data post-launch.
// NOTE: skill strings MUST match the form's DISC_SKILLS exactly (same casing),
// or they won't count toward coverage.
export const HIGH_VALUE_SKILLS: Record<string, string[]> = {
  Frontend: ["Next.js", "System Design", "TypeScript"],
  Backend: ["Go", "Kafka", "Databases", "System Design"],
  "Product Manager": ["Go-to-market", "Stakeholder Mgmt"],
  "Product Designer": ["Design Systems", "Prototyping", "User Research"],
  "Solution Engineer": ["Integrations", "APIs", "Pre-sales"],
  "React Native Engineer": ["TypeScript", "Reanimated", "React Native"],
  "Android Engineer": ["System Design", "Jetpack Compose"],
  "iOS Engineer": ["System Design", "SwiftUI"],
  "SRE/Devops": ["Kubernetes", "Terraform", "AWS", "Observability"],
};

// Fraction of a discipline's high-value skills the user actually selected. 0..1.
export function skillCoverage(discipline: string, skills: string[]): number {
  const hv = HIGH_VALUE_SKILLS[discipline];
  if (!hv || hv.length === 0) return 0;
  const selected = new Set(skills);
  const hits = hv.filter((s) => selected.has(s)).length;
  return Math.max(0, Math.min(1, hits / hv.length));
}

// CHANGED: verdict is now band membership. bandLow/bandHigh are p25/p75.
export function computeVerdict(
  currentPay: number,
  bandLow: number,
  bandHigh: number,
): Verdict {
  if (currentPay < bandLow) return "underpaid";
  if (currentPay > bandHigh) return "above";
  return "fair";
}

// UNCHANGED mechanic, clarified role: skills place the fair point inside the
// band. This now feeds the QUOTE, not the verdict.
export function fairPoint(
  bandLow: number,
  bandHigh: number,
  coverage: number,
): number {
  return bandLow + coverage * (bandHigh - bandLow);
}

// The negotiation-ready number: the user's fair point, never below what they
// already earn (no point quoting less than your current pay).
export function quoteNumber(fp: number, currentPay: number): number {
  return Math.max(Math.round(fp), currentPay);
}

// Directional percentile: currentPay's position across the band, 1..99.
// Placeholder shape, not a distribution fit. Revisit with real data.
export function computePercentile(
  currentPay: number,
  bandLow: number,
  median: number,
  bandHigh: number,
): number {
  let pct: number;
  if (currentPay <= median) {
    const span = median - bandLow || 1;
    pct = 25 + ((currentPay - bandLow) / span) * 25;
  } else {
    const span = bandHigh - median || 1;
    pct = 50 + ((currentPay - median) / span) * 25;
  }
  return Math.max(1, Math.min(99, Math.round(pct)));
}
