const { chromium } = require('playwright');
const WebSocket = require('ws');
const { handleError, parseMessage } = require("../socket-utils/elementUtils");
const { getWebSocket } = require("../../utils/socket");
const { setGlobals, globals, assignPageVariable, resetPageCounter } = require('../socket-utils/globals');
const { setupPage } = require('./pageService');
const { emitSendCode } = require('./socketService');
const logger = require('../../utils/logger');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const sendSocketMessage = (socket, event, message, load = false) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        const data = { event, message, load };
        socket.send(JSON.stringify(data));
    } else {
        logger.error('WebSocket is not open');
    }
};

/**
 * Ensures Playwright browsers are installed.
 * @param {WebSocket} socket - WebSocket instance for sending messages.
 */
const ensurePlaywrightBrowsers = async (socket) => {
    const browserPath = path.resolve('node_modules', 'playwright-core', '.local-browsers', 'chromium-');

    try {
        if (!fs.existsSync(browserPath)) {
            const installMessage = "Configuring Playwright browsers (this may take a few minutes)...";
            logger.info(installMessage);
            sendSocketMessage(socket, 'info', installMessage, true);

            execSync('npx playwright install chromium', { stdio: 'inherit' });

            const successMessage = "Playwright browsers configuration completed successfully";
            logger.info(successMessage);
            sendSocketMessage(socket, 'info', successMessage, false);
        } else {
            logger.info("Playwright browsers already installed");
            sendSocketMessage(socket, 'info', "Playwright browsers already installed", false);
        }
    } catch (error) {
        const errorMessage = `Error installing Playwright browsers: ${error.message}`;
        logger.error(errorMessage, error);
        sendSocketMessage(socket, 'error', errorMessage, false);
        throw error;
    }
};

/**
 * Closes the browser instance and cleans up resources
 */
const closeBrowser = async () => {
    if (globals.browser) {
        logger.info("Closing browser instance");
        try {
            await globals.browser.close();
        } catch (error) {
            // Ignore close errors as browser might already be closed
        } finally {
            globals.browser = null;
            globals.context = null;
            globals.page = null;
            globals.allPages = [];
            globals.isAlreadyAddedContext = false;
        }
    }
};

/**
 * Starts the recording process.
 * @param {string} initialUrl - The initial URL to open in the browser.
 */
const startRecording = async (initialUrl) => {
    const socket = getWebSocket();

    try {
        // Close any existing browser instance
        await closeBrowser();

        // Ensure Playwright browsers are installed
        await ensurePlaywrightBrowsers(socket);

        // Reset page counter and launch browser
        resetPageCounter();
        const browser = await chromium.launch({ headless: false, defaultViewport: null, args: ['--start-maximized'] });
        const context = await browser.newContext({ viewport: null });
        const page = await context.newPage();

        // Assign a variable for the main page and set global state
        const mainPageVar = assignPageVariable(page);
        const browserSocket = new WebSocket('ws://localhost:3001');
        setGlobals({ browser, context, page, browserSocket, allPages: [page], isAlreadyAddedContext: false });

        // Set up the main page for recording
        await setupPage(page, initialUrl);

        // Send initial page setup code
        const initialCode = `const ${mainPageVar} = await browser.newPage();\n\tawait ${mainPageVar}.goto('${initialUrl}');\n`;
        emitSendCode(initialCode);

        // Handle new popups
        context.on('page', async (newPage) => {
            globals.allPages.push(newPage);
            const newPageVar = assignPageVariable(newPage);
            logger.info(`New page assigned variable: ${newPageVar}`);
            await setupPage(newPage, newPage.url(), newPageVar);
        });

        // Listen for messages from the frontend
        socket.onmessage = async (event) => {
            const message = parseMessage(event.data);
            if (message && message.event === "closefromFrontend") {
                socket.send(JSON.stringify({ event: "stopRecord", startLine: globals.startLine }));
                if (browser) {
                    await browser.close();
                }
            }
        };
    } catch (error) {
        await closeBrowser();
        throw error;
    }
};

module.exports = { startRecording, closeBrowser };