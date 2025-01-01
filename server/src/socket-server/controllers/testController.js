const { fetchFile, saveFile } = require("../services/fileService");
const { replaceLocatorsWithGlobal } = require("../socket-utils/globalLocatorReplace");
const { setGlobals, globals } = require("../socket-utils/globals");
const { startRecording } = require("../services/recorderService");
const { parseMessage } = require("../socket-utils/elementUtils");
const logger = require("../../utils/logger");

const handleConnection = (ws) => {
  let isRecordingEnded = false; // Flag to ensure endRecording only runs once

  try {
    // Event listener for receiving WebSocket messages
    ws.on("message", async (message) => {
      const data = parseMessage(message); // Assuming messages are sent as JSON
      if (!data) {
        return;
      }
      try {
        if (data.event === "loadUrl") {
          // Reset the recording ended flag when starting a new session
          isRecordingEnded = false;
          setGlobals({ startLine: data.startLine, project: data.projectDetails });
          await startRecording(data.url);
        }

        if (data.event === "endRecording" && !isRecordingEnded) {
          isRecordingEnded = true; // Mark recording as ended
          ws.send(JSON.stringify({ event: "loadingStart" }));
          logger.info('Recording ended.');

          if (globals.browser) {
            await globals.browser.close();
          }

          setGlobals({ startLine: data.startLine, endLine: data.endLine, page: null, browser: null });
          const code = await replaceLocatorsWithGlobal(data.code);
          const response = {
            event: "replaceCode",
            code,
            startLine: globals.startLine,
            endLine: globals.endLine,
          };
          ws.send(JSON.stringify(response)); // Send the processed code back to the client
          ws.send(JSON.stringify({ event: "loadingEnd" }));
        }

        if (data.event === "closeBrowser") {
          if (globals.browser) {
            await globals.browser.close();
            setGlobals({ page: null, browser: null });
          }
        }

        if (data.event === "fetchFile") {
          fetchFile(ws, data);
        }

        if (data.event === "saveFile") {
          saveFile(ws, data);
        }
      } catch (error) {
        // Send error to client and log only once
        ws.send(JSON.stringify({ 
          event: 'error', 
          message: error.message || 'An error occurred'
        }));
        logger.error(`Error processing message event: ${error.message}`);
      }
    });

    ws.on("close", () => {
      if (globals.browser) {
        globals.browser.close().catch(() => {});
      }
    });
  } catch (error) {
    logger.error(`WebSocket connection error: ${error.message}`);
  }
};

module.exports = { handleConnection };
