import { supabase } from './supabase.js';

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
};

function throwIfError(error, action) {
  if (error) {
    throw new Error(`${action}: ${error.message}`);
  }
}

function conductToRow(conduct) {
  const row = {};

  if (conduct.id) row.id = conduct.id;

  for (const [appField, databaseField] of Object.entries(CONDUCT_FIELDS)) {
    const value = conduct[appField];
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

function rowsToCwos(rows) {
  return Object.fromEntries(
    rows.map((row) => [
      row.company_code,
      { name: row.cwo_name, number: row.cwo_number },
    ])
  );
}

export async function loadSchedulerData() {
  const [conductResult, cwoResult] = await Promise.all([
    supabase.from('conducts').select('*').order('start_date').order('created_at'),
    supabase.from('company_cwos').select('*').order('company_code'),
  ]);

  throwIfError(conductResult.error, 'Could not load conducts');
  throwIfError(cwoResult.error, 'Could not load CWO records');

  return {
    conducts: conductResult.data.map(rowToConduct),
    cwos: rowsToCwos(cwoResult.data),
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

export async function upsertCwo(companyCode, cwo) {
  const { error } = await supabase.from('company_cwos').upsert(
    {
      company_code: companyCode,
      cwo_name: cwo.name,
      cwo_number: cwo.number,
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
