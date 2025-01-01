const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project/projectController');

router.get('/all-projects', projectController.getAllProjects);
router.get('/create-project', projectController.createProject);
router.post("/export", projectController.exportsProject)
router.put('/edit-project/:oldProjectName', projectController.editProject);
router.delete('/delete-project/:projectName', projectController.deleteProject);


module.exports = router;
