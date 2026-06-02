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
