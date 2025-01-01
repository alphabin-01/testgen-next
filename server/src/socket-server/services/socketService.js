const { globals, setGlobals } = require('../socket-utils/globals');
const fs = require('fs').promises;  // Use the promises API for async file writing
const logger = require('../../utils/logger');

if (!globals.recordingState) {
    globals.recordingState = 'recording';
}

const emitSendCode = (message, xpath, frameXpath = null) => {
  const socketInstance = globals.browserSocket;
  if (socketInstance) {
    
    if (globals.recordingState === 'paused') {
      return;
    }

    if (message) {
      const messageObj = {
        event: 'codeUpdate',
        message: message,
        xpath: xpath,
        frameXpath: frameXpath
      };
      socketInstance.send(JSON.stringify(messageObj));
    }

    if (xpath) {
      storeLocatorInMemory(globals.page.url(), xpath, frameXpath);
    }
  } else {
    logger.warn('WebSocket instance not found');
  }
};

const handleRecordingStateUpdate = (state) => {
    globals.recordingState = state;
    logger.info(`Recording state updated to: ${state}`);
};

async function storeLocatorInMemory(url, xpath, frameXpath = null) {
  const locatorMapping = globals.locatorMapping;

  if (!locatorMapping[url]) locatorMapping[url] = [];
  const existingLocator = locatorMapping[url].find(locator => locator.xpath === xpath);

  if (!existingLocator) {
    locatorMapping[url].push({ xpath: xpath });
    if (frameXpath) {
      locatorMapping[url].push({ xpath: frameXpath });
    }
  }

  try {
    await fs.writeFile(globals.tempFilePath, JSON.stringify(locatorMapping, null, 2));
    setGlobals({ locatorMapping });
  } catch (error) {
    logger.error('Error writing locator mapping:', error);
  }
}

module.exports = { emitSendCode, handleRecordingStateUpdate };
