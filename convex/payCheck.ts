"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  buildCacheKey,
  computePercentile,
  computeVerdict,
  quoteNumber,
  seniorityLabel,
  skillCoverage,
  yearsBucket,
  type Confidence,
} from "./lib/verdict";

const LINKUP_URL = "https://api.linkup.so/v1/search";

const STRUCTURED_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    bandLow: {
      type: "number",
      description:
        "25th percentile of total annual compensation, in INR LPA, for this exact role, city, and experience level.",
    },
    median: {
      type: "number",
      description:
        "Median (50th percentile) of total annual compensation, in INR LPA, for this role/city/experience.",
    },
    bandHigh: {
      type: "number",
      description:
        "75th percentile of total annual compensation, in INR LPA, for this role/city/experience.",
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
      description:
        "How much reliable current public data exists for this exact role/city/experience.",
    },
    matchedTitles: {
      type: "array",
      items: { type: "string" },
      description:
        "The exact or closely comparable job titles used to form the band.",
    },
    senioritySupported: {
      type: "boolean",
      description:
        "Whether the evidence specifically supports the requested experience/seniority cohort.",
    },
    companyContextSupported: {
      type: "boolean",
      description:
        "Whether the evidence supports the requested company type or headquarters pay market.",
    },
  },
  required: ["bandLow", "median", "bandHigh", "confidence"],
});

type LinkupSource = { name: string; url: string };
type VerdictResult = {
  bandLow: number;
  bandHigh: number;
  median: number;
  confidence: Confidence;
  sources: LinkupSource[];
  coverage: number;
  fairPoint: number;
  verdict: ReturnType<typeof computeVerdict>;
  percentile: number;
  quote: ReturnType<typeof quoteNumber>;
  uncertain: boolean;
  noData: boolean;
  comparisonSummary: string;
};
type LinkupResponse = {
  // Linkup can return null for any field when public data is thin, even though
  // the structured schema marks them required — so treat every band as nullable.
  data: {
    bandLow: number | null;
    bandHigh: number | null;
    median: number | null;
    confidence: Confidence | null;
    matchedTitles?: string[] | null;
    senioritySupported?: boolean | null;
    companyContextSupported?: boolean | null;
  };
  sources: Array<{
    name: string;
    url: string;
    content?: string;
    favicon?: string;
  }>;
};

function usableBand(data: LinkupResponse["data"]): data is {
  bandLow: number;
  bandHigh: number;
  median: number;
  confidence: Confidence | null;
  matchedTitles?: string[] | null;
  senioritySupported?: boolean | null;
  companyContextSupported?: boolean | null;
} {
  const { bandLow, median, bandHigh } = data;
  return (
    [bandLow, median, bandHigh].every(
      (value) => typeof value === "number" && Number.isFinite(value),
    ) &&
    bandLow! > 0 &&
    bandLow! <= median! &&
    median! <= bandHigh! &&
    bandHigh! <= 500
  );
}

function relevantSources(
  sources: LinkupResponse["sources"],
  role: string,
): LinkupResponse["sources"] {
  const normalizedRole = role.toLowerCase();
  const roleFamilies: Array<{ test: RegExp; terms: RegExp }> = [
    {
      test: /product designer|product design lead|head of product design/,
      terms:
        /product designer|product design lead|ux designer|user experience designer|head of product design/,
    },
    {
      test: /solutions? engineer|pre[- ]?sales/,
      terms:
        /solutions? engineer|sales engineer|pre[- ]?sales engineer|customer engineer/,
    },
    {
      test: /platform|infrastructure|devops|site reliability|\bsre\b/,
      terms:
        /platform engineer|infrastructure engineer|devops|site reliability|\bsre\b|developer platform/,
    },
    {
      test: /forward deployed/,
      terms:
        /forward deployed|deployment strategist|customer engineer|solutions? engineer/,
    },
  ];
  const family = roleFamilies.find(({ test }) => test.test(normalizedRole));
  const genericWords = new Set([
    "senior",
    "junior",
    "lead",
    "leader",
    "head",
    "vp",
    "vice",
    "president",
    "engineer",
    "engineering",
    "manager",
    "india",
    "remote",
  ]);
  const roleTerms = normalizedRole
    .split(/[^a-z0-9+#.]+/)
    .filter((word) => word.length > 2 && !genericWords.has(word));

  return (sources ?? []).filter((source) => {
    const evidence =
      `${source.name} ${source.url} ${source.content ?? ""}`.toLowerCase();
    if (family) return family.terms.test(evidence);
    return (
      roleTerms.length === 0 ||
      roleTerms.some((term) => evidence.includes(term))
    );
  });
}

export const getVerdict = action({
  args: {
    isFreelancer: v.boolean(),
    discipline: v.string(),
    workDescription: v.string(),
    workMode: v.union(v.literal("ic"), v.literal("manager")),
    companyType: v.union(
      v.literal("early_stage"),
      v.literal("growth_stage"),
      v.literal("large_product"),
      v.literal("services_agency"),
      v.literal("unsure"),
    ),
    companyHq: v.string(),
    compensationType: v.union(v.literal("fixed"), v.literal("total")),
    locationMode: v.union(v.literal("city"), v.literal("remote")),
    skills: v.array(v.string()),
    city: v.string(),
    yearsExperience: v.number(),
    // LPA for salaried. Freelancer hourly/project rates must be annualized to
    // LPA before this action — that conversion is still an open decision.
    currentPay: v.number(),
  },
  handler: async (ctx, args): Promise<VerdictResult> => {
    const role = args.discipline.trim();

    if (role.length < 2 || role.length > 80) {
      throw new Error("Invalid job title.");
    }

    if (args.workDescription.length > 240) {
      throw new Error("Work description is too long.");
    }
    if (args.workDescription.trim().length < 10) {
      throw new Error("Please describe the work you do.");
    }
    if (args.companyHq.length > 80) {
      throw new Error("Company headquarters is too long.");
    }

    if (args.yearsExperience < 0 || args.yearsExperience > 50) {
      throw new Error("Invalid experience.");
    }

    if (args.currentPay <= 0 || args.currentPay > 500) {
      throw new Error("Invalid compensation.");
    }

    // Skills do NOT go into the key or the query — band is coarse & cached.
    const cacheKey = buildCacheKey(
      args.discipline,
      args.city,
      args.yearsExperience,
      args.workMode,
      args.workDescription,
      args.companyType,
      args.companyHq,
      args.compensationType,
    );
    const cached = await ctx.runQuery(internal.rateCache.get, { cacheKey });

    let bandLow: number, bandHigh: number, median: number;
    let confidence: Confidence, sources: LinkupSource[];

    if (cached) {
      ({ bandLow, bandHigh, median, confidence, sources } = cached);
    } else {
      const apiKey = process.env.LINKUP_API_KEY ?? process.env.AMIUNDERPAID;
      if (!apiKey)
        throw new Error(
          "LINKUP_API_KEY is not set in Convex environment variables.",
        );

      const seniority = seniorityLabel(args.yearsExperience);

      const role = args.discipline.trim().replace(/\s+/g, " ");

      if (role.length < 2 || role.length > 80) {
        throw new Error("Invalid job title.");
      }
      const city = args.city.trim().replace(/\s+/g, " ").slice(0, 80);

      const workContext = args.workDescription
        ? ` Their actual work is: "${args.workDescription.slice(0, 240)}".`
        : "";
      const track =
        args.workMode === "manager"
          ? "people manager"
          : "individual contributor";
      const companyLabels = {
        early_stage: "an early-stage startup (pre-seed through Series A)",
        growth_stage: "a growth-stage company (Series B through late stage)",
        large_product:
          "a large product company, multinational, or public technology company",
        services_agency: "a services company, consultancy, or agency",
        unsure: "a company whose stage or type is not known",
      } as const;
      const companyContext = companyLabels[args.companyType];
      const hqContext =
        args.companyHq === "Not specified"
          ? "with an unspecified headquarters"
          : `headquartered in ${args.companyHq}`;
      const compensationDefinition =
        args.compensationType === "fixed"
          ? "annual FIXED/BASE cash salary only; exclude bonus, stock, RSUs, and the value of a multi-year grant"
          : "TOTAL annual compensation: fixed/base cash plus annual bonus and only the annualised value of equity/RSUs; never count a full multi-year grant in one year";
      const comparisonSummary = `${seniorityLabel(args.yearsExperience)} ${track}, ${companyContext}, ${hqContext}, in ${args.city}; comparing ${args.compensationType === "fixed" ? "fixed salary" : "total compensation"}.`;
      const buildQuery = (scope: string, cityQualifier: string) =>
        `For a ${seniority} ${track} with the job title "${role}"${cityQualifier}, what is the 25th percentile, median, ` +
        `and 75th percentile of ${compensationDefinition}, in ` +
        `INR lakhs per annum for ${scope}, working at ${companyContext}, ${hqContext}?${workContext} Interpret the title using those responsibilities, ` +
        `management track, and seniority. Search the exact title plus close market-standard comparable titles; ` +
        `do NOT collapse it into a generic "software engineer" average. Base the ` +
        `figures on this seniority level, NOT on averages across all experience levels. Prefer ` +
        `sources that report pay for this specific role and segment by years of experience or ` +
        `seniority (e.g. levels.fyi role/seniority tiers, published salary guides with role and ` +
        `experience bands) over sites that report a single all-levels or all-role average. Match the company ` +
        `segment and headquarters pay market where evidence permits. Do not mix agency/services compensation ` +
        `into a product-company cohort, or vice versa. For Product Designer roles, exclude generic graphic, ` +
        `visual, UI-only, and web designer averages unless the stated responsibilities genuinely match. ` +
        `Cross-check multiple current sources when possible. Return INR LPA numbers, not rupees, ` +
        `monthly pay, or USD. Do not invent a band when the evidence does not support one. ` +
        `Role-family guardrail: a Solution Engineer is a customer-facing pre-sales/technical solutions role, ` +
        `not a Software Engineer. Platform Engineering is infrastructure, reliability, cloud, and developer ` +
        `platform work, not generic application software development. Exclude sources for a different role family.`;

      const callLinkup = async (query: string) => {
        const res = await fetch(LINKUP_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            q: query,
            depth: "standard", // NOT deep/research — 10x–500x pricier, would burn the $50 fast
            outputType: "structured",
            structuredOutputSchema: STRUCTURED_SCHEMA,
            includeSources: true,
            maxResults: 15,
            excludeDomains: ["payscale.com"],
          }),
        });
        if (!res.ok)
          throw new Error(`Linkup failed (${res.status}): ${await res.text()}`);
        return (await res.json()) as LinkupResponse;
      };

      // Single precise query: this exact city + seniority. We deliberately do
      // NOT broaden to all-India on a miss — for senior roles that pulls the
      // junior-heavy national average and poisons the band downward. A genuine
      // miss is better handled as honest "limited data" than a wrong low band.
      let json = await callLinkup(
        buildQuery(
          `${city}, India`,
          ` in ${city}, India with ${args.yearsExperience} years of experience`,
        ),
      );
      let d = json.data;

      // City-level salary evidence is often sparse for niche roles. Retry at
      // India scope, but explicitly downgrade confidence so the UI remains
      // honest about the broader comparison.
      if (!usableBand(d)) {
        json = await callLinkup(
          buildQuery(
            "India",
            ` in India with ${args.yearsExperience} years of experience`,
          ),
        );
        d = json.data;
        if (d.confidence === "high") d.confidence = "medium";
      }

      // A very large gap, or explicit lack of seniority/company support, is a
      // mismatch signal. Spend one extra standard search only for these risky
      // cases instead of making every salary check twice as expensive.
      if (usableBand(d)) {
        const extremeGap =
          args.currentPay > d.bandHigh * 3 || args.currentPay < d.bandLow / 3;
        const weakCohort =
          d.senioritySupported === false ||
          (args.companyType !== "unsure" &&
            d.companyContextSupported === false);
        if (extremeGap || weakCohort) {
          const verification = await callLinkup(
            `Independently verify a current India compensation band for this exact cohort: ${comparisonSummary} ` +
              `Job title: "${role}". Responsibilities: "${args.workDescription.slice(0, 240)}". ` +
              `Return p25, median and p75 in INR LPA. Use sources segmented by the requested seniority and ` +
              `company context; reject junior, all-experience, generic-role, and wrong-role-family averages. ` +
              `Use ${compensationDefinition}. Do not infer a low band merely from broad India averages.`,
          );
          const vd = verification.data;
          const verifiedSources = relevantSources(
            verification.sources ?? [],
            role,
          );
          if (usableBand(vd) && verifiedSources.length > 0) {
            const medianRatio =
              Math.max(d.median, vd.median) / Math.min(d.median, vd.median);
            if (medianRatio > 1.75) {
              d = {
                ...d,
                bandLow: null,
                median: null,
                bandHigh: null,
                confidence: "low",
              };
              json.sources = [...json.sources, ...verification.sources];
            } else if (
              vd.senioritySupported !== false &&
              (args.companyType === "unsure" ||
                vd.companyContextSupported !== false)
            ) {
              d = {
                ...vd,
                confidence: vd.confidence === "high" ? "medium" : vd.confidence,
              };
              json.sources = verification.sources;
            }
          } else if (extremeGap && weakCohort) {
            d = {
              ...d,
              bandLow: null,
              median: null,
              bandHigh: null,
              confidence: "low",
            };
          }
        }
      }

      const finalFilteredSources = relevantSources(json.sources ?? [], role);
      const anchor = finalFilteredSources.length
        ? (d.median ?? d.bandLow ?? d.bandHigh ?? null)
        : null;
      // Thin public data → Linkup nulls out fields despite the required schema.
      // Reject rather than cache/return a broken band.
      if (anchor == null) {
        // Nothing numeric even after broadening. Record the check anyway (so
        // it shows in Convex / analytics) then return a graceful no-data result.
        await ctx.runMutation(internal.checks.record, {
          isFreelancer: args.isFreelancer,
          discipline: args.discipline,
          skills: args.skills,
          coverage: skillCoverage(args.discipline, args.skills),
          city: args.city,
          yearsExperience: args.yearsExperience,
          currentPay: args.currentPay,
          rateUnit: "lpa",
          bandLow: 0,
          bandHigh: 0,
          fairPoint: 0,
          percentile: 0,
          verdict: "fair",
        });
        return {
          bandLow: 0,
          bandHigh: 0,
          median: 0,
          confidence: "low",
          sources: finalFilteredSources.map((s) => ({
            name: s.name,
            url: s.url,
          })),
          coverage: skillCoverage(args.discipline, args.skills),
          fairPoint: 0,
          verdict: "fair",
          percentile: 0,
          quote: args.currentPay,
          uncertain: true,
          noData: true,
          comparisonSummary,
        };
      }
      // Fill any missing bound off the anchor so the band is always usable.
      bandLow = d.bandLow ?? Math.round(anchor * 0.85 * 10) / 10;
      bandHigh = d.bandHigh ?? Math.round(anchor * 1.15 * 10) / 10;
      median = d.median ?? anchor;
      if (!(
        bandLow > 0 &&
        bandLow <= median &&
        median <= bandHigh &&
        bandHigh <= 500
      )) {
        throw new Error(
          `Linkup returned an invalid compensation band for ${role}.`,
        );
      }
      confidence = d.confidence ?? "low";
      sources = finalFilteredSources.map((s) => ({ name: s.name, url: s.url }));

      await ctx.runMutation(internal.rateCache.set, {
        cacheKey,
        discipline: args.discipline,
        city: args.city,
        yearsBucket: yearsBucket(args.yearsExperience),
        bandLow,
        bandHigh,
        median,
        confidence,
        sources,
      });
    }

    const comparisonSummary = `${seniorityLabel(args.yearsExperience)} ${args.workMode === "manager" ? "people manager" : "individual contributor"}, ${args.companyType.replace(/_/g, " ")} company, ${args.companyHq === "Not specified" ? "HQ not specified" : `HQ: ${args.companyHq}`}, in ${args.city}; comparing ${args.compensationType === "fixed" ? "fixed salary" : "total compensation"}.`;

    // With free-text roles there is no preset skill checklist. The cohort
    // median is the honest negotiation anchor; using skill coverage here made
    // every new role silently fall back to p25.
    const coverage = skillCoverage(args.discipline, args.skills);
    const fp = median;
    const verdict = computeVerdict(args.currentPay, bandLow, bandHigh);
    const percentile = computePercentile(
      args.currentPay,
      bandLow,
      median,
      bandHigh,
    );
    const quote = quoteNumber(fp, args.currentPay);
    const uncertain =
      (percentile >= 95 || percentile <= 5) && confidence !== "high";

    await ctx.runMutation(internal.checks.record, {
      isFreelancer: args.isFreelancer,
      discipline: args.discipline,
      skills: args.skills,
      coverage,
      city: args.city,
      yearsExperience: args.yearsExperience,
      currentPay: args.currentPay,
      rateUnit: "lpa",
      bandLow,
      bandHigh,
      fairPoint: fp,
      percentile,
      verdict,
    });

    return {
      bandLow,
      bandHigh,
      median,
      confidence,
      sources,
      coverage,
      fairPoint: fp,
      verdict,
      percentile,
      quote,
      uncertain,
      noData: false,
      comparisonSummary,
    };
  },
});
