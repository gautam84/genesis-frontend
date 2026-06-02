// Token and Sentence types (matching backend DTOs)
export interface TokenDto {
    id: string;
    documentId: string;
    tokenIndex: number;
    sentenceIndex: number;
    globalIndex: number;
    form: string;  // The actual token text
    text?: string; // Legacy alias
    pos: string | null;
    lemma: string | null;
    nerTag: string | null;
    startOffset: number;
    endOffset: number;
}

export interface SentenceDto {
    sentenceIndex: number;
    startTokenIndex: number;
    endTokenIndex: number;
    tokens: TokenDto[];
}

// Editor response types
export interface DocumentContentResponse {
    documentId: string;
    documentName: string;
    orderIndex: number;
    sentences: SentenceDto[];
    tokens: TokenDto[];
    totalSentences: number;
    totalTokens: number;
    globalTokenOffset: number;
    currentPage?: number;
    totalPages?: number;
    pageSize?: number;
}

export interface EditorDocumentInfo {
    id: string;
    name: string;
    orderIndex: number;
    tokenCount: number;
    sentenceCount: number;
    status: string;
    isTokenized: boolean;
}

export interface EditorSessionResponse {
    id?: string;
    workspaceId: string;
    userId: string;
    lastDocumentIndex: number;
    scrollPosition: number;
}

export interface WorkspaceEditorResponse {
    workspaceId: string;
    workspaceName: string;
    annotationType: string;
    documents: EditorDocumentInfo[];
    session: EditorSessionResponse | null;
    totalDocuments: number;
    totalTokens: number;
    totalSentences: number;
}

export interface SaveSessionRequest {
    workspaceId: string;
    lastDocumentIndex: number;
    scrollPosition: number;
}
