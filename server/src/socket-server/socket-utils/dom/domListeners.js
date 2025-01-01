const { createXpathTooltip, createContextMenu, populateContextMenu, showContextMenu, hideContextMenu } = require('./helpers');
const { XPathGenerator } = require('./xpath');
const { createFloatingToolbar } = require('./floatingToolbar');
const { setupEventListeners } = require('./eventListeners');
const logger = require('../../../utils/logger');

async function setupDOMListeners(frame, pageVar) {
    // Inject helper functions so they're immediately available in the page context
    await frame.addScriptTag({
        content: `
            window.hideContextMenu = ${hideContextMenu.toString()};
            window.populateContextMenu = ${populateContextMenu.toString()};
            window.showContextMenu = ${showContextMenu.toString()};
            window.createFloatingToolbar = ${createFloatingToolbar.toString()};
        `
    });

    // Evaluate script in the frame context
    await frame.evaluate(
        ({ pageVar, functions, xpathClass }) => {
            // Prevent multiple initializations
            if (window.listenersAdded) return;
            window.listenersAdded = true;

            /**
             * Converts a stringified function to an actual function in context.
             * Useful for injecting externally-defined functions into the DOM.
             */
            const evalInContext = fnStr => eval(`(${fnStr})`);

            // Reconstruct helpers from their stringified source
            const helpers = Object.fromEntries(
                functions.map(({ name, fn }) => [name, evalInContext(fn)])
            );

            // Instantiate the XPath generator
            const xpathGenerator = new (evalInContext(xpathClass))();

            // State object to track UI elements and statuses
            const state = {
                mouseoverTimeout: null,
                highlightedElement: null,
                lastHoveredElement: null,
                hoveredElement: null,
                hoveredXpath: null,
                contextMenuOpen: false,
                isContextMenuClick: false,
                iframeXpath: null,
                isPaused: false,
                contextMenu: null,
                tooltip: null,
                originalStyles: null,
                firstNodeDataId: null,
                isClicking: false,
                isPaused: false,
                isKeyPressTriggered: false,
                hoveredElement: null,
                lastHoveredElement: null,
                lastMenuButton: null,  // Add this to track last menu button
                iframeXpath: null,
                contextMenu: null,
                inputValueTracker: {},
                inputXpathTracker: {},
                isFilling: false,
                dragState: {
                    sourceElement: null,
                    sourceXpath: null
                }
            };

            // Utility: retrieve xpath for a given element
            function getXpath(element) {
                return xpathGenerator.getXpath(element, state);
            }

            initializeRecordingState(state);
            restoreEmitIfNotPaused(state);

            // Create or update the floating toolbar
            createToolbar(state);

            // Initialize context menu & tooltip
            state.contextMenu = helpers.createContextMenu();
            state.tooltip = helpers.createXpathTooltip();

            // Listen for mouse events (hover, context menu)
            helpers.setupEventListeners(state, pageVar);

            /***** Function Definitions *****/

            /**
             * Load or initialize `state.isPaused` from localStorage.
             * Also sets up a small delay to update UI after page load.
             */
            function initializeRecordingState(state) {
                try {
                    const recordingState = localStorage.getItem('recordingState') || 'recording';
                    state.isPaused = recordingState === 'paused';
                    localStorage.setItem('recordingState', recordingState);

                    const updateButtons = () => {
                        const pauseButton = document.getElementById('recording-pause-btn');
                        const resumeButton = document.getElementById('recording-resume-btn');
                        
                        if (pauseButton && resumeButton) {
                            const currentState = localStorage.getItem('recordingState') || 'recording';
                            const isPaused = currentState === 'paused';
                            
                            state.isPaused = isPaused;

                            pauseButton.style.display = isPaused ? 'none' : 'flex';
                            resumeButton.style.display = isPaused ? 'flex' : 'none';
                        } else {
                            setTimeout(updateButtons, 100);
                        }
                    };

                    updateButtons();
                } catch (e) {
                    console.warn('Could not initialize recording state from localStorage');
                }
            }

            /**
             * If state is not paused, reassign original emit function for event capture.
             */
            function restoreEmitIfNotPaused(state) {
                if (!state.isPaused && window.originalEmit) {
                    window.emit = window.originalEmit;
                }

                // Store original emit function if not already set
                if (!window.originalEmit) {
                    window.originalEmit = window.emit;
                }
            }

            /**
             * Creates the floating toolbar (only in top-level window).
             */
            function createToolbar(state) {
                if (window.top !== window) return; // skip if in an iframe
                window.createFloatingToolbar(state);
            }

            /**
             * Pauses event recording by overriding `window.emit` and updating localStorage.
             */
            window.pauseRecording = function () {
                try {
                    state.isPaused = true;
                    localStorage.setItem('recordingState', 'paused');
                    if (!window.originalEmit) {
                        window.originalEmit = window.emit;
                    }
                    window.emit = () => { }; // No-op
                } catch (e) {
                    console.warn('Could not update localStorage in pauseRecording');
                }
            };

            /**
             * Resumes event recording by restoring `window.emit` and updating localStorage.
             */
            window.resumeRecording = function () {
                try {
                    state.isPaused = false;
                    localStorage.setItem('recordingState', 'recording');
                    if (window.originalEmit) {
                        window.emit = window.originalEmit;
                    }
                    cleanupHighlight(state);
                } catch (e) {
                    console.warn('Could not update localStorage in resumeRecording');
                }
            };

            /**
             * Debounce function for better performance during rapid mouse events.
             */
            function debounce(func, wait) {
                let timeout;
                return (...args) => {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => func(...args), wait);
                };
            }

            /**
             * Injects the highlight styles into a document
             */
            function injectHighlightStyles(doc) {
                if (!doc.getElementById('ab-highlight-styles')) {
                    const style = doc.createElement('style');
                    style.id = 'ab-highlight-styles';
                    style.textContent = `
                        .ab-highlight {
                            background-color: rgba(255, 200, 200, 0.7) !important;
                            transition: none !important;
                        }
                    `;
                    doc.head.appendChild(style);
                }
            }

            // Inject styles into main document
            injectHighlightStyles(document);

            /**
             * Highlights a specific element, applies tooltip, etc.
             */
            function highlightElement(element) {
                if (!element ||
                    element.closest('.context-menu') ||
                    element.closest('.floating-toolbar')) {
                    return;
                }

                // Cleanup previous highlight
                cleanupHighlight(state);

                // Inject styles into element's document if it's in an iframe
                const elementDoc = element.ownerDocument;
                if (elementDoc !== document) {
                    injectHighlightStyles(elementDoc);
                }

                state.highlightedElement = element;
                state.lastHoveredElement = element;

                // Check if element has a popup-menu ancestor
                const menuAncestor = findPopupMenuAncestor(element);
                state.hoveredElement = menuAncestor || element;
                state.originalHoveredElement = element;
                state.hoveredXpath = getXpath(state.hoveredElement);

                // Apply highlight class
                requestAnimationFrame(() => {
                    if (state.highlightedElement === element) {
                        element.classList.add('ab-highlight');
                        showXpathTooltip(element, state.hoveredXpath, state.tooltip);
                    }
                });
            }

            /**
             * Cleans up any existing highlight effects.
             */
            function cleanupHighlight(state) {
                // Remove highlight from all elements in main document
                document.querySelectorAll('.ab-highlight').forEach(el => {
                    el.classList.remove('ab-highlight');
                });

                // Remove highlight from all iframes
                document.querySelectorAll('iframe').forEach(iframe => {
                    try {
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        if (iframeDoc) {
                            iframeDoc.querySelectorAll('.ab-highlight').forEach(el => {
                                el.classList.remove('ab-highlight');
                            });
                        }
                    } catch (e) {
                        // Ignore cross-origin frame access errors
                    }
                });

                // Hide tooltip
                if (state.tooltip) {
                    state.tooltip.style.display = 'none';
                    state.tooltip.style.opacity = '0';
                }

                state.highlightedElement = null;
                state.hoveredElement = null;
                state.lastHoveredElement = null;
            }

            /**
             * Shows the xpath tooltip near the highlighted element.
             */
            function showXpathTooltip(element, xpath, tooltip) {
                if (!xpath || !tooltip) return;

                // Get element's position accounting for iframes
                let rect = element.getBoundingClientRect();
                let currentWindow = element.ownerDocument.defaultView;
                let currentFrame = null;

                // Traverse up through iframes and add their offsets
                while (currentWindow !== window) {
                    currentFrame = currentWindow.frameElement;
                    if (!currentFrame) break;

                    const frameRect = currentFrame.getBoundingClientRect();
                    rect = new DOMRect(
                        rect.left + frameRect.left,
                        rect.top + frameRect.top,
                        rect.width,
                        rect.height
                    );
                    currentWindow = currentFrame.ownerDocument.defaultView;
                }

                tooltip.textContent = xpath;
                tooltip.style.display = 'block';
                tooltip.style.opacity = '0';

                const tooltipRect = tooltip.getBoundingClientRect();
                const { innerHeight: vh, innerWidth: vw } = window;

                // Calculate top position (prefer above, then below, else clamp)
                let top = rect.top - tooltipRect.height - 5;
                if (top < 0) {
                    top = rect.bottom + 5;
                    if (top + tooltipRect.height > vh) {
                        top = Math.max(0, vh - tooltipRect.height);
                    }
                }

                // Calculate left position (center align with element, clamp if needed)
                let left = rect.left + (rect.width - tooltipRect.width) / 2;
                if (left < 0) {
                    left = 0;
                } else if (left + tooltipRect.width > vw) {
                    left = Math.max(0, vw - tooltipRect.width);
                }

                tooltip.style.top = `${top}px`;
                tooltip.style.left = `${left}px`;

                requestAnimationFrame(() => {
                    tooltip.style.opacity = '1';
                });
            }

            /**
             * Debounced highlight function for efficiency.
             */
            const debouncedHighlight = debounce(target => {
                if (!state.isPaused && !target.closest('.floating-toolbar')) {
                    highlightElement(target);
                }
            }, 30);

            /**
             * Fired on mouseover: triggers highlight if not paused.
             */
            function handleMouseOver(event) {
                if (state.isPaused) {
                    cleanupHighlight(state);
                    return;
                }

                if (event.target.closest('.floating-toolbar') ||
                    event.target.closest('.context-menu')) {
                    return;
                }
                if (state.mouseoverTimeout) clearTimeout(state.mouseoverTimeout);

                const target = event.target;
                if ((target.tagName.toLowerCase() === 'button' || target.tagName.toLowerCase() === 'div') && (
                    target.hasAttribute('aria-haspopup') ||
                    target.hasAttribute('aria-expanded') ||
                    target.closest('[aria-haspopup="menu"]')
                )) {
                    state.lastMenuButton = target;
                }

                state.hoveredElement = target;
                debouncedHighlight(event.target);
            }

            /**
             * Fired on mouseout: cleans up highlight/tooltip if truly leaving the element.
             */
            function handleMouseOut(event) {
                // Check if we're moving between elements within the same iframe
                const relatedTarget = event.relatedTarget;
                if (relatedTarget && event.target.ownerDocument === relatedTarget.ownerDocument) {
                    return; // Still within the same iframe
                }

                if (event.target === state.hoveredElement) {
                    state.lastHoveredElement = state.hoveredElement;
                    state.hoveredElement = null;

                    // Remove highlight class from element
                    if (event.target) {
                        event.target.classList.remove('ab-highlight');
                    }

                    // Clean up iframe if needed
                    let currentWindow = event.target.ownerDocument.defaultView;
                    while (currentWindow !== window) {
                        const frame = currentWindow.frameElement;
                        if (!frame) break;

                        frame.classList.remove('ab-highlight');

                        // Clean up iframe document body
                        try {
                            const iframeDoc = frame.contentDocument || frame.contentWindow.document;
                            if (iframeDoc && iframeDoc.body) {
                                iframeDoc.body.classList.remove('ab-highlight');
                            }
                        } catch (e) {
                            // Ignore cross-origin frame access errors
                        }

                        currentWindow = frame.ownerDocument.defaultView;
                    }

                    // Hide tooltip
                    if (state.tooltip) {
                        state.tooltip.style.display = 'none';
                        state.tooltip.style.opacity = '0';
                    }
                }
            }

            /**
             * Handles context menu event to show the custom assertion menu.
             */
            function handleContextMenu(e) {
                e.preventDefault();
                e.stopPropagation();

                // Hide existing context menu if open
                if (state.contextMenuOpen) {
                    helpers.hideContextMenu(state.contextMenu);
                    state.contextMenuOpen = false;
                }

                let targetElement = e.target;
                let xpath = getXpath(targetElement);

                // If no xpath, fallback to hovered element
                if (!xpath && state.hoveredElement) {
                    xpath = getXpath(state.hoveredElement);
                    targetElement = state.hoveredElement;
                }
                if (!xpath) return;

                const tagName = targetElement.tagName.toLowerCase();
                const pageTitle = document.title;
                const pageUrl = document.URL;
                const iframeXpath = state.iframeXpath;

                // Build assertion lists
                const elementAssertions = getAssertionsForElement(targetElement, tagName, iframeXpath);
                const pageAssertions = getPageAssertions(iframeXpath);

                // Populate context menu
                const menuOptions = {
                    header: 'Alphabin Assertions',
                    assertions: {
                        element: elementAssertions,
                        page: pageAssertions
                    },
                    onAssertionClick: assertion => onAssertionClick(assertion, targetElement, xpath, iframeXpath)
                };

                helpers.populateContextMenu(state.contextMenu, menuOptions);
                helpers.showContextMenu(state.contextMenu, e.clientX, e.clientY);
                state.contextMenuOpen = true;
            }

            /**
             * Invoked when an assertion is clicked in the context menu.
             */
            function onAssertionClick(assertion, targetElement, xpath, iframeXpath) {
                state.isContextMenuClick = true;
                let finalCode;

                try {
                    finalCode = generateAssertionCode(assertion.code, xpath, targetElement, iframeXpath);
                    if (!finalCode) return;

                    // Send code if the function is available
                    if (window.emitSendCode && typeof window.emitSendCode === 'function') {
                        window.emitSendCode(finalCode, xpath, iframeXpath, true);
                    } else {
                        console.warn('[DEBUG] emitSendCode not available');
                    }

                    // Cleanup after code emission
                    setTimeout(() => {
                        state.isContextMenuClick = false;
                        state.contextMenuOpen = false;
                    }, 200);

                    return false;
                } catch (error) {
                    logger.error('[DEBUG] Error in assertion handling:', error);
                    state.isContextMenuClick = false;
                    state.contextMenuOpen = false;
                }
            }

            /**
             * Generates the actual Playwright code string for a given assertion.
             */
            function generateAssertionCode(assertionCode, xpath, targetElement, iframeXpath) {
                switch (assertionCode) {
                    case 'hasConnection()':
                    case 'hasNoConnection()':
                        const finalCode = generateEdgeAssertionCode(xpath, state, assertionCode);
                        if (!finalCode) {
                            return;
                        }
                        return finalCode;
                    case 'hover()':
                        targetElement.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                        return `await ${pageVar}.locator(\`${xpath}\`).hover();\n`;
                    case 'dblclick()':
                        targetElement.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
                        return `await ${pageVar}.locator(\`${xpath}\`).dblclick();\n`;
                    case 'toBeVisible()':
                        return `await expect(${pageVar}.locator(\`${xpath}\`)).toBeVisible();\n`;
                    case 'toBeEnabled()':
                        return `await expect(${pageVar}.locator(\`${xpath}\`)).toBeEnabled();\n`;
                    case 'toHaveTitle()':
                        return `await expect(${pageVar}).toHaveTitle(\`${document.title}\`);\n`;
                    case 'toHaveURL()':
                        return `await expect(${pageVar}).toHaveURL(\`${document.URL}\`);\n`;
                    case 'toHaveAttribute()':
                        return `await expect(${pageVar}.locator(\`${xpath}\`)).toHaveAttribute(\`${assertionCode}\`);\n`;
                    case 'toHaveText()':
                        return `await expect(${pageVar}.locator(\`${xpath}\`)).toHaveText(\`${targetElement.textContent.trim()}\`);\n`;
                    case 'toHaveValue()':
                        const value = targetElement.value || '';
                        return `await expect(${pageVar}.locator(\`${xpath}\`)).toHaveValue(\`${value}\`);\n`;
                    default:
                        // Possibly "waitFor({ state: 'visible', timeout: 20000 })" or other code
                        if (assertionCode.includes('waitFor')) {
                            return `await ${pageVar}.locator(\`${xpath}\`).${assertionCode};\n`;
                        }
                        // General fallback for `expect(locator).<assertionCode>`
                        return `await expect(${pageVar}.locator(\`${xpath}\`)).${assertionCode};\n`;
                }
            }

            /**
             * Returns an array of assertions relevant to the given element.
             */
            function getAssertionsForElement(targetElement, tagName, _iframeXpath) {
                const baseAssertions = [
                    { display: 'Hover', code: 'hover()' },
                    { display: 'Is Visible', code: 'toBeVisible()' },
                    { display: 'Is Enabled', code: 'toBeEnabled()' },
                    { display: 'Double Click', code: 'dblclick()' },
                    { display: 'Wait For Element', code: 'waitFor({ state: "visible", timeout: 20000 })' },
                ];

                if (tagName === 'input' || tagName === 'textarea' && ['text', 'email', 'password', 'number'].includes(targetElement.type)) {
                    baseAssertions.push({ display: 'Has Value', code: 'toHaveValue()' });
                }
                if (tagName === 'select') {
                    baseAssertions.push({ display: 'Has Value', code: 'toHaveValue()' });
                }
                if (targetElement.textContent.trim()) {
                    baseAssertions.push({ display: 'Has Text', code: 'toHaveText()' });
                }
                if (isCanvasLike(targetElement)) {
                    baseAssertions.push(
                        { display: 'Has Connection', code: 'hasConnection()' },
                        { display: 'Has No Connection', code: 'hasNoConnection()' }
                    );
                }
                return baseAssertions;
            }

            /**
             * Returns an array of page-level assertions.
             */
            function getPageAssertions(iframeXpath) {
                const pageAssertions = [{ display: 'Has Title', code: 'toHaveTitle()' }];
                if (!iframeXpath) pageAssertions.push({ display: 'Has URL', code: 'toHaveURL()' });
                return pageAssertions;
            }

            /**
             * Finds a popup menu ancestor within a few levels (if any).
             */
            function findPopupMenuAncestor(element) {
                let current = element;
                for (let i = 0; i < 3; i++) {
                    if (current && current.hasAttribute('aria-haspopup') && current.getAttribute('aria-haspopup') === 'menu') {
                        return current;
                    }
                    current = current?.parentElement;
                }
                return null;
            }

            /**
             * Checks if element is part of a canvas or a flow-based structure.
             */
            function isCanvasLike(element) {
                let current = element;
                while (current) {
                    const tag = current.tagName?.toLowerCase();
                    if (
                        tag === 'canvas' ||
                        current.classList?.contains('canvas-container') ||
                        current.classList?.contains('upper-canvas') ||
                        current.classList?.contains('lower-canvas') ||
                        (current.getAttribute && current.getAttribute('data-testid') === 'rf__wrapper') ||
                        (current.classList && [...current.classList].some(cls => cls.startsWith('react-flow'))) ||
                        (current.classList && current.classList.contains('react-flow__node'))
                    ) {
                        return true;
                    }
                    current = current.parentElement;
                }
                return false;
            }

            /**
             * Placeholder for edge-based assertions (for canvas-like elements).
             */
            function generateEdgeAssertionCode(xpath, state, assertion) {
                /**
                 * Traverses up the DOM tree to find an ancestor element with a specific "aria-describedby" attribute
                 * and retrieves its "data-id" attribute if present.
                 */
                function getAncestorXPath(element) {
                    let currentElement = element;
                    while (currentElement) {
                        if (currentElement.getAttribute && currentElement.getAttribute('aria-describedby') === 'react-flow__node-desc-reactFlowCanvasId') {
                            const dataId = currentElement.getAttribute('data-id');
                            if (dataId) {
                                return { dataId };
                            } else {
                                alert('The element with aria-describedby="react-flow__node-desc-reactFlowCanvasId" must have a "data-id" attribute.');
                                return null;
                            }
                        }
                        currentElement = currentElement.parentElement;
                    }
                    alert('No ancestor found with aria-describedby="react-flow__node-desc-reactFlowCanvasId".');
                    return null;
                }

                const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                const ancestorInfo = element ? getAncestorXPath(element) : null;

                if (!ancestorInfo) {
                    return ''; // Exit if no valid data-id was found
                }

                const { dataId } = ancestorInfo;

                // Handle the first and second node selection for assertion
                if (!state.firstNodeDataId) {
                    // Store data-id of the first selected node
                    state.firstNodeDataId = dataId;

                    state.contextMenu.style.display = 'none'; // Close the context menu
                    state.contextMenuOpen = false;

                    alert('First node selected for edge assertion. Please select the second node and choose the same assertion again.');
                    return ''; // No code to emit yet
                } else {
                    const firstNodeDataId = state.firstNodeDataId;
                    const secondNodeDataId = dataId;

                    // Reset state for future assertions
                    state.firstNodeDataId = null;

                    let code;
                    if (assertion === 'hasConnection()') {
                        code = `expect(await abPlaywright.areNodesConnected(page1, \`//div[@id="${firstNodeDataId}"]\`, \`//div[@id="${secondNodeDataId}"]\`)).toBe(true);\n`;
                    } else if (assertion === 'hasNoConnection()') {
                        code = `expect(await abPlaywright.areNodesConnected(page1, \`//div[@id="${firstNodeDataId}"]\`, \`//div[@id="${secondNodeDataId}"]\`)).toBe(false);\n`;
                    } else {
                        code = ''; // Unknown assertion
                    }

                    return code;
                }
            }
        },
        {
            pageVar,
            functions: [
                { name: 'createXpathTooltip', fn: createXpathTooltip.toString() },
                { name: 'createContextMenu', fn: createContextMenu.toString() },
                { name: 'populateContextMenu', fn: populateContextMenu.toString() },
                { name: 'showContextMenu', fn: showContextMenu.toString() },
                { name: 'hideContextMenu', fn: hideContextMenu.toString() },
                { name: 'setupEventListeners', fn: setupEventListeners.toString() },
            ],
            xpathClass: XPathGenerator.toString(),
        }
    );
}

module.exports = { setupDOMListeners };