// CSV Export Utility [P2]
// Converts tabular array data to CSV formatted string for reports

/**
 * Converts JSON array of objects to CSV formatted string.
 * @param {Array<Object>} rows
 * @param {Array<string>} headers
 * @returns {string}
 */
function toCsv(rows, headers) {
  if (!rows || !rows.length) return '';
  const fields = headers || Object.keys(rows[0]);
  const headerLine = fields.join(',');
  const lines = rows.map((row) =>
    fields.map((field) => JSON.stringify(row[field] ?? '')).join(',')
  );
  return [headerLine, ...lines].join('\n');
}

module.exports = {
  toCsv,
};
