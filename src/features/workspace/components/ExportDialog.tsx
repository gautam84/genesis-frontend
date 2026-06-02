'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Column2Mode, ExportFormat } from '@/features/workspace/export.contracts';
import { isOneOf } from '@/lib/utils';

const EXPORT_FORMATS = Object.values(ExportFormat) as readonly ExportFormat[];
const COLUMN2_MODES = Object.values(Column2Mode) as readonly Column2Mode[];

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetIsDocument: boolean;
  format: ExportFormat;
  onChangeFormat: (format: ExportFormat) => void;
  column2Mode: Column2Mode;
  onChangeColumn2Mode: (mode: Column2Mode) => void;
  isExporting: boolean;
  onExport: () => void;
}

export function ExportDialog({
  open,
  onOpenChange,
  targetIsDocument,
  format,
  onChangeFormat,
  column2Mode,
  onChangeColumn2Mode,
  isExporting,
  onExport,
}: ExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{targetIsDocument ? 'Export Document' : 'Export Workspace'}</DialogTitle>
          <DialogDescription>Choose export options.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!targetIsDocument && (
            <div className="space-y-2">
              <Label htmlFor="exportFormat">Export Format</Label>
              <Select
                value={format}
                onValueChange={(value) => { if (isOneOf(value, EXPORT_FORMATS)) onChangeFormat(value); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ExportFormat.SEPARATE_FILES_ZIP}>CoNLL-2012 (Zip)</SelectItem>
                  <SelectItem value={ExportFormat.MERGED_SINGLE_FILE}>CoNLL-2012 (Merged)</SelectItem>
                  <SelectItem value={ExportFormat.SEPARATE_FILES_ZIP_WITH_MERGED}>CoNLL-2012 (Zip + Merged)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="column2Mode">Column 2 Mode</Label>
            <Select
              value={column2Mode}
              onValueChange={(value) => { if (isOneOf(value, COLUMN2_MODES)) onChangeColumn2Mode(value); }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Column2Mode.PART_NUMBER}>Part Number</SelectItem>
                <SelectItem value={Column2Mode.SENTENCE_NUMBER}>Sentence Number</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
