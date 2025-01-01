const { getXpath } = require('./xpath');
        
function setupEventListeners(state, pageVar) {
    // ---------- UTILITIES ----------
    function isCanvasLike(element) {
        let currentElement = element;
        while (currentElement) {
            if (
                currentElement.tagName?.toLowerCase() === 'canvas' ||
                currentElement.classList?.contains('canvas-container') ||
                currentElement.classList?.contains('upper-canvas') ||
                currentElement.classList?.contains('lower-canvas') ||
                (currentElement.getAttribute && currentElement.getAttribute('data-testid') === 'rf__wrapper') ||
                (currentElement.classList && [...currentElement.classList].some(cls => cls.startsWith('react-flow'))) ||
                (currentElement.classList && currentElement.classList.contains('react-flow__node'))
            ) {
                return true;
            }
            currentElement = currentElement.parentElement;
        }
        return false;
    }

    function isInsideContextMenu(element) {
        let current = element;
        while (current) {
            if (current === state.contextMenu) {
                return true;
            }
            current = current.parentElement;
        }
        return false;
    }

    // ---------- MOUSE EVENTS ----------
    function handleClick(event) {
        state.isClicking = true;

        // Skip if paused, clicking on toolbar, triggered by keypress, globally disabled, or context menu is open
        if (state.isPaused || event.target.closest('.floating-toolbar') || state.isKeyPressTriggered || window.skipNextClick || state.contextMenuOpen) {
            if (state.isKeyPressTriggered) {
                state.isKeyPressTriggered = false;
            }
            if (window.skipNextClick) {
                window.skipNextClick = false;
            }
            if (state.contextMenuOpen) {
                state.contextMenuOpen = false;
            }
            return;
        }

        const target = event.target;
        
        // Check if we're clicking near the last known menu button
        if (state.lastMenuButton && (
            target === state.lastMenuButton ||
            target.closest('button') === state.lastMenuButton ||
            state.lastMenuButton.contains(target)
        )) {
            const xpath = getXpath(state.lastMenuButton, state);
            if (xpath) {
                window.emitSendCode('click()', xpath, state.iframeXpath);
            }
            return;
        }

        // For non-menu buttons, proceed with normal click handling
        let xpath = getXpath(target, state);

        // If clicking on HTML element or no xpath found, try to get meaningful element
        if (!xpath || target.tagName.toLowerCase() === 'html') {
            // First try lastMenuButton if it exists
            if (state.lastMenuButton) {
                xpath = getXpath(state.lastMenuButton, state);
            }
            // Then try hovered element
            if (!xpath) {
                const hoveredElement = state.hoveredElement || state.lastHoveredElement;
                xpath = hoveredElement ? getXpath(hoveredElement, state) : null;
            }
            // Finally, if it's HTML element and we still don't have xpath, use it
            if (!xpath && target.tagName.toLowerCase() === 'html') {
                xpath = getXpath(target, state);
            }
        }

        if (!xpath) {
            return;
        }

        // Handle canvas-like elements
        if (isCanvasLike(target)) {
            const canvasElement = target.tagName?.toLowerCase() === 'canvas'
                ? target
                : target.querySelector('canvas') || target;

            const rect = canvasElement.getBoundingClientRect();
            const x = Math.round(event.clientX - rect.left);
            const y = Math.round(event.clientY - rect.top);
            window.emitSendCode(`click({ position: { x: ${x}, y: ${y} } })`, xpath, state.iframeXpath);
            return;
        }

        // Handle checkbox
        if (target.type === 'checkbox') {
            const action = target.checked ? 'check' : 'uncheck';
            window.emitSendCode(`${action}()`, xpath, state.iframeXpath);
        } else {
            window.emitSendCode('click()', xpath, state.iframeXpath);
        }

        // Reset lastMenuButton after click is handled
        if (state.lastMenuButton) {
            setTimeout(() => {
                state.lastMenuButton = null;
            }, 100);
        }
    }

    // ---------- KEYBOARD EVENTS ----------
    function handleKeyDown(event) {
        const xpath = getXpath(event.target, state);
        const key = event.key.replace(/'/g, "\\'");
        const isTextArea = event.target.tagName.toLowerCase() === 'textarea';

        // Allow pressing Enter in textarea without code emission
        if (isTextArea && key === 'Enter' ||
            (key === 'Backspace' && event.target.tagName.toLowerCase() === 'input')) {
            return;
        }

        const keysAllowed = [
            'Tab',
            'Enter',
            'Escape',
            'ArrowUp',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'Backspace',
            'Delete',
            'PageUp',
            'PageDown',
            'Control',
            'Escape',
        ]

        // Common keys that trigger code emission
        if (keysAllowed.includes(key)) {
            // Check if the Enter key triggered a form submit
            if (state.inputValueTracker[xpath]) {
                const value = state.inputValueTracker[xpath];
                window.emitSendCode(`fill(\`${value}\`)`, xpath, state.iframeXpath);
                delete state.inputValueTracker[xpath];
            }
            window.emitSendCode(`press(\`${key}\`)`, xpath, state.iframeXpath);

            // Check if the Enter key triggered a form submit
            if (key === 'Enter') {
                let parent = event.target;
                while (parent) {
                    if (parent.tagName && parent.tagName.toLowerCase() === 'form') {
                        state.isKeyPressTriggered = true;
                        break;
                    }
                    parent = parent.parentElement;
                }
            }
        }
    }

    // ---------- FOCUS/INPUT/BLUR/CHANGE EVENTS ----------
    function handleFocus(event) {
        if (!isInsideContextMenu(event.target)) {
            const xpath = getXpath(event.target, state);
            state.inputXpathTracker[event.target] = xpath; // Track focused element's Xpath
        }
    }

    function handleInput(event) {
        if (
            !isInsideContextMenu(event.target) &&
            !/type=["'](submit|radio|checkbox)["']/i.test(event.target.outerHTML)
        ) {
            const xpath = state.inputXpathTracker[event.target] || getXpath(event.target, state);
            const currentValue = event.target.value || event.target.textContent;
            state.inputValueTracker[xpath] = currentValue;
        }
    }

    function handleBlur(event) {
        const storedXpath = state.inputXpathTracker[event.target];

        if (
            !isInsideContextMenu(event.target) &&
            storedXpath &&
            state.inputValueTracker[storedXpath] &&
            event.target.tagName.toLowerCase() !== 'select'
        ) {
            let value = state.inputValueTracker[storedXpath];

            // Encode newlines for textarea
            if (event.target.tagName.toLowerCase() === 'textarea') {
                value = value.replace(/\n/g, '\\n');
            }

            window.emitSendCode(`fill(\`${value}\`)`, storedXpath, state.iframeXpath);
            delete state.inputValueTracker[storedXpath];
            delete state.inputXpathTracker[event.target];
            state.isFilling = true;
        }
    }

    function handleChange(event) {
        // Ensure the event target is valid and not inside a context menu
        if (!isInsideContextMenu(event.target)) {
            const targetType = event.target.type.toLowerCase();
            const xpath = getXpath(event.target, state);

            // Handle `select` elements
            if (event.target.tagName.toLowerCase() === 'select') {
                const selectedOption = event.target.options[event.target.selectedIndex].value.replace(/'/g, "\\'");
                window.recordSelect(xpath, selectedOption, state.iframeXpath);
            }

            // Handle `file` inputs
            if (targetType === 'file') {
                const files = Array.from(event.target.files).map(file => {
                    // Use file.name for the file's name (available in the File object)
                    return `'${file.name}'`;
                }).join(', ');

                // Emit Playwright code for uploading files
                window.emitSendCode(
                    `await ${pageVar}.locator(\`${xpath}\`).setInputFiles([${files}]);\n`,
                    null,
                    state.iframeXpath,
                    true
                );
            }
            // Handle `date` inputs
            if (targetType === 'date') {
                const selectedDate = event.target.value; // Date in ISO format (e.g., "2025-01-09")
                window.emitSendCode(`fill('${selectedDate}')`, xpath, state.iframeXpath);
            }
        }
    }

    // ---------- DRAG & DROP ----------
    function handleDragStart(event) {
        const draggedElement = event.target;
        state.dragState.sourceElement = draggedElement;
        state.dragState.sourceXpath = getXpath(draggedElement);
    }

    function handleDrop(event) {
        event.preventDefault();

        const dropTarget = event.target;
        const dropTargetXpath = getXpath(dropTarget);

        if (state.dragState.sourceXpath && dropTargetXpath) {
            // Record the target xpath
            window.emitSendCode('', dropTargetXpath, state.iframeXpath, true);
            // Emitted dragTo code
            const dragToCode = `await ${pageVar}.locator(\`${state.dragState.sourceXpath}\`).dragTo(${pageVar}.locator(\`${dropTargetXpath}\`));\n`;
            window.emitSendCode(dragToCode, null, state.iframeXpath, true);
        } else {
            console.warn('Drop failed - missing xpath:', {
                hasSourceXpath: !!state.dragState.sourceXpath,
                hasTargetXpath: !!dropTargetXpath
            });
        }

        // Reset drag state
        state.dragState.sourceElement = null;
        state.dragState.sourceXpath = null;
    }

    function handleDragOver(event) {
        event.preventDefault();
    }


    // ---------- SETUP EVENTS IN DOCUMENT ----------
    function setupEvents(doc) {
        doc.addEventListener('mouseover', handleMouseOver, true);
        doc.addEventListener('mouseout', handleMouseOut, true);
        doc.addEventListener('contextmenu', handleContextMenu, true);
        doc.addEventListener('click', handleClick, true);
        doc.addEventListener('keydown', handleKeyDown, true);
        doc.addEventListener('input', handleInput, true);
        doc.addEventListener('blur', handleBlur, true);
        doc.addEventListener('change', handleChange, true);
        doc.addEventListener('focus', handleFocus, true);
        doc.addEventListener('dragstart', handleDragStart, true);
        doc.addEventListener('drop', handleDrop, true);
        doc.addEventListener('dragover', handleDragOver, true);
    }

    // Attach events to main document
    setupEvents(document);

    // ---------- MAIN WINDOW LOGIC ----------
    if (window.top === window) {
        // Before unloading, track pause state in sessionStorage
        window.addEventListener('beforeunload', () => {
            if (state.isPaused) {
                sessionStorage.setItem('recorderPaused', 'true');
            }
        });

        // Check pause state after navigation
        if (sessionStorage.getItem('recorderPaused') === 'true') {
            state.isPaused = true;
            const resumeButton = document.querySelector('.floating-toolbar button:nth-child(3)');
            const pauseButton = document.querySelector('.floating-toolbar button:nth-child(2)');
            if (resumeButton && pauseButton) {
                pauseButton.style.display = 'none';
                resumeButton.style.display = 'flex';
            }
        }

        // Setup iframes
        function setupIframeEvents() {
            const canAccessIframe = (iframe) => {
                try {
                    // Triggers SecurityError if cross-origin
                    const _ = iframe.contentDocument || iframe.contentWindow.document;
                    return true;
                } catch {
                    return false;
                }
            };

            const setupExistingIframes = () => {
                document.querySelectorAll('iframe').forEach(iframe => {
                    if (canAccessIframe(iframe)) {
                        setupEvents(iframe.contentDocument);
                    }
                });
            };

            // Observe new iframes being added
            const iframeObserver = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.tagName === 'IFRAME') {
                            node.addEventListener('load', () => {
                                if (canAccessIframe(node)) {
                                    setupEvents(node.contentDocument);
                                }
                            });
                        }
                    });
                });
            });

            iframeObserver.observe(document.body, {
                childList: true,
                subtree: true
            });

            setupExistingIframes();
        }

        setupIframeEvents();
    }
}

module.exports = { setupEventListeners };