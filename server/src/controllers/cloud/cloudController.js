const envConfig = require('../../config/envConfig');
const express = require('express');
const { ShareServiceClient } = require('@azure/storage-file-share');
const path = require('path');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const fs = require("node:fs");
const { promisify } = require("util");
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const logger = require('../../utils/logger');

const shareName = 'test-requests';
const connectionString = envConfig.AZURE_STORAGE_CONN_STRING;

async function createZipWithJson(folderPath, jsonFileName, jsonData, zipFileName) {
    const uploadDir = path.join(__dirname, '..', 'upload-to-zip');
    const zipFilePath = path.join(uploadDir, zipFileName);

    // Ensure the upload directory exists
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
    }

    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
        output.on('close', () => {
            if (fs.existsSync(zipFilePath)) {
                resolve({ zipFilePath, uploadDir });
            } else {
                reject(new Error('Failed to create the ZIP file.'));
            }
        });

        archive.on('error', (err) => reject(err));

        archive.pipe(output);


        // Function to add directory contents to the archive
        const addDirectoryToArchive = (dirPath, basePath) => {
            fs.readdirSync(dirPath).forEach(file => {
                const fullPath = path.join(dirPath, file);
                const relativePath = path.relative(basePath, fullPath);

                if (fs.statSync(fullPath).isDirectory()) {
                    // Skip the 'node_modules' directory
                    if (file !== 'node_modules' && file !== 'screenshots' && file !== 'temp-locator-mapping.json') {
                        // Recursively add directory contents
                        addDirectoryToArchive(fullPath, basePath);
                    }
                } else {
                    // Add file to the archive
                    archive.file(fullPath, { name: relativePath });
                }
            });
        };

        // Add the folder contents to the archive, excluding 'node_modules'
        addDirectoryToArchive(folderPath, folderPath);
        // Add the JSON data to the archive
        archive.append(JSON.stringify(jsonData, null, 2), { name: jsonFileName });

        // Include additional files if they exist
        const filesToInclude = ['.env', 'package.json', 'playwright.config.js'];

        filesToInclude.forEach((file) => {
            const filePath = path.join(folderPath, '..', file);
            if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: file });
            } else {
                logger.warn(`Warning: ${file} does not exist in ${folderPath}`);
            }
        });

        // Finalize the archive
        archive.finalize();
    });
}

async function uploadFileToAzure(zipFilePath, fileName) {

    const serviceClient = ShareServiceClient.fromConnectionString(connectionString);

    // Get a ShareClient for the file share
    const shareClient = serviceClient.getShareClient(shareName);

    // Get a FileClient for the file to upload
    const fileClient = shareClient.rootDirectoryClient.getFileClient(fileName);


    try {
        // Get the size of the file to be uploaded
        const { size: fileSize } = await stat(zipFilePath);

        // Create the file on the file share with the specified size
        await fileClient.create(fileSize);

        // Read the entire file into memory
        const fileContent = await readFile(zipFilePath);

        // Upload the file using the `uploadRange` method
        await fileClient.uploadRange(fileContent, 0, fileSize);
    } catch (error) {
        logger.error('Error uploading file:', error.message);
        throw error; // Re-throw the error for proper error handling
    }
}

// API endpoint to handle the request
async function runCloud(req, res) {
    const { projectPath, folderName, projectName, jsonFileName, jsonData, uuid } = req.body;

    if (!projectPath || !folderName || !projectName || !jsonFileName || !jsonData || !uuid) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const folderPath = path.join(projectPath);

    if (!fs.existsSync(folderPath)) {
        return res.status(404).json({ error: `Folder ${folderName} not found in project path ${projectPath}` });
    }

    const zipFileName = `${projectName}-${uuid}.zip`;
    try {
        // Create the zip file with the folder and JSON
        const { zipFilePath, uploadDir } = await createZipWithJson(folderPath, jsonFileName, jsonData, zipFileName);

        // Verify if the ZIP file exists
        if (fs.existsSync(zipFilePath)) {
            // Upload the zip file to Azure File Share
            await uploadFileToAzure(zipFilePath, zipFileName);
            logger.info(`Zip file uploaded to Azure File Share: ${zipFilePath}`);

            fs.unlinkSync(zipFilePath);
            if (fs.existsSync(uploadDir)) {
                fs.rmSync(uploadDir, { recursive: true, force: true });
            }

            // Send a POST request to the external API with the UUID and JSON data
            const apiResponse = await fetch('https://malamute-noble-miserably.ngrok-free.app/submit-uuid', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ uuid: zipFileName.split('.')[0], json: jsonData }),
            });

            // Handle the response from the external API
            const apiData = await apiResponse.json();

            if (apiResponse.ok) {
                res.status(200).json(apiData);
            } else {
                logger.error('API responded with an error:', apiData);
                res.status(apiResponse.status).json({ error: 'Error processing the file', details: apiData });
            }
        } else {
            throw new Error('ZIP file was not found after creation.');
        }
    } catch (error) {
        logger.error('Error in runCloud function:', error.message);
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    runCloud,
}