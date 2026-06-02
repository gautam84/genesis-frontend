export interface UpdateTokenPosRequest {
    pos: string | null;
}

export interface BatchUpdateTokenPosRequest {
    updates: { tokenId: string; pos: string | null }[];
}

export interface PosAnnotation {
    id: string;
    tokenId: string;
    annotatorId: string;
    posTag: string;
    timestamp: string;
}

// ==================== POS Tag Definitions (custom tags) ====================

export type PosTagScope = 'GLOBAL' | 'WORKSPACE';

export interface PosTagDefinition {
    id: string | null;
    tag: string;
    description: string | null;
    scope: PosTagScope;
    workspaceId: string | null;
    builtin: boolean;
}

export interface CreatePosTagRequest {
    tag: string;
    description?: string | null;
    scope: PosTagScope;
    workspaceId?: string | null;
}

// ==================== POS Tagset (Universal Dependencies) ====================

export interface PosTag {
    tag: string;
    label: string;
    description: string;
    color: string;
    shortcut?: string;
    builtin?: boolean;
    definitionId?: string | null;
    scope?: PosTagScope;
}

export const UNIVERSAL_POS_TAGS: PosTag[] = [
    { tag: 'NOUN', label: 'Noun', description: 'Common noun', color: '#3b82f6', shortcut: 'n' },
    { tag: 'PROPN', label: 'Proper Noun', description: 'Proper noun', color: '#2563eb', shortcut: 'p' },
    { tag: 'VERB', label: 'Verb', description: 'Verb', color: '#ef4444', shortcut: 'v' },
    { tag: 'ADJ', label: 'Adjective', description: 'Adjective', color: '#f59e0b', shortcut: 'j' },
    { tag: 'ADV', label: 'Adverb', description: 'Adverb', color: '#f97316', shortcut: 'r' },
    { tag: 'PRON', label: 'Pronoun', description: 'Pronoun', color: '#8b5cf6', shortcut: 'o' },
    { tag: 'DET', label: 'Determiner', description: 'Determiner', color: '#a855f7', shortcut: 'd' },
    { tag: 'ADP', label: 'Adposition', description: 'Preposition/postposition', color: '#14b8a6', shortcut: 'a' },
    { tag: 'CONJ', label: 'Conjunction', description: 'Coordinating conjunction', color: '#06b6d4', shortcut: 'c' },
    { tag: 'SCONJ', label: 'Sub. Conjunction', description: 'Subordinating conjunction', color: '#0891b2' },
    { tag: 'AUX', label: 'Auxiliary', description: 'Auxiliary verb', color: '#ec4899', shortcut: 'x' },
    { tag: 'NUM', label: 'Numeral', description: 'Numeral', color: '#84cc16', shortcut: 'm' },
    { tag: 'PART', label: 'Particle', description: 'Particle', color: '#10b981' },
    { tag: 'INTJ', label: 'Interjection', description: 'Interjection', color: '#e11d48' },
    { tag: 'SYM', label: 'Symbol', description: 'Symbol', color: '#6b7280' },
    { tag: 'PUNCT', label: 'Punctuation', description: 'Punctuation', color: '#9ca3af', shortcut: '.' },
    { tag: 'X', label: 'Other', description: 'Other/unknown', color: '#d1d5db' },
];
