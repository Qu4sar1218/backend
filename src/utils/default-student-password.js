/**
 * Default login password for auto-created student users:
 * student ID + last name with whitespace removed, lowercased.
 * Example: "00152" + "Dela Cruz" -> "00152delacruz"
 */
function buildDefaultStudentPassword(studentIdNumber, lastName) {
  const id = String(studentIdNumber ?? '');
  const lastPart = String(lastName ?? '')
    .replace(/\s+/g, '')
    .toLowerCase();
  return id + lastPart;
}

module.exports = { buildDefaultStudentPassword };
