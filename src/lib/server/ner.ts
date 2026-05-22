import 'server-only';

import {
  ApiResponse,
  CreateNerAnnotationRequest,
  CreateNerTagRequest,
  NerAnnotation,
  NerTagDefinition,
} from '@/lib/api';
import { serverFetch } from './api';

export async function listTags(workspaceId?: string): Promise<NerTagDefinition[]> {
  const qs = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
  const res = await serverFetch<ApiResponse<NerTagDefinition[]>>(`/api/ner-tags${qs}`);
  return res.data;
}

export async function createTag(
  request: CreateNerTagRequest,
): Promise<NerTagDefinition> {
  const res = await serverFetch<ApiResponse<NerTagDefinition>>('/api/ner-tags', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return res.data;
}

export async function listAnnotations(
  documentId: string,
  annotatorId?: string,
): Promise<NerAnnotation[]> {
  const params = new URLSearchParams({ documentId });
  if (annotatorId) params.set('annotatorId', annotatorId);
  const res = await serverFetch<ApiResponse<NerAnnotation[]>>(
    `/api/ner-annotations?${params.toString()}`,
  );
  return res.data;
}

export async function createAnnotation(
  request: CreateNerAnnotationRequest,
): Promise<NerAnnotation> {
  const res = await serverFetch<ApiResponse<NerAnnotation>>('/api/ner-annotations', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return res.data;
}

export async function deleteAnnotation(annotationId: string): Promise<void> {
  await serverFetch<ApiResponse<void>>(`/api/ner-annotations/${annotationId}`, {
    method: 'DELETE',
  });
}
