import { useState, useEffect } from 'react';
import MonthNav from './components/MonthNav.jsx';
import CalendarTab from './components/CalendarTab.jsx';
import VehicleTab from './components/VehicleTab.jsx';
import MedicTab from './components/MedicTab.jsx';
import BusTab from './components/BusTab.jsx';
import IndentSummaryTab from './components/IndentSummaryTab.jsx';
import AddConductModal from './components/AddConductModal.jsx';
import { loadConducts, saveConducts, loadCwos, saveCwos } from './utils/storage.js';
import { toISO } from './utils/dateUtils.js';

const TABS = [
  { key: 'calendar', label: 'Calendar' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'bus', label: 'Bus / Troop-lift' },
  { key: 'medic', label: 'Medic' },
  { key: 'summary', label: 'Indent Summary' },
];

function currentMonthKey() {
  const iso = toISO(new Date());
  return iso.slice(0, 7);
}

export default function App() {
  const [conducts, setConducts] = useState(() => loadConducts());
  const [cwos, setCwos] = useState(() => loadCwos());
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [activeTab, setActiveTab] = useState('calendar');
  const [modalOpen, setModalOpen] = useState(false);
  const [prefillDate, setPrefillDate] = useState(null);

  useEffect(() => saveConducts(conducts), [conducts]);
  useEffect(() => saveCwos(cwos), [cwos]);

  const handleSaveConduct = (entry) => {
    setConducts((prev) => [...prev, { ...entry, id: crypto.randomUUID() }]);
    setModalOpen(false);
    setPrefillDate(null);
  };

  const handleSaveCwo = (companyCode, cwo) => {
    setCwos((prev) => ({ ...prev, [companyCode]: cwo }));
  };

  const openModal = (dateIso) => {
    setPrefillDate(dateIso || null);
    setModalOpen(true);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-title">
          <span className="app-title-mark">SCH2</span>
          <span className="app-title-sub">Conduct &amp; Indent Scheduler</span>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          + Add Conduct
        </button>
      </header>

      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${activeTab === t.key ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="tab-toolbar">
        <MonthNav monthKey={monthKey} onChange={setMonthKey} />
      </div>

      <main className="tab-content">
        {activeTab === 'calendar' && (
          <CalendarTab monthKey={monthKey} conducts={conducts} onDayClick={openModal} />
        )}
        {activeTab === 'vehicle' && <VehicleTab conducts={conducts} cwos={cwos} monthKey={monthKey} />}
        {activeTab === 'bus' && <BusTab />}
        {activeTab === 'medic' && <MedicTab conducts={conducts} monthKey={monthKey} />}
        {activeTab === 'summary' && <IndentSummaryTab conducts={conducts} monthKey={monthKey} />}
      </main>

      {modalOpen && (
        <AddConductModal
          cwos={cwos}
          initialDate={prefillDate}
          onSave={handleSaveConduct}
          onSaveCwo={handleSaveCwo}
          onClose={() => {
            setModalOpen(false);
            setPrefillDate(null);
          }}
        />
      )}
    </div>
  );
}
