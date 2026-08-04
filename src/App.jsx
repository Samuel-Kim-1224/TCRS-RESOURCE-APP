import { useEffect, useMemo, useRef, useState } from 'react';
import MonthNav from './components/MonthNav.jsx';
import CalendarTab from './components/CalendarTab.jsx';
import VehicleTab from './components/VehicleTab.jsx';
import MedicTab from './components/MedicTab.jsx';
import BusTab from './components/BusTab.jsx';
import IndentSummaryTab from './components/IndentSummaryTab.jsx';
import AddConductModal from './components/AddConductModal.jsx';
import AddNoteModal from './components/AddNoteModal.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import { supabase } from './lib/supabase.js';
import {
  createConduct,
  createNote,
  deleteConduct,
  deleteNote,
  importLocalSchedulerData,
  loadSchedulerData,
  updateConduct,
  updateNote,
  upsertCwo,
} from './lib/database.js';
import { loadConducts, loadCwos } from './utils/storage.js';
import { toISO } from './utils/dateUtils.js';
import { applyTheme, getStoredTheme, saveTheme } from './utils/theme.js';
import { SCHOOLS, companySchool } from './data/companies.js';
import { schoolFromSession, usernameFromSession } from './data/schools.js';

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
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [notice, setNotice] = useState('');
  const [conducts, setConducts] = useState([]);
  const [notes, setNotes] = useState([]);
  const [cwos, setCwos] = useState({});
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [activeTab, setActiveTab] = useState('calendar');
  const [modalOpen, setModalOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [prefillDate, setPrefillDate] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [editNote, setEditNote] = useState(null);
  const [theme, setTheme] = useState(() => getStoredTheme());
  const [activeSchools, setActiveSchools] = useState(() =>
    Object.fromEntries(SCHOOLS.map((s) => [s.id, false]))
  );
  const migrationAttemptedForUser = useRef(null);

  const homeSchool = schoolFromSession(session);
  const accountLabel = usernameFromSession(session);

  // Own school is always on; other schools start off until toggled.
  useEffect(() => {
    if (!homeSchool) return;
    setActiveSchools(
      Object.fromEntries(SCHOOLS.map((s) => [s.id, s.id === homeSchool]))
    );
  }, [homeSchool]);

  const schoolVisible = (school) =>
    school === homeSchool || !!activeSchools[school];

  const filteredConducts = useMemo(
    () =>
      conducts.filter((c) => {
        const school = companySchool(c.companyCode) || c.school;
        if (!school) return true;
        return schoolVisible(school);
      }),
    [conducts, activeSchools, homeSchool]
  );

  const filteredNotes = useMemo(
    () =>
      notes.filter((n) => {
        const school = companySchool(n.companyCode) || n.school;
        if (!school) return true;
        return schoolVisible(school);
      }),
    [notes, activeSchools, homeSchool]
  );

  const toggleSchool = (schoolId) => {
    if (schoolId === homeSchool) return;
    setActiveSchools((prev) => ({ ...prev, [schoolId]: !prev[schoolId] }));
  };

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setDataError(error.message);
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setConducts([]);
      setNotes([]);
      setCwos({});
      setDataLoading(false);
      return undefined;
    }

    let active = true;
    const userId = session.user.id;

    async function loadData() {
      setDataLoading(true);
      setDataError('');

      try {
        let remoteData = await loadSchedulerData();

        if (
          remoteData.conducts.length === 0 &&
          Object.keys(remoteData.cwos).length === 0 &&
          migrationAttemptedForUser.current !== userId
        ) {
          migrationAttemptedForUser.current = userId;
          const localConducts = loadConducts();
          const localCwos = loadCwos();

          if (localConducts.length > 0 || Object.keys(localCwos).length > 0) {
            await importLocalSchedulerData(localConducts, localCwos);
            remoteData = await loadSchedulerData();
            if (active) setNotice('Existing browser data was imported into Supabase.');
          }
        }

        if (active) {
          setConducts(remoteData.conducts);
          setNotes(remoteData.notes);
          setCwos(remoteData.cwos);
        }
      } catch (error) {
        if (active) setDataError(error.message);
      } finally {
        if (active) setDataLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [session]);

  const toggleTheme = () => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  };

  const closeModal = () => {
    setModalOpen(false);
    setPrefillDate(null);
    setEditEntry(null);
  };

  const closeNoteModal = () => {
    setNoteModalOpen(false);
    setPrefillDate(null);
    setEditNote(null);
  };

  const handleSaveConduct = async (entry) => {
    const savedConduct = entry.id
      ? await updateConduct(entry)
      : await createConduct(entry);

    if (entry.id) {
      setConducts((previous) =>
        previous.map((conduct) => (conduct.id === entry.id ? savedConduct : conduct))
      );
    } else {
      setConducts((previous) => [...previous, savedConduct]);
    }
    closeModal();
  };

  const handleDeleteConduct = async (id) => {
    await deleteConduct(id);
    setConducts((previous) => previous.filter((conduct) => conduct.id !== id));
    closeModal();
  };

  const handleSaveNote = async (entry) => {
    const savedNote = entry.id ? await updateNote(entry) : await createNote(entry);

    if (entry.id) {
      setNotes((previous) => previous.map((note) => (note.id === entry.id ? savedNote : note)));
    } else {
      setNotes((previous) => [...previous, savedNote]);
    }
    closeNoteModal();
  };

  const handleDeleteNote = async (id) => {
    await deleteNote(id);
    setNotes((previous) => previous.filter((note) => note.id !== id));
    closeNoteModal();
  };

  const handleSaveCwo = async (companyCode, cwo) => {
    await upsertCwo(companyCode, { ...cwo, school: homeSchool });
    setCwos((previous) => ({ ...previous, [companyCode]: { ...cwo, school: homeSchool } }));
  };

  const openAddModal = (dateIso) => {
    setEditEntry(null);
    setPrefillDate(dateIso || null);
    setModalOpen(true);
  };

  const openEditModal = (entry) => {
    const school = companySchool(entry.companyCode) || entry.school;
    if (school && homeSchool && school !== homeSchool) {
      setDataError('Other school conducts are view-only. Sign in to that school to edit.');
      return;
    }
    setEditEntry(entry);
    setPrefillDate(null);
    setModalOpen(true);
  };

  const openAddNoteModal = (dateIso) => {
    setEditNote(null);
    setPrefillDate(dateIso || null);
    setNoteModalOpen(true);
  };

  const openEditNoteModal = (entry) => {
    const school = companySchool(entry.companyCode) || entry.school;
    if (school && homeSchool && school !== homeSchool) {
      setDataError('Other school notes are view-only. Sign in to that school to edit.');
      return;
    }
    setEditNote(entry);
    setPrefillDate(null);
    setNoteModalOpen(true);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) setDataError(error.message);
  };

  if (authLoading) {
    return <div className="loading-screen">Checking session…</div>;
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-title">
          <span className="app-title-mark">{accountLabel || 'TCRS'}</span>
          <span className="app-title-sub">Conduct &amp; Indent Scheduler</span>
        </div>
        <div className="app-header-actions">
          <span className="user-email">{accountLabel}</span>
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
          <button className="btn" onClick={() => openAddNoteModal()}>
            + Add Note
          </button>
          <button className="btn" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      {notice && (
        <div className="status-message status-success dismissible-message">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      {dataError && <div className="status-message status-error">{dataError}</div>}

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
        <div className="school-filter" role="group" aria-label="Filter by school">
          {SCHOOLS.map((school) => {
            const isHome = school.id === homeSchool;
            const on = isHome || !!activeSchools[school.id];
            return (
              <button
                key={school.id}
                type="button"
                className={`school-filter-btn ${on ? 'school-filter-btn-active' : ''} ${isHome ? 'school-filter-btn-home' : ''}`}
                style={{ '--school-color': school.color }}
                aria-pressed={on}
                aria-disabled={isHome || undefined}
                title={isHome ? 'Your school (always shown)' : undefined}
                onClick={() => toggleSchool(school.id)}
              >
                {school.label}
                {isHome ? ' · you' : ''}
              </button>
            );
          })}
        </div>
      </div>

      <main className="tab-content">
        {dataLoading && <div className="loading-panel">Loading shared schedule…</div>}
        {!dataLoading && (
          <>
            {activeTab === 'calendar' && (
              <CalendarTab
                monthKey={monthKey}
                conducts={filteredConducts}
                notes={filteredNotes}
                homeSchool={homeSchool}
                onDayClick={openAddModal}
                onConductClick={openEditModal}
                onNoteClick={openEditNoteModal}
              />
            )}
            {activeTab === 'vehicle' && (
              <VehicleTab conducts={filteredConducts} cwos={cwos} monthKey={monthKey} />
            )}
            {activeTab === 'bus' && <BusTab conducts={filteredConducts} monthKey={monthKey} />}
            {activeTab === 'medic' && (
              <MedicTab conducts={filteredConducts} monthKey={monthKey} />
            )}
            {activeTab === 'summary' && (
              <IndentSummaryTab conducts={filteredConducts} monthKey={monthKey} />
            )}
          </>
        )}
      </main>

      {modalOpen && (
        <AddConductModal
          cwos={cwos}
          homeSchool={homeSchool}
          initialDate={prefillDate}
          editEntry={editEntry}
          onSave={handleSaveConduct}
          onSaveCwo={handleSaveCwo}
          onDelete={handleDeleteConduct}
          onClose={closeModal}
        />
      )}

      {noteModalOpen && (
        <AddNoteModal
          homeSchool={homeSchool}
          initialDate={prefillDate}
          editEntry={editNote}
          onSave={handleSaveNote}
          onDelete={handleDeleteNote}
          onClose={closeNoteModal}
        />
      )}
    </div>
  );
}
