import React, { useState } from 'react';
import './IntakeForm.css';

export default function IntakeForm({ onSubmit, initialValues = {} }) {
  const [role, setRole] = useState(initialValues.discipline || '');
  const [workDescription, setWorkDescription] = useState(initialValues.workDescription || '');
  const [workMode, setWorkMode] = useState(initialValues.workMode || '');
  const [companyType, setCompanyType] = useState(initialValues.companyType || '');
  const [companyHq, setCompanyHq] = useState(initialValues.companyHq === 'Not specified' ? '' : initialValues.companyHq || '');
  const [compensationType, setCompensationType] = useState(initialValues.compensationType || 'total');
  const [locationMode, setLocationMode] = useState(initialValues.locationMode || 'city');
  const [city, setCity] = useState(initialValues.locationMode === 'remote' ? '' : initialValues.city || '');
  const [years, setYears] = useState(initialValues.years ?? '');
  const [salary, setSalary] = useState(initialValues.salary ?? '');

  const canSubmit =
    role.trim().length >= 2 &&
    workDescription.trim().length >= 10 &&
    Boolean(workMode) &&
    Boolean(companyType) &&
    years !== '' &&
    Number(years) >= 0 &&
    salary !== '' &&
    Number(salary) > 0 &&
    (locationMode === 'remote' || city.trim().length >= 2);

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      employment: 'salaried',
      discipline: role.trim(),
      workDescription: workDescription.trim(),
      workMode,
      companyType,
      companyHq: companyHq || 'Not specified',
      compensationType,
      locationMode,
      city: locationMode === 'remote' ? 'Remote — India' : city.trim(),
      years,
      salary,
      skills: [],
    });
  }

  return (
    <main className="intake">
      <form className="intake__card" onSubmit={handleSubmit}>
        <h1 className="intake__title">Where do you stand?</h1>
        <p className="intake__subtitle">A transparent market estimate in about a minute.</p>

        <div className="field">
          <label className="field__label" htmlFor="role">Current job title <span className="required">*</span></label>
          <input id="role" value={role} maxLength={80} onChange={e => setRole(e.target.value)} placeholder="e.g. Platform Engineering Lead" autoComplete="organization-title" />
          <p className="field__hint">Use the title closest to the work you do.</p>
        </div>

        <div className="field field--spaced">
          <label className="field__label" htmlFor="work-description">What do you primarily work on? <span className="required">*</span></label>
          <textarea id="work-description" required value={workDescription} maxLength={240} onChange={e => setWorkDescription(e.target.value)} placeholder="e.g. Lead a team of 6 building Kubernetes infrastructure, internal tooling and AWS systems" rows={3} />
          <div className="field__counter">{workDescription.length}/240</div>
        </div>

        <fieldset className="field field--spaced">
          <legend className="field__label">How do you work? <span className="required">*</span></legend>
          <div className="choice-grid">
            <Choice active={workMode === 'ic'} title="Individual contributor" copy="I primarily build or execute" onClick={() => setWorkMode('ic')} />
            <Choice active={workMode === 'manager'} title="People manager" copy="I manage at least one person" onClick={() => setWorkMode('manager')} />
          </div>
        </fieldset>

        <fieldset className="field field--spaced">
          <legend className="field__label">What kind of company is this? <span className="required">*</span></legend>
          <div className="company-grid">
            <Choice active={companyType === 'early_stage'} title="Early-stage startup" copy="Pre-seed to Series A" onClick={() => setCompanyType('early_stage')} />
            <Choice active={companyType === 'growth_stage'} title="Growth-stage company" copy="Series B to late stage" onClick={() => setCompanyType('growth_stage')} />
            <Choice active={companyType === 'large_product'} title="Large product company" copy="MNC, public or mature product firm" onClick={() => setCompanyType('large_product')} />
            <Choice active={companyType === 'services_agency'} title="Services or agency" copy="Consulting, IT services or design agency" onClick={() => setCompanyType('services_agency')} />
            <Choice active={companyType === 'unsure'} title="Not sure" copy="We'll use a broader comparison" onClick={() => setCompanyType('unsure')} />
          </div>
        </fieldset>

        <div className="intake__grid intake__grid--context">
          <div className="field">
            <label className="field__label" htmlFor="company-hq">Company headquarters <span className="optional">Optional</span></label>
            <select id="company-hq" value={companyHq} onChange={e => setCompanyHq(e.target.value)}>
              <option value="">Not sure / prefer not to say</option>
              <option value="India">India</option>
              <option value="US or Canada">US or Canada</option>
              <option value="UK or Europe">UK or Europe</option>
              <option value="Southeast Asia">Southeast Asia</option>
              <option value="Other">Other</option>
            </select>
            <p className="field__hint">HQ can materially change the pay market.</p>
          </div>
          <fieldset className="field">
            <legend className="field__label">What does your pay include? <span className="required">*</span></legend>
            <div className="location-toggle compensation-toggle">
              <button type="button" className={compensationType === 'total' ? 'is-active' : ''} onClick={() => setCompensationType('total')}>Total comp</button>
              <button type="button" className={compensationType === 'fixed' ? 'is-active' : ''} onClick={() => setCompensationType('fixed')}>Fixed salary</button>
            </div>
            <p className="field__hint">Total comp = fixed + bonus + annualised equity.</p>
          </fieldset>
        </div>

        <fieldset className="field field--spaced">
          <legend className="field__label">Where do you work? <span className="required">*</span></legend>
          <div className="location-toggle">
            <button type="button" className={locationMode === 'city' ? 'is-active' : ''} onClick={() => setLocationMode('city')}>In a city</button>
            <button type="button" className={locationMode === 'remote' ? 'is-active' : ''} onClick={() => setLocationMode('remote')}>Remote in India</button>
          </div>
          {locationMode === 'city' && (
            <input className="conditional-input" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Bengaluru" autoComplete="address-level2" />
          )}
        </fieldset>

        <div className="intake__grid intake__grid--numbers">
          <div className="field">
            <label className="field__label" htmlFor="years">Relevant experience <span className="required">*</span></label>
            <div className="input-with-suffix">
              <input id="years" type="number" min="0" max="50" step="0.5" value={years} onChange={e => setYears(e.target.value)} placeholder="5" />
              <span className="input-suffix">years</span>
            </div>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="salary">Current {compensationType === 'fixed' ? 'fixed salary' : 'total pay'} <span className="required">*</span></label>
            <div className="input-with-suffix">
              <input id="salary" type="number" min="0" step="0.1" value={salary} onChange={e => setSalary(e.target.value)} placeholder="24" />
              <span className="input-suffix">LPA</span>
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn--primary btn--lg intake__submit" disabled={!canSubmit}>Check my market range <span aria-hidden="true">→</span></button>
        <p className="intake__footnote">Your salary check is anonymous. Estimates are based on public market evidence.</p>
      </form>
    </main>
  );
}

function Choice({ active, title, copy, onClick }) {
  return (
    <button type="button" className={`choice-card ${active ? 'choice-card--active' : ''}`} aria-pressed={active} onClick={onClick}>
      <span className="choice-card__radio"><span /></span>
      <span><strong>{title}</strong><small>{copy}</small></span>
    </button>
  );
}
