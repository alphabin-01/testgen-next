const express = require('express');
const router = express.Router();
const testController = require('../controllers/test/testController');
const cloudController = require('../controllers/cloud/cloudController');

router.post('/run-cloud', cloudController.runCloud);
router.post('/run-tests', testController.runTests);
router.post('/stop-tests', testController.stopTests);
router.post('/get-test-result', testController.getTestResult);

module.exports = router;
