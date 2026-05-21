import { API_BASE_URL, ApiResponse, tokenStorage } from './client';

export enum Column2Mode {
    PART_NUMBER = 'PART_NUMBER',
    SENTENCE_NUMBER = 'SENTENCE_NUMBER'
}

export enum ExportFormat {
    MERGED_SINGLE_FILE = 'MERGED_SINGLE_FILE',
    SEPARATE_FILES_ZIP = 'SEPARATE_FILES_ZIP',
    SEPARATE_FILES_ZIP_WITH_MERGED = 'SEPARATE_FILES_ZIP_WITH_MERGED'
}

export interface ExportOptions {
    column2Mode: Column2Mode;
    exportFormat: ExportFormat;
    continueSentenceNumbers: boolean;
    defaultPartNumber: number;
}

export const importExportApi = {
    /**
     * Import CoNLL-2012 file
     */
    importCoNLL: async (workspaceId: string, documentId: string, file: File): Promise<ApiResponse<Record<string, number>>> => {
        const formData = new FormData();
        formData.append('file', file);

        const accessToken = tokenStorage.getAccessToken();
        const headers: HeadersInit = {};
        if (accessToken) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${API_BASE_URL}/api/import-export/workspaces/${workspaceId}/documents/${documentId}/conll`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Import failed' }));
            throw new Error(error.message || 'Import failed');
        }

        return response.json();
    },

    /**
     * Export document
     */
    exportDocument: async (documentId: string, options?: ExportOptions): Promise<{ blob: Blob; filename: string }> => {
        const accessToken = tokenStorage.getAccessToken();
        const headers: HeadersInit = {
            'Content-Type': 'application/json'
        };
        if (accessToken) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${API_BASE_URL}/api/export/documents/${documentId}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(options || {}),
        });

        if (!response.ok) {
            throw new Error('Export failed');
        }

        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'export.conll';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }

        return { blob: await response.blob(), filename };
    },

    /**
     * Export workspace
     */
    exportWorkspace: async (workspaceId: string, options?: ExportOptions): Promise<{ blob: Blob; filename: string }> => {
        const accessToken = tokenStorage.getAccessToken();
        const headers: HeadersInit = {
            'Content-Type': 'application/json'
        };
        if (accessToken) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${API_BASE_URL}/api/export/workspaces/${workspaceId}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(options || {}),
        });

        if (!response.ok) {
            throw new Error('Export failed');
        }

        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'export.zip';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }

        return { blob: await response.blob(), filename };
    },

    /**
     * Export document to CoNLL-2012 format (Legacy)
     */
    exportDocumentToCoNLL: async (documentId: string): Promise<Blob> => {
        const result = await importExportApi.exportDocument(documentId);
        return result.blob;
    },

    /**
     * Export workspace to CoNLL-2012 format (Legacy)
     */
    exportWorkspaceToCoNLL: async (workspaceId: string): Promise<Blob> => {
        const result = await importExportApi.exportWorkspace(workspaceId);
        return result.blob;
    },
};
