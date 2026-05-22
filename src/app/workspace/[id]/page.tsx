import { redirect } from 'next/navigation';
import { SessionExpiredError } from '@/lib/errors';
import { listDocuments } from '@/lib/server/document';
import { getWorkspaceById, listMembers } from '@/lib/server/workspace';
import { WorkspaceClient } from './WorkspaceClient';

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const [workspace, documents, members] = await Promise.all([
      getWorkspaceById(id),
      listDocuments(id),
      listMembers(id),
    ]);
    return (
      <WorkspaceClient
        workspaceId={id}
        initialWorkspace={workspace}
        initialDocuments={documents}
        initialMembers={members}
      />
    );
  } catch (err) {
    if (err instanceof SessionExpiredError) {
      redirect('/api/auth/end-session');
    }
    throw err;
  }
}
