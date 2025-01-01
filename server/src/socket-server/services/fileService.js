const fs = require('fs').promises;
const path = require('path');
const { getWebSocket } = require('../../utils/socket');
const logger = require('../../utils/logger');

// Centralized WebSocket response helper
const sendWSResponse = (ws, event, success, data = {}) => {
  ws.send(JSON.stringify({ event, success, ...data }));
};

// Fetch file using WebSocket
const fetchFile = async (ws, data) => {
  try {
    const filePath = path.join(data.rootPath, data.filename || 'playwright.config.js');
    const content = await fs.readFile(filePath, 'utf8');
    sendWSResponse(ws, 'fetchFile', true, { content, filePath });
  } catch (err) {
    logger.error('Error fetching file', err);
    sendWSResponse(ws, 'fetchFile', false, { error: err.message });
  }
};

// Save file using WebSocket
const saveFile = async (ws, fileData) => {
  const filePath = path.resolve(fileData.path);
    await fs.writeFile(filePath, fileData.code);
    sendWSResponse(ws, 'saveFile', true);
};

function updateGlobalJSFile(locators, project) {
  const ws = getWebSocket();
  const globalJSPath = path.join(project.path, 'global.js');
  let existingLocators = {};

  // Check if the global.js file exists
  if (!fs.access(globalJSPath)) {
    const fileContent = fs.readFileSync(globalJSPath, 'utf8');
    const locatorsMatch = fileContent.match(/let locators\s*=\s*(\{[\s\S]*?\});/);
    if (locatorsMatch) {
      existingLocators = eval(`(${locatorsMatch[1]})`); // Extract existing locators
    }
  }

  // Update locators: if exists, replace the image (value); if not, add the locator
  for (const [key, newLocator] of Object.entries(locators)) {
    existingLocators[key] = newLocator;  // Update or insert directly
  }

  // Prepare the content for writing to global.js
  const locatorsEntries = Object.entries(existingLocators)
    .map(([key, value]) => `"${key}": \`${value}\``);  // Ensure template literals format

  const locatorsContent = `let locators = {\n  ${locatorsEntries.join(',\n  ')}\n};\n\nmodule.exports = { locators };\n`;

  // Write the updated locators to global.js
  fs.writeFile(globalJSPath, locatorsContent, 'utf8');

  // Send success response to WebSocket client
  const response = { event: 'updateGlobalJSFile', success: true };
  ws.send(JSON.stringify(response));  // Notify client of success
}

module.exports = { fetchFile, saveFile, updateGlobalJSFile };
