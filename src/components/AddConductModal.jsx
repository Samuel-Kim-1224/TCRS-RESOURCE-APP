import { useState, useMemo } from 'react';
import { COMPANIES } from '../data/companies.js';
import {
  CONDUCTS,
  conductDef,
  AMPM_ENABLED_CATEGORIES,
  RM_KM_OPTIONS,
  RM_PES_OPTIONS,
  ER_NUMBER_OPTIONS,
  CC_NUMBER_OPTIONS,
  SOC_PES_OPTIONS,
  VENUE_OPTIONS,
} from '../data/conducts.js';

const emptyForm = {
  companyCode: '',
  conductKey: '',
  rmKm: '',
  rmPes: '',
  erNumber: '',
  ccNumber: '',
  socPes: '',
  venue: '',
  period: '',
  status: 'conducting',
  pes: '',
  date: '',
  endDate: '',
};

export default function AddConductModal({ cwos, onSave, onSaveCwo, onClose, initialDate }) {
  const [form, setForm] = useState(() => (initialDate ? { ...emptyForm, date: initialDate } : emptyForm));
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const def = form.conductKey ? conductDef(form.conductKey) : null;
  const ampmEnabled = def ? AMPM_ENABLED_CATEGORIES.includes(def.category) : false;
  const isMultiDay = !!def?.multiDay;

  const cwo = cwos[form.companyCode] || { name: '', number: '' };
  const [cwoName, setCwoName] = useState('');
  const [cwoNumber, setCwoNumber] = useState('');

  const effectiveCwoName = cwo.name || cwoName;
  const effectiveCwoNumber = cwo.number || cwoNumber;
  const cwoNeedsInput = !!form.companyCode && !cwo.name;

  const subFieldsValid = useMemo(() => {
    if (!def?.subFields) return true;
    return def.subFields.every((f) => !!form[f]);
  }, [def, form]);

  const isValid =
    !!form.companyCode &&
    !!effectiveCwoName &&
    !!effectiveCwoNumber &&
    !!form.conductKey &&
    subFieldsValid &&
    (!ampmEnabled || !!form.period) &&
    !!form.pes &&
    !!form.date &&
    (!isMultiDay || !!form.endDate);

  const handleSelectCompany = (code) => {
    set({ companyCode: code });
    setCwoName('');
    setCwoNumber('');
  };

  const handleSelectConduct = (key) => {
    set({
      conductKey: key,
      period: '',
      rmKm: '',
      rmPes: '',
      erNumber: '',
      ccNumber: '',
      socPes: '',
      venue: '',
      endDate: '',
    });
  };

  const handleSubmit = () => {
    if (!isValid) return;
    if (cwoNeedsInput) {
      onSaveCwo(form.companyCode, { name: cwoName.trim(), number: cwoNumber.trim() });
    }
    onSave({
      ...form,
      endDate: isMultiDay ? form.endDate : form.date,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Conduct</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Company */}
          <section className="form-section">
            <label className="form-label">Company</label>
            <div className="pill-row">
              {COMPANIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className={`pill ${form.companyCode === c.code ? 'pill-active' : ''}`}
                  onClick={() => handleSelectCompany(c.code)}
                >
                  {c.code}
                </button>
              ))}
            </div>
            {form.companyCode && (
              <div className="cwo-box">
                {cwo.name ? (
                  <div className="cwo-readout">
                    CWO on file: <strong>{cwo.name}</strong> · {cwo.number}
                  </div>
                ) : (
                  <div className="cwo-inputs">
                    <div className="field-hint">
                      No CWO saved yet for {form.companyCode} COY — enter it once, it's remembered next time.
                    </div>
                    <input
                      className="text-input"
                      placeholder="CWO name"
                      value={cwoName}
                      onChange={(e) => setCwoName(e.target.value)}
                    />
                    <input
                      className="text-input"
                      placeholder="CWO phone number"
                      value={cwoNumber}
                      onChange={(e) => setCwoNumber(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Conduct */}
          <section className="form-section">
            <label className="form-label">Conduct</label>
            <div className="pill-row pill-row-wrap">
              {CONDUCTS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`pill ${form.conductKey === c.key ? 'pill-active' : ''}`}
                  onClick={() => handleSelectConduct(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </section>

          {/* Conduct sub-fields */}
          {form.conductKey === 'RM' && (
            <section className="form-section form-section-sub">
              <div className="sub-field">
                <label className="form-label-sm">Distance (KM)</label>
                <div className="pill-row">
                  {RM_KM_OPTIONS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`pill pill-sm ${form.rmKm === v ? 'pill-active' : ''}`}
                      onClick={() => set({ rmKm: v })}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sub-field">
                <label className="form-label-sm">PES</label>
                <div className="pill-row">
                  {RM_PES_OPTIONS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`pill pill-sm ${form.rmPes === v ? 'pill-active' : ''}`}
                      onClick={() => set({ rmPes: v })}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {form.conductKey === 'ER' && (
            <section className="form-section form-section-sub">
              <div className="sub-field">
                <label className="form-label-sm">ER Number</label>
                <div className="pill-row">
                  {ER_NUMBER_OPTIONS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`pill pill-sm ${form.erNumber === v ? 'pill-active' : ''}`}
                      onClick={() => set({ erNumber: v })}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <VenuePicker value={form.venue} onChange={(v) => set({ venue: v })} />
            </section>
          )}

          {form.conductKey === 'IPPT' && (
            <section className="form-section form-section-sub">
              <VenuePicker value={form.venue} onChange={(v) => set({ venue: v })} />
            </section>
          )}

          {form.conductKey === 'CC' && (
            <section className="form-section form-section-sub">
              <div className="sub-field">
                <label className="form-label-sm">CC Number</label>
                <div className="pill-row">
                  {CC_NUMBER_OPTIONS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`pill pill-sm ${form.ccNumber === v ? 'pill-active' : ''}`}
                      onClick={() => set({ ccNumber: v })}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {form.conductKey === 'SOC' && (
            <section className="form-section form-section-sub">
              <div className="sub-field">
                <label className="form-label-sm">PES</label>
                <div className="pill-row">
                  {SOC_PES_OPTIONS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`pill pill-sm ${form.socPes === v ? 'pill-active' : ''}`}
                      onClick={() => set({ socPes: v })}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* AM/PM */}
          <section className="form-section">
            <label className="form-label">Period</label>
            <div className="pill-row">
              {['AM', 'PM'].map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={!ampmEnabled}
                  className={`pill ${form.period === p ? 'pill-active' : ''} ${!ampmEnabled ? 'pill-disabled' : ''}`}
                  onClick={() => set({ period: p })}
                >
                  {p}
                </button>
              ))}
              {!ampmEnabled && form.conductKey && (
                <span className="field-hint field-hint-inline">Full-day conduct — no AM/PM needed.</span>
              )}
            </div>
          </section>

          {/* Status */}
          <section className="form-section">
            <label className="form-label">Status</label>
            <div className="pill-row">
              {['conducting', 'not conducting'].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`pill ${form.status === s ? 'pill-active' : ''}`}
                  onClick={() => set({ status: s })}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          {/* PES BMT / Non-BMT */}
          <section className="form-section">
            <label className="form-label">PES Type</label>
            <div className="pill-row">
              {['BMT', 'Non-BMT'].map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`pill ${form.pes === p ? 'pill-active' : ''}`}
                  onClick={() => set({ pes: p })}
                >
                  {p}
                </button>
              ))}
            </div>
          </section>

          {/* Date(s) */}
          <section className="form-section">
            <label className="form-label">{isMultiDay ? 'Start date' : 'Date'}</label>
            <input
              type="date"
              className="text-input date-input"
              value={form.date}
              onChange={(e) => set({ date: e.target.value })}
            />
            {isMultiDay && (
              <>
                <label className="form-label" style={{ marginTop: '0.75rem' }}>
                  End date
                </label>
                <input
                  type="date"
                  className="text-input date-input"
                  value={form.endDate}
                  min={form.date}
                  onChange={(e) => set({ endDate: e.target.value })}
                />
              </>
            )}
          </section>
        </div>

        <div className="modal-footer">
          <button className="btn btn-block" disabled={!isValid} onClick={handleSubmit}>
            Add conduct
          </button>
        </div>
      </div>
    </div>
  );
}

function VenuePicker({ value, onChange }) {
  return (
    <div className="sub-field">
      <label className="form-label-sm">Venue (for medical coverage)</label>
      <div className="pill-row pill-row-wrap">
        {VENUE_OPTIONS.map((v) => (
          <button
            key={v}
            type="button"
            className={`pill pill-sm ${value === v ? 'pill-active' : ''}`}
            onClick={() => onChange(v)}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
