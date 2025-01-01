import axios from 'axios';
import { API_CONFIG, API_ENDPOINTS } from './src/lib/api/apiEndpoints';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Error handler
const handleError = (error) => {
    if (error.response) {
        // Server responded with error status
        return {
            data: null,
            error: error.response.data?.message || 'Server error occurred',
            status: error.response.status,
            success: false,
        };
    } else if (error.request) {
        // Request made but no response received
        return {
            data: null,
            error: 'No response received from server',
            status: 503,
            success: false,
        };
    } else {
        // Error in request configuration
        return {
            data: null,
            error: error.message || 'Request configuration error',
            status: 400,
            success: false,
        };
    }
};

// Success handler
const handleSuccess = (response) => {
    return {
        data: response.data,
        error: null,
        status: response.status,
        success: true,
    };
};

// API methods
export const apiHandler = {
    // Project related API calls
    projects: {
        fetchAll: async () => {
            try {
                const response = await api.get(API_ENDPOINTS.PROJECT.LIST);
                return handleSuccess(response);
            } catch (error) {
                return handleError(error);
            }
        },
        edit: async (folderName, data) => {
            try {
                const response = await api.patch(API_ENDPOINTS.PROJECT.EDIT(folderName), data);
                return handleSuccess(response);
            } catch (error) {
                return handleError(error);
            }
        },
        delete: async (folderName) => {
            try {
                const response = await api.delete(API_ENDPOINTS.PROJECT.DELETE(folderName));
                return handleSuccess(response);
            } catch (error) {
                return handleError(error);
            }
        },
    },
    // GET request
    get: async (url, params) => {
        try {
            const response = await api.get(url, { params });
            return handleSuccess(response);
        } catch (error) {
            return handleError(error);
        }
    },

    // POST request
    post: async (url, data) => {
        try {
            const response = await api.post(url, data);
            return handleSuccess(response);
        } catch (error) {
            return handleError(error);
        }
    },

    // PUT request
    put: async (url, data) => {
        try {
            const response = await api.put(url, data);
            return handleSuccess(response);
        } catch (error) {
            return handleError(error);
        }
    },

    // DELETE request
    delete: async (url) => {
        try {
            const response = await api.delete(url);
            return handleSuccess(response);
        } catch (error) {
            return handleError(error);
        }
    },

    // PATCH request
    patch: async (url, data) => {
        try {
            const response = await api.patch(url, data);
            return handleSuccess(response);
        } catch (error) {
            return handleError(error);
        }
    },
};