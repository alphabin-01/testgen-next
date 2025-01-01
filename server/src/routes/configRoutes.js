const express = require('express');
const router = express.Router();
const configController = require('../controllers/config/configController');

router.post('/get-config', configController.getConfig);
router.post('/update-config', configController.updateConfigHandler);

module.exports = router;
