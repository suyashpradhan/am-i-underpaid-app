import React from 'react';
import './Payment.css';

/**
 * Tip jar payment handoff — the ONLY money moment in the app, and it is
 * entirely optional (nothing is ever gated behind it). Two phases:
 *  'redirect' — brief "taking you to Buy Me a Coffee" moment
 *  'thankyou' — warm gratitude state, no upsell
 *
 * Wire the redirect phase to your real checkout link (Dodo Payments /
 * Buy Me a Coffee) and land back on 'thankyou' after a successful charge
 * or a webhook confirms it.
 */
export default function Payment({ phase = 'redirect', tipAmount = '₹30', onBackToResult }) {
  return (
    <div className="payment">
      <div className="payment__card">
        {phase === 'redirect' && (
          <>
            <div className="payment__spinner">
              <div className="payment__spinner-ring" />
              <span className="coffee-cup coffee-cup--dark" />
            </div>
            <h2 className="payment__headline">Taking you to Buy Me a Coffee&hellip;</h2>
            <p className="payment__subtext">One tap, then straight back here. No account needed.</p>
            <div className="payment__secure-pill">
              <span className="payment__secure-dot" />
              <span>{tipAmount} · Secured by Dodo Payments</span>
            </div>
          </>
        )}

        {phase === 'thankyou' && (
          <>
            <div className="payment__thanks-icon">
              <span className="coffee-cup coffee-cup--coral" />
            </div>
            <h2 className="payment__headline">Thank you — that means a lot.</h2>
            <p className="payment__subtext">
              Genuinely. This keeps the tool free and anonymous for the next person who needs it.
            </p>
            <button type="button" className="btn btn--secondary" style={{ height: 48, padding: '0 24px', fontSize: 15 }} onClick={onBackToResult}>
              Back to my result
            </button>
          </>
        )}
      </div>
    </div>
  );
}
