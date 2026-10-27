import { strFromU8, unzipSync } from 'fflate';

const MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function localChildren(node, name) {
  return Array.from(node?.children || []).filter((child) => child.localName === name);
}

function descendants(node, name) {
  return Array.from(node?.getElementsByTagNameNS('*', name) || []);
}

function parseXml(xml, label) {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.getElementsByTagName('parsererror').length) {
    throw new Error(`${label} is malformed.`);
  }
  return document;
}

function fileText(files, path) {
  const bytes = files[path];
  if (!bytes) throw new Error(`The workbook is missing ${path}.`);
  return strFromU8(bytes);
}

function attribute(node, name) {
  return node?.getAttribute(name) || '';
}

function columnIndex(cellAddress) {
  const letters = cellAddress.match(/^[A-Z]+/i)?.[0]?.toUpperCase() || '';
  let index = 0;
  for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64;
  return index - 1;
}

function excelColorToHex(color) {
  if (!color) return '';
  const rgb = color.replace(/^#/, '').toUpperCase();
  return rgb.length === 8 ? rgb.slice(2) : rgb;
}

function isRedColor(color) {
  const hex = excelColorToHex(color);
  if (!/^[0-9A-F]{6}$/.test(hex)) return false;
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  return red >= 160 && green <= 120 && blue <= 120 && red - green >= 90 && red - blue >= 90;
}

function parseStyles(xml) {
  const document = parseXml(xml, 'Workbook styles');
  const fillsNode = descendants(document, 'fills')[0];
  const fills = localChildren(fillsNode, 'fill').map((fill) => {
    const pattern = descendants(fill, 'patternFill')[0];
    const foreground = descendants(pattern, 'fgColor')[0];
    return excelColorToHex(attribute(foreground, 'rgb'));
  });
  const xfsNode = descendants(document, 'cellXfs')[0];
  return localChildren(xfsNode, 'xf').map((xf) => {
    const fillId = Number(attribute(xf, 'fillId') || 0);
    return fills[fillId] || '';
  });
}

function parseSharedStrings(xml) {
  const document = parseXml(xml, 'Workbook shared strings');
  return descendants(document, 'si').map((item) =>
    descendants(item, 't').map((text) => text.textContent || '').join(''),
  );
}

function resolveSheetPath(target) {
  const normalized = target.replace(/\\/g, '/').replace(/^\//, '');
  return normalized.startsWith('xl/') ? normalized : `xl/${normalized}`;
}

function parseCellValue(cell, sharedStrings) {
  const type = attribute(cell, 't');
  const valueNode = localChildren(cell, 'v')[0];

  if (type === 'inlineStr') {
    return descendants(cell, 't').map((text) => text.textContent || '').join('');
  }
  if (!valueNode) return '';

  const value = valueNode.textContent || '';
  if (type === 's') return sharedStrings[Number(value)] ?? '';
  if (type === 'b') return value === '1';
  if (type === 'str' || type === 'e') return value;
  if (type === 'd') return value;
  if (value.trim() === '') return '';

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

function parseSheet(xml, sharedStrings, styleColors) {
  const document = parseXml(xml, 'Worksheet');
  const sheetData = descendants(document, 'sheetData')[0];
  const rows = [];

  for (const rowNode of localChildren(sheetData, 'row')) {
    const rowNumber = Number(attribute(rowNode, 'r')) || rows.length + 1;
    const values = [];
    let hasRedFill = false;

    for (const cell of localChildren(rowNode, 'c')) {
      const index = columnIndex(attribute(cell, 'r'));
      if (index < 0) continue;
      values[index] = parseCellValue(cell, sharedStrings);

      const styleIndex = Number(attribute(cell, 's') || 0);
      if (isRedColor(styleColors[styleIndex])) hasRedFill = true;
    }

    rows[rowNumber - 1] = { values, hasRedFill };
  }

  return rows.map((row) => row || { values: [], hasRedFill: false });
}

/** Read the workbook values and cell fill information needed by the import flow. */
export async function readXlsxFile(file) {
  if (!file || !/\.xlsx$/i.test(file.name || '')) {
    throw new Error('Choose an .xlsx workbook.');
  }
  if (file.size > 25 * 1024 * 1024) {
    throw new Error('This workbook is larger than the 25 MB upload limit.');
  }

  let files;
  try {
    files = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new Error('This file could not be opened as an .xlsx workbook.');
  }

  if (!files['xl/workbook.xml'] || !files['xl/_rels/workbook.xml.rels']) {
    throw new Error('This file is missing the workbook structure required for .xlsx.');
  }

  const workbookDocument = parseXml(fileText(files, 'xl/workbook.xml'), 'Workbook');
  const relationshipsDocument = parseXml(
    fileText(files, 'xl/_rels/workbook.xml.rels'),
    'Workbook relationships',
  );
  const relationshipTargets = new Map(
    descendants(relationshipsDocument, 'Relationship').map((relationship) => [
      attribute(relationship, 'Id'),
      attribute(relationship, 'Target'),
    ]),
  );
  const sharedStrings = files['xl/sharedStrings.xml']
    ? parseSharedStrings(fileText(files, 'xl/sharedStrings.xml'))
    : [];
  const styleColors = files['xl/styles.xml']
    ? parseStyles(fileText(files, 'xl/styles.xml'))
    : [];
  const sheetsNode = descendants(workbookDocument, 'sheets')[0];
  const sheetNodes = localChildren(sheetsNode, 'sheet');

  if (!sheetNodes.length) throw new Error('The workbook contains no worksheets.');

  const sheets = sheetNodes.map((sheetNode) => {
    const relationId =
      sheetNode.getAttributeNS(REL_NS, 'id') || attribute(sheetNode, 'r:id');
    const target = relationshipTargets.get(relationId);
    if (!target) throw new Error(`Could not locate worksheet “${attribute(sheetNode, 'name')}”.`);
    const path = resolveSheetPath(target);
    return {
      name: attribute(sheetNode, 'name'),
      rows: parseSheet(fileText(files, path), sharedStrings, styleColors),
    };
  });

  return { name: file.name, sheets };
}
