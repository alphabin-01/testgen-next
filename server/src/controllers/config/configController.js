const path = require("path");
const fs = require("fs");
const logger = require('../../utils/logger');

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

const getConfig = (req, res) => {
    const { rootpath } = req.body;

    if (!rootpath) {
        return res.status(400).send('Missing rootPath');
    }

    // Determine if the config file is TypeScript or JavaScript
    const tsConfigPath = path.join(rootpath, 'playwright.config.ts');
    const jsConfigPath = path.join(rootpath, 'playwright.config.js');

    let configPath = null;
    if (fs.existsSync(tsConfigPath)) {
        configPath = tsConfigPath;
    } else if (fs.existsSync(jsConfigPath)) {
        configPath = jsConfigPath;
    } else {
        return res.status(404).send('No config file found');
    }

    // Read the existing config file
    fs.readFile(configPath, 'utf8', (err, data) => {
        if (err) {
            logger.error('Error reading config file:', err);
            return res.status(500).send('Failed to read config file');
        }

        // Extract the configuration settings
        const testDirMatch = data.match(/testDir:\s*['"](.*?)['"]/);

        const slowMoMatch = data.match(/slowMo:\s*(\d+)/);
        const baseUrlMatch = data.match(/baseURL:\s*['"](.*?)['"]/);
        const selectedBrowserMatch = data.match(/name:\s*['"](.*?)['"]/);
        const noOfWorkersMatch = data.match(/workers:\s*(\d+)/);
        const headlessMatch = data.match(/headless:\s*(\w+)/);
        const timeoutMatch = data.match(/timeout:\s*(\d+)\s*/);

        const config = {
            timeout: timeoutMatch ? parseInt(timeoutMatch[1]) : 60,
            testDir: testDirMatch ? testDirMatch[1] : null,
            slowMo: slowMoMatch ? slowMoMatch[1] : null,
            baseUrl: baseUrlMatch ? baseUrlMatch[1] : null,
            selectedBrowser: selectedBrowserMatch ? selectedBrowserMatch[1] : null,
            noOfWorkers: noOfWorkersMatch ? noOfWorkersMatch[1] : null,
            headless: headlessMatch ? headlessMatch[1] === 'true' : false,
        };

        res.json(config);
    });
};

const updateConfigHandler = (req, res) => {
    const { slowMo, testDir, noOfWorkers, baseUrl, selectedBrowser, headless, rootPath, timeout } = req.body;

    // Determine if the config file is TypeScript or JavaScript
    const tsConfigPath = path.join(rootPath, 'playwright.config.ts');
    const jsConfigPath = path.join(rootPath, 'playwright.config.js');

    let configPath = null;
    if (fs.existsSync(tsConfigPath)) {
        configPath = tsConfigPath;
    } else if (fs.existsSync(jsConfigPath)) {
        configPath = jsConfigPath;
    } else {
        return res.status(404).send('No config file found');
    }

    // Read the existing config file
    fs.readFile(configPath, 'utf8', (err, data) => {
        if (err) {
            logger.error('Error reading config file:', err);
            return res.status(500).send('Failed to read config file');
        }

        // Update the specific parts of the file
        let updatedConfig = data;
        if (testDir) {
            updatedConfig = updatedConfig.replace(/testDir:\s*['"].*['"]/g, `testDir: '${testDir}'`);
        }
        if (baseUrl) {
            updatedConfig = updatedConfig.replace(/baseURL:\s*['"].*['"]/g, `baseURL: '${baseUrl}'`);
        }
        if (noOfWorkers !== undefined) {
            updatedConfig = updatedConfig.replace(/workers:\s*\d+/g, `workers: ${noOfWorkers}`);
        }
        if (headless !== undefined) {
            updatedConfig = updatedConfig.replace(/headless:\s*\w+/g, `headless: ${headless}`);
        }
        if (timeout !== undefined) {            
            updatedConfig = updatedConfig.replace(/timeout:\s*\d+\s*/g, `timeout: ${timeout}`);
        }
        
        // Replace the projects section dynamically
        const capitalizedBrowser = capitalizeFirstLetter(selectedBrowser || 'chromium');
        
        // Update launch options for Chromium
        const launchOptionsRegex = /launchOptions:\s*{[^}]*}/g;
        const newLaunchOptions = selectedBrowser === 'chromium' 
            ? `launchOptions: {
      slowMo: ${slowMo || 0},
      args: [
        '--start-maximized',
      ]
    }`
            : `launchOptions: {
      slowMo: ${slowMo || 0}
    }`;
        updatedConfig = updatedConfig.replace(launchOptionsRegex, newLaunchOptions);

        const projectsRegex = /projects:\s*\[[^\]]*\]/g;
        const updatedProjects = `projects: [
    {
      name: '${selectedBrowser || 'chromium'}',
      use: { ...devices['Desktop ${capitalizedBrowser}']`;
        updatedConfig = updatedConfig.replace(projectsRegex, updatedProjects);

        if (selectedBrowser !== 'chromium') {
            updatedConfig = updatedConfig.replace(/,\s*viewport:\s*null/g, '');
        } else {
            updatedConfig = updatedConfig.replace(/use: { ...devices\['Desktop Chromium'\] }/g, `use: { ...devices['Desktop Chromium'], viewport: null }`);
        }

        fs.writeFile(configPath, updatedConfig, (err) => {
            if (err) {
                logger.error('Error saving config:', err);
                return res.status(500).send('Failed to save config');
            }
            return res.status(200).json({ message: 'Config updated successfully.' });
        });
    });
};


module.exports = {
    getConfig,
    updateConfigHandler,
};
