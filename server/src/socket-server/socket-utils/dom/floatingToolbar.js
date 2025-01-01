function createFloatingToolbar(state) {
    try {
        const storedState = localStorage.getItem('recordingState');
        const initialState = storedState || 'recording';

        localStorage.setItem('recordingState', initialState);
        state.isPaused = initialState === 'paused';
    } catch (e) {
        state.isPaused = false;
    }

    const toolbar = document.createElement('div');
    toolbar.className = 'floating-toolbar';
    Object.assign(toolbar.style, {
        position: 'fixed',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '3px 5px 3px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
        zIndex: '2147483647',
        display: 'flex',
        alignItems: 'center',
        userSelect: 'none',
        borderRadius: '8px',
        cursor: 'grab',
        pointerEvents: 'auto',
        backdropFilter: 'blur(5px)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease'
    });

    const logo = document.createElement('span');
    logo.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="flex" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m14 5l-2-2m0 0l-2 2m2-2v18m0 0l2-2m-2 2l-2-2m9-5l2-2m0 0l-2-2m2 2H3m0 0l2 2m-2-2l2-2"/></svg>';
    Object.assign(logo.style, {
        color: '#0066ff',
        fontSize: '16px',
        fontWeight: '600',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        margin: '5px',
        cursor: 'grab',
        pointerEvents: 'auto'
    });

    const createButton = (svgPath) => {
        const button = document.createElement('button');
        button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"><path fill="currentColor" d="${svgPath}"/></svg>`;
        Object.assign(button.style, {
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '36px',
            borderRadius: '6px',
            color: '#444',
            pointerEvents: 'auto',
            transition: 'all 0.2s ease'
        });
        return button;
    };

    const pauseButton = createButton("M8 19c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2v10c0 1.1.9 2 2 2m6-12v10c0 1.1.9 2 2 2s2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2");
    pauseButton.id = 'recording-pause-btn';
    pauseButton.style.display = state.isPaused ? 'none' : 'flex';

    const resumeButton = createButton("M19.105 11.446a2.34 2.34 0 0 1-.21 1c-.15.332-.38.62-.67.84l-9.65 7.51a2.3 2.3 0 0 1-1.17.46h-.23a2.2 2.2 0 0 1-1-.24a2.29 2.29 0 0 1-1.28-2v-14a2.2 2.2 0 0 1 .33-1.17a2.27 2.27 0 0 1 2.05-1.1c.412.02.812.148 1.16.37l9.66 6.44c.294.204.54.47.72.78c.19.34.29.721.29 1.11");
    resumeButton.id = 'recording-resume-btn';
    resumeButton.style.display = state.isPaused ? 'flex' : 'none';

    const updateButtonState = (isPaused) => {
        try {
            const pauseButton = document.getElementById('recording-pause-btn');
            const resumeButton = document.getElementById('recording-resume-btn');

            if (pauseButton && resumeButton) {
                pauseButton.style.display = isPaused ? 'none' : 'flex';
                resumeButton.style.display = isPaused ? 'flex' : 'none';
            }
        } catch (e) {
            console.warn('Error updating button state:', e);
        }
    };

    updateButtonState(state.isPaused);

    let isDragging = false;
    let startX, startY, startLeft, startTop;

    const startDrag = (e) => {
        if (e.target.tagName.toLowerCase() === 'button') return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = toolbar.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
        toolbar.style.cursor = 'grabbing';
        toolbar.style.transition = 'none';
    };

    const drag = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const newLeft = startLeft + dx;
        const newTop = startTop + dy;

        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const toolbarRect = toolbar.getBoundingClientRect();

        const maxLeft = viewportWidth - toolbarRect.width;
        const maxTop = viewportHeight - toolbarRect.height;

        toolbar.style.left = `${Math.max(0, Math.min(newLeft, maxLeft))}px`;
        toolbar.style.top = `${Math.max(0, Math.min(newTop, maxTop))}px`;
        toolbar.style.transform = 'none';
    };

    const endDrag = () => {
        isDragging = false;
        toolbar.style.cursor = 'grab';
        toolbar.style.transition = 'all 0.3s ease';
    };

    toolbar.addEventListener('mousedown', startDrag);
    toolbar.addEventListener('touchstart', (e) => startDrag(e.touches[0]));
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', (e) => drag(e.touches[0]));
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);

    const updateState = (isPaused) => {
        try {
            state.isPaused = isPaused;
            localStorage.setItem('recordingState', isPaused ? 'paused' : 'recording');
            updateButtonState(isPaused);
            if (typeof window.updateRecordingState === 'function') {
                window.updateRecordingState(isPaused ? 'paused' : 'recording');
            }
        } catch (e) {
            console.warn('Error updating state:', e);
        }
    };

    pauseButton.addEventListener('click', () => {
        updateState(true);
        if (state.highlightedElement) {
            state.highlightedElement.style.removeProperty('transition');
            state.highlightedElement.style.removeProperty('background-color');
            state.highlightedElement = null;
        }
        if (state.tooltip) {
            state.tooltip.style.display = 'none';
        }
        if (typeof window.pauseRecording === 'function') {
            window.pauseRecording();
        }
    });

    resumeButton.addEventListener('click', () => {
        updateState(false);
        if (typeof window.resumeRecording === 'function') {
            window.resumeRecording();
        }
    });

    toolbar.appendChild(logo);
    toolbar.appendChild(pauseButton);
    toolbar.appendChild(resumeButton);

    const style = document.createElement('style');
    style.textContent = `
        .floating-toolbar, .floating-toolbar * {
            pointer-events: auto !important;
        }
        .floating-toolbar:hover {
            box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .floating-toolbar button:hover {
            background-color: rgba(0, 0, 0, 0.05) !important;
            color: #000 !important;
        }
    `;
    document.head.appendChild(style);

    const observer = new MutationObserver(() => {
        toolbar.style.zIndex = '2147483647';
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.body.appendChild(toolbar);
    return toolbar;
}

module.exports = { createFloatingToolbar };