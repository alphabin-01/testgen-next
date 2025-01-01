function createXpathTooltip() {
    // Create tooltip only if it doesn't exist
    if (document.getElementById('xpath-tooltip')) {
        return document.getElementById('xpath-tooltip');
    }
    
    const tooltip = document.createElement('div');
    tooltip.id = 'xpath-tooltip';
    Object.assign(tooltip.style, {
        position: 'fixed', // Changed to fixed for better performance
        padding: '5px 8px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        fontSize: '12px',
        borderRadius: '4px',
        pointerEvents: 'none',
        zIndex: '100002',
        display: 'none',
        maxWidth: '300px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        transition: 'opacity 0.15s ease-out',
    });
    document.body.appendChild(tooltip);
    return tooltip;
}

function createContextMenu() {
    const menu = document.createElement('div');
    menu.classList.add('context-menu');
    document.body.appendChild(menu);

    if (document.getElementById('custom-context-menu-styles')) return menu;

    const style = document.createElement('style');
    style.id = 'custom-context-menu-styles';
    style.type = 'text/css';
    style.appendChild(document.createTextNode(`
        .context-menu {
            position: fixed;
            background-color: #2C3A42;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            min-width: 200px;
            max-width: 300px;
            max-height: calc(100vh - 40px);
            display: none;
            flex-direction: column;
            opacity: 0;
            transition: opacity 0.15s ease-out;
            overflow: hidden;
            margin-top: 4px;
        }
        
        .context-menu.open {
            opacity: 1;
        }
        
        .context-menu-sections-container {
            overflow-y: auto;
            overflow-x: hidden;
            flex: 1;
            max-height: calc(100vh - 120px);
        }
        .context-menu-header {
            padding: 8px 16px;
            font-size: 14px;
            font-weight: 600;
            color: #E2E8F0;
            background-color: #252F35;
            border-bottom: 1px solid #3D4A53;
            position: sticky;
            top: 0;
            z-index: 3;
        }
        .context-menu-section {
            position: relative;
            display: flex;
            flex-direction: column;
            background-color: #2C3A42;
        }
        .context-menu-section-header {
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 600;
            color: #A0AEC0;
            background-color: #252F35;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            user-select: none;
            position: sticky;
            top: 0;
            z-index: 2;
        }
        .context-menu-section-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease-out;
            background-color: #2C3A42;
        }
        .context-menu-section-content.expanded {
            max-height: none;
        }
        .context-menu-section-content::-webkit-scrollbar {
            width: 6px;
        }
        .context-menu-section-content::-webkit-scrollbar-track {
            background: #252F35;
        }
        .context-menu-section-content::-webkit-scrollbar-thumb {
            background: #3D4A53;
            border-radius: 3px;
        }
        .context-menu-item {
            padding: 8px 16px;
            font-size: 13px;
            color: #E2E8F0;
            cursor: pointer;
            transition: background-color 0.2s;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .context-menu-item:hover {
            background-color: #3D4A53;
        }
        .section-title {
            font-size: 13px;
            font-weight: 600;
            color: #A0AEC0;
        }
        .section-arrow {
            font-size: 10px;
            transition: transform 0.2s ease;
        }
    `));
    document.head.appendChild(style);

    return menu;
}

function populateContextMenu(menu, options) {
    menu.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'context-menu-header';
    header.textContent = 'Alphabin Assertion';
    header.style.cursor = 'default';
    
    // Prevent click recording on the main header
    ['mousedown', 'mouseup', 'click'].forEach(eventType => {
        header.addEventListener(eventType, (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            window.skipNextClick = true;
            setTimeout(() => {
                window.skipNextClick = false;
            }, 200);
        }, true);
    });
    
    menu.appendChild(header);

    const sectionsContainer = document.createElement('div');
    sectionsContainer.className = 'context-menu-sections-container';
    menu.appendChild(sectionsContainer);

    const elementAssertions = options.assertions?.element || options.assertions || [];
    const pageAssertions = options.assertions?.page || options.pageAssertions || [];

    const sections = [
        { name: 'Element Assertions', items: elementAssertions, defaultOpen: true },
        { name: 'Page Assertions', items: pageAssertions, defaultOpen: true }
    ];

    sections.forEach(({ name, items, defaultOpen }) => {
        if (!Array.isArray(items) || items.length === 0) return;

        const section = document.createElement('div');
        section.className = 'context-menu-section';

        const header = document.createElement('div');
        header.className = 'context-menu-section-header';
        header.innerHTML = `<span>${name}</span><span class="section-arrow">▼</span>`;

        const content = document.createElement('div');
        content.className = 'context-menu-section-content' + (defaultOpen ? ' expanded' : '');

        header.querySelector('.section-arrow').style.transform = defaultOpen ? 'rotate(0deg)' : 'rotate(-90deg)';

        items.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = item.display;
            menuItem.style.cursor = 'pointer';
            
            let isHandlingClick = false;

            const handleAssertionClick = (e) => {
                
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                if (isHandlingClick) {
                    return false;
                }

                isHandlingClick = true;
                
                try {
                    if (typeof options.onAssertionClick === 'function') {
                        options.onAssertionClick(item);
                    } else if (typeof item.action === 'function') {
                        item.action();
                    }
                } catch (error) {
                    console.error('[MENU-DEBUG] 💥 Error in assertion handler:', error);
                } finally {
                    hideContextMenu(menu);
                    
                    // Add a flag to prevent click recording
                    window.skipNextClick = true;
                    setTimeout(() => {
                        isHandlingClick = false;
                        window.skipNextClick = false;
                    }, 200);
                }

                return false;
            };

            menuItem.addEventListener('mousedown', handleAssertionClick, { 
                capture: true,
                once: true
            });

            ['mouseup', 'click'].forEach(eventType => {
                menuItem.addEventListener(eventType, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }, true);
            });

            content.appendChild(menuItem);
        });

        header.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Add a flag to prevent click recording
            window.skipNextClick = true;
            setTimeout(() => {
                window.skipNextClick = false;
            }, 200);

            const arrow = header.querySelector('.section-arrow');
            const isExpanded = content.classList.toggle('expanded');
            arrow.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
        });

        section.appendChild(header);
        section.appendChild(content);
        sectionsContainer.appendChild(section);
    });

    menu.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });
}

function showContextMenu(menu, x, y) {
    menu.style.display = 'none';
    menu.style.opacity = '0';

    menu.style.display = 'flex';
    menu.style.position = 'fixed';
    menu.style.visibility = 'hidden';

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const menuRect = menu.getBoundingClientRect();
    const menuWidth = menuRect.width;
    const menuHeight = menuRect.height;

    let finalX = x;
    let finalY = y;

    if (x + menuWidth > viewportWidth) {
        finalX = x - menuWidth;
    }

    if (y + menuHeight > viewportHeight) {
        finalY = y - menuHeight;
    }

    finalX = Math.max(0, Math.min(finalX, viewportWidth - menuWidth));
    finalY = Math.max(0, Math.min(finalY, viewportHeight - menuHeight));

    menu.style.left = `${finalX}px`;
    menu.style.top = `${finalY}px`;
    menu.style.visibility = 'visible';

    requestAnimationFrame(() => {
        menu.classList.add('open');
        menu.style.opacity = '1';
    });
 
    document.removeEventListener('click', menu.closeMenuHandler);

    menu.closeMenuHandler = function (e) {
        if (!menu.contains(e.target)) {
            hideContextMenu(menu);
            document.removeEventListener('click', menu.closeMenuHandler);
        }
    };

    setTimeout(() => {
        document.addEventListener('click', menu.closeMenuHandler);
    }, 0);
}

function hideContextMenu(menu) {
    menu.style.display = 'none';
    menu.classList.remove('open');
    menu.style.opacity = '0';

    if (menu.closeMenuHandler) {
        document.removeEventListener('click', menu.closeMenuHandler);
        menu.closeMenuHandler = null;
    }
}

module.exports = { createXpathTooltip, createContextMenu, populateContextMenu, showContextMenu, hideContextMenu };