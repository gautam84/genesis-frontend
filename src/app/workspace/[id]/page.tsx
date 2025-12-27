'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from '@/lib/auth';
import {
  workspaceApi,
  documentApi,
  WorkspaceResponse,
  DocumentResponse,
  MemberResponse,
  UpdateWorkspaceRequest,
  MemberRole
} from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

// Icons (using inline SVGs for now)
const Icons = {
  home: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  play: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  download: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  upload: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  file: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  users: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  tag: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  settings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  back: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
};

type SidebarItem = 'getting-started' | 'documents' | 'collaborators' | 'schema' | 'settings';

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeSection, setActiveSection] = useState<SidebarItem>('getting-started');
  const [documentFilter, setDocumentFilter] = useState<'all' | 'completed' | 'in-progress' | 'unannotated'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Settings state
  const [updatedName, setUpdatedName] = useState('');
  const [updatedDescription, setUpdatedDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Member management state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<MemberRole>('ANNOTATOR');
  const [isAddingMember, setIsAddingMember] = useState(false);

  useEffect(() => {
    if (workspaceId && user) {
      fetchData();
    }
  }, [workspaceId, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [wsRes, docRes, memRes] = await Promise.all([
        workspaceApi.getById(workspaceId),
        documentApi.list(workspaceId),
        workspaceApi.getMembers(workspaceId)
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
        description: updatedDescription
      };
      const res = await workspaceApi.update(workspace.id, req);
      setWorkspace(res.data);
    } catch (error) {
      console.error('Failed to update workspace:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail || !workspace) return;
    try {
      setIsAddingMember(true);
      await workspaceApi.addMember(workspace.id, {
        email: newMemberEmail,
        role: newMemberRole
      });
      setIsAddMemberOpen(false);
      setNewMemberEmail('');
      setNewMemberRole('ANNOTATOR');
      // Refresh members
      const memRes = await workspaceApi.getMembers(workspace.id);
      setMembers(memRes.data);
    } catch (error) {
      console.error('Failed to add member:', error);
      alert('Failed to add member. Please check if the user exists and is not already a member.');
    } finally {
      setIsAddingMember(false);
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
      // Refresh workspace stats as document count changes
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
      // Refresh documents
      const docRes = await documentApi.list(workspace.id);
      setDocuments(docRes.data);

      // Refresh workspace stats
      const wsRes = await workspaceApi.getById(workspace.id);
      setWorkspace(wsRes.data);
    } catch (error) {
      console.error('Failed to upload document:', error);
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    // Basic status mapping - simplified for now
    // In real app, you might map backend status string to these filter categories
    const status = doc.status.toLowerCase(); // Backend: UPLOADED, IMPORTED, ANNOTATING, COMPLETE
    let filterCategory = 'unannotated';
    if (status === 'complete') filterCategory = 'completed';
    else if (status === 'annotating') filterCategory = 'in-progress';
    else filterCategory = 'unannotated';

    const matchesFilter = documentFilter === 'all' || filterCategory === documentFilter;
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETE':
        return { variant: 'default' as const, label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' };
      case 'ANNOTATING':
        return { variant: 'secondary' as const, label: 'In Progress', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' };
      default:
        return { variant: 'secondary' as const, label: 'Unannotated', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown logic';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Workspace not found</h1>
          <Button onClick={() => router.push('/home')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
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
            <Button variant="ghost" size="icon" className="relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>
            <Avatar className="cursor-pointer ring-2 ring-white dark:ring-slate-800 hover:shadow-lg transition-shadow">
              <AvatarImage src="" alt="User avatar" />
              <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white font-bold">
                {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm min-h-[calc(100vh-73px)] sticky top-[73px]">
          <div className="p-4">
            <Button
              variant="ghost"
              className="w-full justify-start mb-6"
              onClick={() => router.push('/home')}
            >
              <Icons.back />
              <span className="ml-2">Back to Home</span>
            </Button>

            <nav className="space-y-1">
              <button
                onClick={() => setActiveSection('getting-started')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeSection === 'getting-started'
                  ? 'bg-[var(--primary)] text-white shadow-md'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                <Icons.home />
                <span className="font-medium">Getting Started</span>
              </button>

              <button
                onClick={() => setActiveSection('documents')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeSection === 'documents'
                  ? 'bg-[var(--primary)] text-white shadow-md'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                <Icons.file />
                <span className="font-medium">Documents</span>
              </button>

              <button
                onClick={() => setActiveSection('collaborators')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeSection === 'collaborators'
                  ? 'bg-[var(--primary)] text-white shadow-md'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                <Icons.users />
                <span className="font-medium">Collaborators</span>
              </button>

              <button
                onClick={() => setActiveSection('schema')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeSection === 'schema'
                  ? 'bg-[var(--primary)] text-white shadow-md'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                <Icons.tag />
                <span className="font-medium">Annotation Schema</span>
              </button>

              <button
                onClick={() => setActiveSection('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${activeSection === 'settings'
                  ? 'bg-[var(--primary)] text-white shadow-md'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                <Icons.settings />
                <span className="font-medium">Settings</span>
              </button>
            </nav>

            {/* Workspace Stats */}
            <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Progress</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Completion</span>
                    <span className="font-bold text-[var(--primary)]">{workspace.progressPercentage}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--primary)] to-purple-600 rounded-full"
                      style={{ width: `${workspace.progressPercentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  <p>{workspace.annotatedDocumentCount} / {workspace.documentCount} documents</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

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
                      <Icons.play />
                    </div>
                    <CardTitle>Open Editor</CardTitle>
                    <CardDescription>
                      Start annotating documents in the annotation editor
                    </CardDescription>
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
                      <Icons.download />
                    </div>
                    <CardTitle>Export Documents</CardTitle>
                    <CardDescription>
                      Download annotated documents in various formats
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">Export</Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                      <Icons.upload />
                    </div>
                    <CardTitle>Import Documents</CardTitle>
                    <CardDescription>
                      Upload new documents to this workspace
                    </CardDescription>
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
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Documents</h2>
                <Button className="gap-2" onClick={() => fileInputRef.current?.click()}>
                  <Icons.upload />
                  {isUploading ? 'Uploading...' : 'Upload Documents'}
                </Button>
              </div>

              {/* Filters and Search */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <svg
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <Input
                      type="search"
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 h-11"
                    />
                  </div>
                </div>
                <Tabs value={documentFilter} onValueChange={(value) => setDocumentFilter(value as typeof documentFilter)} className="w-auto">
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                    <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                    <TabsTrigger value="unannotated">Unannotated</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Documents List */}
              <div className="space-y-3">
                {filteredDocuments.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Icons.file />
                      <p className="text-slate-600 dark:text-slate-400 mt-4">No documents found</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredDocuments.map((doc) => {
                    const statusInfo = getStatusBadge(doc.status);
                    return (
                      <Card key={doc.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <Icons.file />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-white truncate">
                                {doc.name}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mt-1">
                                <span>{formatFileSize(doc.fileSize)}</span>
                                <span>•</span>
                                <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={statusInfo.color}>
                              {statusInfo.label}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/workspace/${workspaceId}/editor`);
                              }}
                            >
                              <Icons.play />
                              {doc.status === 'COMPLETE' ? 'View' : 'Annotate'}
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                  </svg>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleDeleteDocument(doc.id)} className="text-red-600">
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                  </svg>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleDeleteDocument(doc.id)} className="text-red-600">
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeSection === 'collaborators' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Collaborators</h2>
                <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Icons.users />
                      Add Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Member</DialogTitle>
                      <DialogDescription>
                        Invite a user to collaborate on this workspace.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          placeholder="user@example.com"
                          value={newMemberEmail}
                          onChange={(e) => setNewMemberEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select
                          value={newMemberRole}
                          onValueChange={(value) => setNewMemberRole(value as MemberRole)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="CURATOR">Curator</SelectItem>
                            <SelectItem value="ANNOTATOR">Annotator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddMember} disabled={isAddingMember}>
                        {isAddingMember ? 'Adding...' : 'Add Member'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-4">
                {members.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Icons.users />
                      <p className="text-slate-600 dark:text-slate-400 mt-4">No collaborators yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  members.map((member) => (
                    <Card key={member.userId}>
                      <CardContent className="flex items-center justify-between p-6">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src="" alt={member.username} />
                            <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white font-bold">
                              {member.firstName ? member.firstName.charAt(0) : member.username.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {member.firstName} {member.lastName} ({member.username})
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Select
                            value={member.role}
                            onValueChange={(value) => handleUpdateRole(member.userId, value as MemberRole)}
                            disabled={user?.id === member.userId} // Cannot change own role here effectively
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="CURATOR">Curator</SelectItem>
                              <SelectItem value="ANNOTATOR">Annotator</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={user?.id === member.userId}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
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
                    <Icons.tag />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    Coming Soon
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Advanced schema management will be available in the next update.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'settings' && (
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Settings</h2>

              <div className="space-y-6">
                {/* General Settings */}
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
                      <Input
                        value={updatedName}
                        onChange={(e) => setUpdatedName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Description
                      </label>
                      <Input
                        value={updatedDescription}
                        onChange={(e) => setUpdatedDescription(e.target.value)}
                      />
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

                {/* Danger Zone */}
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
      </div >
    </div >
  );
}
