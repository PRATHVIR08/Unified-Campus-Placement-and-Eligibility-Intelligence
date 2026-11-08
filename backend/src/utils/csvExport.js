// CSV Export Utility [P2]
// Converts tabular array data to CSV formatted string for reports

/**
 * Converts JSON array of objects to CSV formatted string.
 * @param {Array<Object>} rows
 * @param {Array<string>} headers
 * @returns {string}
 */
function toCsv(rows, headers) {
  const fields = headers || (rows && rows.length ? Object.keys(rows[0]) : []);
  const escape = (value) => {
    const text = value == null ? '' : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const headerLine = fields.map(escape).join(',');
  const lines = (rows || []).map((row) => fields.map((field) => escape(row[field])).join(','));
  return [headerLine, ...lines].join('\r\n');
}

module.exports = {
  toCsv,
};
