export interface WorkspaceResponse {
    id: string;
    name: string;
    description?: string;
    annotationType: string;
    status: string;
    ownerId: string;
    ownerUsername: string;
    documentCount: number;
    annotatedDocumentCount: number;
    progressPercentage: number;
    createdAt: string;
    updatedAt: string;
}

export interface UpdateWorkspaceRequest {
    name?: string;
    description?: string;
}

export type MemberRole = 'ADMIN' | 'ANNOTATOR' | 'CURATOR';

export interface AddMemberRequest {
    email: string;
    role: MemberRole;
}

export interface MemberResponse {
    userId: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: MemberRole;
}

// Annotation type enum matching backend
export type AnnotationType = 'COREF' | 'NER' | 'POS' | 'WSD';

export interface CreateWorkspaceRequest {
    name: string;
    description?: string;
    annotationType: AnnotationType;
}
