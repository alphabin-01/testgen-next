const fspath = require("path");
const fs = require("fs");
const { connectToMongoDB } = require("../../config/mongoDatabase");
const logger = require('../../utils/logger');

// Helper function to fetch locators from MongoDB and return the locators object
const fetchLocatorsFromDB = async (collection) => {
    const db = await connectToMongoDB();
    const cl = db.collection(collection);

    const documents = await cl.find({}, { projection: { entries: 1 } }).toArray();

    const locators = {};
    for (const doc of documents) {
        // Validate entries field
        if (!doc.entries || !Array.isArray(doc.entries)) {
            logger.warn(`Invalid or missing entries in document:`, doc._id);
            // Optionally, remove invalid documents
            await cl.deleteOne({ _id: doc._id });
            continue;
        }

        // Process valid entries
        doc.entries.forEach(entry => {
            if (entry.index && entry.locator) {
                locators[entry.index] = entry.locator;
            } else {
                logger.warn(`Invalid entry in document:`, entry);
            }
        });
    }

    // console.log(`Total locators fetched:`, Object.entries(locators).length);
    return locators;
};


// Helper function to generate the content for global.js
const generateLocatorsContent = (locators) => {
    // Sort the entries by key
    const sortedEntries = Object.entries(locators).sort(([keyA], [keyB]) => {
        // Extract numeric values from keys for proper numeric sorting
        const numA = parseInt(keyA.replace(/\D/g, ""), 10);
        const numB = parseInt(keyB.replace(/\D/g, ""), 10);
        return numA - numB;
    });

    // Map sorted entries into a formatted string
    const locatorsEntries = sortedEntries.map(([key, value]) => {
        return `"${key}": \`${value}\``; // Ensure template literals with backticks
    });

    return `let locators = {\n  ${locatorsEntries.join(',\n  ')}\n};\n\nmodule.exports = { locators };\n`;
};

// Common function to write locators to global.js
const writeLocatorsToFile = (locators, outputFilePath) => {
    const content = generateLocatorsContent(locators);
    fs.writeFileSync(outputFilePath, content, 'utf8');
    return content; // Return the written content
};

// Update global.js directly from the collection
const updateGlobalJs = async (projectPath, collection) => {
    try {
        const outputFilePath = fspath.join(projectPath, 'global.js');
        const locators = await fetchLocatorsFromDB(collection);
        const content = writeLocatorsToFile(locators, outputFilePath);
        return content; // Return the updated content
    } catch (error) {
        logger.error('Error updating global.js:', error);
        throw new Error('Failed to update global.js');
    }
};

// Load locators from the collection and write to global.js, responding to the client
const loadLocatorInFile = async (req, res) => {
    const { collection, projectPath } = req.body;
    try {
        const outputFilePath = fspath.join(projectPath, 'global.js');
        const locators = await fetchLocatorsFromDB(collection);
        const content = writeLocatorsToFile(locators, outputFilePath);
        res.json({ message: `Locators successfully written to ${outputFilePath}`, content });
    } catch (error) {
        logger.error('Error loading locators:', error);
        res.status(500).json({ error: 'An error occurred while loading locators' });
    }
};

// Update locators and return updated file content
const updateLocators = async (req, res) => {
    const { id, locator, collection, projectPath } = req.body;

    if (!id || !locator) {
        return res.status(400).json({ error: 'ID and locator are required' });
    }

    try {
        const db = await connectToMongoDB();
        const cl = db.collection(collection);

        const result = await cl.updateOne(
            { 'entries.index': id },
            { $set: { 'entries.$[elem].locator': locator } },
            { arrayFilters: [{ 'elem.index': id }] }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Locator not found' });
        }

        // Update the global.js file and return its content
        const updatedContent = await updateGlobalJs(projectPath, collection);

        res.json({ message: 'Locator updated successfully', content: updatedContent });
    } catch (error) {
        logger.error('Error updating locator:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete locators and return updated file content
const deleteLocator = async (req, res) => {
    const { id, projectPath, collection } = req.body;

    if (!id) {
        return res.status(400).json({ error: 'ID is required' });
    }

    try {
        const db = await connectToMongoDB();
        const cl = db.collection(collection);

        const result = await cl.updateOne(
            { 'entries.index': id },
            { $pull: { entries: { index: id } } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: 'Locator not found or already deleted' });
        }

        // Update the global.js file and return its content
        const updatedContent = await updateGlobalJs(projectPath, collection);

        res.json({ message: 'Locator deleted successfully', content: updatedContent });
    } catch (error) {
        logger.error('Error deleting locator:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getGlobalFileLocator = async (req, res) => {
    const { projectPath, collection } = req.body;
    try {
        const database = await connectToMongoDB();  // Assuming you have a function to connect to MongoDB
        const cl = database.collection(collection);

        // Query for locators based on the projectPath and exclude the _id field
        const locators = await cl.find({}, { projection: { _id: 0 } }).toArray();

        // If no locators found, return an empty object
        if (!locators.length) {
            return res.json({});
        }

        // Format the response to match [{URL: [all locators]}]
        const formattedLocators = locators.reduce((acc, locator) => {
            const url = locator.url; // Assuming 'url' is the correct field for the URL
            if (!acc[url]) {
                acc[url] = [];
            }

            // Collect all locator strings from the 'entries' array, excluding any _id fields within entries
            const locatorsList = locator.entries.map(entry => {
                // Destructure the entry to remove _id, if it exists in the nested objects
                const { _id, ...rest } = entry;
                return rest;
            });
            acc[url] = acc[url].concat(locatorsList); // Concatenate locators for the same URL

            return acc;
        }, {});

        res.json(formattedLocators);
    } catch (error) {
        logger.error('Error loading locators:', error);
        res.status(500).json({ error: 'Failed to load locators' });
    }
};


const getLocatorImagePath = async (req, res) => {
    try {
        const { id, collection } = req.body;

        if (!id || !collection) {
            return res.status(400).json({ error: 'ID and Collection path are required' });
        }

        const db = await connectToMongoDB();
        const cl = db.collection(collection);

        const documents = await cl.find({ 'entries.index': id }).toArray();

        for (const doc of documents) {
            const matchedEntry = doc.entries.find(entry => entry.index === id);

            if (matchedEntry && matchedEntry.image) {
                return res.status(200).json({ image: `http://localhost:3001${matchedEntry.image}` });
            }
        }

        res.status(200).json({ error: 'Screenshot not found' });

    } catch (error) {
        logger.error('Error fetching locator image path:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteAllLocators = async (req, res) => {
    const { collection, projectPath } = req.body;

    if (!collection || !projectPath) {
        return res.status(400).json({ error: "Collection and Project Path are required" });
    }

    try {
        const db = await connectToMongoDB();
        const cl = db.collection(collection);

        // Delete all entries in the collection
        await cl.updateMany({}, { $set: { entries: [] } });

        // Update the global.js file to remove all locators
        const emptyLocators = {};
        const updatedContent = writeLocatorsToFile(emptyLocators, fspath.join(projectPath, 'global.js'));

        // Reset the tc_counter to 0 for the project
        const tcCountersCollection = db.collection("tc_counters");
        
        await tcCountersCollection.updateOne(
            { _id: "TCcounter" },
            { $set: { [`projects.${collection}`]: 0 } },
            { upsert: true }
        );

        res.json({
            message: "All locators deleted successfully and TC counter reset",
            content: updatedContent,
        });
    } catch (error) {
        logger.error("Error deleting all locators:", error);
        res.status(500).json({ error: "Failed to delete all locators" });
    }
};



module.exports = {
    loadLocatorInFile,
    getGlobalFileLocator,
    updateLocators,
    getLocatorImagePath,
    deleteLocator,
    deleteAllLocators
};