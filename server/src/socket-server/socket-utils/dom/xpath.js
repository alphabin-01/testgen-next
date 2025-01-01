class XPathGenerator {
    constructor() {
        this.priorityAttributes = ["data-test", "data-test-id", "data-testid", "data-qa", 'aria-label', 'aria-labelledby', 'aria-describedby'];
        this.attributesProperty = {
            svg: [...this.priorityAttributes, 'title', 'role', 'data-semantics-role'],
            img: ['alt', 'src', 'title', ...this.priorityAttributes],
            button: [...this.priorityAttributes, 'name', 'type', 'data-semantics-role'],
            input: [...this.priorityAttributes, 'name', 'placeholder', 'type', 'value', 'data-semantics-role'],
            textarea: [...this.priorityAttributes, 'name', 'placeholder', 'type', 'value', 'data-semantics-role'],
            select: [...this.priorityAttributes, 'name', 'title', 'data-semantics-role'],
            option: [...this.priorityAttributes, 'value', 'text', 'title', 'data-semantics-role'],
            label: [...this.priorityAttributes, 'for', 'title', 'data-semantics-role'],
            a: [...this.priorityAttributes, 'title', 'data-semantics-role'],
            span: [...this.priorityAttributes, 'data-semantics-role'],
            div: [...this.priorityAttributes, 'role', 'data-semantics-role'],
            default: [...this.priorityAttributes, 'name', 'role', 'title', 'data-semantics-role'],
        };
    }

    getXpath(element, state) {
        if (!element) return '';

        const frameElement = element.ownerDocument.defaultView.frameElement;

        if (frameElement) {
            state.iframeXpath = this.getXpath(frameElement, state);
            return this.getXpathWithinDocument(element);
        }

        state.iframeXpath = null;
        return this.getXpathWithinDocument(element);
    }

    getXpathWithinDocument(element) {
        if (element.tagName.toLowerCase() === 'path' || element.tagName.toLowerCase() === 'i') {
            element = element.parentElement;
        }

        return this.buildOptimalXPath(element);
    }

    buildOptimalXPath(element, state) {
        const tagName = element.tagName.toLowerCase();

        if (tagName === 'svg') {
            const svgXPath = this.handleSVGElement(element);
            if (svgXPath) return svgXPath;
        }

        const segments = [];
        let current = element;
        let foundUnique = false;

        const uniqueXPath = this.tryGetUniqueXPath(element, state);
        if (uniqueXPath) return uniqueXPath;

        while (current && current.nodeType === Node.ELEMENT_NODE) {
            const tagName = current.tagName.toLowerCase();

            if (tagName === 'svg') {
                const svgXPath = this.handleSVGElement(current, true);
                if (svgXPath) {
                    segments.unshift(svgXPath);
                    break;
                }
            }

            const currentXPath = this.tryGetUniqueXPath(current, state);
            if (currentXPath) {
                segments.unshift(currentXPath.replace('//', ''));
                foundUnique = true;
                break;
            }

            const siblings = Array.from(current.parentNode?.children || [])
                .filter(sibling => sibling.tagName === current.tagName);
            const position = siblings.length > 1 ? `[${siblings.indexOf(current) + 1}]` : '';
            segments.unshift(tagName + position);

            current = current.parentNode;

            if (foundUnique || !current || current === document.documentElement) break;
        }

        if (foundUnique) {
            const joinedSegments = segments.join('/');
            return joinedSegments.startsWith('(') ? joinedSegments.replace('(', '(//') : `//${joinedSegments}`;
        }

        const relativeXPath = segments.slice(-4).join('/');
        return relativeXPath.startsWith('(') ? relativeXPath.replace('(', '(//') : `//${relativeXPath}`;
    }

    tryGetUniqueXPath(element, state) {
        const tagName = element.tagName.toLowerCase();

        // Check if element is inside an iframe
        let iframe = null;
        let currentWindow = element.ownerDocument.defaultView;
        while (currentWindow !== window.top) {
            iframe = currentWindow.frameElement;
            if (iframe) {
                break;
            }
            currentWindow = currentWindow.parent;
        }

        // Store iframe XPath in state if found
        if (iframe && state) {
            const iframeXPath = this.getXpath(iframe, state);
            if (iframeXPath) {
                state.iframeXpath = iframeXPath;
            }
        }

        // Generate XPath for the element
        if (element.textContent && element.textContent.trim() && !element.children.length && !['textarea', 'input'].includes(tagName)) {
            const textContent = element.textContent.trim();
            const truncatedText = this.escapeXPathString(textContent.slice(0, 30));
            const xpathText = `//${tagName}[contains(text(), ${truncatedText})]`;
            const elements = this.evaluateXPath(xpathText, element.ownerDocument);

            if (elements.length === 1) return xpathText;
        }

        // Attribute-based logic for generating XPaths
        const attributes = this.attributesProperty[tagName] || this.attributesProperty['default'];
        for (let attr of attributes) {
            if (element.hasAttribute(attr)) {
                const value = element.getAttribute(attr);
                if (!value || this.isInvalidAttributeValue(attr, value)) continue;

                const escapedValue = this.escapeXPathString(value);
                const xpath = `//${tagName}[@${attr}=${escapedValue}]`;
                const elements = this.evaluateXPath(xpath);

                if (elements.length === 1) return xpath; // Return if unique
                if (elements.length > 1) {
                    const index = elements.indexOf(element) + 1;
                    return `(//${tagName}[@${attr}=${escapedValue}])[${index}]`;
                }
            }
        }


        const filterAttributes = (attr) => {
            if (attr.name === 'style' || attr.name === 'href' || attr.name === 'src' || attr.name === 'class' || attr.name.includes('disabled') || attr.name.includes('hidden') || attr.name.includes('readonly')) return false;
            // if (attr.name === 'class' || attr.name === 'className') {
            //     const classes = element.getAttribute('class')?.split(' ').filter(cls => {
            //         // Skip any class with a hyphen
            //         if (cls.includes('-')) return false;

            //         // Skip highlight and dynamic classes
            //         if (/ab-highlight|ui-elemfocus|selected|:/.test(cls)) return false;

            //         // Skip framework prefixes
            //         if (/^(ui|ng|react|vue)/.test(cls)) return false;

            //         // Skip special characters and numbers
            //         if (/[!@#$%^&*()_+={}[\]:;"'<>,.?/|\\~]|\d/.test(cls)) return false;

            //         // Skip UUID-like strings
            //         if (/^[a-f0-9]{8}/.test(cls)) return false;

            //         // Skip state-related classes
            //         if (['hover', 'focus', 'active', 'disabled', 'hidden'].some(state => cls.includes(state))) return false;

            //         // Only allow simple, semantic class names
            //         return /^[a-z][a-z]*$/.test(cls);
            //     });

            //     // Only use classes if we found some valid ones
            //     return classes && classes.length > 0 && classes.length <= 3;
            // }
            return true;
        };

        const filteredAttributes = Array.from(element.attributes).filter(filterAttributes);
        for (let attr of filteredAttributes) {
            if (element.hasAttribute(attr)) {
                const value = element.getAttribute(attr);
                if (!value || this.isInvalidAttributeValue(attr, value)) continue;

                const xpath = `//${tagName}[@${attr.name}=${value}]`;
                const elements = this.evaluateXPath(xpath, element.ownerDocument);

                if (elements.length === 1) return xpath;
                if (elements.length > 1) {
                    const index = elements.indexOf(element) + 1;
                    return `(//${tagName}[@${attr.name}=${value}])[${index}]`;
                }
            }
        }

        return null;
    }


    handleSVGElement(element, current = false) {
        const pathElement = element.querySelector('path');
        if (!pathElement?.getAttribute('d')) {
            const allSVGs = Array.from(document.querySelectorAll('svg'));
            const index = allSVGs.indexOf(element) + 1;
            return index > 0 ? `(//*[name()='svg'])[${index}]` : null;
        }

        const dValue = pathElement.getAttribute('d');
        const dValueSubstring = dValue.substring(0, 20);
        const allSVGs = document.querySelectorAll('svg');
        const matchingSVGs = Array.from(allSVGs).filter(svg => {
            const path = svg.querySelector('path');
            return path?.getAttribute('d')?.includes(dValueSubstring);
        });

        if (matchingSVGs.length === 1) {
            return `//*[name()='svg'][.//*[name()='path' and contains(@d,'${dValueSubstring}')]]`;
        }

        const index = matchingSVGs.indexOf(element) + 1;
        return `(//*[name()='svg'][.//*[name()='path' and contains(@d,'${dValueSubstring}')]])[${index}]`;
    }

    escapeXPathString(str) {
        if (str.includes('"') && str.includes("'")) {
            const parts = str.split('"').map(part => `"${part}"`);
            return `concat(${parts.join(', ' + "'\"'" + ', ')})`;
        } else if (str.includes('"')) {
            return `'${str}'`;
        } else {
            return `"${str}"`;
        }
    }

    isInvalidAttributeValue(attr, value) {
        // Exclude IDs containing ':', numeric-only, or random-looking values
        if (attr === 'id') {
            if (value.includes(':') || /^\d+$/.test(value) || this.isRandomString(value)) {
                return true;
            }
        }
        return false;
    }

    // Helper to check for random-looking strings
    isRandomString(value) {
        // Assume random strings are alphanumeric with no pattern, length 8-32
        return /^[a-zA-Z0-9]{8,32}$/.test(value);
    }

    evaluateXPath(xpath, contextDocument = document) {
        try {
            const result = contextDocument.evaluate(
                xpath,
                contextDocument,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
            );

            const elements = [];
            for (let i = 0; i < result.snapshotLength; i++) {
                elements.push(result.snapshotItem(i));
            }
            return elements;
        } catch (e) {
            console.error('XPath evaluation failed:', e);
            return [];
        }
    }
}

// Create singleton instance
const xpathGenerator = new XPathGenerator();

module.exports = {
    getXpath: (element, state) => xpathGenerator.getXpath(element, state),
    getXpathWithinDocument: (element) => xpathGenerator.getXpathWithinDocument(element),
    buildOptimalXPath: (element, state) => xpathGenerator.buildOptimalXPath(element, state),
    tryGetUniqueXPath: (element, state) => xpathGenerator.tryGetUniqueXPath(element, state),
    XPathGenerator
};