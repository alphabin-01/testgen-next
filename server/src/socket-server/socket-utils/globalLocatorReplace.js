const fs = require('fs');
const { connectToMongoDB } = require('../../config/mongoDatabase');
const { updateGlobalJSFile } = require('../services/fileService');
const { globals } = require("./globals");
const logger = require('../../utils/logger');

const replaceLocatorsWithGlobal = async (code) => {
    try {
        const project = globals.project;

        // Validate inputs early
        if (!project?.name) {
            throw new Error('Invalid project configuration');
        }

        if (!globals.tempFilePath) {
            throw new Error('Temp file path is not defined');
        }

        // Check if the temp file exists
        if (!fs.existsSync(globals.tempFilePath)) {
            return code;
        }

        // Read and parse the temp file with error handling
        let locatorMapping;
        try {
            const data = fs.readFileSync(globals.tempFilePath, 'utf8');
            locatorMapping = JSON.parse(data);
        } catch (error) {
            logger.error('Error reading or parsing temp file:', error);
            throw error;
        }

        // Connect to MongoDB with connection management
        const db = await connectToMongoDB();
        if (!db) {
            throw new Error('Failed to connect to MongoDB');
        }

        const tcCounterCollection = db.collection('tc_counters');
        const projectCollection = db.collection(project.name);

        // Initialize counter document with better error handling
        const projectCounterDoc = await initializeCounterDocument(tcCounterCollection, project.name);

        // Process code with optimized caching
        const { updatedCode, newLocators } = await processCode(
            code,
            locatorMapping,
            projectCollection,
            tcCounterCollection,
            project.name,
            projectCounterDoc
        );

        // Cleanup and update
        try {
            fs.unlinkSync(globals.tempFilePath);
            await updateGlobalJSFile(newLocators, project);
        } catch (error) {
            logger.error('Error in cleanup phase:', error);
            throw error;
        }


        return updatedCode;
    } catch (error) {
        logger.error('Fatal error in replaceLocatorsWithGlobal:', error);
        return code;
    }
};

async function initializeCounterDocument(tcCounterCollection, projectName) {
    const projectCounterDoc = await tcCounterCollection.findOneAndUpdate(
        { _id: 'TCcounter' },
        {
            $setOnInsert: {
                projects: { [projectName]: 0 }
            }
        },
        { upsert: true, returnDocument: 'after' }
    );

    if (!projectCounterDoc.projects?.[projectName]) {
        await tcCounterCollection.updateOne(
            { _id: 'TCcounter' },
            { $set: { [`projects.${projectName}`]: 0 } }
        );
    }

    return projectCounterDoc;
}

const processCode = async (code, locatorMapping, projectCollection, tcCounterCollection, projectName, counterDoc) => {
    try {
        const lines = code.split('\n');
        const updatedLines = [];
        const newLocators = new Set();

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            const locators = extractAllLocators(line);

            if (locators.length > 0) {

                // Process each locator in the line
                for (const locator of locators) {

                    const mappedLocator = findLocatorInMapping(locator.locator, locatorMapping);

                    if (mappedLocator) {
                        const documentUrl = mappedLocator.documentUrl;
                        const existingDocument = await findExistingDocument(documentUrl, projectCollection, locator.locator);
                        const existingEntry = mappedLocator.existingEntry;

                        try {
                            const locatorIndex = await getLocatorIndex(
                                existingDocument,
                                locator.locator,
                                existingEntry,
                                tcCounterCollection,
                                projectName,
                                projectCollection,
                                documentUrl
                            );

                            if (locatorIndex) {
                                line = replaceLocatorInLine(line, locator.pattern, locatorIndex, locator.type);
                                newLocators.add(locator.locator);
                            }
                        } catch (error) {
                            logger.error('Error processing locator:', error);
                        }
                    } else {
                        logger.warn(`Locator not found: ${locator.locator}`);
                    }
                }
            }

            updatedLines.push(line);
        }


        return {
            updatedCode: updatedLines.join('\n'),
            newLocators: Array.from(newLocators)
        };
    } catch (error) {

        throw error;
    }
};

function extractAllLocators(line) {
    try {

        const locators = [];

        // Match backtick-quoted XPath with possible spaces, globally
        const pattern = /\.locator\(\s*(['"`])((?:\\.|(?!\1).)*?)\1\s*\)/g;
        let match;

        while ((match = pattern.exec(line)) !== null) {
            // Trim any extra spaces from the locator
            const locator = match[2].trim();

            locators.push({
                locator: locator,
                pattern: match[0],
                type: locator.startsWith('//') ? 'xpath' : 'locator'
            });
        }

        return locators;
    } catch (error) {
        logger.error('Error extracting locators:', error);
        return [];
    }
}

function replaceLocatorInLine(line, pattern, locatorIndex, type) {
    try {
        let replacement = `.locator(locators.${locatorIndex})`;

        // Do a direct string replacement for this specific pattern
        const newLine = line.replace(pattern, replacement);

        return newLine;
    } catch (error) {
        logger.error('Error replacing locator:', error);
        return line;
    }
}

function findLocatorInMapping(locator, locatorMapping) {
    // First check if the locator exists in the mapping
    for (const [url, mappings] of Object.entries(locatorMapping)) {
        const matchingEntry = mappings.find(entry =>
            entry.xpath?.trim() === locator.trim() ||
            (entry.locator && entry.locator.trim() === locator.trim())
        );

        if (matchingEntry) {
            return {
                documentUrl: url,
                existingEntry: matchingEntry,
                type: matchingEntry.xpath ? 'xpath' : 'locator'
            };
        }
    }

    // If locator not found, add it to the first URL's mapping
    const firstUrl = Object.keys(locatorMapping)[0];
    if (firstUrl) {
        const newEntry = locator.startsWith('//')
            ? { xpath: locator.trim() }
            : { locator: locator.trim() };

        locatorMapping[firstUrl].push(newEntry);

        // Save the updated mapping back to the temp file
        try {
            fs.writeFileSync(globals.tempFilePath, JSON.stringify(locatorMapping, null, 2));

        } catch (error) {
            logger.error('Error writing locator mapping:', error);
        }

        return {
            documentUrl: firstUrl,
            existingEntry: newEntry,
            type: locator.startsWith('//') ? 'xpath' : 'locator'
        };
    }

    return null;
}

async function findExistingDocument(documentUrl, projectCollection, locator) {
    if (documentUrl === 'unknown') return null;
    return await projectCollection.findOne(
        { url: documentUrl },
        { projection: { entries: 1 } }
    );
}

async function getLocatorIndex(
    existingDocument,
    locator,
    existingEntry,
    tcCounterCollection,
    projectName,
    projectCollection,
    documentUrl
) {
    const dbMatchingEntry = existingDocument?.entries?.find(entry => entry.locator === locator);

    if (dbMatchingEntry) {
        return dbMatchingEntry.index;
    }

    const updatedCounterDoc = await tcCounterCollection.findOneAndUpdate(
        { _id: 'TCcounter' },
        { $inc: { [`projects.${projectName}`]: 1 } },
        { returnDocument: 'after' }
    );

    const currentMaxTcId = updatedCounterDoc.projects[projectName];
    const tcId = `LOCATOR_${String(currentMaxTcId).padStart(2, '0')}`;
    const screenshotPath = existingEntry?.screenshotPath || '';

    const newEntry = {
        index: tcId,
        locator,
        image: screenshotPath
    };

    if (existingDocument) {
        await projectCollection.updateOne(
            { url: documentUrl },
            { $push: { entries: newEntry } }
        );
    } else if (documentUrl !== 'unknown') {
        await projectCollection.insertOne({
            url: documentUrl,
            entries: [newEntry],
        });
    }

    return tcId;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { replaceLocatorsWithGlobal };