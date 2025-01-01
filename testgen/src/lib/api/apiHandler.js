import axios from 'axios';
import { API_CONFIG, API_ENDPOINTS } from './apiEndpoints';

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

// Project related methods
const projects = {
    create: async (projectData) => {
        return new Promise((resolve, reject) => {
            const eventSource = new EventSource(
                `${API_CONFIG.BASE_URL}${API_ENDPOINTS.PROJECT.CREATE}?` +
                `name=${encodeURIComponent(projectData.projectName)}&` +
                `description=${encodeURIComponent(projectData.projectDescription)}`
            );

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    // You can handle progress updates here if needed
                    console.log('Progress:', data.message);
                } catch (error) {
                    console.error('Failed to parse progress update:', event.data);
                }
            };

            eventSource.onerror = (error) => {
                console.error('An error occurred while receiving updates:', error);
                eventSource.close();
                reject(new Error("Failed to receive project creation updates"));
            };

            eventSource.addEventListener('done', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    resolve({
                        data: data.project,
                        error: null,
                        status: 200,
                        success: true
                    });
                } catch (error) {
                    console.error('Failed to parse final message:', event.data);
                    reject(error);
                } finally {
                    eventSource.close();
                }
            });
        });
    },

    edit: async (projectName, data) => {
        try {
            const response = await api.put(API_ENDPOINTS.PROJECT.EDIT(projectName), {
                newFolderName: data.projectName,
                description: data.projectDescription
            });
            return handleSuccess(response);
        } catch (error) {
            return handleError(error);
        }
    },

    delete: async (projectName) => {
        try {
            const response = await api.delete(API_ENDPOINTS.PROJECT.DELETE(projectName));
            return handleSuccess(response);
        } catch (error) {
            return handleError(error);
        }
    },

    fetchAll: async () => {
        try {
            const response = await api.get(API_ENDPOINTS.PROJECT.LIST);
            return handleSuccess(response);
        } catch (error) {
            return handleError(error);
        }
    }
};

export const apiHandler = {
    projects
};