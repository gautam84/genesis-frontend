'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { WsdSense } from '@/lib/api';
import {
  createSenseAction,
  deleteSenseAction,
  updateSenseAction,
} from '@/lib/actions/wsd';

type Props = {
  workspaceId: string;
  initialSenses: WsdSense[];
};

export function WsdSensesClient({ workspaceId, initialSenses }: Props) {
  const router = useRouter();

  const [senses, setSenses] = useState<WsdSense[]>(initialSenses);
  const [error, setError] = useState<string | null>(null);

  const [newWord, setNewWord] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWord, setEditWord] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || !newLabel.trim()) return;
    setSubmitting(true);
    setError(null);
    const result = await createSenseAction(workspaceId, {
      word: newWord.trim(),
      senseLabel: newLabel.trim(),
      description: newDescription.trim() || null,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSenses((prev) => [...prev, result.data]);
    setNewWord('');
    setNewLabel('');
    setNewDescription('');
  };

  const startEdit = (sense: WsdSense) => {
    setEditingId(sense.id);
    setEditWord(sense.word);
    setEditLabel(sense.senseLabel);
    setEditDescription(sense.description ?? '');
  };

  const cancelEdit = () => setEditingId(null);

  const handleSaveEdit = async (senseId: string) => {
    setError(null);
    const result = await updateSenseAction(workspaceId, senseId, {
      word: editWord.trim(),
      senseLabel: editLabel.trim(),
      description: editDescription.trim() || null,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSenses((prev) => prev.map((s) => (s.id === senseId ? result.data : s)));
    setEditingId(null);
  };

  const handleDelete = async (senseId: string) => {
    if (!confirm('Delete this sense? Backend rejects with 409 if annotations reference it.')) {
      return;
    }
    setError(null);
    const result = await deleteSenseAction(workspaceId, senseId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSenses((prev) => prev.filter((s) => s.id !== senseId));
  };

  const grouped: Record<string, WsdSense[]> = {};
  for (const s of senses) {
    if (!grouped[s.word]) grouped[s.word] = [];
    grouped[s.word].push(s);
  }
  const words = Object.keys(grouped).sort();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/workspace/${workspaceId}/editor`)}>
            ← Back to editor
          </Button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Sense Inventory <span className="text-slate-400">(admin only)</span>
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {error && (
          <Card className="border-red-300 bg-red-50 dark:bg-red-950/30">
            <CardContent className="p-4">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-3">Add a sense</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Word (e.g. bank)"
                  value={newWord}
                  onChange={e => setNewWord(e.target.value)}
                  required
                />
                <Input
                  placeholder="Sense label (e.g. financial-institution)"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  required
                />
              </div>
              <Textarea
                placeholder="Description (optional)"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
              />
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Adding…' : 'Add sense'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-3">Existing senses</h2>
            {words.length === 0 && (
              <p className="text-sm text-slate-500">No senses defined yet.</p>
            )}
            {words.map(word => (
              <div key={word} className="mb-4 last:mb-0">
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{word}</div>
                <div className="space-y-2">
                  {grouped[word].map(sense => {
                    const editing = editingId === sense.id;
                    return (
                      <div
                        key={sense.id}
                        className="rounded border border-slate-200 dark:border-slate-700 p-3"
                      >
                        {editing ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                value={editWord}
                                onChange={e => setEditWord(e.target.value)}
                              />
                              <Input
                                value={editLabel}
                                onChange={e => setEditLabel(e.target.value)}
                              />
                            </div>
                            <Textarea
                              value={editDescription}
                              onChange={e => setEditDescription(e.target.value)}
                              placeholder="Description"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleSaveEdit(sense.id)}>
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-slate-900 dark:text-white">
                                {sense.senseLabel}
                              </div>
                              {sense.description && (
                                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                  {sense.description}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <Button size="sm" variant="outline" onClick={() => startEdit(sense)}>
                                Edit
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDelete(sense.id)}>
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
