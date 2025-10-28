'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

// Mock data for recent workspaces
const recentWorkspaces = [
  {
    id: 1,
    name: 'Customer Sentiment Analysis',
    type: 'Sentiment Analysis',
    lastModified: '2 hours ago',
    progress: 65,
    documents: 245,
    annotated: 159,
  },
  {
    id: 2,
    name: 'Medical Entity Recognition',
    type: 'Named Entity Recognition',
    lastModified: 'Yesterday',
    progress: 42,
    documents: 180,
    annotated: 76,
  },
  {
    id: 3,
    name: 'Legal Document Classification',
    type: 'Text Classification',
    lastModified: '3 days ago',
    progress: 88,
    documents: 420,
    annotated: 370,
  },
  {
    id: 4,
    name: 'News Relation Extraction',
    type: 'Relation Extraction',
    lastModified: '1 week ago',
    progress: 25,
    documents: 500,
    annotated: 125,
  },
];

// Mock data for all workspaces (includes more workspaces)
const allWorkspaces = [
  ...recentWorkspaces,
  {
    id: 5,
    name: 'Social Media Monitor',
    type: 'Sentiment Analysis',
    lastModified: '2 weeks ago',
    progress: 55,
    documents: 300,
    annotated: 165,
  },
  {
    id: 6,
    name: 'Product Review Analysis',
    type: 'Text Classification',
    lastModified: '3 weeks ago',
    progress: 70,
    documents: 150,
    annotated: 105,
  },
  {
    id: 7,
    name: 'Research Paper Extraction',
    type: 'Relation Extraction',
    lastModified: '1 month ago',
    progress: 30,
    documents: 200,
    annotated: 60,
  },
  {
    id: 8,
    name: 'Email Classification',
    type: 'Text Classification',
    lastModified: '1 month ago',
    progress: 45,
    documents: 350,
    annotated: 158,
  },
];

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewWorkspaceOpen, setIsNewWorkspaceOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [workspaceType, setWorkspaceType] = useState('');

  const handleCreateWorkspace = () => {
    // Handle workspace creation logic here
    console.log('Creating workspace:', { workspaceName, workspaceDescription, workspaceType });
    setIsNewWorkspaceOpen(false);
    // Reset form
    setWorkspaceName('');
    setWorkspaceDescription('');
    setWorkspaceType('');
  };

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
              className="h-10 w-auto"
            />
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Top Section - Search and New Project */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between mb-8">
            <div>
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
                Welcome back, John
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                Continue your annotation work or start a new workspace
              </p>
            </div>
            <div className="flex gap-3">
              <Button size="lg" variant="outline" className="gap-2 shadow-sm hover:shadow-md">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Import Workspace
              </Button>
              <Dialog open={isNewWorkspaceOpen} onOpenChange={setIsNewWorkspaceOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Workspace
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>Create New Workspace</DialogTitle>
                    <DialogDescription>
                      Set up a new annotation workspace. Choose a name, description, and annotation type.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-5 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name" className="font-medium">Workspace Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Customer Feedback Analysis"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description" className="font-medium">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe the purpose of this workspace..."
                        value={workspaceDescription}
                        onChange={(e) => setWorkspaceDescription(e.target.value)}
                        rows={3}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="type" className="font-medium">Annotation Type</Label>
                      <Select value={workspaceType} onValueChange={setWorkspaceType}>
                        <SelectTrigger id="type" className="h-11 rounded-xl">
                          <SelectValue placeholder="Select annotation type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ner">Named Entity Recognition</SelectItem>
                          <SelectItem value="sentiment">Sentiment Analysis</SelectItem>
                          <SelectItem value="classification">Text Classification</SelectItem>
                          <SelectItem value="relation">Relation Extraction</SelectItem>
                          <SelectItem value="custom">Custom Annotation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsNewWorkspaceOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateWorkspace} disabled={!workspaceName || !workspaceType}>
                      Create Workspace
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-2xl">
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
              placeholder="Search workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-xl shadow-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="recent">Recent Workspaces</TabsTrigger>
            <TabsTrigger value="all">All Workspaces</TabsTrigger>
          </TabsList>

          <TabsContent value="recent">
            {/* Workspaces Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentWorkspaces
                .filter((workspace) => workspace.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((workspace) => (
            <Card
              key={workspace.id}
              className="hover:shadow-xl hover:shadow-[var(--primary)]/10 transition-all duration-300 cursor-pointer group border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:scale-[1.02] hover:border-[var(--primary)]/30"
              onClick={() => router.push(`/workspace/${workspace.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--primary)] via-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[var(--primary)]/20">
                    {workspace.name.charAt(0)}
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                    <svg className="w-5 h-5 text-slate-400 hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
                <CardTitle className="text-lg font-bold">{workspace.name}</CardTitle>
                <CardDescription className="text-sm">{workspace.type}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Progress</span>
                      <span className="font-bold text-[var(--primary)] dark:text-[var(--primary-light)]">{workspace.progress}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--primary)] to-purple-600 rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: `${workspace.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm pt-1">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      {workspace.annotated} / {workspace.documents} documents
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {workspace.lastModified}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
                ))}
            </div>

            {/* Empty State */}
            {recentWorkspaces.filter((workspace) => workspace.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-slate-800 dark:to-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
                  <svg className="w-10 h-10 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  No workspaces found
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                  Try adjusting your search or create a new workspace to get started
                </p>
                <Button size="lg">Create New Workspace</Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            {/* Workspaces Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allWorkspaces
                .filter((workspace) => workspace.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((workspace) => (
            <Card
              key={workspace.id}
              className="hover:shadow-xl hover:shadow-[var(--primary)]/10 transition-all duration-300 cursor-pointer group border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:scale-[1.02] hover:border-[var(--primary)]/30"
              onClick={() => router.push(`/workspace/${workspace.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--primary)] via-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[var(--primary)]/20">
                    {workspace.name.charAt(0)}
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                    <svg className="w-5 h-5 text-slate-400 hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
                <CardTitle className="text-lg font-bold">{workspace.name}</CardTitle>
                <CardDescription className="text-sm">{workspace.type}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Progress</span>
                      <span className="font-bold text-[var(--primary)] dark:text-[var(--primary-light)]">{workspace.progress}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--primary)] to-purple-600 rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: `${workspace.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm pt-1">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      {workspace.annotated} / {workspace.documents} documents
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {workspace.lastModified}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
                ))}
            </div>

            {/* Empty State */}
            {allWorkspaces.filter((workspace) => workspace.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-slate-800 dark:to-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
                  <svg className="w-10 h-10 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  No workspaces found
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                  Try adjusting your search or create a new workspace to get started
                </p>
                <Button size="lg">Create New Workspace</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
