/**
 * @file APModal.tsx
 * @description AP 개선조치 수정 모달 — FMEA 분석결과 연동
 * @version 2.0.0
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { APItem, APStatus } from './types';
import { calculateAP } from '@/app/(fmea-core)/pfmea/worksheet/tabs/all/apCalculator';
import {
  getImprovementRecommendation,
  getImprovementPriority,
  getTargetScore,
} from '@/app/(fmea-core)/pfmea/worksheet/tabs/all/hooks/improvementMap';

interface APModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: APItem | null;
  onSave?: (riskId: string, updates: Partial<APItem>) => Promise<void>;
}

export default function APModal({ isOpen, onClose, editingItem, onSave }: APModalProps) {
  // 편집 가능 필드 state
  const [preventionAction, setPreventionAction] = useState('');
  const [detectionAction, setDetectionAction] = useState('');
  const [responsible, setResponsible] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<APStatus>('대기');
  const [newS, setNewS] = useState<number | ''>('');
  const [newO, setNewO] = useState<number | ''>('');
  const [newD, setNewD] = useState<number | ''>('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  // editingItem이 변경되면 폼 초기화
  useEffect(() => {
    if (editingItem) {
      setPreventionAction(editingItem.preventionAction || '');
      setDetectionAction(editingItem.detectionAction || '');
      setResponsible(editingItem.responsible || '');
      setDueDate(editingItem.dueDate || '');
      setStatus(editingItem.status || '대기');
      setNewS(editingItem.newSeverity || '');
      setNewO(editingItem.newOccurrence || '');
      setNewD(editingItem.newDetection || '');
      setRemarks(editingItem.remarks || '');
    }
  }, [editingItem]);

  // 최적화 AP 실시간 계산
  const newAP = useMemo(() => {
    const s = typeof newS === 'number' ? newS : (editingItem?.severity || 0);
    const o = typeof newO === 'number' ? newO : (editingItem?.occurrence || 0);
    const d = typeof newD === 'number' ? newD : (editingItem?.detection || 0);
    if (s > 0 && o > 0 && d > 0) return calculateAP(s, o, d);
    return '';
  }, [newS, newO, newD, editingItem]);

  // AIAG-VDA 기준 개선 추천
  const recommendation = useMemo(() => {
    if (!editingItem) return null;
    const { severity: S, occurrence: O, detection: D, ap5 } = editingItem;
    if (!S || !O || !D || (ap5 !== 'H' && ap5 !== 'M')) return null;

    const priority = getImprovementPriority(S, O, D, ap5);
    const oRec = getImprovementRecommendation(O, 'O');
    const dRec = getImprovementRecommendation(D, 'D');
    const targetO = getTargetScore(O, 'O');
    const targetD = getTargetScore(D, 'D');

    return { priority, oRec, dRec, targetO, targetD };
  }, [editingItem]);

  const handleSave = async () => {
    if (!editingItem || !onSave) return;
    setSaving(true);
    try {
      await onSave(editingItem.riskId, {
        preventionAction,
        detectionAction,
        responsible,
        dueDate,
        status,
        newSeverity: typeof newS === 'number' ? newS : undefined,
        newOccurrence: typeof newO === 'number' ? newO : undefined,
        newDetection: typeof newD === 'number' ? newD : undefined,
        remarks,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!editingItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#00587a]">AP 개선조치 수정</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 읽기 전용 영역: 5단계 분석 결과 */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <h4 className="text-[11px] font-bold text-slate-500 mb-2">5단계 분석 결과 (읽기 전용)</h4>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-[10px] text-gray-400">AP (5단계)</Label>
                <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold ${editingItem.ap5 === 'H' ? 'bg-red-500' : editingItem.ap5 === 'M' ? 'bg-orange-500' : 'bg-green-500'}`}>
                  {editingItem.ap5}
                </div>
              </div>
              <div>
                <Label className="text-[10px] text-gray-400">S</Label>
                <div className="mt-1 text-sm font-bold">{editingItem.severity}</div>
              </div>
              <div>
                <Label className="text-[10px] text-gray-400">O</Label>
                <div className="mt-1 text-sm font-bold">{editingItem.occurrence}</div>
              </div>
              <div>
                <Label className="text-[10px] text-gray-400">D</Label>
                <div className="mt-1 text-sm font-bold">{editingItem.detection}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <Label className="text-[10px] text-gray-400">Failure Mode</Label>
                <div className="mt-1 text-[11px] text-gray-700 truncate">{editingItem.failureMode || '-'}</div>
              </div>
              <div>
                <Label className="text-[10px] text-gray-400">Failure Cause</Label>
                <div className="mt-1 text-[11px] text-gray-700 truncate">{editingItem.failureCause || '-'}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <Label className="text-[10px] text-gray-400">예방관리 (현재)</Label>
                <div className="mt-1 text-[11px] text-gray-700">{editingItem.preventiveControl || '-'}</div>
              </div>
              <div>
                <Label className="text-[10px] text-gray-400">검출관리 (현재)</Label>
                <div className="mt-1 text-[11px] text-gray-700">{editingItem.detectionControl || '-'}</div>
              </div>
            </div>
          </div>

          {/* AIAG-VDA 개선 추천 */}
          {recommendation && (
            <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200">
              <h4 className="text-[11px] font-bold text-amber-700 mb-2">
                AIAG-VDA 개선 추천
                <span className="ml-2 text-[10px] font-normal text-amber-500">
                  (우선: {recommendation.priority.priority === 'both' ? '예방+검출'
                    : recommendation.priority.priority === 'prevention' ? '예방관리' : '검출관리'})
                </span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {recommendation.priority.prevention && recommendation.oRec && (
                  <div>
                    <div className="text-[10px] font-bold text-blue-600 mb-1">
                      예방관리 (O: {editingItem?.occurrence} → {recommendation.targetO})
                    </div>
                    <ul className="space-y-0.5">
                      {recommendation.oRec.recommendations.map((r, i) => (
                        <li key={i} className="text-[10px] text-gray-700 pl-2 border-l-2 border-blue-200">{r}</li>
                      ))}
                    </ul>
                    <div className="text-[9px] text-gray-400 mt-1">{recommendation.oRec.rationale}</div>
                  </div>
                )}
                {recommendation.priority.detection && recommendation.dRec && (
                  <div>
                    <div className="text-[10px] font-bold text-green-600 mb-1">
                      검출관리 (D: {editingItem?.detection} → {recommendation.targetD})
                    </div>
                    <ul className="space-y-0.5">
                      {recommendation.dRec.recommendations.map((r, i) => (
                        <li key={i} className="text-[10px] text-gray-700 pl-2 border-l-2 border-green-200">{r}</li>
                      ))}
                    </ul>
                    <div className="text-[9px] text-gray-400 mt-1">{recommendation.dRec.rationale}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 편집 가능 영역: 6단계 개선조치 */}
          <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-200">
            <h4 className="text-[11px] font-bold text-[#00587a] mb-2">6단계 개선조치 (편집)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-[10px]">예방 개선조치</Label>
                <Input
                  value={preventionAction}
                  onChange={(e) => setPreventionAction(e.target.value)}
                  placeholder="예방관리 개선조치 입력"
                  className="h-8 text-[11px]"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-[10px]">검출 개선조치</Label>
                <Input
                  value={detectionAction}
                  onChange={(e) => setDetectionAction(e.target.value)}
                  placeholder="검출관리 개선조치 입력"
                  className="h-8 text-[11px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">담당자</Label>
                <Input
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  placeholder="담당자"
                  className="h-8 text-[11px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">완료예정일</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-8 text-[11px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">상태</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as APStatus)}>
                  <SelectTrigger className="h-8 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="대기" className="text-[11px]">대기</SelectItem>
                    <SelectItem value="진행중" className="text-[11px]">진행중</SelectItem>
                    <SelectItem value="완료" className="text-[11px]">완료</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">비고</Label>
                <Input
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="비고"
                  className="h-8 text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* 최적화 결과 SOD 입력 */}
          <div className="bg-green-50/50 p-3 rounded-lg border border-green-200">
            <h4 className="text-[11px] font-bold text-green-700 mb-2">최적화 결과 (개선 후 SOD)</h4>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px]">New S</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={newS}
                  onChange={(e) => setNewS(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder={String(editingItem.severity)}
                  className="h-8 text-[11px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">New O</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={newO}
                  onChange={(e) => setNewO(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder={String(editingItem.occurrence)}
                  className="h-8 text-[11px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">New D</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={newD}
                  onChange={(e) => setNewD(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder={String(editingItem.detection)}
                  className="h-8 text-[11px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">New AP</Label>
                <div className="mt-1">
                  {newAP ? (
                    <span className={`inline-block w-8 h-8 rounded-full text-white text-[12px] leading-8 text-center font-bold ${newAP === 'H' ? 'bg-red-500' : newAP === 'M' ? 'bg-orange-500' : 'bg-green-500'}`}>
                      {newAP}
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-400">SOD 입력 시 자동 계산</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button
            className="bg-[#00587a] hover:bg-[#004560]"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
