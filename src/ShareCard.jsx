import React from 'react';
import './ShareCard.css';

/**
 * ShareCard — the shareable result card. Used in the Share Sheet preview,
 * the standalone share-card gallery, and (rendered server-side or via
 * html-to-image) as the actual downloadable/social image.
 *
 * Props:
 *  isAbove     bool    true = green "above market" styling, false = coral
 *  headline    string  e.g. "I'm underpaid by ₹6L."
 *  subline     string  e.g. "I earn less than 78% of frontend engineers in Bangalore."
 *  bandText    string  e.g. "₹22–24L"
 *  quoteLabel  string  e.g. "The number to quote"
 *  quoteText   string  e.g. "₹24L"
 *  receipts    string  e.g. "Based on public salary data."
 *  wordmark    string  e.g. "amiunderpaid.in"
 *  cta         string  e.g. "Check yours"
 */
export default function ShareCard({
  isAbove = false,
  headline = "I'm underpaid by ₹6L.",
  subline = "I earn less than 78% of frontend engineers in Bangalore.",
  bandText = '₹22–24L',
  quoteLabel = 'The number to quote',
  quoteText = '₹24L',
  receipts = 'Based on public salary data.',
  wordmark = 'am-i-underpaid.in',
  cta = 'Check yours',
}) {
  const tone = isAbove ? 'green' : 'coral';

  return (
    <div className="sc-card">
      <div className={`sc-card__topbar sc-card__topbar--${tone}`} />

      <div className="sc-card__brand">
        <span className={`sc-card__dot sc-card__dot--${tone}`} />
        <span className={`sc-card__wordmark sc-card__wordmark--${tone}`}>{wordmark}</span>
      </div>

      <div className="sc-card__headline">{headline}</div>
      <div className="sc-card__subline">{subline}</div>

      <div className={`sc-card__stats sc-card__stats--${tone}`}>
        <div className="sc-card__stat-row">
          <span className={`sc-card__stat-label sc-card__stat-label--${tone}`}>Fair market band</span>
          <span className="sc-card__stat-value">{bandText}</span>
        </div>
        <div className={`sc-card__divider sc-card__divider--${tone}`} />
        <div className="sc-card__stat-row">
          <span className={`sc-card__stat-label sc-card__stat-label--${tone}`}>{quoteLabel}</span>
          <span className={`sc-card__stat-value--hero ${tone}`}>{quoteText}</span>
        </div>
      </div>

      <div className="sc-card__receipts">
        <div className="sc-card__receipts-text">{receipts}</div>
      </div>

      <div className="sc-card__footer">
        <div className="sc-card__footer-divider" />
        <div className="sc-card__footer-row">
          <span className="sc-card__cta">{cta} &rarr;</span>
          <span className={`sc-card__wordmark sc-card__wordmark--${tone}`}>{wordmark}</span>
        </div>
      </div>
    </div>
  );
}
