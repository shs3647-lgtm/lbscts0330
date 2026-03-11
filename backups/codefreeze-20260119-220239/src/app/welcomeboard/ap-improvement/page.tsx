/**
 * @file page.tsx
 * @description AP 개선관리 메인 페이지
 * @author AI Assistant
 * @created 2026-01-03
 * 
 * 테이블 디자인 원칙:
 * - 헤더: #00587a (진한 남청색) + 흰색 글자
 * - 첫 번째 열: #00587a + 흰색 글자
 * - 짝수 행: #e0f2fb (연한 하늘색)
 * - 홀수 행: #ffffff (흰색)
 * - 테두리: 1px solid #999
 */

'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Filter, Download, Edit2, Trash2 } from 'lucide-react';

// 모듈화된 파일 import
import { APItem } from './types';
import { mockAPData } from './mock-data';
import { getAPBadgeClass, getStatusBadgeClass, calculateStats, filterAPData } from './utils';
import APModal from './APModal';

/**
 * AP 개선관리 페이지
 */
export default function APImprovementPage() {
  // 상태 관리
  const [data, setData] = useState<APItem[]>(mockAPData);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAP, setFilterAP] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<APItem | null>(null);

  // 필터링된 데이터 및 통계
  const filteredData = filterAPData(data, filterStatus, filterAP, searchTerm);
  const stats = calculateStats(data);

  // 모달 열기 (신규/수정)
  const openModal = (item?: APItem) => {
    setEditingItem(item || null);
    setIsModalOpen(true);
  };

  // 삭제
  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      setData(data.filter((d) => d.id !== id));
    }
  };

  return (
    <div className="p-5 min-h-full" style={{ background: '#f5f5f5', fontFamily: '"Malgun Gothic", sans-serif' }}>
      {/* 페이지 헤더 - 표준 디자인 */}
      <div className="max-w-[1400px] mx-auto mb-5">
        <h1 className="text-2xl font-bold text-[#00587a] mb-2">AP 개선관리</h1>
        <div className="p-4 border-l-4 border-[#00587a]" style={{ background: '#e0f2fb' }}>
          <strong>안내:</strong> Action Priority 기반 개선조치 현황 관리
        </div>
      </div>

      {/* 통계 테이블 - 표준 디자인 */}
      <div className="max-w-[1400px] mx-auto mb-5">
        <div className="bg-white rounded-lg overflow-hidden" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="bg-[#00587a] text-white font-bold px-4 py-2 text-center" style={{ border: '1px solid #999' }}>전체</th>
                <th className="bg-[#00587a] text-white font-bold px-4 py-2 text-center" style={{ border: '1px solid #999' }}>High</th>
                <th className="bg-[#00587a] text-white font-bold px-4 py-2 text-center" style={{ border: '1px solid #999' }}>Medium</th>
                <th className="bg-[#00587a] text-white font-bold px-4 py-2 text-center" style={{ border: '1px solid #999' }}>Low</th>
                <th className="bg-[#00587a] text-white font-bold px-4 py-2 text-center" style={{ border: '1px solid #999' }}>대기</th>
                <th className="bg-[#00587a] text-white font-bold px-4 py-2 text-center" style={{ border: '1px solid #999' }}>진행중</th>
                <th className="bg-[#00587a] text-white font-bold px-4 py-2 text-center" style={{ border: '1px solid #999' }}>완료</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="bg-white text-center text-[#00587a] font-bold text-2xl py-3" style={{ border: '1px solid #999' }}>{stats.total}</td>
                <td className="bg-[#e0f2fb] text-center text-red-600 font-bold text-2xl py-3" style={{ border: '1px solid #999' }}>{stats.high}</td>
                <td className="bg-white text-center text-yellow-600 font-bold text-2xl py-3" style={{ border: '1px solid #999' }}>{stats.medium}</td>
                <td className="bg-[#e0f2fb] text-center text-green-600 font-bold text-2xl py-3" style={{ border: '1px solid #999' }}>{stats.low}</td>
                <td className="bg-white text-center text-gray-600 font-bold text-2xl py-3" style={{ border: '1px solid #999' }}>{stats.pending}</td>
                <td className="bg-[#e0f2fb] text-center text-orange-600 font-bold text-2xl py-3" style={{ border: '1px solid #999' }}>{stats.inProgress}</td>
                <td className="bg-white text-center text-blue-600 font-bold text-2xl py-3" style={{ border: '1px solid #999' }}>{stats.completed}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 액션 바 - 표준 디자인 */}
      <div className="max-w-[1400px] mx-auto mb-5">
        <div className="bg-white p-4 rounded-lg" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* 검색 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="고장모드, 원인, 담당자 검색..."
                  className="pl-10 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ border: '1px solid #999' }}
                />
              </div>

              {/* AP 필터 */}
              <Select value={filterAP} onValueChange={setFilterAP}>
                <SelectTrigger className="w-32" style={{ border: '1px solid #999' }}>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="AP 등급" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 AP</SelectItem>
                  <SelectItem value="H">High</SelectItem>
                  <SelectItem value="M">Medium</SelectItem>
                  <SelectItem value="L">Low</SelectItem>
                </SelectContent>
              </Select>

              {/* 상태 필터 */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32" style={{ border: '1px solid #999' }}>
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="대기">대기</SelectItem>
                  <SelectItem value="진행중">진행중</SelectItem>
                  <SelectItem value="완료">완료</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="border-[#00587a] text-[#00587a] hover:bg-[#e0f2fb]">
                <Download className="h-4 w-4 mr-2" />
                Excel 다운로드
              </Button>
              <Button
                size="sm"
                className="bg-[#00587a] hover:bg-[#004560] text-white font-bold"
                onClick={() => openModal()}
              >
                <Plus className="h-4 w-4 mr-2" />
                신규 등록
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 테이블 - 표준 디자인 */}
      <div className="max-w-[1400px] mx-auto">
        <div className="bg-white rounded-lg overflow-hidden" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['No', 'AP5', 'AP6', '특성', 'S', 'Failure Mode', 'Failure Cause', 'O', 'D', 'Prevention', 'Detection', '담당자', '상태', '완료예정', '작업'].map((h, i) => (
                    <th key={i} className="bg-[#00587a] text-white font-bold px-3 py-2 text-center whitespace-nowrap" style={{ border: '1px solid #999' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, index) => (
                  <tr key={item.id}>
                    {/* No 열 - row-header 스타일 */}
                    <td className="bg-[#00587a] text-white font-bold px-3 py-2 text-center" style={{ border: '1px solid #999' }}>
                      {index + 1}
                    </td>
                    <td className={`px-3 py-2 text-center ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ border: '1px solid #999' }}>
                      <Badge className={getAPBadgeClass(item.ap5)}>{item.ap5}</Badge>
                    </td>
                    <td className={`px-3 py-2 text-center ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ border: '1px solid #999' }}>
                      <Badge className={getAPBadgeClass(item.ap6)}>{item.ap6}</Badge>
                    </td>
                    <td className={`px-3 py-2 text-center ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ border: '1px solid #999' }}>
                      {item.specialChar && <Badge variant="outline" className="border-[#00587a] text-[#00587a]">{item.specialChar}</Badge>}
                    </td>
                    <td className={`px-3 py-2 text-center font-medium text-black ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ border: '1px solid #999' }}>{item.severity}</td>
                    <td className={`px-3 py-2 text-left text-black min-w-[180px] ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ border: '1px solid #999' }}>{item.failureMode}</td>
                    <td className={`px-3 py-2 text-left text-black min-w-[180px] ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ border: '1px solid #999' }}>{item.failureCause}</td>
                    <td className={`px-3 py-2 text-center font-medium text-black ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ border: '1px solid #999' }}>{item.occurrence}</td>
                    <td className={`px-3 py-2 text-center font-medium text-black ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ border: '1px solid #999' }}>{item.detection}</td>
                    <td className={`px-3 py-2 text-left text-black min-w-[140px] ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ border: '1px solid #999' }}>{item.preventionAction}</td>
                    <td className={`px-3 py-2 text-left text-black min-w-[140px] ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ border: '1px solid #999' }}>{item.detectionAction}</td>
                    <td className={`px-3 py-2 text-center text-black ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ border: '1px solid #999' }}>{item.responsible}</td>
                    <td className={`px-3 py-2 text-center ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ border: '1px solid #999' }}>
                      <Badge className={getStatusBadgeClass(item.status)}>{item.status}</Badge>
                    </td>
                    <td className={`px-3 py-2 text-center text-black whitespace-nowrap ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ border: '1px solid #999' }}>{item.dueDate}</td>
                    <td className={`px-3 py-2 text-center ${index % 2 === 0 ? 'bg-white' : 'bg-[#e0f2fb]'}`} style={{ border: '1px solid #999' }}>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-[#e0f2fb]" onClick={() => openModal(item)}>
                          <Edit2 className="h-4 w-4 text-[#00587a]" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-red-50" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 결과 없음 */}
          {filteredData.length === 0 && (
            <div className="p-8 text-center text-gray-500">조건에 맞는 데이터가 없습니다.</div>
          )}
        </div>

        {/* 색상 범례 */}
        <div className="mt-4 flex items-center gap-6 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#00587a]" style={{ border: '1px solid #999' }}></div>
            <span>헤더/좌측열: #00587a</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#e0f2fb]" style={{ border: '1px solid #999' }}></div>
            <span>짝수 행: #e0f2fb</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white" style={{ border: '1px solid #999' }}></div>
            <span>홀수 행: #ffffff</span>
          </div>
        </div>
      </div>

      {/* 등록/수정 모달 */}
      <APModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingItem={editingItem}
      />
    </div>
  );
}

















