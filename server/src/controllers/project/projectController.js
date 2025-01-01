const path = require('path');
const fs = require('fs').promises;
const fss = require('fs');
const { exec } = require('child_process');
const archiver = require('archiver');
const { connectToMongoDB } = require('../../config/mongoDatabase');
const envConfig = require('../../config/envConfig');
const logger = require('../../utils/logger');

const BASE_PATH = path.join(envConfig.BASE_PATH, 'projects');

const DEFAULT_FILES = [
    {
        name: 'README.md',
        content: (folderName, description) => `# ${folderName}\n\nProject description: ${description}`
    },
    {
        name: 'playwright.config.js', content: `// @ts-check
import { defineConfig, devices } from '@playwright/test';

module.exports = defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  snapshotDir: './test-results/snapshots',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: './test-results', open: 'never' }],
    ['json', { outputFile: './test-results/results.json' }]
  ],
  timeout: 60000,
  expect: {
    timeout: 60000,
  },
  use: {
    launchOptions: {
      slowMo: 0,
      args: [
        '--start-maximized',
      ]
    },
    headless: false,
    baseURL: 'http://alphabin.co',
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chromium'], viewport: null },
    },
  ],
});`
    },
    { name: '.env', content: (folderName) => `` },
    {
        name: 'tests/example.spec.js', content: `const { locators } = require('../global.js');
const { test, expect } = require('@playwright/test');
const playwright = require('playwright');
const abPlaywright = require("alphabin-pw");
const config = require('../playwright.config.js');
let browser;

test.beforeEach(async () => {
    browser = await playwright[config.projects[0].name].launch(config.use);
});

test.afterEach(async () => {
    await browser.close();
});

test('should go to the homepage', async () => {
    const context = await browser.newContext();
	const page1 = await context.newPage();
    await page1.goto('https://playwright.dev/');

    await expect(page1).toHaveTitle('Fast and reliable end-to-end testing for modern web apps | Playwright');
});
`
    },
    {
        name: 'global.js', content: `let locators = {
        
};

module.exports = { locators };
`
    },
    {
        name: 'package.json', content: (folderName, description) => JSON.stringify({
            "name": folderName,
            "version": "1.0.0",
            "main": "index.js",
            "scripts": {},
            "keywords": [],
            "author": "",
            "license": "ISC",
            "description": description || 'description',
            "dependencies": {
                "playwright": "^1.47.2",
                'dotenv': '^16.4.5',
            },
            "devDependencies": {
                "@playwright/test": "^1.47.2",
                "@types/node": "^22.1.0"
            }
        }, null, 2)
    },
];

// Function to create default files
async function createDefaultFiles(folderPath, folderName, description) {
    await fs.mkdir(path.join(folderPath, 'tests'), { recursive: true });

    for (const file of DEFAULT_FILES) {
        const filePath = path.join(folderPath, file.name);
        const fileContent = typeof file.content === 'function'
            ? file.content(folderName, description)
            : file.content;

        await fs.writeFile(filePath, fileContent);
    }
}

const ensureDirectoryExists = async (dir) => {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch (err) {
        logger.error(`Error creating directory ${dir}:`, err);
    }
};

const getAllProjects = async (req, res) => {
    try {
        await ensureDirectoryExists(BASE_PATH);

        const files = await fs.readdir(BASE_PATH, { withFileTypes: true });

        const folders = await Promise.all(
            files
                .filter(dirent => dirent.isDirectory())
                .map(async dirent => {
                    const metadataPath = path.join(BASE_PATH, dirent.name, 'metadata.json');
                    let description = 'Default description';

                    try {
                        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
                        description = metadata.description || description;
                    } catch { }

                    return { name: dirent.name, description };
                })
        );

        res.status(200).json(folders);
    } catch (err) {
        logger.error('Error reading folders:', err);
        res.status(500).json({ error: 'Failed to read folders' });
    }
};

const createProject = async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const folderName = req.query.name;
    const description = req.query.description;

    if (!folderName) {
        res.write(`data: ${JSON.stringify({ message: 'Folder name is required' })}\n\n`);
        res.end();
        return;
    }

    const folderPath = path.join(BASE_PATH, folderName);
    const sendProgress = (message) => {
        res.write(`data: ${JSON.stringify({ message })}\n\n`);
    };

    try {
        sendProgress('Initializing project creation...');

        if (await fs.access(folderPath).then(() => true).catch(() => false)) {
            sendProgress('Project name already exists.');
            res.end();
            return;
        }

        await fs.mkdir(folderPath, { recursive: true });
        const metadata = { description: description || 'Default description' };
        await fs.writeFile(path.join(folderPath, 'metadata.json'), JSON.stringify(metadata, null, 2));
        await createDefaultFiles(folderPath, folderName, description);

        // MongoDB operations
        try {
            sendProgress('Setting up database...');
            const db = await connectToMongoDB();
            
            // Create a new document in the projects collection
            const projectsCollection = db.collection('projects');
            try {
                await projectsCollection.insertOne({
                    name: folderName,
                    description: description || 'Default description',
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                // Create a dedicated collection for the project
                try {
                    await db.createCollection(folderName);
                    
                    // Initialize the project collection with a default document
                    const projectCollection = db.collection(folderName);
                    await projectCollection.insertOne({
                        _id: 'config',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        settings: {
                            version: '1.0.0',
                            initialized: true
                        }
                    });
                    logger.info(`Collection '${folderName}' initialized with default configuration`);
                } catch (collectionError) {
                    logger.error(`Error creating collection '${folderName}': ${collectionError.message}`);
                }
            } catch (error) {
                logger.error(`Error inserting project document in collection 'projects': ${error.message}`);
            }

            // Initialize test case counter
            const tcCountersCollection = db.collection('tc_counters');
            try {
                await tcCountersCollection.updateOne(
                    { _id: "TCcounter" },
                    { 
                        $set: { 
                            [`projects.${folderName}`]: {
                                counter: 0,
                                createdAt: new Date()
                            }
                        } 
                    },
                    { upsert: true }
                );
                logger.info(`Collection 'tc_counters' updated with new counter for project ${folderName}`);
            } catch (error) {
                logger.error(`Error inserting project counter document in collection 'tc_counters': ${error.message}`);
            }

            sendProgress('Database setup completed.');
        } catch (dbError) {
            logger.error(`MongoDB operation failed: ${dbError.message}`);
            sendProgress('Warning: Database setup encountered an issue, but project creation will continue.');
        }

        const commands = [
            { cmd: 'npm i', message: 'Creating Project...' },
            { cmd: 'npx playwright install', message: 'Configuring Playwright (this may take a few minutes)...' },
            { cmd: 'npm i alphabin-pw', message: 'Configuring Alphabin Playwright...' }
        ];

        for (const { cmd, message } of commands) {
            sendProgress(message);
            await new Promise((resolve, reject) => {
                exec(cmd, { cwd: folderPath }, (error) => {
                    if (error) reject(error);
                    else resolve();
                });
            });
            sendProgress(`✓ ${message.replace('...', '')} completed`);
        }

        sendProgress('Project setup completed successfully');
        res.write(`event: done\ndata: ${JSON.stringify({ message: 'Project setup completed successfully', folder: { name: folderName, description: metadata.description } })}\n\n`);
    } catch (error) {
        logger.error(`Error creating project: ${error.message}`);
        sendProgress(`Error: ${error.message}`);
    } finally {
        res.end();
    }
};


const editProject = async (req, res) => {
    const { oldProjectName } = req.params;
    const { newFolderName, description } = req.body;

    const oldFolderPath = path.join(BASE_PATH, oldProjectName);
    const newFolderPath = path.join(BASE_PATH, newFolderName);

    try {
        // Check if old folder exists
        await fs.access(oldFolderPath);

        // Check if new folder name conflicts
        try {
            await fs.access(newFolderPath);
            return res.status(200).json({ error: 'A folder with the new name already exists.' });
        } catch { }

        // Rename folder if needed
        if (oldProjectName !== newFolderName) {
            await fs.rename(oldFolderPath, newFolderPath);
        }

        // Update metadata
        const metadata = { description: description || 'Default description' };
        await fs.writeFile(
            path.join(newFolderPath, 'metadata.json'),
            JSON.stringify(metadata, null, 2)
        );

        // MongoDB operations
        const db = await connectToMongoDB();
        if (oldProjectName !== newFolderName) {
            await db.renameCollection(oldProjectName, newFolderName);
        }

        const tcCountersCollection = db.collection('tc_counters');
        await tcCountersCollection.updateOne(
            { _id: "TCcounter" },
            {
                $rename: {
                    [`projects.${oldProjectName}`]: `projects.${newFolderName}`
                }
            }
        );

        res.status(200).json({
            message: 'Project and metadata updated successfully.',
            folder: { name: newFolderName, description: metadata.description }
        });
    } catch (error) {
        logger.error(`Error editing project: ${error.message}`);
        res.status(500).json({ error: 'Failed to edit project.' });
    }
};

const deleteProject = async (req, res) => {
    const { projectName } = req.params;
    const folderPath = path.join(BASE_PATH, projectName);

    try {
        // Check if folder exists
        await fs.access(folderPath);

        // Delete folder
        await fs.rm(folderPath, { recursive: true, force: true });

        // MongoDB operations
        const db = await connectToMongoDB();
        await db.dropCollection(projectName);

        const tcCountersCollection = db.collection('tc_counters');
        await tcCountersCollection.updateOne(
            { _id: "TCcounter" },
            { $unset: { [`projects.${projectName}`]: "" } }
        );

        res.status(200).json({ message: 'Project and collection deleted successfully.' });
    } catch (error) {
        logger.error(`Error deleting project: ${error.message}`);
        res.status(500).json({ error: 'Failed to delete project.' });
    }
};

const exportsProject = async (req, res) => {
    const { path: dirPath, project: projectName } = req.body;

    logger.debug(`dirPath: ${dirPath}, projectName: ${projectName}`);

    // Validate inputs
    if (!dirPath || !projectName) {
        return res.status(400).send("Invalid directory path or project name");
    }

    try {
        // Ensure the directory exists
        await fs.access(dirPath).catch(() => {
            throw new Error("Directory does not exist");
        });

        // Resolve the correct output file path
        const zipFileName = `${projectName}.zip`;
        const zipFilePath = path.join(__dirname, zipFileName);

        // Create a writable stream for the zip file
        const output = fss.createWriteStream(zipFilePath);

        // Initialize archiver
        const archive = archiver("zip", { zlib: { level: 5 } });

        // Pipe archive data to the output file
        archive.pipe(output);

        // Listen for the close event to send the file
        output.on("close", async () => {
            logger.debug(`${archive.pointer()} total bytes`);
            res.download(zipFilePath, zipFileName, async (err) => {
                if (err) {
                    logger.error("Error downloading file:", err);
                }
                try {
                    await fs.unlink(zipFilePath); // Cleanup zip file after download
                } catch (cleanupErr) {
                    logger.error("Error cleaning up zip file:", cleanupErr);
                }
            });
        });

        // Handle errors
        archive.on("error", (err) => {
            logger.error("Archiver error:", err);
            if (!res.headersSent) {
                res.status(500).send("Error creating the archive");
            }
        });

        // Append files and folders from the directory, excluding certain patterns
        archive.glob("**/*", {
            cwd: dirPath,
            ignore: ["node_modules/**", "test-results/**", "screenshots/**", "package-lock.json"],
        });

        // Finalize the archive
        await archive.finalize();
    } catch (error) {
        logger.error("Error exporting project:", error);
        if (!res.headersSent) {
            res.status(500).send(error.message || "Failed to export project");
        }
    }
};

module.exports = {
    getAllProjects,
    createProject,
    editProject,
    deleteProject,
    exportsProject
};