import { redirect } from 'next/navigation';
import { SessionExpiredError } from '@/server/errors';
import { listDocuments } from '@/features/document/document.gateway';
import { getWorkspaceById, listMembers } from '@/features/workspace/workspace.gateway';
import { WorkspaceShell } from '@/features/workspace/components/WorkspaceShell';

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
      <WorkspaceShell
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
