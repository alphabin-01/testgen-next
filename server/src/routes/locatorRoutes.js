const express = require('express');
const router = express.Router();
const locatorController = require('../controllers/locator/locatorController');

router.post('/load-locators', locatorController.loadLocatorInFile);
router.post('/update-locators', locatorController.updateLocators);
router.post('/get-image-path', locatorController.getLocatorImagePath);
router.post('/get-global-js', locatorController.getGlobalFileLocator);
router.post('/delete-locator', locatorController.deleteLocator);
router.post('/delete-all-locator', locatorController.deleteAllLocators)

module.exports = router;
