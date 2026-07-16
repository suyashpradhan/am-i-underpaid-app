import React, { useState } from 'react';
import './EdgeStates.css';

/**
 * Edge states — Thin data (limited public data, honest lower-confidence
 * estimate) and Error/no-data (calm retry, reassurance nothing was lost).
 * `variant` switches between them; wire onRetry / onBack to your real flow.
 */
export default function EdgeStates({
  variant = "thin",
  city = "your city",
  roleLabel = "professionals",
  currentAmount = undefined,   
  bandLow = undefined,         
  bandHigh = undefined,        
  sources = [],
  noData = false,
  comparisonSummary = '',
  profile = {},
  canBroaden = false,
  onBroaden = () => {},
  onReportMissing = () => {},
  onRetry,
  onBackToForm,
}) {
  const [reportState, setReportState] = useState('idle');

  if (variant === 'error') {
    return (
      <div className="edge">
        <div className="edge__card edge__card--center">
          <div className="edge__error-icon">
            <div className="edge__error-bolt" />
          </div>
          <h1 className="edge__headline">That didn't go through.</h1>
          <p className="edge__body edge__body--center">
            Something hiccuped on our end while pulling the data. Your check is anonymous
            and nothing you typed was lost.
          </p>
          <button type="button" className="btn btn--primary btn--md" style={{ width: '100%', maxWidth: 280 }} onClick={onRetry}>
            Try again
          </button>
          <div style={{ marginTop: 16 }}>
            <button type="button" className="edge__link-btn" onClick={onBackToForm}>Back to my details</button>
          </div>
        </div>
      </div>
    );
  }

  const hasBand = Number(bandLow) > 0 && Number(bandHigh) > 0;
  const payText = Number(currentAmount) > 0 ? `₹${Number(currentAmount)}L` : 'your pay';

  async function reportMissing() {
    if (reportState !== 'idle') return;
    setReportState('sending');
    try {
      await onReportMissing?.();
      setReportState('sent');
    } catch {
      setReportState('error');
    }
  }

  return (
    <div className="edge">
      <div className="edge__card">
        <span className="edge__badge">LIMITED DATA</span>
        <h1 className="edge__headline">{hasBand ? "Here's our best estimate." : "We couldn't calculate a trustworthy range."}</h1>
        <p className="edge__body">
          {hasBand
            ? `We found limited public data for ${roleLabel} in ${city}, so treat this as a starting point — not gospel.`
            : `We found relevant pages for ${roleLabel} in ${city}, but not enough comparable numerical evidence to give you a verdict.`}
        </p>

        {!hasBand && (
          <div className="edge__cohort">
            <strong>What we checked</strong>
            <b>{profile.role || roleLabel}</b>
            <span>{comparisonSummary}</span>
            {Number(profile.currentPay) > 0 && <em>Your current compensation: ₹{Number(profile.currentPay)}L</em>}
          </div>
        )}

        {!hasBand && (
          <div className="edge__why">
            <strong>Why no verdict?</strong>
            <p>The available salary pages did not match enough of your role, seniority, location and company context. Showing a broad junior or generic engineering range would be misleading.</p>
          </div>
        )}

        {hasBand && (
          <div className="edge__range-bar-block">
            <div className="edge__range-bar">
              <div className="edge__range-bar-hatched" />
              <div className="edge__range-bar-dot" />
            </div>
            <div className="edge__legend">
              <span className="edge__legend-item"><span className="edge__legend-dot" /> You · {payText}</span>
              <span className="edge__legend-item"><span className="edge__legend-swatch" /> Estimated band · ~₹{Number(bandLow)}–{Number(bandHigh)}L</span>
            </div>
          </div>
        )}

        <div className="edge__sources">
          <div className="edge__sources-label">{noData || !hasBand ? 'Sources inspected' : 'What we could find'}</div>
          {sources && sources.length > 0 ? (
            sources.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="edge__source-link">
                {s.label} &#8599;
              </a>
            ))
          ) : (
            <p className="edge__body" style={{ margin: '4px 0 0' }}>
              We couldn't find solid public salary data for this exact role and city yet.
            </p>
          )}
          <p className="edge__disclaimer">
            Estimates from public data. Not affiliated with any of these sources. Confidence is lower here.
          </p>
        </div>

        {!hasBand && (
          <div className="edge__actions">
            {canBroaden && <button type="button" className="btn btn--primary btn--md" onClick={onBroaden}>Compare with broader market</button>}
            <button type="button" className="btn btn--secondary btn--md" onClick={onBackToForm}>Edit my details</button>
            <button type="button" className="edge__report" onClick={reportMissing} disabled={reportState === 'sending' || reportState === 'sent'}>
              {reportState === 'sent' ? 'Thanks — role reported' : reportState === 'sending' ? 'Reporting…' : reportState === 'error' ? 'Try reporting again' : 'Report missing role data'}
            </button>
            {canBroaden && <small>A broader comparison removes company stage and headquarters constraints only. It keeps your role, seniority, location and compensation type.</small>}
          </div>
        )}
      </div>
    </div>
  );
}
