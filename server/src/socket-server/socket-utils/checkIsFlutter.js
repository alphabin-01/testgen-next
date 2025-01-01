const { emitSendCode } = require("../services/socketService");
const logger = require('../../utils/logger');

async function checkIsFlutter(page, pageVar) {
    const maxWaitTime = 10000;
    const interval = 500;
    let totalWaitTime = 0;

    try {
        while (totalWaitTime < maxWaitTime) {
            if (page.isClosed()) {
                logger.warn("Page has been closed. Exiting Flutter detection.");
                return;
            }
            const detectionResults = await page.evaluate(() => {
                const results = { hasFlutterElements: false, hasMetaTag: false, hasClass: false, hasScript: false, hasContentSignature: false };

                // Check for Flutter-specific elements
                results.hasFlutterElements = document.querySelector('flt-semantics-placeholder') !== null ||
                    document.querySelector('flt-glass-pane') !== null ||
                    document.querySelector('flt-semantics-host') !== null;

                // Check for Flutter-specific meta tags
                const metas = Array.from(document.getElementsByTagName('meta'));
                results.hasMetaTag = metas.some(meta => meta.getAttribute('content')?.includes('FlutterFlow'));

                // Check for FlutterFlow-related class names
                const flutterFlowClasses = ['flutter-flow-', 'ff-', 'flutter-builder'];
                const allElements = Array.from(document.getElementsByTagName('*'));
                results.hasClass = allElements.some(element => {
                    const className = element.className && element.className.baseVal ? element.className.baseVal : element.className;
                    return typeof className === 'string' && flutterFlowClasses.some(prefix => className.includes(prefix));
                });

                // Check for Flutter-related script tags
                const scripts = Array.from(document.getElementsByTagName('script'));
                results.hasScript = scripts.some(script => {
                    const src = script.getAttribute('src') || '';
                    return src.includes('flutterflow') || src.includes('flutter_web');
                });

                // Check for specific Flutter content signatures
                const pageContent = document.documentElement.innerHTML;
                results.hasContentSignature = pageContent.includes('flutter-canvaskit') ||
                    pageContent.includes('flutter_web.js') ||
                    pageContent.includes('flutter_service_worker.js');

                return results;
            });

            const isFlutterSite = detectionResults.hasFlutterElements || detectionResults.hasMetaTag ||
                detectionResults.hasClass || detectionResults.hasScript || detectionResults.hasContentSignature;

            if (isFlutterSite) {
                const success = await page.evaluate(() => {
                    const placeholders = document.querySelectorAll('flt-semantics-placeholder');
                    if (placeholders.length === 0) return false;

                    placeholders.forEach(element => {
                        element.style.width = '100px';
                        element.style.height = '100px';
                        element.style.zIndex = '1000';
                        element.style.position = 'relative';
                    });

                    const placeholder = placeholders[0];
                    if (placeholder) {
                        placeholder.click();
                        return true;
                    }
                    return false;
                });

                if (success) {
                    emitSendCode(`await abPlaywright.parseFlutterDOM(${pageVar});\n`);
                    return;
                }
            }
            if (page.isClosed()) {
                logger.warn("Page has been closed during Flutter detection. Exiting.");
                return;
            }
            // await page.waitForTimeout(interval);
            totalWaitTime += interval;
        }

    } catch (error) {
        logger.error("Error during Flutter DOM detection or modification:", error);
    }
}

module.exports = { checkIsFlutter };
