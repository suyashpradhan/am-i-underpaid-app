import React, { useState } from 'react';
import './SkillsSelector.css';

/**
 * Skills selector — two-step modal (discipline, then optional skill chips).
 * Step 2 is always optional; "Done" is always enabled once a discipline
 * is picked (or even without one, if you want to allow skipping entirely —
 * adjust the disabled logic below to taste).
 */
export default function SkillsSelector({
  disciplines,
  disciplineSkills,
  initialDiscipline = null,
  initialSkills = [],
  onDone,
  onClose,
}) {
  const [discipline, setDiscipline] = useState(initialDiscipline);
  const [skills, setSkills] = useState(initialSkills);
  const [customRole, setCustomRole] = useState(
    initialDiscipline && !disciplines.includes(initialDiscipline) ? initialDiscipline : ''
  );

  function pickDiscipline(d) {
    setDiscipline(d);
    setCustomRole('');
    setSkills([]); // reset skills when discipline changes
  }

  function useCustomRole() {
    const role = customRole.trim();
    if (!role) return;
    setDiscipline(role);
    setSkills([]);
  }

  function toggleSkill(s) {
    setSkills(cur => cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s]);
  }

  const availableSkills = discipline ? (disciplineSkills[discipline] || []) : [];

  return (
    <div className="skills-modal__overlay" onClick={onClose}>
      <div className="skills-modal__panel" onClick={e => e.stopPropagation()}>
        <div className="skills-modal__header">
          <div>
            <h3 className="skills-modal__title">Your work</h3>
            <p className="skills-modal__subtitle">This sharpens the comparison.</p>
          </div>
          <button className="skills-modal__close" onClick={onClose} type="button">&times;</button>
        </div>

        <div className="skills-modal__step-label">Step 1 · Choose or enter your role</div>
        <div className="custom-role">
          <input
            type="text"
            value={customRole}
            maxLength={80}
            placeholder="e.g. Data Analyst, ML Engineer"
            aria-label="Your job title"
            onChange={e => setCustomRole(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                useCustomRole();
              }
            }}
          />
          <button type="button" className="custom-role__button" disabled={!customRole.trim()} onClick={useCustomRole}>
            Use role
          </button>
        </div>
        <div className="skills-modal__disciplines">
          {disciplines.map(d => {
            const active = d === discipline;
            return (
              <button
                key={d}
                type="button"
                className={`discipline-option ${active ? 'discipline-option--active' : ''}`}
                onClick={() => pickDiscipline(d)}
              >
                <span>{d}</span>
                {active && <span className="discipline-option__check">&#10003;</span>}
              </button>
            );
          })}
        </div>

        {discipline && (
          <div className="skills-modal__step2">
            <div className="skills-modal__step-label-row">
              <span className="skills-modal__step-label">Step 2 · Sharpen it</span>
              <span className="skills-modal__optional">optional</span>
            </div>
            <p className="skills-modal__step2-copy">
              {availableSkills.length ? 'Pick the skills you actually use.' : `We'll compare the exact “${discipline}” title you entered.`}
            </p>
            <div className="skill-chips">
              {availableSkills.map(s => {
                const active = skills.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    className={`skill-chip ${active ? 'skill-chip--active' : ''}`}
                    onClick={() => toggleSkill(s)}
                  >
                    {active && <span className="skill-chip__check">&#10003;</span>}
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          className="btn btn--primary btn--md"
          style={{ width: '100%', marginTop: 24 }}
          onClick={() => onDone(discipline, skills)}
        >
          Done
        </button>
      </div>
    </div>
  );
}
