// ==================== NER Tag Definitions (custom tags) ====================

export type NerTagScope = 'GLOBAL' | 'WORKSPACE';

export interface NerTagDefinition {
    id: string | null;
    tag: string;
    description: string | null;
    scope: NerTagScope;
    workspaceId: string | null;
    builtin: boolean;
}

export interface CreateNerTagRequest {
    tag: string;
    description?: string | null;
    scope: NerTagScope;
    workspaceId?: string | null;
}

// ==================== NER Tagset (OntoNotes 18) ====================

export interface NerTag {
    tag: string;
    label: string;
    description: string;
    color: string;
    builtin?: boolean;
    definitionId?: string | null;
    scope?: NerTagScope;
}

// Colors picked to be visually distinct at span-pill scale. Order matches
// the backend's UNIVERSAL_NER_TAGS LinkedHashMap for stable badge ordering.
export const UNIVERSAL_NER_TAGS: NerTag[] = [
    { tag: 'PERSON',      label: 'Person',       description: 'People, including fictional',                color: '#2563eb' },
    { tag: 'NORP',        label: 'NORP',         description: 'Nationalities, religious or political groups', color: '#7c3aed' },
    { tag: 'FAC',         label: 'Facility',     description: 'Buildings, airports, highways, bridges',     color: '#0ea5e9' },
    { tag: 'ORG',         label: 'Organization', description: 'Companies, agencies, institutions',          color: '#9333ea' },
    { tag: 'GPE',         label: 'GPE',          description: 'Countries, cities, states',                  color: '#16a34a' },
    { tag: 'LOC',         label: 'Location',     description: 'Non-GPE locations: mountains, water bodies', color: '#22c55e' },
    { tag: 'PRODUCT',     label: 'Product',      description: 'Vehicles, weapons, foods (not services)',    color: '#f59e0b' },
    { tag: 'EVENT',       label: 'Event',        description: 'Named hurricanes, battles, wars, sports',    color: '#ef4444' },
    { tag: 'WORK_OF_ART', label: 'Work of Art',  description: 'Titles of books, songs, etc.',               color: '#ec4899' },
    { tag: 'LAW',         label: 'Law',          description: 'Named documents made into laws',             color: '#a855f7' },
    { tag: 'LANGUAGE',    label: 'Language',     description: 'Any named language',                         color: '#14b8a6' },
    { tag: 'DATE',        label: 'Date',         description: 'Absolute or relative dates or periods',      color: '#84cc16' },
    { tag: 'TIME',        label: 'Time',         description: 'Times smaller than a day',                   color: '#65a30d' },
    { tag: 'PERCENT',     label: 'Percent',      description: 'Percentage, including %',                    color: '#06b6d4' },
    { tag: 'MONEY',       label: 'Money',        description: 'Monetary values, including unit',            color: '#10b981' },
    { tag: 'QUANTITY',    label: 'Quantity',     description: 'Measurements, as of weight or distance',     color: '#0891b2' },
    { tag: 'ORDINAL',     label: 'Ordinal',      description: '"first", "second"',                          color: '#6366f1' },
    { tag: 'CARDINAL',    label: 'Cardinal',     description: 'Numerals that do not fall under another type', color: '#64748b' },
];

// ==================== NER Annotations ====================

export interface NerAnnotation {
    id: string;
    documentId: string;
    startTokenIndex: number;
    endTokenIndex: number;
    label: string;
    annotatorId: string;
    timestamp: string;
}

export interface CreateNerAnnotationRequest {
    documentId: string;
    startTokenIndex: number;
    endTokenIndex: number;
    label: string;
}

export interface UpdateNerAnnotationRequest {
    startTokenIndex?: number;
    endTokenIndex?: number;
    label?: string;
}

