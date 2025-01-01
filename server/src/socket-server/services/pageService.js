const { emitSendCode } = require("./socketService");
const { setupDOMListeners } = require('../socket-utils/dom/domListeners');
const { checkIsFlutter } = require('../socket-utils/checkIsFlutter');
const { setupEventListeners } = require('../handlers/eventHandler');
const { globals, pageVariableMapping, assignPageVariable, setGlobals } = require('../socket-utils/globals');
const logger = require('../../utils/logger');

const setupPage = async (page, initialUrl) => {
    await page.goto(initialUrl, { waitUntil: 'load', timeout: 60000 });

    const pageVar = assignPageVariable(page);

    // Track active page state
    if (!globals.activePageVar) {
        globals.activePageVar = pageVar;
    }

    checkIsFlutter(page, pageVar);

    await setupEventListeners(page);

    // Handle popups
    page.on('popup', async (popup) => {
        const popupVar = assignPageVariable(popup);
        emitSendCode(`const ${popupVar}Promise = ${pageVar}.waitForEvent('popup');\n`);
        globals.allPages.push(popup);
        emitSendCode(`const ${popupVar} = await ${popupVar}Promise;\n`);

        // Set the popup as the active page
        globals.activePageVar = popupVar;
    });

    async function addEventListenersToAllFrames() {
        const frames = page.frames();
        for (const frame of frames) {
            if (!frame.isDetached()) {
                await addEventListenersToFrame(frame, pageVar);
            }
        }
    }

    page.on('domcontentloaded', async () => {
        await addEventListenersToAllFrames();
    });

    page.on('frameattached', async (frame) => {
        if (!frame.isDetached()) {
            await addEventListenersToFrame(frame, pageVar);
        }
    });

    page.on("close", async () => {
        const pageVarToClose = pageVariableMapping.get(page);
        
        // Clean up page references
        globals.allPages = globals.allPages.filter(p => p !== page);
        pageVariableMapping.delete(page);

        // Emit close command if page variable exists
        pageVarToClose && emitSendCode(`await ${pageVarToClose}.close();\n`);

        // Stop recording only if no pages remain
        if (!globals.allPages.length && globals.browser) {
            globals.browserSocket.send(JSON.stringify({ 
                event: "stopRecord", 
                startLine: globals.startLine 
            }));
            await globals.browser.close();
        }
    });

    await addEventListenersToAllFrames();
};

async function addEventListenersToFrame(frame, pageVar) {
    try {
        const url = frame.url();
        if (url === 'about:blank' || url === '' || !url.startsWith('http')) {
            return;
        }

        // Check if frame is accessible
        try {
            await frame.evaluate(() => true);
        } catch (e) {
            console.debug(`Frame ${url} is not accessible (likely cross-origin)`);
            return;
        }

        await setupDOMListeners(frame, pageVar);
    } catch (error) {
        // Log but don't throw - we want to continue even if one frame fails
        logger.debug(`Error adding event listeners to frame ${frame.url()}:`, error.message);
    }
}

module.exports = { setupPage };