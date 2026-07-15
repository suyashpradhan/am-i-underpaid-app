import React, { useEffect, useRef, useState } from 'react';
import './Result.css';

/**
 * Result screen — covers all three verdict variants (underpaid / at-market /
 * above-market) plus the free "Where's your upside" section and the tip jar.
 * Two-column layout on desktop (verdict+share left, upside+tip right),
 * stacks to one scrollable column below ~660px.
 *
 * Props (wire these to your real computed result):
 *  name            string   e.g. "Raj"
 *  roleLabel       string   e.g. "frontend engineer"
 *  city            string   e.g. "Bangalore"
 *  verdict         'underpaid' | 'fair' | 'above'
 *  percentile      number   0-100
 *  currentAmount   number   in lakhs, e.g. 18
 *  bandLow         number   in lakhs, e.g. 22
 *  bandHigh        number   in lakhs, e.g. 24
 *  quoteAmount     number   in lakhs, e.g. 24 — "the number to quote"
 *  poolRank        number   e.g. 1204
 *  sources         array of { label, url } — plain-text outbound citations
 *  levers          object grouped as { skills: [], cities: [], seniority: [], roles: [] }
 *                  each lever: { title, delta: '+₹4L', newBand: '→ ₹27–28L', source: {label, url} }
 *  onRecheck       () => void
 *  onShare         () => void
 *  onStartTip      () => void
 *  tipAmount       string   currently selected chip, e.g. '₹30'
 */
export default function Result({
  name = 'Raj',
  roleLabel = 'frontend engineer',
  city = 'Bangalore',
  verdict = 'underpaid',
  percentile = 22,
  currentAmount = 18,
  bandLow = 22,
  bandHigh = 24,
  quoteAmount = 24,
  poolRank = 1204,
  sources = [
    { label: 'levels.fyi — Bengaluru software roles', url: 'https://www.levels.fyi/t/software-engineer/locations/india-bengaluru' },
    { label: 'Michael Page India Salary Guide', url: 'https://www.michaelpage.co.in/salary-guide' },
    { label: 'MoSPI — Periodic Labour Force Survey', url: 'https://www.mospi.gov.in/' },
    { label: 'Economic Times — tech salary coverage', url: 'https://economictimes.indiatimes.com/tech' },
  ],
  confidence = 'medium',
  uncertain = false,
  onRecheck,
  onShare,
  onStartTip,
  tipAmount = '₹20',
  onTipAmountChange,
  onFeedback,
}) {
  const isUnder = verdict === 'underpaid';
  const isAbove = verdict === 'above';
  const isFair = verdict === 'fair';
  const accent = isAbove ? 'green' : 'coral';

  const gap = Math.max(0, quoteAmount - currentAmount);
  const gapPct = currentAmount > 0 ? Math.round((gap / currentAmount) * 100) : 0;

  const head = isUnder
    ? `${name ? name + ', ' : ''}you're underpaid.`
    : isFair
      ? "You're right around market."
      : "You're paid above market. Nice.";

  const sub = isUnder
    ? `You earn less than ${100 - percentile}% of ${roleLabel}s in ${city}.`
    : isFair
      ? `You're in the ${percentile}th percentile for ${roleLabel}s in ${city}.`
      : `You earn more than ${percentile}% of ${roleLabel}s in ${city}.`;

  const frame = isUnder
    ? `You're leaving about ₹${gap}L on the table. That's roughly +${gapPct}%.`
    : isFair
      ? "Your current compensation sits inside the estimated market range."
      : "Your current compensation sits above the estimated market range.";

  const verdictBadge = isUnder ? 'UNDERPAID' : isFair ? 'AT MARKET' : 'ABOVE MARKET';

  const [feedbackState, setFeedbackState] = useState('idle');
  const [coffeeOpen, setCoffeeOpen] = useState(false);
  const [coffeeBump, setCoffeeBump] = useState(0);

  async function sendFeedback() {
    if (feedbackState !== 'idle') return;
    setFeedbackState('sending');
    try {
      await onFeedback?.();
      setFeedbackState('sent');
    } catch {
      setFeedbackState('error');
    }
  }

  function selectTip(label) {
    onTipAmountChange?.(label);
    setCoffeeBump(value => value + 1);
  }

  // --- count-up animation for the hero number ---
  const [heroDisplay, setHeroDisplay] = useState(0);
  const [barReady, setBarReady] = useState(false);
  const rafRef = useRef(null);

  useEffect(() => {
    setHeroDisplay(0);
    setBarReady(false);
    const target = quoteAmount;
    const dur = 1050;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setHeroDisplay(eased * target);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    const barTimer = setTimeout(() => setBarReady(true), 180);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(barTimer);
    };
  }, [quoteAmount]);

  // Range-bar math — clamp visual scale so bars stay legible
  const rawMin = Math.min(currentAmount, bandLow, quoteAmount);
  const rawMax = Math.max(currentAmount, bandHigh, quoteAmount);
  const visualPadding = Math.max(2, (rawMax - rawMin) * 0.22);
  const BAR_MIN = Math.max(0, rawMin - visualPadding), BAR_MAX = rawMax + visualPadding;
  const pos = (x) => Math.max(2, Math.min(98, ((x - BAR_MIN) / (BAR_MAX - BAR_MIN)) * 100));
  const bandL = pos(bandLow), bandR = pos(bandHigh);
  const markerLeft = barReady ? pos(currentAmount) : 2;

  return (
    <>
    <div className="result">
      <div className="result__topbar">
        <div className="brand">
        </div>
        <button type="button" className="btn btn--secondary" style={{ height: 36, padding: '0 14px', fontSize: 13, borderRadius: 999 }} onClick={onRecheck}>
          Recheck
        </button>
      </div>

      <div className="result__grid">
        {/* LEFT COLUMN — verdict card + share CTA */}
        <div className="result__col">
          <div className="result-card">
            <span className={`badge badge--${accent}`}>{verdictBadge}</span>
            <h1 className="result-card__headline">{head}</h1>
            <p className="result-card__sub">{sub}</p>

            {/* Range bar */}
            <div className="range-bar-block">
              <div className="range-bar">
                <div
                  className={`range-bar__band range-bar__band--${accent}`}
                  style={{ left: `${bandL}%`, width: `${bandR - bandL}%` }}
                />
                <div className="range-bar__marker" style={{ left: `${markerLeft}%` }}>
                  <div className="range-bar__marker-tag">You · ₹{currentAmount}L</div>
                  <div className="range-bar__marker-arrow" />
                  <div className={`range-bar__marker-dot range-bar__marker-dot--${accent}`} />
                </div>
              </div>
              <div className="range-bar__legend">
                <span className="range-bar__legend-item">
                  <span className={`legend-dot legend-dot--${accent}`} /> You · ₹{currentAmount}L
                </span>
                <span className="range-bar__legend-item">
                  <span className={`legend-swatch legend-swatch--${accent}`} /> Fair band · ₹{bandLow}–{bandHigh}L
                </span>
              </div>
            </div>

            {/* Hero number */}
            <div className="hero-block">
              <div className="hero-block__label">The number to quote</div>
              <div className={`hero-block__number hero-block__number--${accent}`}>
                ₹{Math.round(heroDisplay)}L
              </div>
              <div className={`hero-block__frame hero-block__frame--${accent}`}>{frame}</div>
            </div>

            <div className="pool-note">
              You're the {Number(poolRank || 0).toLocaleString('en-IN')}th person to check. Every check sharpens the next.
            </div>
          </div>

          <button type="button" className="btn btn--primary btn--lg share-cta" onClick={onShare}>
            <span className="share-cta__dots">
              <span /><span /><span />
            </span>
            Share this
          </button>
        </div>

        {/* RIGHT COLUMN — evidence and feedback */}
        <div className="result__col">
          <EvidencePanel sources={sources} confidence={confidence} uncertain={uncertain} roleLabel={roleLabel} city={city} />
          <div className="feedback-card">
            <div><strong>Does this comparison look wrong?</strong><span>Your feedback helps us catch mismatched roles and sources.</span></div>
            <button type="button" onClick={sendFeedback} disabled={feedbackState === 'sending' || feedbackState === 'sent'}>
              {feedbackState === 'sent' ? 'Thanks — reported' : feedbackState === 'sending' ? 'Sending…' : feedbackState === 'error' ? 'Try again' : 'This looks incorrect'}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div className={`coffee-widget ${coffeeOpen ? 'coffee-widget--open' : ''}`}>
        {coffeeOpen && (
          <div className="coffee-widget__panel">
            <button className="coffee-widget__close" type="button" aria-label="Close coffee widget" onClick={() => setCoffeeOpen(false)}>×</button>
            <div className="coffee-widget__title">Buy me a coffee</div>
            <p>Am I Underpaid is free and built in public.</p>
            <div className="coffee-widget__amounts">
              {['₹10', '₹20', '₹50'].map(label => <button key={label} type="button" className={tipAmount === label ? 'is-active' : ''} onClick={() => selectTip(label)}>{label}</button>)}
            </div>
            <button type="button" className="coffee-widget__pay" onClick={onStartTip}>Continue with {tipAmount}</button>
          </div>
        )}
        <button type="button" className="coffee-widget__trigger" aria-label="Buy me a coffee" aria-expanded={coffeeOpen} onClick={() => setCoffeeOpen(open => !open)}>
          <span key={coffeeBump} className={coffeeBump ? 'coffee-widget__cup coffee-widget__cup--cheer' : 'coffee-widget__cup'}>
            <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M13 17h34v24a13 13 0 0 1-13 13h-8a13 13 0 0 1-13-13V17Z"/><path d="M47 23h4a9 9 0 0 1 0 18h-4"/><path d="M22 10c-4-4 4-5 0-9M34 10c-4-4 4-5 0-9"/></svg>
          </span>
        </button>
      </div>
      </>
  );
}

function EvidencePanel({ sources, confidence, uncertain, roleLabel, city }) {
  const conf = uncertain ? 'low' : confidence;
  const meta = {
    high: { label: 'Strong match', copy: 'Multiple relevant sources support this estimate.' },
    medium: { label: 'Directional match', copy: 'Useful as a guide; titles and company tiers vary.' },
    low: { label: 'Limited evidence', copy: 'Treat this as a starting point and inspect the sources.' },
  }[conf] || { label: 'Directional match', copy: 'Treat this estimate as a guide.' };

  return (
    <section className="evidence-panel evidence-panel--right">
      <div className="evidence-panel__eyebrow">Evidence quality</div>
      <div className={`confidence confidence--${conf}`}><span /> <strong>{meta.label}</strong> · {meta.copy}</div>
      <div className="evidence-panel__heading">Salary comparison sources</div>
      <p className="evidence-panel__context">Evidence used for {roleLabel} in {city}</p>
      <div className="evidence-panel__details">
        <div className="evidence-panel__sources">
          {sources.length ? sources.map((source, index) => (
            <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
              <span>{String(index + 1).padStart(2, '0')}</span><strong>{source.label}</strong><b aria-hidden="true">↗</b>
            </a>
          )) : <p>No relevant public source links were returned.</p>}
        </div>
      </div>
    </section>
  );
}
