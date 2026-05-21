'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Download, LogOut, Play, Settings, Tag, Upload, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth';
import {
  workspaceApi,
  documentApi,
  WorkspaceResponse,
  DocumentResponse,
  MemberResponse,
  UpdateWorkspaceRequest,
  MemberRole,
  importExportApi,
  ExportFormat,
  Column2Mode,
  ExportOptions,
} from '@/lib/api';
import { AuthGuard } from '@/components/auth-guard';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { Sidebar, SidebarItem } from './_components/Sidebar';
import { DocumentGrid, DocumentFilter } from './_components/DocumentGrid';
import { MemberManagement } from './_components/MemberManagement';
import { ExportDialog } from './_components/ExportDialog';

export default function WorkspacePage() {
  const { id: workspaceId } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUserRole = members.find(m => m.userId === user?.id)?.role;
  const isAdmin = currentUserRole === 'ADMIN';

  const [activeSection, setActiveSection] = useState<SidebarItem>('getting-started');
  const [documentFilter, setDocumentFilter] = useState<DocumentFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Settings state
  const [updatedName, setUpdatedName] = useState('');
  const [updatedDescription, setUpdatedDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Export state
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>(ExportFormat.SEPARATE_FILES_ZIP);
  const [column2Mode, setColumn2Mode] = useState<Column2Mode>(Column2Mode.PART_NUMBER);
  const [exportTargetId, setExportTargetId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (workspaceId && user) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, user]);

  const getUserInitials = () => {
    if (!user) return 'U';
    const first = user.firstName?.charAt(0) || '';
    const last = user.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || user.username?.charAt(0)?.toUpperCase() || 'U';
  };

  const getUserDisplayName = () => {
    if (!user) return 'User';
    if (user.firstName) {
      return user.firstName + (user.lastName ? ' ' + user.lastName : '');
    }
    return user.username || 'User';
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [wsRes, docRes, memRes] = await Promise.all([
        workspaceApi.getById(workspaceId),
        documentApi.list(workspaceId),
        workspaceApi.getMembers(workspaceId),
      ]);

      setWorkspace(wsRes.data);
      setDocuments(docRes.data);
      setMembers(memRes.data);

      setUpdatedName(wsRes.data.name);
      setUpdatedDescription(wsRes.data.description || '');
    } catch (error) {
      console.error('Failed to fetch workspace data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWorkspace = async () => {
    if (!workspace) return;
    try {
      setIsUpdating(true);
      const req: UpdateWorkspaceRequest = {
        name: updatedName,
        description: updatedDescription,
      };
      const res = await workspaceApi.update(workspace.id, req);
      setWorkspace(res.data);
    } catch (error) {
      console.error('Failed to update workspace:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddMember = async (email: string, role: MemberRole) => {
    if (!workspace) return;
    try {
      await workspaceApi.addMember(workspace.id, { email, role });
      const memRes = await workspaceApi.getMembers(workspace.id);
      setMembers(memRes.data);
    } catch (error: unknown) {
      console.error('Failed to add member:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to add member: ${message}`);
      throw error;
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!workspace || !confirm('Are you sure you want to remove this member?')) return;
    try {
      await workspaceApi.removeMember(workspace.id, userId);
      setMembers(members.filter(m => m.userId !== userId));
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove member.');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: MemberRole) => {
    if (!workspace) return;
    try {
      await workspaceApi.updateMemberRole(workspace.id, userId, newRole);
      setMembers(members.map(m => m.userId === userId ? { ...m, role: newRole } : m));
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Failed to update role.');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!workspace || !confirm('Are you sure you want to delete this document?')) return;
    try {
      await documentApi.delete(documentId);
      setDocuments(documents.filter(d => d.id !== documentId));
      const wsRes = await workspaceApi.getById(workspace.id);
      setWorkspace(wsRes.data);
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document.');
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspace || !confirm(`Are you sure you want to delete workspace "${workspace.name}"? This action cannot be undone.`)) return;
    try {
      await workspaceApi.delete(workspace.id);
      router.push('/home');
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      alert('Failed to delete workspace.');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !workspace) return;

    try {
      setIsUploading(true);
      await documentApi.upload(workspace.id, file);
      const docRes = await documentApi.list(workspace.id);
      setDocuments(docRes.data);
      const wsRes = await workspaceApi.getById(workspace.id);
      setWorkspace(wsRes.data);
    } catch (error) {
      console.error('Failed to upload document:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openExportDialog = (documentId?: string) => {
    setExportTargetId(documentId || null);
    setIsExportDialogOpen(true);
    setExportFormat(ExportFormat.SEPARATE_FILES_ZIP);
    setColumn2Mode(Column2Mode.PART_NUMBER);
  };

  const handleExportAction = async () => {
    if (!workspace) return;
    try {
      setIsExporting(true);
      const options: ExportOptions = {
        column2Mode,
        exportFormat,
        continueSentenceNumbers: true,
        defaultPartNumber: 0,
      };

      const result = exportTargetId
        ? await importExportApi.exportDocument(exportTargetId, options)
        : await importExportApi.exportWorkspace(workspace.id, options);

      const { blob, filename } = result;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setIsExportDialogOpen(false);
    } catch (error) {
      console.error('Failed to export:', error);
      alert('Failed to export.');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-[var(--primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg text-slate-600 dark:text-slate-400">Loading Workspace...</span>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Workspace not found</h1>
            <Button onClick={() => router.push('/home')}>Back to Home</Button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <header className="border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Image
                src="/genesis-logo.svg"
                alt="Genesis Logo"
                width={120}
                height={55}
                priority
                className="h-10 w-auto cursor-pointer"
                onClick={() => router.push('/home')}
              />
              <div className="border-l border-slate-300 dark:border-slate-700 pl-8">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">{workspace.name}</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">{workspace.annotationType}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NotificationDropdown />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="cursor-pointer ring-2 ring-white dark:ring-slate-800 hover:shadow-lg transition-shadow">
                    <AvatarImage src="" alt={getUserDisplayName()} />
                    <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white font-bold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{getUserDisplayName()}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="flex max-w-7xl mx-auto">
          <Sidebar
            workspace={workspace}
            activeSection={activeSection}
            isAdmin={isAdmin}
            onChangeSection={setActiveSection}
            onBack={() => router.push('/home')}
          />

          <main className="flex-1 p-8">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
            />

            {activeSection === 'getting-started' && (
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Getting Started</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-blue-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5" />
                      </div>
                      <CardTitle>Open Editor</CardTitle>
                      <CardDescription>Start annotating documents in the annotation editor</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full" onClick={() => router.push(`/workspace/${workspaceId}/editor`)}>
                        Launch Editor
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                        <Download className="w-5 h-5" />
                      </div>
                      <CardTitle>Export Documents</CardTitle>
                      <CardDescription>Download annotated documents in various formats</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full" onClick={() => openExportDialog()}>Export</Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <CardTitle>Import Documents</CardTitle>
                      <CardDescription>Upload new documents to this workspace</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                        Import
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">Quick Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Total Documents</span>
                          <span className="font-bold text-lg">{workspace.documentCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Annotated</span>
                          <span className="font-bold text-lg text-green-600">{workspace.annotatedDocumentCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Remaining</span>
                          <span className="font-bold text-lg text-orange-600">{workspace.documentCount - workspace.annotatedDocumentCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Team Members</span>
                          <span className="font-bold text-lg">{members.length}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeSection === 'documents' && (
              <DocumentGrid
                documents={documents}
                filter={documentFilter}
                onChangeFilter={setDocumentFilter}
                searchQuery={searchQuery}
                onChangeSearch={setSearchQuery}
                isUploading={isUploading}
                onUploadClick={() => fileInputRef.current?.click()}
                onAnnotate={() => router.push(`/workspace/${workspaceId}/editor`)}
                onExportDocument={openExportDialog}
                onDeleteDocument={handleDeleteDocument}
              />
            )}

            {activeSection === 'collaborators' && (
              <MemberManagement
                members={members}
                isAdmin={isAdmin}
                currentUserId={user?.id}
                onAddMember={handleAddMember}
                onRemoveMember={handleRemoveMember}
                onUpdateRole={handleUpdateRole}
              />
            )}

            {activeSection === 'schema' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Annotation Schema</h2>
                  <Button className="gap-2" disabled>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Layer
                  </Button>
                </div>

                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Tag className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Coming Soon</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                      Advanced schema management will be available in the next update.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === 'settings' && isAdmin && (
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Settings</h2>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>General</CardTitle>
                      <CardDescription>Basic workspace configuration</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Workspace Name
                        </label>
                        <Input value={updatedName} onChange={(e) => setUpdatedName(e.target.value)} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Description
                        </label>
                        <Input value={updatedDescription} onChange={(e) => setUpdatedDescription(e.target.value)} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Annotation Type
                        </label>
                        <Input value={workspace.annotationType} disabled className="bg-slate-100 dark:bg-slate-800" />
                        <p className="text-xs text-slate-500">Annotation type cannot be changed after creation</p>
                      </div>

                      <div className="pt-4">
                        <Button onClick={handleUpdateWorkspace} disabled={isUpdating}>
                          {isUpdating ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-red-200 dark:border-red-900 mt-8">
                    <CardHeader>
                      <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                      <CardDescription>Irreversible actions for this workspace</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between p-4 border border-red-100 dark:border-red-900/50 rounded-lg bg-red-50 dark:bg-red-900/10">
                        <div>
                          <h4 className="font-medium text-red-900 dark:text-red-200">Delete Workspace</h4>
                          <p className="text-sm text-red-700 dark:text-red-300">
                            Permanently delete this workspace and all its documents
                          </p>
                        </div>
                        <Button variant="destructive" onClick={handleDeleteWorkspace}>
                          Delete Workspace
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <ExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        targetIsDocument={exportTargetId !== null}
        format={exportFormat}
        onChangeFormat={setExportFormat}
        column2Mode={column2Mode}
        onChangeColumn2Mode={setColumn2Mode}
        isExporting={isExporting}
        onExport={handleExportAction}
      />
    </AuthGuard>
  );
}
