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
import { applyTheme, getStoredTheme, saveTheme } from './utils/theme.js';

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
  const [editEntry, setEditEntry] = useState(null);
  const [theme, setTheme] = useState(() => getStoredTheme());

  useEffect(() => saveConducts(conducts), [conducts]);
  useEffect(() => saveCwos(cwos), [cwos]);
  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  };

  const closeModal = () => {
    setModalOpen(false);
    setPrefillDate(null);
    setEditEntry(null);
  };

  const handleSaveConduct = (entry) => {
    if (entry.id) {
      setConducts((prev) => prev.map((c) => (c.id === entry.id ? { ...entry, id: c.id } : c)));
    } else {
      setConducts((prev) => [...prev, { ...entry, id: crypto.randomUUID() }]);
    }
    closeModal();
  };

  const handleDeleteConduct = (id) => {
    setConducts((prev) => prev.filter((c) => c.id !== id));
    closeModal();
  };

  const handleSaveCwo = (companyCode, cwo) => {
    setCwos((prev) => ({ ...prev, [companyCode]: cwo }));
  };

  const openAddModal = (dateIso) => {
    setEditEntry(null);
    setPrefillDate(dateIso || null);
    setModalOpen(true);
  };

  const openEditModal = (entry) => {
    setEditEntry(entry);
    setPrefillDate(null);
    setModalOpen(true);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-title">
          <span className="app-title-mark">SCH2</span>
          <span className="app-title-sub">Conduct &amp; Indent Scheduler</span>
        </div>
        <div className="app-header-actions">
          <button
            className="btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button className="btn btn-primary" onClick={() => openAddModal()}>
            + Add Conduct
          </button>
        </div>
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
          <CalendarTab
            monthKey={monthKey}
            conducts={conducts}
            onDayClick={openAddModal}
            onConductClick={openEditModal}
          />
        )}
        {activeTab === 'vehicle' && <VehicleTab conducts={conducts} cwos={cwos} monthKey={monthKey} />}
        {activeTab === 'bus' && <BusTab conducts={conducts} monthKey={monthKey} />}
        {activeTab === 'medic' && <MedicTab conducts={conducts} monthKey={monthKey} />}
        {activeTab === 'summary' && <IndentSummaryTab conducts={conducts} monthKey={monthKey} />}
      </main>

      {modalOpen && (
        <AddConductModal
          cwos={cwos}
          initialDate={prefillDate}
          editEntry={editEntry}
          onSave={handleSaveConduct}
          onSaveCwo={handleSaveCwo}
          onDelete={handleDeleteConduct}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
