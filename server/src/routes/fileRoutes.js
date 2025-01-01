const express = require('express');
const router = express.Router();
const fileController = require('../controllers/file/fileController');

router.post('/file/create', fileController.createFileOrFolderHandler);
router.post('/file/rename', fileController.renameFileOrFolderHandler);
router.post('/file/delete', fileController.deleteFileOrFolderHandler);
router.post('/getStructure', fileController.getDirectoryStructureHandler);
router.post('/file/fetch', fileController.fetchFile);

module.exports = router;
