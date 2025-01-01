const fs = require("fs").promises; // Use promises-based fs
const path = require("path");
const { BASE_PATH } = require('../../config/envConfig');
const logger = require('../../utils/logger');

// Constants
const EXCLUDED_DIRS = ['node_modules'];
const SPEC_FILE_TEMPLATE = `const { locators } = require('../global.js');
const { test, expect } = require('@playwright/test');
const playwright = require('playwright');
const config = require('../playwright.config.js');
let browser;

test.beforeEach(async () => {
    browser = await playwright[config.projects[0].name].launch(config.use);
});

test.afterEach(async () => {
    await browser.close();
});`;

// Utility functions
const isSpecFile = (filename) => /\.spec\.(js|ts)$/.test(filename);
const shouldSkipDirectory = (dirname) => EXCLUDED_DIRS.includes(dirname);

const fetchFile = async (req, res) => {
    const { projectPath, name } = req.body;
    const filePath = path.join(projectPath, name);

    try {
        const data = await fs.readFile(filePath, 'utf-8');
        res.status(200).send({ content: data, filePath });
    } catch (error) {
        logger.error('Error fetching file:', error);
        res.status(500).send({ error: 'Failed to read file', details: error.message });
    }
};

const traverseDirectory = async (dir, callback) => {
    const items = await fs.readdir(dir);
    
    for (const item of items) {
        if (shouldSkipDirectory(item)) continue;
        
        const fullPath = path.join(dir, item);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
            const found = await callback(fullPath, item, true);
            if (found) return true;
            const subDirResult = await traverseDirectory(fullPath, callback);
            if (subDirResult) return true;
        } else {
            const found = await callback(fullPath, item, false);
            if (found) return true;
        }
    }
    return false;
};

const createFileOrFolderHandler = async (req, res) => {
    const { projectPath, name, type } = req.body;
    const fullPath = path.join(projectPath, name);

    try {
        if (type === 'folder') {
            await fs.mkdir(fullPath);
        } else if (type === 'file') {
            const content = isSpecFile(name) ? SPEC_FILE_TEMPLATE : '';
            await fs.writeFile(fullPath, content);
            return res.json({ message: 'File created successfully', content });
        } else {
            return res.status(400).json({ error: 'Invalid type' });
        }
        res.json({ message: `${type} created successfully` });
    } catch (error) {
        logger.error(`Error creating ${type}:`, error);
        res.status(500).json({ error: `Failed to create ${type}` });
    }
};

const renameFileOrFolderHandler = async (req, res) => {
    const { projectPath, oldName, newName } = req.body;

    try {
        const success = await traverseDirectory(projectPath, async (fullPath, item, isDirectory) => {
            if (item === oldName) {
                const newFullPath = path.join(path.dirname(fullPath), newName);
                await fs.rename(fullPath, newFullPath);
                logger.info(`Renamed ${isDirectory ? 'directory' : 'file'}: ${fullPath} to ${newFullPath}`);
                return true;
            }
            return false;
        });

        if (success) {
            res.json({ message: 'File or folder renamed successfully' });
        } else {
            res.status(404).json({ error: 'File or folder not found' });
        }
    } catch (error) {
        logger.error('Error renaming file/folder:', error);
        res.status(500).json({ error: 'Failed to rename file or folder' });
    }
};

const deleteFileOrFolderHandler = async (req, res) => {
    const { projectPath, filename } = req.body;

    try {
        const success = await traverseDirectory(projectPath, async (fullPath, item, isDirectory) => {
            if (item === filename) {
                if (isDirectory) {
                    await fs.rm(fullPath, { recursive: true, force: true });
                } else {
                    await fs.unlink(fullPath);
                }
                logger.info(`Deleted ${isDirectory ? 'directory' : 'file'}: ${fullPath}`);
                return true;
            }
            return false;
        });

        if (success) {
            res.json({ message: 'File deleted successfully' });
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (error) {
        logger.error('Error deleting file:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
};

const getDirectoryStructure = async (dirPath) => {
    const items = await fs.readdir(dirPath);
    const structure = [];

    for (const item of items) {
        if (shouldSkipDirectory(item)) continue;

        const fullPath = path.join(dirPath, item);
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
            structure.push({
                name: item,
                type: 'folder',
                children: await getDirectoryStructure(fullPath)
            });
        } else {
            const code = await fs.readFile(fullPath, 'utf-8');
            structure.push({
                name: item,
                type: 'file',
                extension: path.extname(item),
                code
            });
        }
    }
    return structure;
};

const getDirectoryStructureHandler = async (req, res) => {
    const { folderName } = req.body;
    const basePath = path.join(BASE_PATH, 'projects', folderName);

    try {
        if (!await fs.access(basePath).then(() => true).catch(() => false)) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const structure = await getDirectoryStructure(basePath);
        res.json({ structure, directory: folderName, path: basePath });
    } catch (error) {
        logger.error('Error fetching directory structure:', error);
        res.status(500).json({ error: 'Failed to fetch directory structure' });
    }
};

module.exports = {
    createFileOrFolderHandler,
    renameFileOrFolderHandler,
    deleteFileOrFolderHandler,
    getDirectoryStructureHandler,
    fetchFile
};