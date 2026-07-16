import React from 'react';
import './Payment.css';

/**
 * Optional Razorpay tip flow. Nothing in the product is gated behind payment.
 */
export default function Payment({ phase = 'redirect', tipAmount = '₹20', errorMessage = '', onRetry, onBackToResult }) {
  return (
    <div className="payment">
      <div className="payment__card">
        {phase === 'redirect' && (
          <>
            <div className="payment__spinner">
              <div className="payment__spinner-ring" />
              <span className="coffee-cup coffee-cup--dark" />
            </div>
            <h2 className="payment__headline">Opening secure checkout&hellip;</h2>
            <p className="payment__subtext">Your optional tip is processed by Razorpay.</p>
            <div className="payment__secure-pill">
              <span className="payment__secure-dot" />
              <span>{tipAmount} · Secured by Razorpay</span>
            </div>
          </>
        )}

        {phase === 'verifying' && (
          <>
            <div className="payment__spinner"><div className="payment__spinner-ring" /></div>
            <h2 className="payment__headline">Verifying your payment&hellip;</h2>
            <p className="payment__subtext">Please keep this page open for a moment.</p>
          </>
        )}

        {phase === 'pending' && (
          <>
            <h2 className="payment__headline">Payment received, confirmation pending.</h2>
            <p className="payment__subtext">Razorpay authorised the payment but has not marked it captured yet. You do not need to pay again.</p>
            <button type="button" className="btn btn--secondary" onClick={onBackToResult}>Back to my result</button>
          </>
        )}

        {(phase === 'error' || phase === 'cancelled') && (
          <>
            <h2 className="payment__headline">{phase === 'cancelled' ? 'Checkout closed.' : 'Payment didn’t go through.'}</h2>
            <p className="payment__subtext">{phase === 'cancelled' ? 'No problem, supporting the tool is completely optional.' : errorMessage}</p>
            <div className="payment__actions">
              {phase === 'error' && <button type="button" className="btn btn--primary" onClick={onRetry}>Try again</button>}
              <button type="button" className="btn btn--secondary" onClick={onBackToResult}>Back to my result</button>
            </div>
          </>
        )}

        {phase === 'thankyou' && (
          <>
            <div className="payment__thanks-icon">
              <span className="coffee-cup coffee-cup--coral" />
            </div>
            <h2 className="payment__headline">Thank you!!! That means a lot.</h2>
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
