const studentUseCases = require('../../use-cases/student/student-use-cases');

const studentController = {
  getStudents: async (req, res) => {
    try {
      const students = await studentUseCases.getStudents();
      res.status(200).json(students);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getEligibleStudentsForFace: async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      const sectionId = typeof req.query.sectionId === 'string' ? req.query.sectionId : '';
      const students = await studentUseCases.getEligibleStudentsForFace({ q, sectionId });
      res.status(200).json(students);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getStudentById: async (req, res) => {
    try {
      const student = await studentUseCases.getStudentById(req.params.id);
      res.status(200).json(student);
    } catch (error) {
      const status = error.message === 'Student not found' ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  },

  getStudentsWithFaceCredentials: async (req, res) => {
    try {
      const students = await studentUseCases.getStudentsWithFaceCredentials();
      res.status(200).json(students);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getStudentCredentials: async (req, res) => {
    try {
      const credentials = await studentUseCases.getStudentCredentials(req.params.studentId);
      res.status(200).json(credentials);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  enrollFaceCredential: async (req, res) => {
    try {
      const { descriptors, quality_scores } = req.body;
      const parsedDescriptors = JSON.parse(descriptors || '[]');
      const parsedQualityScores = JSON.parse(quality_scores || '[]');
      const thumbnailPath = req.file ? `/uploads/credentialuploads/${req.file.filename}` : null;

      const credential = await studentUseCases.enrollFaceCredential({
        studentId: req.params.studentId,
        descriptors: parsedDescriptors,
        qualityScores: parsedQualityScores,
        thumbnailPath,
        createdBy: req.user?.id
      });

      res.status(201).json(credential);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  replaceFaceCredential: async (req, res) => {
    try {
      const { descriptors, quality_scores } = req.body;
      const parsedDescriptors = JSON.parse(descriptors || '[]');
      const parsedQualityScores = JSON.parse(quality_scores || '[]');
      const thumbnailPath = req.file ? `/uploads/credentialuploads/${req.file.filename}` : null;

      const credential = await studentUseCases.replaceFaceCredential({
        studentId: req.params.studentId,
        descriptors: parsedDescriptors,
        qualityScores: parsedQualityScores,
        thumbnailPath,
        createdBy: req.user?.id
      });

      res.status(201).json(credential);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  deleteCredential: async (req, res) => {
    try {
      await studentUseCases.deleteCredential({
        studentId: req.params.studentId,
        credentialId: req.params.credentialId
      });
      res.status(204).send();
    } catch (error) {
      const status = error.message === 'Credential not found' ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  },

  createStudent: async (req, res) => {
    try {
      const student = await studentUseCases.createStudent(req.body, req.user.id, req.user.schoolId);
      res.status(201).json(student);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  updateStudent: async (req, res) => {
    try {
      const student = await studentUseCases.updateStudent(req.params.id, req.body, req.user.id);
      res.status(200).json(student);
    } catch (error) {
      const status = error.message === 'Student not found' ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  }
};

module.exports = studentController;
