import { redirect } from 'next/navigation';
import { SessionExpiredError } from '@/lib/errors';
import { listWorkspaces } from '@/features/workspace/workspace.gateway';
import { HomeClient } from './HomeClient';

export default async function HomePage() {
  try {
    const workspaces = await listWorkspaces();
    return <HomeClient initialWorkspaces={workspaces} />;
  } catch (err) {
    if (err instanceof SessionExpiredError) {
      // Route handler clears the stale cookies (RSC can't) before
      // /login renders, avoiding a middleware bounce loop.
      redirect('/api/auth/end-session');
    }
    throw err;
  }
}
