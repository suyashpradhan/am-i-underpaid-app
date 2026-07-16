import { useState, useCallback, useEffect } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { usePostHog } from "@posthog/react";
import { api } from "../convex/_generated/api";
import "./index.css";

import IntakeForm from "./components/IntakeForm";
import Calculating from "./components/Calculating";
import Result from "./components/Result";
import Payment from "./components/Payment";
import ShareSheet from "./components/ShareSheet";
import EdgeStates from "./components/EdgeStates";
import ReturningUser from "./components/ReturningUser";
import ErrorBoundary from "./components/ErrorBoundary";

/**
 * App — screen router wired to the real Convex `getVerdict` action.
 * Design components are untouched; this file only orchestrates them and maps
 * the API response into the props each screen expects.
 */

type Screen =
  | "landing"
  | "intake"
  | "calculating"
  | "result"
  | "payment"
  | "edge-thin"
  | "edge-error"
  | "returning";

const ROLE_SINGULAR: Record<string, string> = {
  Frontend: "frontend engineer",
  Backend: "backend engineer",
  "Product Manager": "product manager",
  "Product Designer": "product designer",
  "Solution Engineer": "solution engineer",
  "SRE/Devops": "DevOps engineer",
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [formData, setFormData] = useState<any>(null);
  const [resultData, setResultData] = useState<any>(null);
  const [tipAmount, setTipAmount] = useState("₹20");
  const [paymentPhase, setPaymentPhase] = useState("redirect");
  const [shareOpen, setShareOpen] = useState(false);
  const [broaderAttempted, setBroaderAttempted] = useState(false);

  const getVerdict = useAction(api.payCheck.getVerdict);
  const reportIncorrect = useMutation(api.feedback.reportIncorrect);
  const reportMissingRole = useMutation(api.feedback.reportMissingRole);
  const checkCount = useQuery(api.checks.count);
  const posthog = usePostHog();

  useEffect(() => {
    posthog?.capture("landing_view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // IntakeForm submits -> fire the REAL API call, then route on the result.
  const handleFormSubmit = useCallback(
    async (data: any, preserveOriginal = false) => {
      if (!preserveOriginal) {
        setFormData(data);
        setBroaderAttempted(false);
      }
      setResultData(null); // clear any previous result so nothing stale can render
      const isFreelancer = data.employment === "freelancer";

      posthog?.capture("check_submitted", {
        employment: data.employment,
        discipline: data.discipline,
        city: data.city,
        years: Number(data.years) || 0,
        work_mode: data.workMode,
        location_mode: data.locationMode,
        company_type: data.companyType,
        company_hq: data.companyHq,
        compensation_type: data.compensationType,
      });

      setScreen("calculating");

      // Salaried uses `salary` (LPA). Freelancer uses `rate` — note this is a
      // rate, not annualized LPA yet (open item), so freelancer numbers are
      // not trustworthy until the annualization rule is decided.
      const currentPay = isFreelancer
        ? Number(data.rate) || 0
        : Number(data.salary) || 0;

      try {
        const res: any = await getVerdict({
          isFreelancer,
          discipline: data.discipline || "Frontend",
          skills: data.skills || [],
          workDescription: data.workDescription || "",
          workMode: data.workMode || "ic",
          companyType: data.companyType || "unsure",
          companyHq: data.companyHq || "Not specified",
          compensationType: data.compensationType || "total",
          locationMode: data.locationMode || "city",
          city: (data.city || "").trim() || "Bangalore",
          yearsExperience: Number(data.years) || 0,
          currentPay,
        });

        // Route to the limited-data screen only on GENUINE thinness: no data,
        // or low confidence. An extreme percentile against a solid band is a
        // real "above/underpaid" verdict, not a reason to hedge — it shows as a
        // normal result with the confidence dot.
        if (res.noData || res.confidence === "low") {
          setResultData(mapResult(res, data, currentPay));
          setScreen("edge-thin");
          posthog?.capture("result_viewed", {
            variant: res.verdict,
            percentile: res.percentile,
            uncertain: true,
          });
          return;
        }

        const mapped = mapResult(res, data, currentPay);
        setResultData(mapped);
        setScreen("result");
        posthog?.capture("result_viewed", {
          variant: res.verdict,
          percentile: res.percentile,
          uncertain: false,
        });
      } catch (e) {
        // Never dead-end: route to the error edge state with retry.
        setScreen("edge-error");
      }
    },
    [getVerdict, posthog],
  );

  function startTip() {
    posthog?.capture("tip_clicked", { amount: tipAmount });
    setPaymentPhase("redirect");
    setScreen("payment");
    // TODO Phase 4: real Dodo checkout redirect. Simulated for now.
    setTimeout(() => setPaymentPhase("thankyou"), 1900);
  }

  const shareCardProps = resultData
    ? {
        isAbove: resultData.verdict === "above",
        headline:
          resultData.verdict === "underpaid"
            ? `I'm underpaid by ₹${Math.max(0, resultData.quoteAmount - resultData.currentAmount)}L.`
            : resultData.verdict === "fair"
              ? "I'm right at market."
              : "I'm paid above market.",
        subline:
          resultData.verdict === "underpaid"
            ? `I earn less than ${100 - resultData.percentile}% of ${resultData.roleLabel}s in ${resultData.city}.`
            : `I earn more than ${resultData.percentile}% of ${resultData.roleLabel}s in ${resultData.city}.`,
        bandText: `₹${resultData.bandLow}–${resultData.bandHigh}L`,
        quoteText: `₹${resultData.quoteAmount}L`,
      }
    : null;

  return (
    <ErrorBoundary
      onReset={() => {
        setResultData(null);
        setScreen("landing");
      }}
    >
      <div className="app-shell">
        {(screen === "landing" || screen === "intake") && (
          <IntakeForm
            onSubmit={handleFormSubmit}
            initialValues={formData || {}}
          />
        )}

        {screen === "calculating" && (
          <Calculating
            roleLabel={
              (formData &&
                (ROLE_SINGULAR[formData.discipline] ||
                  (formData.discipline || "").toLowerCase())) ||
              "your role"
            }
            city={(formData?.city || "").trim() || "your city"}
            onDone={() => {
              /* API drives navigation; nothing to do here */
            }}
          />
        )}

        {screen === "result" && resultData && (
          <>
            <Result
              {...resultData}
              checkCount={checkCount}
              tipAmount={tipAmount}
              onTipAmountChange={setTipAmount}
              onRecheck={() => setScreen("intake")}
              onShare={() => {
                posthog?.capture("share_clicked", {
                  channel: "open",
                  variant: resultData.verdict,
                });
                setShareOpen(true);
              }}
              onStartTip={startTip}
              onFeedback={async () => {
                await reportIncorrect({
                  role: resultData.roleLabel,
                  city: resultData.city,
                  verdict: resultData.verdict,
                });
                posthog?.capture("result_feedback", {
                  reason: "incorrect",
                  role: resultData.roleLabel,
                });
              }}
            />
            {shareOpen && (
              <ShareSheet
                shareCardProps={shareCardProps}
                caption={captionFor(resultData)}
                link={`am-i-underpaid.in`}
                onClose={() => setShareOpen(false)}
                onStartTip={startTip}
              />
            )}
          </>
        )}

        {screen === "payment" && (
          <Payment
            phase={paymentPhase}
            tipAmount={tipAmount}
            onBackToResult={() => setScreen("result")}
          />
        )}

        {screen === "edge-thin" && (
          <EdgeStates
            variant="thin"
            city={
              resultData?.city || (formData?.city || "").trim() || "your city"
            }
            roleLabel={resultData?.roleLabel || "professionals"}
            currentAmount={resultData?.currentAmount}
            bandLow={resultData?.bandLow}
            bandHigh={resultData?.bandHigh}
            sources={resultData?.sources || []}
            noData={resultData?.noData}
            comparisonSummary={resultData?.comparisonSummary}
            profile={{
              role: resultData?.roleLabel,
              seniority: resultData?.comparisonSummary,
              location: resultData?.city,
              currentPay: resultData?.currentAmount,
            }}
            canBroaden={
              !broaderAttempted &&
              Boolean(formData) &&
              (formData.companyType !== "unsure" ||
                formData.companyHq !== "Not specified")
            }
            onBroaden={() => {
              if (!formData) return;
              setBroaderAttempted(true);
              posthog?.capture("broader_comparison_requested", {
                role: formData.discipline,
                location_mode: formData.locationMode,
              });
              void handleFormSubmit(
                {
                  ...formData,
                  companyType: "unsure",
                  companyHq: "Not specified",
                },
                true,
              );
            }}
            onReportMissing={async () => {
              if (!formData) return;
              await reportMissingRole({
                role: String(formData.discipline || "").slice(0, 80),
                city: String(formData.city || "").slice(0, 80),
                yearsExperience: Number(formData.years) || 0,
                companyType: String(formData.companyType || "unsure"),
              });
              posthog?.capture("missing_role_reported", {
                role: formData.discipline,
              });
            }}
            onRetry={() => formData && handleFormSubmit(formData)}
            onBackToForm={() => setScreen("intake")}
          />
        )}

        {screen === "edge-error" && (
          <EdgeStates
            variant="error"
            city={
              resultData?.city || (formData?.city || "").trim() || "your city"
            }
            roleLabel={resultData?.roleLabel || "professionals"}
            currentAmount={resultData?.currentAmount}
            bandLow={resultData?.bandLow}
            bandHigh={resultData?.bandHigh}
            sources={resultData?.sources || []}
            onRetry={() => formData && handleFormSubmit(formData)}
            onBackToForm={() => setScreen("intake")}
          />
        )}

        {screen === "returning" && (
          <ReturningUser onRecheck={() => setScreen("intake")} />
        )}
      </div>
    </ErrorBoundary>
  );
}

// Maps the Convex getVerdict response + form data into Result's prop shape.
// Every field is coerced to a safe value so the UI can never crash on
// undefined/null/NaN, regardless of what the API returns.
function mapResult(res: any, form: any, currentPay: number) {
  const r = res || {};
  const disc = (form && form.discipline) || "Frontend";
  const num = (v: any, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const verdict: "underpaid" | "fair" | "above" =
    r.verdict === "underpaid" || r.verdict === "above" || r.verdict === "fair"
      ? r.verdict
      : "fair";

  return {
    name: (form && form.name) || "",
    roleLabel: ROLE_SINGULAR[disc] || String(disc).toLowerCase(),
    city: ((form && form.city) || "your city").trim() || "your city",
    verdict,
    percentile: num(r.percentile),
    currentAmount: num(currentPay),
    bandLow: num(r.bandLow),
    bandHigh: num(r.bandHigh),
    quoteAmount: num(r.quote, num(currentPay)),
    confidence:
      r.confidence === "high" || r.confidence === "medium"
        ? r.confidence
        : "low",
    uncertain: Boolean(r.uncertain),
    noData: Boolean(r.noData),
    comparisonSummary:
      String(r.comparisonSummary || "").trim() ||
      `${form.workMode === "manager" ? "People managers" : "Individual contributors"} at ${String(form.companyType || "similar").replace(/_/g, " ")} companies, using ${form.compensationType === "fixed" ? "fixed salary" : "total compensation"}.`,
    sources: Array.isArray(r.sources)
      ? r.sources
          .filter((s: any) => s && s.url && s.name)
          .map((s: any) => ({ label: String(s.name), url: String(s.url) }))
      : [],
  };
}

function captionFor(r: any) {
  const gap = Math.max(0, r.quoteAmount - r.currentAmount);
  if (r.verdict === "underpaid")
    return `Just found out I'm underpaid by ₹${gap}L. Check yours: am-i-underpaid.in`;
  if (r.verdict === "fair")
    return `Turns out I'm right at market as a ${r.roleLabel} in ${r.city}. Check yours: am-i-underpaid.in`;
  return `Turns out I'm paid above market as a ${r.roleLabel} in ${r.city}. Check yours: am-i-underpaid.in`;
}
