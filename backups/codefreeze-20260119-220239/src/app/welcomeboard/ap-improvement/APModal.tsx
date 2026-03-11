/**
 * @file APModal.tsx
 * @description AP 개선조치 등록/수정 모달 컴포넌트
 * @author AI Assistant
 * @created 2026-01-03
 */

'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { APItem } from './types';

interface APModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: APItem | null;
  onSave?: (item: Partial<APItem>) => void;
}

/**
 * AP 개선조치 등록/수정 모달
 */
export default function APModal({
  isOpen,
  onClose,
  editingItem,
  onSave,
}: APModalProps) {
  const handleSave = () => {
    // TODO: 실제 저장 로직 구현
    onSave?.({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? 'AP 개선조치 수정' : 'AP 개선조치 등록'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {/* AP5 */}
          <div className="space-y-2">
            <Label>AP5</Label>
            <Select defaultValue={editingItem?.ap5 || 'M'}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="H">High</SelectItem>
                <SelectItem value="M">Medium</SelectItem>
                <SelectItem value="L">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* AP6 */}
          <div className="space-y-2">
            <Label>AP6</Label>
            <Select defaultValue={editingItem?.ap6 || 'M'}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="H">High</SelectItem>
                <SelectItem value="M">Medium</SelectItem>
                <SelectItem value="L">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Failure Mode */}
          <div className="space-y-2 col-span-2">
            <Label>Failure Mode</Label>
            <Input defaultValue={editingItem?.failureMode || ''} />
          </div>

          {/* Failure Cause */}
          <div className="space-y-2 col-span-2">
            <Label>Failure Cause</Label>
            <Input defaultValue={editingItem?.failureCause || ''} />
          </div>

          {/* SOD */}
          <div className="space-y-2">
            <Label>Severity (S)</Label>
            <Input
              type="number"
              min={1}
              max={10}
              defaultValue={editingItem?.severity || 5}
            />
          </div>

          <div className="space-y-2">
            <Label>Occurrence (O)</Label>
            <Input
              type="number"
              min={1}
              max={10}
              defaultValue={editingItem?.occurrence || 5}
            />
          </div>

          <div className="space-y-2">
            <Label>Detection (D)</Label>
            <Input
              type="number"
              min={1}
              max={10}
              defaultValue={editingItem?.detection || 5}
            />
          </div>

          {/* 특별특성 */}
          <div className="space-y-2">
            <Label>특별특성</Label>
            <Select defaultValue={editingItem?.specialChar || ''}>
              <SelectTrigger>
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">없음</SelectItem>
                <SelectItem value="CC">CC</SelectItem>
                <SelectItem value="SC">SC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="space-y-2 col-span-2">
            <Label>Prevention Action</Label>
            <Input defaultValue={editingItem?.preventionAction || ''} />
          </div>

          <div className="space-y-2 col-span-2">
            <Label>Detection Action</Label>
            <Input defaultValue={editingItem?.detectionAction || ''} />
          </div>

          {/* 담당자/일정 */}
          <div className="space-y-2">
            <Label>담당자</Label>
            <Input defaultValue={editingItem?.responsible || ''} />
          </div>

          <div className="space-y-2">
            <Label>완료예정일</Label>
            <Input type="date" defaultValue={editingItem?.dueDate || ''} />
          </div>

          {/* 상태 */}
          <div className="space-y-2">
            <Label>상태</Label>
            <Select defaultValue={editingItem?.status || '대기'}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="대기">대기</SelectItem>
                <SelectItem value="진행중">진행중</SelectItem>
                <SelectItem value="완료">완료</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            className="bg-[#00587a] hover:bg-[#004560]"
            onClick={handleSave}
          >
            {editingItem ? '수정' : '등록'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

















