import React, { useEffect, useState } from 'react';
import './Calculating.css';

const STEPS = [
  'Reading current market data',
  'Comparing your role and city',
  'Factoring in your experience',
  'Building your pay band',
];

/**
 * Calculating / trust screen. Deliberately generic — no third-party brand
 * names are ever shown here (see sourcing principle in README). Runs for
 * ~2.5s then calls onDone(). Replace the fake timer with your real
 * data-fetch promise and call onDone() when it resolves (with a minimum
 * duration so it doesn't feel instant).
 */
export default function Calculating({ roleLabel = 'frontend engineer', city = 'Bangalore', onDone }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setStepIndex(i);
      if (i >= STEPS.length) {
        clearInterval(interval);
        setTimeout(() => onDone && onDone(), 700);
      }
    }, 640);
    return () => clearInterval(interval);
  }, [onDone]);

  const progress = Math.min(100, (stepIndex / STEPS.length) * 100);

  return (
    <div className="calculating">
      <div className="calculating__inner">
        <div className="calculating__spinner">
          <div className="calculating__spinner-ring" />
          <div className="calculating__spinner-dot" />
        </div>
        <h2 className="calculating__headline">Fetching relevant information&hellip;</h2>
        <p className="calculating__subtext">Crunching the numbers for {roleLabel}s in {city}.</p>

        <div className="calculating__progress-track">
          <div className="calculating__progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="calculating__steps">
          {STEPS.map((label, i) => (
            <div key={label} className="calculating__step">
              <span className="calculating__step-label">{label}</span>
              {stepIndex > i
                ? <span className="calculating__step-check">&#10003;</span>
                : <span className="calculating__step-spinner" />}
            </div>
          ))}
        </div>

        <p className="calculating__footnote">Your estimate is built from public salary data.</p>
      </div>
    </div>
  );
}
