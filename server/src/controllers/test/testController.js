const { exec, execSync } = require("child_process");
const { getWebSocket } = require("../../utils/socket");
const path = require("path");
const fs = require("fs");
const readline = require("readline");
const logger = require("../../utils/logger");

let testProcess = null;
let testCompleted = false;

async function ensurePlaywrightBrowsers(folderPath) {
  try {
    const browserPath = path.join(folderPath, 'node_modules', 'playwright-core', '.local-browsers', 'chromium-');
    logger.info("Checking Playwright browsers");
    broadcastProgress({
      message: "Checking Playwright browsers...",
    });
    if (!fs.existsSync(browserPath)) {
      logger.info("Configuring Playwright browsers");
      broadcastProgress({
        message: "Configuring Playwright browsers (this may take a few minutes)...",
      });
      execSync('npx playwright install', { cwd: folderPath, stdio: 'inherit' });
      logger.info("Playwright browsers installation completed");
    } else {
      logger.info("Playwright browsers already installed");
    }
    broadcastProgress({
      message: "Playwright browsers are ready",
    });
  } catch (error) {
    logger.error("Error checking/configuring Playwright browsers:", error);
    broadcastProgress({
      message: "Error with Playwright browsers: " + error.message,
    });
    throw error;
  }
}

function runTests(req, res) {
  const { folderPath, testCases, fileLevelSelections } = req.body;
  
  // First ensure Playwright browsers are installed
  ensurePlaywrightBrowsers(folderPath)
    .then(() => {
      let command = "";

      if (testCases && testCases.length > 0) {
        // Use the first test case's playwrightPattern
        // Since we're running one test at a time
        command = testCases[0].playwrightPattern;
      } else if (fileLevelSelections && fileLevelSelections.length > 0) {
        // Run the selected files
        command = `npx playwright test ${fileLevelSelections.join(' ')}`;
      } else {
        // Default to running all tests if no specific tests are selected
        command = "npx playwright test";
      }

      logger.info(`Command to be executed: ${command}`);

      // Create process with its own group ID
      testProcess = exec(command, { 
        cwd: folderPath,
        detached: true 
      });
      
      let responseSent = false;
      let errorOutput = "";
      let hasErrors = false;
      const rl = readline.createInterface({
        input: testProcess.stdout,
        output: testProcess.stderr,
      });
      rl.on("line", (line) => {
        const match = line.match(/\b[\w\\/.]+:\d+:\d+\s›\s.+\s›\s.+$/);
        const isFailed =
          line.toLowerCase().includes("error") ||
          line.toLowerCase().includes("failed");
        broadcastProgress({
          message: match ? match[0] : line,
          status: isFailed ? "failed" : "passed",
          details: isFailed ? line : "",
        });
        if (isFailed) {
          hasErrors = true;
          errorOutput += `${line}\n`;
        }
      });
      rl.on("error", (err) => {
        hasErrors = true;
        errorOutput += `Error: ${err.message}\n`;
        broadcastProgress({
          message: `Error: ${err.message}`,
          status: "failed",
          details: err.message,
        });
      });
      testProcess.on("close", (code) => {
        testProcess = null;
        if (!responseSent) {
          if (code === 0 && !hasErrors) {
            logger.info("Tests Completed Successfully");
            res
              .status(200)
              .send({ success: true, message: "Tests Completed Successfully" });
          } else {
            res
              .status(200)
              .send({
                success: false,
                message: "Tests completed with mixed results: Some passed, some failed",
                details: errorOutput,
              });
          }
          responseSent = true;
        }
      });
      testProcess.on("error", (err) => {
        if (!responseSent) {
          res
            .status(500)
            .send({
              success: false,
              message: `Failed to start tests: ${err.message}`,
              details: filterErrorOutput(errorOutput || err.message),
            });
          responseSent = true;
        }
      });
    })
    .catch((error) => {
      res
        .status(500)
        .send({
          success: false,
          message: `Failed to start tests: ${error.message}`,
          details: error.message,
        });
    });
}

// Function to filter and format the error output
function filterErrorOutput(output) {
  // Regex to match ANSI escape codes
  const ansiEscapeCodeRegex =
    /\u001b\[\d+([ABCDEFGHJKSTfmsu]|\d{0,2};\d{0,2}[Hf])/g;

  // Remove ANSI escape codes
  output = output.replace(ansiEscapeCodeRegex, "");

  let errorDetails = [];
  let captureDetails = false;

  output.split("\n").forEach((line) => {
    // Filter out unnecessary lines
    if (
      line.includes("node_modules") ||
      line.includes("───────────────────────────")
    ) {
      return; // Skip these lines
    }

    // Capture the main error message
    if (line.startsWith("Error:")) {
      errorDetails.push(line);
      captureDetails = true; // Start capturing subsequent detailed lines
    } else if (captureDetails && line.trim().startsWith("-")) {
      // Capture additional indented details (e.g., unexpected values)
      errorDetails.push(line.trim());
    } else {
      captureDetails = false; // Stop capturing if the details block ends
    }
  });

  return errorDetails.join("\n");
}

function getTestResult(req, res) {
  const { folderPath } = req.body;

  // Check if the folderPath is valid
  if (!folderPath || !fs.existsSync(folderPath)) {
    return res.status(400).json({ error: "Invalid folder path provided" });
  }

  // Check if the Playwright report exists
  const reportPath = path.join(folderPath, "test-results", "index.html");
  res.writeHead(200, { "Content-Type": "text/html" });

  // Create a read stream for the HTML file
  const readStream = fs.createReadStream(reportPath);

  // Pipe the read stream to the response
  readStream.pipe(res);

  // Handle any errors that might occur
  readStream.on("error", (err) => {
    res.writeHead(500, { "Content-Type": "text/html" });
    res.end("Internal Server Error");
  });
}

function stopTests(req, res) {
  if (testCompleted) {
    return res.status(500).send({
      success: false,
      message: "Failed to cancel the tests: Tests have already completed.",
    });
  }

  if (testProcess) {
    try {
      if (process.platform === "win32") {
        exec(`taskkill /pid ${testProcess.pid} /T /F`, (error) => {
          if (error) {
            return res
              .status(500)
              .send({ success: false, message: "Failed to cancel the tests" });
          }
          testProcess = null;
          return res
            .status(200)
            .send({ success: true, message: "Test execution cancelled" });
        });
      } else {
        // On Unix-like systems, kill the entire process group
        try {
          process.kill(-testProcess.pid);
        } catch (killError) {
          // If the process group kill fails, try killing just the process
          try {
            process.kill(testProcess.pid);
          } catch (directKillError) {
            return res
              .status(500)
              .send({ success: false, message: "Failed to cancel the tests" });
          }
        }
        testProcess = null;
        return res
          .status(200)
          .send({ success: true, message: "Test execution cancelled" });
      }
    } catch (err) {
      return res
        .status(500)
        .send({ success: false, message: "Failed to cancel the tests" });
    }
  } else {
    return res
      .status(400)
      .send({ success: false, message: "No test process running" });
  }
}

function broadcastProgress(data) {
  const ws = getWebSocket();
  if (ws) {
    ws.send(
      JSON.stringify({
        event: "progress",
        data,
      })
    );
  }
}

module.exports = {
  runTests,
  stopTests,
  getTestResult,
};
