import { supabase } from './supabase.js';
import { companySchool } from '../data/companies.js';

const CONDUCT_FIELDS = {
  companyCode: 'company_code',
  conductKey: 'conduct_key',
  date: 'start_date',
  endDate: 'end_date',
  period: 'period',
  status: 'status',
  pes: 'pes',
  rmKm: 'rm_km',
  rmPes: 'rm_pes',
  erNumber: 'er_number',
  tempoNumber: 'tempo_number',
  ipptNumber: 'ippt_number',
  ccNumber: 'cc_number',
  socPes: 'soc_pes',
  venue: 'venue',
  btpRange: 'btp_range',
  fcSite: 'fc_site',
  sitTestSite: 'sit_test_site',
  school: 'school',
};

const NOTE_FIELDS = {
  companyCode: 'company_code',
  body: 'body',
  date: 'start_date',
  endDate: 'end_date',
  school: 'school',
};

function throwIfError(error, action) {
  if (error) {
    throw new Error(`${action}: ${error.message}`);
  }
}

function withSchool(payload) {
  const school = payload.school || companySchool(payload.companyCode);
  return { ...payload, school };
}

function conductToRow(conduct) {
  const source = withSchool(conduct);
  const row = {};

  if (source.id) row.id = source.id;

  for (const [appField, databaseField] of Object.entries(CONDUCT_FIELDS)) {
    const value = source[appField];
    row[databaseField] = value === '' || value === undefined ? null : value;
  }

  return row;
}

function rowToConduct(row) {
  const conduct = { id: row.id };

  for (const [appField, databaseField] of Object.entries(CONDUCT_FIELDS)) {
    conduct[appField] = row[databaseField] ?? '';
  }

  return conduct;
}

function noteToRow(note) {
  const source = withSchool(note);
  const row = {};

  if (source.id) row.id = source.id;

  for (const [appField, databaseField] of Object.entries(NOTE_FIELDS)) {
    const value = source[appField];
    row[databaseField] = value === '' || value === undefined ? null : value;
  }

  return row;
}

function rowToNote(row) {
  const note = { id: row.id };

  for (const [appField, databaseField] of Object.entries(NOTE_FIELDS)) {
    note[appField] = row[databaseField] ?? '';
  }

  return note;
}

function rowsToCwos(rows) {
  return Object.fromEntries(
    rows.map((row) => [
      row.company_code,
      { name: row.cwo_name, number: row.cwo_number, school: row.school },
    ])
  );
}

export async function loadSchedulerData() {
  const [conductResult, cwoResult, noteResult] = await Promise.all([
    supabase.from('conducts').select('*').order('start_date').order('created_at'),
    supabase.from('company_cwos').select('*').order('company_code'),
    supabase.from('notes').select('*').order('start_date').order('created_at'),
  ]);

  throwIfError(conductResult.error, 'Could not load conducts');
  throwIfError(cwoResult.error, 'Could not load CWO records');
  throwIfError(noteResult.error, 'Could not load notes');

  return {
    conducts: conductResult.data.map(rowToConduct),
    cwos: rowsToCwos(cwoResult.data),
    notes: noteResult.data.map(rowToNote),
  };
}

export async function createConduct(conduct) {
  const { data, error } = await supabase
    .from('conducts')
    .insert(conductToRow(conduct))
    .select()
    .single();

  throwIfError(error, 'Could not add conduct');
  return rowToConduct(data);
}

export async function updateConduct(conduct) {
  const row = conductToRow(conduct);
  delete row.id;

  const { data, error } = await supabase
    .from('conducts')
    .update(row)
    .eq('id', conduct.id)
    .select()
    .single();

  throwIfError(error, 'Could not update conduct');
  return rowToConduct(data);
}

export async function deleteConduct(id) {
  const { error } = await supabase.from('conducts').delete().eq('id', id);
  throwIfError(error, 'Could not delete conduct');
}

export async function createNote(note) {
  const { data, error } = await supabase
    .from('notes')
    .insert(noteToRow(note))
    .select()
    .single();

  throwIfError(error, 'Could not add note');
  return rowToNote(data);
}

export async function updateNote(note) {
  const row = noteToRow(note);
  delete row.id;

  const { data, error } = await supabase
    .from('notes')
    .update(row)
    .eq('id', note.id)
    .select()
    .single();

  throwIfError(error, 'Could not update note');
  return rowToNote(data);
}

export async function deleteNote(id) {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  throwIfError(error, 'Could not delete note');
}

export async function upsertCwo(companyCode, cwo) {
  const school = cwo.school || companySchool(companyCode);
  const { error } = await supabase.from('company_cwos').upsert(
    {
      company_code: companyCode,
      cwo_name: cwo.name,
      cwo_number: cwo.number,
      school,
    },
    { onConflict: 'company_code' }
  );

  throwIfError(error, 'Could not save CWO record');
}

export async function importLocalSchedulerData(conducts, cwos) {
  const operations = [];

  if (conducts.length > 0) {
    operations.push(
      supabase.from('conducts').upsert(conducts.map(conductToRow), { onConflict: 'id' })
    );
  }

  const cwoRows = Object.entries(cwos).map(([companyCode, cwo]) => ({
    company_code: companyCode,
    cwo_name: cwo.name,
    cwo_number: cwo.number,
    school: cwo.school || companySchool(companyCode),
  }));

  if (cwoRows.length > 0) {
    operations.push(
      supabase.from('company_cwos').upsert(cwoRows, { onConflict: 'company_code' })
    );
  }

  const results = await Promise.all(operations);
  const failedResult = results.find((result) => result.error);
  throwIfError(failedResult?.error, 'Could not import local data');
}
