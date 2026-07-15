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
  levers = defaultLevers(),
  confidence = 'medium',
  uncertain = false,
  onRecheck,
  onShare,
  onStartTip,
  tipAmount = '₹30',
  onTipAmountChange,
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
      ? "You're paid fairly. If you want to push higher, here's where the room is."
      : "You're ahead of the pack. Here's how to stay there.";

  const verdictBadge = isUnder ? 'UNDERPAID' : isFair ? 'AT MARKET' : 'ABOVE MARKET';

  const upsideHead = isUnder
    ? `You're leaving ₹${gap}L on the table. Here's where it is.`
    : isFair
      ? "You're at market. Here's where the room is."
      : "You're ahead. Here's how to stay there.";

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
    <div className="result">
      <div className="result__topbar">
        <div className="brand">
          <span className="brand__dot" />
          <span className="brand__name">amiunderpaid<span className="brand__accent">.in</span></span>
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

        {/* RIGHT COLUMN — free upside + tip jar */}
        <div className="result__col">
          <EvidencePanel sources={sources} confidence={confidence} uncertain={uncertain} roleLabel={roleLabel} city={city} />
          <div className="upside">
            <div className="upside__eyebrow">
              <span>WHERE'S YOUR UPSIDE</span>
              <span className="upside__free-badge">Free</span>
            </div>
            <h3 className="upside__headline">{upsideHead}</h3>
            <p className="upside__intro">
              Real levers for a {roleLabel} in {city}. Each one links to a public source you can click.
            </p>

            <LeverGroup title="Capability signals" items={levers.skills} />
            <LeverGroup title="Cities that pay more" items={levers.cities} />
            <LeverGroup title="Your seniority curve" items={levers.seniority} />
            <LeverGroup title="Roles to pivot to" items={levers.roles} />

            {!levers.skills?.length && !levers.cities?.length && !levers.seniority?.length && !levers.roles?.length && (
              <div className="upside__empty">
                We found your market range, but not enough evidence to claim a specific move will increase your pay. We won’t invent recommendations.
              </div>
            )}

            <p className="upside__disclaimer">
              Estimates from public data. Not affiliated with any of these sources.
            </p>
          </div>

          <div className="tip-jar">
            <div className="tip-jar__header">
              <span className="tip-jar__icon">
                <span className="coffee-cup" />
              </span>
              <div>
                <div className="tip-jar__title">Free tool, built in public.</div>
                <div className="tip-jar__subtitle">If it helped, buy me a coffee. Totally optional.</div>
              </div>
            </div>
            <div className="tip-jar__chips">
              {['₹20', '₹30', '$1', 'Custom'].map(label => (
                <button
                  key={label}
                  type="button"
                  className={`tip-chip ${tipAmount === label ? 'tip-chip--active' : ''}`}
                  onClick={() => onTipAmountChange && onTipAmountChange(label)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn--dark" style={{ width: '100%', height: 50, marginTop: 16 }} onClick={onStartTip}>
              Buy a coffee · {tipAmount}
            </button>
          </div>
        </div>
      </div>
    </div>
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
    <section className="evidence-panel">
      <div className="evidence-panel__eyebrow">How we reached this range</div>
      <h2>Evidence for {roleLabel} in {city}</h2>
      <div className={`confidence confidence--${conf}`}><span /> <strong>{meta.label}</strong> · {meta.copy}</div>
      <div className="evidence-panel__sources">
        {sources.length ? sources.map((source, index) => (
          <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{source.label}</strong>
            <b aria-hidden="true">↗</b>
          </a>
        )) : <p>No public source links were returned for this estimate.</p>}
      </div>
    </section>
  );
}

function LeverGroup({ title, items }) {
  if (!items || !items.length) return null;
  return (
    <div className="lever-group">
      <div className="lever-group__title">{title}</div>
      <div className="lever-group__list">
        {items.map(item => (
          <div key={item.title} className="lever-card">
            <div>
              <div className="lever-card__title">{item.title}</div>
              {item.source && <a href={item.source.url} target="_blank" rel="noopener noreferrer" className="lever-card__source">
                {item.source.label} &#8599;
              </a>}
            </div>
            <div className="lever-card__stats">
              <div className="lever-card__delta">{item.delta}</div>
              <div className="lever-card__band">{item.newBand}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function defaultLevers() {
  return {
    skills: [
      { title: 'Add System Design', delta: '+₹4L', newBand: '→ ₹27–28L', source: { label: 'levels.fyi — Bengaluru SWE', url: 'https://www.levels.fyi/t/software-engineer/locations/india-bengaluru' } },
      { title: 'Go deep on Next.js (SSR)', delta: '+₹2L', newBand: '→ ₹25–26L', source: { label: 'Michael Page Salary Guide', url: 'https://www.michaelpage.co.in/salary-guide' } },
    ],
    cities: [
      { title: 'Gurgaon', delta: '+₹4L', newBand: '→ ₹24–28L', source: { label: 'MoSPI wage data', url: 'https://www.mospi.gov.in/' } },
      { title: 'Remote · US clients', delta: '+₹12L', newBand: '→ ₹30–45L', source: { label: 'levels.fyi — remote roles', url: 'https://www.levels.fyi/' } },
    ],
    seniority: [
      { title: 'Senior Engineer · 5–7 yrs', delta: '+₹14L', newBand: '→ ₹32–40L', source: { label: 'Michael Page Salary Guide', url: 'https://www.michaelpage.co.in/salary-guide' } },
    ],
    roles: [
      { title: 'Solutions Engineer', delta: '+₹8L', newBand: '→ ₹26–34L', source: { label: 'Economic Times — tech pay', url: 'https://economictimes.indiatimes.com/tech' } },
      { title: 'Engineering Manager', delta: '+₹22L', newBand: '→ ₹40–55L', source: { label: 'levels.fyi — Eng Manager', url: 'https://www.levels.fyi/t/engineering-manager/locations/india-bengaluru' } },
    ],
  };
}
