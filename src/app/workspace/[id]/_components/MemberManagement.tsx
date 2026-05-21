'use client';

import { useState } from 'react';
import { Trash2, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MemberResponse, MemberRole } from '@/lib/api';
import { isOneOf } from '@/lib/utils';

const MEMBER_ROLES: readonly MemberRole[] = ['ADMIN', 'CURATOR', 'ANNOTATOR'];

interface MemberManagementProps {
  members: MemberResponse[];
  isAdmin: boolean;
  currentUserId?: string;
  onAddMember: (email: string, role: MemberRole) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  onUpdateRole: (userId: string, role: MemberRole) => Promise<void>;
}

export function MemberManagement({
  members,
  isAdmin,
  currentUserId,
  onAddMember,
  onRemoveMember,
  onUpdateRole,
}: MemberManagementProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('ANNOTATOR');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!email) return;
    setIsAdding(true);
    try {
      await onAddMember(email, role);
      setIsAddOpen(false);
      setEmail('');
      setRole('ANNOTATOR');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Collaborators</h2>
        {isAdmin && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Users className="w-5 h-5" />
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={role}
                    onValueChange={(value) => { if (isOneOf(value, MEMBER_ROLES)) setRole(value); }}
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
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={isAdding}>
                  {isAdding ? 'Adding...' : 'Add Member'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {members.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-5 h-5 mx-auto text-slate-400" />
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
                    onValueChange={(value) => { if (isOneOf(value, MEMBER_ROLES)) onUpdateRole(member.userId, value); }}
                    disabled={!isAdmin || currentUserId === member.userId}
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

                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => onRemoveMember(member.userId)}
                      disabled={currentUserId === member.userId}
                      aria-label="Remove member"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
