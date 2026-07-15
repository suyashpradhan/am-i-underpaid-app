import React from 'react';
import './ReturningUser.css';

/**
 * Returning-user memory moment — shown when a repeat visitor rechecks
 * their pay. Compares this check against their last one. Wire `before`
 * and `after` to real stored results (localStorage / account / DB).
 */
export default function ReturningUser({
  name = 'Raj',
  before = { amount: 18, percentile: 22 },
  after = { amount: 22, percentile: 48 },
  onRecheck,
}) {
  const deltaAmount = after.amount - before.amount;
  const deltaPct = after.percentile - before.percentile;

  return (
    <div className="returning">
      <div className="brand" style={{ marginBottom: 18 }}>
        <span className="brand__dot" />
        <span className="brand__name">amiunderpaid<span className="brand__accent">.in</span></span>
      </div>

      <div className="returning__card">
        <span className="badge badge--green">WELCOME BACK</span>
        <h1 className="returning__headline">Nice move, {name}.</h1>
        <p className="returning__sub">
          Last time you were at ₹{before.amount}L, bottom {100 - before.percentile}%. You're now
          at ₹{after.amount}L, {after.percentile}th percentile.
        </p>

        <div className="returning__bar-block">
          <div className="returning__bar">
            <div className="returning__bar-band" />
            <div className="returning__bar-dot returning__bar-dot--before" />
            <div className="returning__bar-connector" />
            <div className="returning__bar-dot returning__bar-dot--after" />
          </div>
          <div className="returning__legend">
            <span className="returning__legend-item">
              <span className="returning__legend-dot returning__legend-dot--before" /> Then · ₹{before.amount}L · {before.percentile}nd
            </span>
            <span className="returning__legend-item returning__legend-item--strong">
              <span className="returning__legend-dot returning__legend-dot--after" /> Now · ₹{after.amount}L · {after.percentile}th
            </span>
          </div>
        </div>

        <div className="returning__stats">
          <div className="returning__stat returning__stat--green">
            <div className="returning__stat-value">+₹{deltaAmount}L</div>
            <div className="returning__stat-label">since last check</div>
          </div>
          <div className="returning__stat returning__stat--neutral">
            <div className="returning__stat-value" style={{ color: 'var(--color-text)' }}>+{deltaPct}</div>
            <div className="returning__stat-label">percentile points</div>
          </div>
        </div>

        <button type="button" className="btn btn--primary btn--md" style={{ width: '100%', marginTop: 24 }} onClick={onRecheck}>
          Recheck at ₹{after.amount}L
        </button>
      </div>
    </div>
  );
}
