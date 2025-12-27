'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthGuard } from '@/components/auth-guard';

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

// Mock workspace data
const workspaceData = {
  1: {
    name: 'Customer Sentiment Analysis',
    type: 'Sentiment Analysis',
    description: 'Analyze customer feedback and reviews to understand sentiment patterns',
    progress: 65,
    documents: 245,
    annotated: 159,
    collaborators: [
      { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', avatar: '' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Annotator', avatar: '' },
      { id: 3, name: 'Bob Wilson', email: 'bob@example.com', role: 'Annotator', avatar: '' },
      { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'Viewer', avatar: '' },
    ],
    documentsList: [
      { id: 1, name: 'customer_review_001.txt', status: 'completed', annotator: 'Jane Smith', date: '2024-01-15', size: '2.3 KB' },
      { id: 2, name: 'customer_review_002.txt', status: 'completed', annotator: 'Bob Wilson', date: '2024-01-15', size: '1.8 KB' },
      { id: 3, name: 'customer_review_003.txt', status: 'in-progress', annotator: 'Jane Smith', date: '2024-01-16', size: '3.1 KB' },
      { id: 4, name: 'customer_review_004.txt', status: 'unannotated', annotator: null, date: '2024-01-16', size: '2.7 KB' },
      { id: 5, name: 'customer_review_005.txt', status: 'unannotated', annotator: null, date: '2024-01-16', size: '1.9 KB' },
      { id: 6, name: 'customer_review_006.txt', status: 'completed', annotator: 'Bob Wilson', date: '2024-01-17', size: '2.1 KB' },
      { id: 7, name: 'customer_review_007.txt', status: 'in-progress', annotator: 'Jane Smith', date: '2024-01-17', size: '2.5 KB' },
      { id: 8, name: 'customer_review_008.txt', status: 'unannotated', annotator: null, date: '2024-01-17', size: '3.4 KB' },
    ],
    annotationLayers: [
      {
        id: 1,
        name: 'Sentiment',
        type: 'span',
        description: 'Mark sentiment expressions in text',
        labels: [
          { id: 1, name: 'Positive', color: '#10b981', shortcut: 'P' },
          { id: 2, name: 'Negative', color: '#ef4444', shortcut: 'N' },
          { id: 3, name: 'Neutral', color: '#6b7280', shortcut: 'U' },
          { id: 4, name: 'Mixed', color: '#f59e0b', shortcut: 'M' },
        ],
      },
      {
        id: 2,
        name: 'Entities',
        type: 'span',
        description: 'Named entity recognition',
        labels: [
          { id: 5, name: 'Product', color: '#3b82f6', shortcut: 'R' },
          { id: 6, name: 'Feature', color: '#8b5cf6', shortcut: 'F' },
          { id: 7, name: 'Company', color: '#ec4899', shortcut: 'C' },
        ],
      },
    ],
  },
};

type SidebarItem = 'getting-started' | 'documents' | 'collaborators' | 'schema' | 'settings';

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const workspace = workspaceData[1];

  const [activeSection, setActiveSection] = useState<SidebarItem>('getting-started');
  const [documentFilter, setDocumentFilter] = useState<'all' | 'completed' | 'in-progress' | 'unannotated'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter documents
  const filteredDocuments = workspace?.documentsList?.filter((doc) => {
    const matchesFilter = documentFilter === 'all' || doc.status === documentFilter;
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  }) || [];

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return { variant: 'default' as const, label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' };
      case 'in-progress':
        return { variant: 'secondary' as const, label: 'In Progress', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' };
      case 'unannotated':
        return { variant: 'secondary' as const, label: 'Unannotated', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
      default:
        return { variant: 'secondary' as const, label: status, color: '' };
    }
  };

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
              <p className="text-sm text-slate-600 dark:text-slate-400">{workspace.type}</p>
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
                JD
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                  activeSection === 'getting-started'
                    ? 'bg-[var(--primary)] text-white shadow-md'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icons.home />
                <span className="font-medium">Getting Started</span>
              </button>

              <button
                onClick={() => setActiveSection('documents')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                  activeSection === 'documents'
                    ? 'bg-[var(--primary)] text-white shadow-md'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icons.file />
                <span className="font-medium">Documents</span>
              </button>

              <button
                onClick={() => setActiveSection('collaborators')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                  activeSection === 'collaborators'
                    ? 'bg-[var(--primary)] text-white shadow-md'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icons.users />
                <span className="font-medium">Collaborators</span>
              </button>

              <button
                onClick={() => setActiveSection('schema')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                  activeSection === 'schema'
                    ? 'bg-[var(--primary)] text-white shadow-md'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icons.tag />
                <span className="font-medium">Annotation Schema</span>
              </button>

              <button
                onClick={() => setActiveSection('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                  activeSection === 'settings'
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
                    <span className="font-bold text-[var(--primary)]">{workspace.progress}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--primary)] to-purple-600 rounded-full"
                      style={{ width: `${workspace.progress}%` }}
                    />
                  </div>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  <p>{workspace.annotated} / {workspace.documents} documents</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
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
                    <Button variant="outline" className="w-full">Import</Button>
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
                        <span className="font-bold text-lg">{workspace.documents}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Annotated</span>
                        <span className="font-bold text-lg text-green-600">{workspace.annotated}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Remaining</span>
                        <span className="font-bold text-lg text-orange-600">{workspace.documents - workspace.annotated}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Team Members</span>
                        <span className="font-bold text-lg">{workspace.collaborators.length}</span>
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
                <Button className="gap-2">
                  <Icons.upload />
                  Upload Documents
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
                                <span>{doc.size}</span>
                                <span>•</span>
                                <span>{doc.date}</span>
                                {doc.annotator && (
                                  <>
                                    <span>•</span>
                                    <span>{doc.annotator}</span>
                                  </>
                                )}
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
                              {doc.status === 'completed' ? 'View' : 'Annotate'}
                            </Button>
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
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Collaborators</h2>
              <div className="space-y-4">
                {workspace.collaborators.map((collaborator) => (
                  <Card key={collaborator.id}>
                    <CardContent className="flex items-center justify-between p-6">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={collaborator.avatar} alt={collaborator.name} />
                          <AvatarFallback className="bg-gradient-to-br from-[var(--primary)] to-purple-600 text-white font-bold">
                            {collaborator.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{collaborator.name}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{collaborator.email}</p>
                        </div>
                      </div>
                      <Badge variant={collaborator.role === 'Admin' ? 'default' : 'secondary'}>
                        {collaborator.role}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'schema' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Annotation Schema</h2>
                <Button className="gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Layer
                </Button>
              </div>

              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Define annotation layers and labels for your workspace. Each layer can have multiple labels with custom colors and keyboard shortcuts.
              </p>

              <div className="space-y-6">
                {workspace.annotationLayers?.map((layer) => (
                  <Card key={layer.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {layer.name}
                            <Badge variant="secondary" className="text-xs font-normal">
                              {layer.type}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="mt-2">{layer.description}</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Labels ({layer.labels.length})
                          </h4>
                          <Button variant="outline" size="sm" className="h-8 gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Label
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {layer.labels.map((label) => (
                            <div
                              key={label.id}
                              className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-8 h-8 rounded-md"
                                  style={{ backgroundColor: label.color }}
                                />
                                <div>
                                  <p className="font-medium text-slate-900 dark:text-white">
                                    {label.name}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Shortcut: {label.shortcut}
                                  </p>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Empty State if no layers */}
                {(!workspace.annotationLayers || workspace.annotationLayers.length === 0) && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Icons.tag />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        No annotation layers yet
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Create your first annotation layer to start defining labels for your workspace
                      </p>
                      <Button>Add Your First Layer</Button>
                    </CardContent>
                  </Card>
                )}
              </div>
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
                      <Input defaultValue={workspace.name} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Description
                      </label>
                      <Input defaultValue={workspace.description} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Annotation Type
                      </label>
                      <Input defaultValue={workspace.type} disabled className="bg-slate-100 dark:bg-slate-800" />
                      <p className="text-xs text-slate-500">Annotation type cannot be changed after creation</p>
                    </div>

                    <div className="pt-4">
                      <Button>Save Changes</Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Export Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Export Preferences</CardTitle>
                    <CardDescription>Configure default export settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Default Export Format
                      </label>
                      <select className="w-full h-11 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm">
                        <option>JSON</option>
                        <option>CoNLL</option>
                        <option>WebAnno TSV</option>
                        <option>CSV</option>
                        <option>UIMA CAS XMI</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Include metadata</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Export document metadata along with annotations
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                        defaultChecked
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Include annotator information</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Add annotator names and timestamps to exported data
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                        defaultChecked
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Collaboration Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Collaboration</CardTitle>
                    <CardDescription>Manage workspace permissions and access</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Allow new members</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Members can invite others to this workspace
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                        defaultChecked
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Require review</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Annotations must be reviewed before marking as complete
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-red-200 dark:border-red-900">
                  <CardHeader>
                    <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                    <CardDescription>Irreversible actions</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
                      <div>
                        <p className="font-medium text-red-900 dark:text-red-200">Archive Workspace</p>
                        <p className="text-sm text-red-700 dark:text-red-400">
                          Archive this workspace and all its data
                        </p>
                      </div>
                      <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-100 dark:border-red-800 dark:text-red-400">
                        Archive
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
                      <div>
                        <p className="font-medium text-red-900 dark:text-red-200">Delete Workspace</p>
                        <p className="text-sm text-red-700 dark:text-red-400">
                          Permanently delete this workspace and all annotations
                        </p>
                      </div>
                      <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-100 dark:border-red-800 dark:text-red-400">
                        Delete
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
    </AuthGuard>
  );
}
