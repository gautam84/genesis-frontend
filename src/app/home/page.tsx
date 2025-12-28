'use client';

import { useState, useEffect } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth, useRequireAuth } from '@/lib/auth';
import { workspaceApi, WorkspaceResponse, AnnotationType, CreateWorkspaceRequest } from '@/lib/api';
import { LogOut, Settings, User, MoreVertical, Trash, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday, subDays, isAfter, format } from 'date-fns';
import { NotificationDropdown } from '@/components/NotificationDropdown';

export default function HomePage() {
  const router = useRouter();
  const { user, logout, isLoading: authLoading } = useAuth();
  const { isLoading: requireAuthLoading } = useRequireAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceResponse[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewWorkspaceOpen, setIsNewWorkspaceOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [workspaceType, setWorkspaceType] = useState<string>('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<WorkspaceResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      loadWorkspaces();
    }
  }, [user]);

  const loadWorkspaces = async () => {
    try {
      setLoadingWorkspaces(true);
      const response = await workspaceApi.list();
      setWorkspaces(response.data);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!workspaceName || !workspaceType) return;

    try {
      setIsCreating(true);
      const request: CreateWorkspaceRequest = {
        name: workspaceName,
        description: workspaceDescription,
        annotationType: workspaceType as AnnotationType,
      };

      await workspaceApi.create(request);
      await loadWorkspaces();
      setIsNewWorkspaceOpen(false);

      // Reset form
      setWorkspaceName('');
      setWorkspaceDescription('');
      setWorkspaceType('');
    } catch (error) {
      console.error('Failed to create workspace:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // const handleDeleteWorkspace = async () => {
  //   if (!workspaceToDelete) return;
  //   setIsDeleting(true);
  //   try {
  //     await workspaceApi.delete(workspaceToDelete.id);
  //     setWorkspaces(workspaces.filter(w => w.id !== workspaceToDelete.id));
  //     setWorkspaceToDelete(null);
  //   } catch (error) {
  //     console.error('Failed to delete workspace:', error);
  //   } finally {
  //     setIsDeleting(false);
  //   }
  // };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Show loading while checking auth
  if (authLoading || requireAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-[var(--primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg text-slate-600 dark:text-slate-400">Loading...</span>
        </div>
      </div>
    );
  }

  // Get user initials for avatar
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

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    // If today, show relative time (e.g., "5 minutes ago")
    if (isToday(date)) {
      return formatDistanceToNow(date, { addSuffix: true });
    }

    // If yesterday, show "Yesterday"
    if (isYesterday(date)) {
      return 'Yesterday';
    }

    // If less than 7 days ago (or whatever threshold), show relative (e.g. "3 days ago")
    if (isAfter(date, subDays(now, 7))) {
      return formatDistanceToNow(date, { addSuffix: true });
    }

    // Otherwise show standard date
    return format(date, 'MMM d, yyyy');
  };

  const filteredWorkspaces = workspaces.filter((workspace) =>
    workspace.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentWorkspaces = [...workspaces]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  const renderWorkspaceCard = (workspace: WorkspaceResponse) => (
    <Card
      key={workspace.id}
      className="hover:shadow-xl hover:shadow-[var(--primary)]/10 transition-all duration-300 cursor-pointer group border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:scale-[1.02] hover:border-[var(--primary)]/30"
      onClick={() => router.push(`/workspace/${workspace.id}`)}
    >
      <CardHeader>
        <div className="flex items-start justify-between mb-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--primary)] via-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[var(--primary)]/20">
            {workspace.name.charAt(0).toUpperCase()}
          </div>
          {/* <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg focus:opacity-100">
                  <MoreVertical className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-red-600 cursor-pointer focus:text-red-600"
                  onClick={() => setWorkspaceToDelete(workspace)}
                >
                  <Trash className="w-4 h-4 mr-2" />
                  Delete Workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div> */}
        </div>
        <div className="flex flex-col gap-1">
          <CardTitle className="text-lg font-bold">{workspace.name}</CardTitle>
          <CardDescription className="text-sm">{workspace.annotationType}</CardDescription>
          {workspace.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-1" title={workspace.description}>
              {workspace.description}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Progress</span>
              <span className="font-bold text-[var(--primary)] dark:text-[var(--primary-light)]">{workspace.progressPercentage}%</span>
            </div>
            <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--primary)] to-purple-600 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${workspace.progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm pt-1">
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              {workspace.annotatedDocumentCount} / {workspace.documentCount} documents
            </span>
            <Badge variant="secondary" className="text-xs">
              Updated {formatLastUpdated(workspace.updatedAt)}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card >
  );

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
            <NotificationDropdown />

            {/* User Dropdown */}
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Top Section - Search and New Project */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between mb-8">
            <div>
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
                Welcome back, {user?.firstName || user?.username || 'User'}
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
                          <SelectItem value="COREF">Coreference Resolution</SelectItem>
                          <SelectItem value="NER">Named Entity Recognition</SelectItem>
                          <SelectItem value="POS">Part-of-Speech Tagging</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsNewWorkspaceOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateWorkspace} disabled={!workspaceName || !workspaceType || isCreating}>
                      {isCreating ? 'Creating...' : 'Create Workspace'}
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
            {loadingWorkspaces ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse h-[200px] bg-slate-100 dark:bg-slate-800 border-none" />
                ))}
              </div>
            ) : (
              <>
                {/* Recent Workspaces Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recentWorkspaces.map(renderWorkspaceCard)}
                </div>

                {/* Empty State */}
                {recentWorkspaces.length === 0 && (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-slate-800 dark:to-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
                      <svg className="w-10 h-10 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                      No recent workspaces
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                      Start working on a workspace and it will appear here
                    </p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="all">
            {loadingWorkspaces ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse h-[200px] bg-slate-100 dark:bg-slate-800 border-none" />
                ))}
              </div>
            ) : (
              <>
                {/* Workspaces Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredWorkspaces.map(renderWorkspaceCard)}
                </div>

                {/* Empty State */}
                {filteredWorkspaces.length === 0 && (
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
                    <Button size="lg" onClick={() => setIsNewWorkspaceOpen(true)}>Create New Workspace</Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      {/* <Dialog open={!!workspaceToDelete} onOpenChange={(open) => !open && setWorkspaceToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Workspace
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete workspace &quot;{workspaceToDelete?.name}&quot;? This action cannot be undone and will delete all documents and annotations within this workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkspaceToDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteWorkspace} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}
    </div>
  );
}
