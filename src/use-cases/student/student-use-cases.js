const studentDataAccess = require('../../data-access/student/student-data-access');
const { YEAR_LEVELS } = require('../../constants/year-levels');

const studentUseCases = {
  getStudents: async () => studentDataAccess.getStudents(),

  getEligibleStudentsForFace: async ({ q, sectionId } = {}) =>
    studentDataAccess.getEligibleStudentsForFace({ q, sectionId }),

  getStudentById: async (id) => {
    const student = await studentDataAccess.getStudentById(id);
    if (!student) {
      throw new Error('Student not found');
    }
    return student;
  },

  getStudentsWithFaceCredentials: async () => studentDataAccess.getStudentsWithFaceCredentials(),

  getStudentCredentials: async (studentId) => studentDataAccess.getStudentCredentials(studentId),

  enrollFaceCredential: async ({ studentId, descriptors, qualityScores, thumbnailPath, createdBy }) => {
    if (!Array.isArray(descriptors) || descriptors.length === 0) {
      throw new Error('descriptors is required');
    }

    return studentDataAccess.enrollFaceCredential({
      studentId,
      descriptors,
      qualityScores,
      thumbnailPath,
      createdBy
    });
  },

  replaceFaceCredential: async ({ studentId, descriptors, qualityScores, thumbnailPath, createdBy }) => {
    if (!Array.isArray(descriptors) || descriptors.length === 0) {
      throw new Error('descriptors is required');
    }

    return studentDataAccess.replaceFaceCredential({
      studentId,
      descriptors,
      qualityScores,
      thumbnailPath,
      createdBy
    });
  },

  deleteCredential: async ({ studentId, credentialId }) => {
    const deleted = await studentDataAccess.deleteCredential({ studentId, credentialId });
    if (!deleted) {
      throw new Error('Credential not found');
    }
    return deleted;
  },

  createStudent: async (data, createdById, creatorSchoolId) => {
    const required = ['firstName', 'lastName', 'contactNumber', 'email', 'studentIdNumber', 'yearLevel', 'guardianContactNumber', 'guardianEmail'];
    for (const field of required) {
      if (!data[field]) throw new Error(`${field} is required`);
    }
    if (!YEAR_LEVELS.includes(data.yearLevel)) throw new Error('Invalid yearLevel');
    if (!creatorSchoolId) throw new Error('School context is required');
    const { schoolId: _ignoredSchoolId, ...safeData } = data;
    return studentDataAccess.createStudent({ ...safeData, createdById, schoolId: creatorSchoolId });
  },

  updateStudent: async (id, data, modifiedById) => {
    if (data.yearLevel !== undefined && !YEAR_LEVELS.includes(data.yearLevel)) {
      throw new Error('Invalid yearLevel');
    }
    const updated = await studentDataAccess.updateStudent(id, { ...data, modifiedBy: modifiedById });
    if (!updated) throw new Error('Student not found');
    return updated;
  }
};

module.exports = studentUseCases;
