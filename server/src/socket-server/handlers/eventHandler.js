const logger = require('../../utils/logger');
const { emitSendCode, handleRecordingStateUpdate } = require('../services/socketService');
const { globals, setGlobals, assignPageVariable, pageCounter } = require('../socket-utils/globals');
const setupPage = require('../services/pageService');
const path = require('path');

async function setupEventListeners(page) {
    let navigationByClick = false;

    const pageVar = assignPageVariable(page);
    const tempLocatorMappingPath = path.join(globals.project.path, 'temp-locator-mapping.json');
    setGlobals({ tempFilePath: tempLocatorMappingPath });

    // Set up dialog handling
    page.on('dialog', async dialog => {
        if (globals.recordingState === 'paused') return; // Skip if recording is paused
        
        try {
            const dialogType = dialog.type();
            const message = dialog.message();
            switch (dialogType) {
                case 'alert':
                    await dialog.accept();
                    emitSendCode(`// Found Alert Message: ${message}\n`);
                    break;

                case 'confirm':
                    await dialog.accept();
                    emitSendCode(`await ${pageVar}.on('dialog', dialog => dialog.accept()); // Replace 'accept' with 'dismiss' for cancel action\n`);
                    break;

                case 'prompt':
                    await dialog.accept(`Default User Input from dialog`);
                    emitSendCode(`await ${pageVar}.on('dialog', dialog => dialog.accept(\`Default User Input from dialog\`)); // Change Default User Input accordingly\n`);
                    break;

                default:
                    console.log(`Unexpected dialog type: ${dialogType}`);
                    await dialog.dismiss();
                    break;
            }
        } catch (error) {
            console.log(`Error handling dialog: ${error.message}`);
            await dialog.dismiss(); // Dismiss dialog on error
        }
    });

    await page.exposeFunction('updateRecordingState', (state) => {
        handleRecordingStateUpdate(state);
    });

    await page.exposeFunction('recordClick', async (action, xpath, frameXpath = null) => {
        if (globals.recordingState === 'paused') return; 
        
        checkIsPageChange();
        emitCodeForElement(action, xpath, frameXpath, false, pageVar);
        navigationByClick = true;

        const newTargetPromise = new Promise(resolve => {
            globals.browser.once('targetcreated', resolve);
        });

        const newTarget = await Promise.race([
            newTargetPromise,
            new Promise(resolve => setTimeout(() => resolve(null), 500))
        ]);

        if (newTarget && newTarget.type() === 'page') {
            const newPage = await newTarget.page();
            globals.allPages.push(newPage);
            const newPageVar = assignPageVariable(newPage);
            await setupPage(newPage, newPage.url(), newPageVar);
        }
    });

    await page.exposeFunction('recordSelect', async (xpath, value, isAssert = false) => {
        if (globals.recordingState === 'paused') return; // Skip if recording is paused
        
        checkIsPageChange();
        const action = `selectOption('${value}')`;
        emitCodeForElement(action, xpath, null, isAssert, pageVar);
    });

    await page.exposeFunction('emitSendCode', (code, xpath, frameXpath = null, isAssert = false) => {
        if (globals.recordingState === 'paused') return; // Skip if recording is paused
        
        checkIsPageChange();
        emitCodeForElement(code, xpath, frameXpath, isAssert, pageVar);
    });

    function emitCodeForElement(action, xpath, frameXpath = null, isAssert, pageVar) {
        checkIsPageChange();
        if (isAssert) {
            emitSendCode(action, xpath, frameXpath);
        } else {
            const code = frameXpath
                ? `await ${pageVar}.locator(\`${frameXpath}\`).contentFrame().locator(\`${xpath}\`).${action};\n`
                : `await ${pageVar}.locator(\`${xpath}\`).${action};\n`;
            emitSendCode(code, xpath, frameXpath);
        }
    }

    function checkIsPageChange() {
        if (globals.activePageVar && globals.activePageVar !== pageVar) {
            emitSendCode(`await ${pageVar}.bringToFront();\n`);
            globals.activePageVar = pageVar;
        }
    }
}

module.exports = { setupEventListeners };
