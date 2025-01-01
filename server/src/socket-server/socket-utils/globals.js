const globals = {
    tempFilePath: null,
    startLine: 0,
    endLine: null,
    browser: null,
    page: null,
    browserSocket: null,
    activePageVar: null,
    project: null,
    locatorMapping: {},
    allPages: [],
    isAlreadyAddedContext: false,
};

let pageCounter = 1;
let pageVariableMapping = new Map(); // Map to track pages and their variable names

function assignPageVariable(page) {
    if (!pageVariableMapping.has(page)) {
        const variableName = `page${pageCounter++}`;
        pageVariableMapping.set(page, variableName);
        return variableName;
    }
    return pageVariableMapping.get(page);
}
function resetPageCounter() {
    pageCounter = 1;
}

const setGlobals = (newValues) => {
    if (newValues !== null && newValues !== undefined) {
        Object.assign(globals, newValues);
    }
};

// Export global variables and setter function
module.exports = { globals, setGlobals, assignPageVariable, pageCounter, resetPageCounter, pageVariableMapping }; // Exporting the global variables and the setter function
