// API Endpoints configuration

export const API_ENDPOINTS = {
    HEALTH_CHECK: '/health',

    // File related endpoints
    FILE: {
        RENAME: '/file/rename',
        CREATE: '/file/create',
        DELETE: '/file/delete',
        FETCH: '/file/fetch',
        FETCH_ALL: '/getStructure',
    },

    // Project related endpoints
    PROJECT: {
        CREATE: '/create-project',
        EXPORT: '/export',
        EDIT: (folderName) => `/edit-project/${folderName}`,
        DELETE: (folderName) => `/delete-project/${folderName}`,
        LIST: '/all-projects',
        UPDATE_CONFIG: '/update-config',
        GET_CONFIG: '/get-config',
    },

    // Test-related endpoints
    TEST: {
        RUN: '/run-tests',
        STOP: '/stop-tests',
        CLOUD: '/run-cloud',
        RESULTS: '/get-test-result',
    },

    // Locator endpoints
    LOCATORS: {
        LOAD: '/locators/load-locators',
        GET_GLOBAL_JS: '/locators/get-global-js',
        UPDATE: '/locators/update-locators',
        GET_IMAGE_PATH: '/locators/get-image-path',
        DELETE: '/locators/delete-locator',
        DELETE_ALL: '/locators/delete-all-locator',
    },

    // URL-related endpoint
    LOAD_URL: '/load-url',
};

// Base URL configuration
export const API_CONFIG = {
    BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api',
    TIMEOUT: 30000, // 30 seconds
};