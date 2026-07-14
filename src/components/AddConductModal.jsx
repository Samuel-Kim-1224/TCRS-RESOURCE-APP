import { useState, useMemo, useEffect } from 'react';
import { COMPANIES } from '../data/companies.js';
import {
  CONDUCTS,
  conductDef,
  AMPM_ENABLED_CATEGORIES,
  RM_KM_OPTIONS,
  RM_PES_OPTIONS,
  ER_NUMBER_OPTIONS,
  TEMPO_NUMBER_OPTIONS,
  IPPT_NUMBER_OPTIONS,
  CC_NUMBER_OPTIONS,
  SOC_PES_OPTIONS,
  PES_TYPE_OPTIONS,
  VENUE_OPTIONS,
  BTP_RANGE_OPTIONS,
  FC_SITE_OPTIONS,
  SITTEST_SITE_OPTIONS,
  resolveFixedDays,
  hasSitTest,
} from '../data/conducts.js';
import { addDays, dateRange, formatDDMMYYYY } from '../utils/dateUtils.js';

const emptyForm = {
  companyCode: '',
  conductKey: '',
  rmKm: '',
  rmPes: '',
  erNumber: '',
  tempoNumber: '',
  ipptNumber: '',
  ccNumber: '',
  socPes: '',
  venue: '',
  btpRange: '',
  fcSite: '',
  sitTestSite: '',
  period: '',
  status: 'conducting',
  pes: '',
  date: '',
  endDate: '',
};

function entryToForm(entry) {
  if (!entry) return emptyForm;
  return {
    companyCode: entry.companyCode || '',
    conductKey: entry.conductKey || '',
    rmKm: entry.rmKm || '',
    rmPes: entry.rmPes || '',
    erNumber: entry.erNumber || '',
    tempoNumber: entry.tempoNumber || '',
    ipptNumber: entry.ipptNumber || '',
    ccNumber: entry.ccNumber || '',
    socPes: entry.socPes || '',
    venue: entry.venue || '',
    btpRange: entry.btpRange || '',
    fcSite: entry.fcSite || '',
    sitTestSite: entry.sitTestSite || '',
    period: entry.period || '',
    status: entry.status || 'conducting',
    pes: entry.pes || '',
    date: entry.date || '',
    endDate: entry.endDate || '',
  };
}

export default function AddConductModal({
  cwos,
  onSave,
  onSaveCwo,
  onDelete,
  onClose,
  initialDate,
  editEntry,
}) {
  const isEdit = !!editEntry;
  const [form, setForm] = useState(() => {
    if (editEntry) return entryToForm(editEntry);
    return initialDate ? { ...emptyForm, date: initialDate } : emptyForm;
  });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const def = form.conductKey ? conductDef(form.conductKey) : null;
  const ampmEnabled =
    def &&
    (AMPM_ENABLED_CATEGORIES.includes(def.category) || def.busSession);
  const hasFixedDays = !!def?.fixedDays;
  const isManualMultiDay = !!def?.multiDay && !def?.fixedDays;
  const sitTestRequired = form.conductKey === 'IFC' && form.pes === 'Combat fit';
  const fixedDaysCount = resolveFixedDays(form);

  const [cwoName, setCwoName] = useState(() => {
    if (editEntry) return (cwos[editEntry.companyCode] || {}).name || '';
    return '';
  });
  const [cwoNumber, setCwoNumber] = useState(() => {
    if (editEntry) return (cwos[editEntry.companyCode] || {}).number || '';
    return '';
  });

  useEffect(() => {
    if (form.companyCode) {
      const saved = cwos[form.companyCode] || { name: '', number: '' };
      setCwoName(saved.name);
      setCwoNumber(saved.number);
    }
  }, [form.companyCode, cwos]);

  const effectiveCwoName = cwoName.trim();
  const effectiveCwoNumber = cwoNumber.trim();

  const subFieldsValid = useMemo(() => {
    if (!def?.subFields) return true;
    const baseOk = def.subFields.every((f) => !!form[f]);
    if (!baseOk) return false;
    if (sitTestRequired && !form.sitTestSite) return false;
    return true;
  }, [def, form, sitTestRequired]);

  const isValid =
    !!form.companyCode &&
    !!effectiveCwoName &&
    !!effectiveCwoNumber &&
    !!form.conductKey &&
    subFieldsValid &&
    (!ampmEnabled || !!form.period) &&
    (!!form.pes || !!def?.calendarOnly) &&
    !!form.date &&
    (!isManualMultiDay || !!form.endDate);

  const previewEndDate = useMemo(() => {
    if (!form.date || !fixedDaysCount) return null;
    return addDays(form.date, fixedDaysCount - 1);
  }, [form.date, fixedDaysCount]);

  const previewDays = useMemo(() => {
    if (!form.date) return [];
    const end = hasFixedDays ? previewEndDate : form.endDate || form.date;
    if (!end) return [];
    return dateRange(form.date, end);
  }, [form.date, form.endDate, hasFixedDays, previewEndDate]);

  const handleSelectCompany = (code) => {
    set({ companyCode: code });
  };

  const handleSelectConduct = (key) => {
    const newDef = conductDef(key);
    set({
      conductKey: key,
      period: newDef?.busSession ? 'AM' : '',
      rmKm: '',
      rmPes: '',
      erNumber: '',
      tempoNumber: '',
      ipptNumber: '',
      ccNumber: '',
      socPes: '',
      venue: '',
      btpRange: '',
      fcSite: '',
      sitTestSite: '',
      endDate: '',
    });
  };

  const handleSelectPes = (p) => {
    const patch = { pes: p };
    if (form.conductKey === 'IFC') {
      if (p === 'Combat fit') {
        patch.sitTestSite = form.sitTestSite || 'Sittest Site 1';
      } else {
        patch.sitTestSite = '';
      }
    }
    set(patch);
  };

  const handleSubmit = () => {
    if (!isValid) return;
    const savedCwo = cwos[form.companyCode];
    if (
      !savedCwo ||
      savedCwo.name !== effectiveCwoName ||
      savedCwo.number !== effectiveCwoNumber
    ) {
      onSaveCwo(form.companyCode, { name: effectiveCwoName, number: effectiveCwoNumber });
    }

    const days = resolveFixedDays(form);
    const endDate = days
      ? addDays(form.date, days - 1)
      : isManualMultiDay
        ? form.endDate
        : form.date;

    onSave({
      ...form,
      sitTestSite: hasSitTest(form) ? form.sitTestSite : '',
      endDate,
      id: editEntry?.id,
    });
  };

  const handleDelete = () => {
    if (editEntry && onDelete) {
      onDelete(editEntry.id);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Conduct' : 'Add Conduct'}</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
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
                <div className="cwo-inputs">
                  <div className="field-hint">CWO for {form.companyCode} COY</div>
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
              </div>
            )}
          </section>

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

          {!def?.calendarOnly && form.conductKey && (
            <section className="form-section">
              <label className="form-label">PES Type</label>
              <div className="pill-row">
                {PES_TYPE_OPTIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`pill ${form.pes === p ? 'pill-active' : ''}`}
                    onClick={() => handleSelectPes(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </section>
          )}

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

          {form.conductKey === 'TEMPO' && (
            <section className="form-section form-section-sub">
              <div className="sub-field">
                <label className="form-label-sm">Tempo Number</label>
                <div className="pill-row">
                  {TEMPO_NUMBER_OPTIONS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`pill pill-sm ${form.tempoNumber === v ? 'pill-active' : ''}`}
                      onClick={() => set({ tempoNumber: v })}
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
              <div className="sub-field">
                <label className="form-label-sm">IPPT Number</label>
                <div className="pill-row">
                  {IPPT_NUMBER_OPTIONS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`pill pill-sm ${form.ipptNumber === v ? 'pill-active' : ''}`}
                      onClick={() => set({ ipptNumber: v })}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
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

          {form.conductKey === 'BTP' && (
            <section className="form-section form-section-sub">
              <div className="sub-field">
                <label className="form-label-sm">Range</label>
                <div className="pill-row">
                  {BTP_RANGE_OPTIONS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`pill pill-sm ${form.btpRange === v ? 'pill-active' : ''}`}
                      onClick={() => set({ btpRange: v })}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {form.conductKey === 'IFC' && (
            <section className="form-section form-section-sub">
              <div className="sub-field">
                <label className="form-label-sm">FC Site</label>
                <div className="pill-row pill-row-wrap">
                  {FC_SITE_OPTIONS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`pill pill-sm ${form.fcSite === v ? 'pill-active' : ''}`}
                      onClick={() => set({ fcSite: v })}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              {sitTestRequired && (
                <div className="sub-field">
                  <label className="form-label-sm">SIT Test Site</label>
                  <div className="pill-row">
                    {SITTEST_SITE_OPTIONS.map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={`pill pill-sm ${form.sitTestSite === v ? 'pill-active' : ''}`}
                        onClick={() => set({ sitTestSite: v })}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {form.pes === 'B3/4' && (
                <div className="field-hint">Lower PES — no sit test (4-day fieldcamp).</div>
              )}
            </section>
          )}

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
                <span className="field-hint field-hint-inline">
                  {def?.busSession
                    ? 'Select AM or PM for bus session timing.'
                    : 'Full-day conduct — no AM/PM needed.'}
                </span>
              )}
            </div>
          </section>

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

          <section className="form-section">
            <label className="form-label">
              {hasFixedDays || isManualMultiDay ? 'Start date' : 'Date'}
            </label>
            <input
              type="date"
              className="text-input date-input"
              value={form.date}
              onChange={(e) => set({ date: e.target.value })}
            />
            {hasFixedDays && previewEndDate && fixedDaysCount && (
              <div className="field-hint" style={{ marginTop: '0.5rem' }}>
                {fixedDaysCount}-day conduct: {formatDDMMYYYY(form.date)} –{' '}
                {formatDDMMYYYY(previewEndDate)}
              </div>
            )}
            {isManualMultiDay && (
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
            {previewDays.length > 1 && (
              <div className="range-preview">
                {previewDays.map((d, i) => (
                  <span key={d} className="range-preview-day">
                    {formatDDMMYYYY(d)}
                    {def?.key === 'BTP' && (i === 0 ? ' (btp1)' : i === 1 ? ' (btp2)' : '')}
                    {def?.key === 'IFC' && hasSitTest(form) && i === 4 ? ' (SIT test)' : ''}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="modal-footer">
          {isEdit && (
            <button className="btn btn-danger btn-block" onClick={handleDelete}>
              Delete conduct
            </button>
          )}
          <button className="btn btn-block" disabled={!isValid} onClick={handleSubmit}>
            {isEdit ? 'Save changes' : 'Add conduct'}
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
