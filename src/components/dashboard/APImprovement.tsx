'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface APItem {
  no: number;
  ap5: 'H' | 'M' | 'L';
  ap6: 'H' | 'M' | 'L';
  special?: '◇' | '★' | 'SC' | 'CC';
  s: number;
  failureMode: string;
  failureCause: string;
  o: number;
  d: number;
  rpn?: number;
}

// 샘플 데이터 (pfm26-m001)
const sampleData: APItem[] = [
  { no: 1, ap5: 'M', ap6: 'L', special: '◇', s: 7, failureMode: '10 미비지점 누락', failureCause: '작업자 미비지점 식별 누락', o: 4, d: 6, rpn: 168 },
  { no: 2, ap5: 'M', ap6: 'L', special: '◇', s: 7, failureMode: '10 제품,제품 파손', failureCause: '금형온도 과열로 제품 파손', o: 3, d: 6, rpn: 126 },
  { no: 3, ap5: 'L', ap6: 'L', special: '◇', s: 2, failureMode: '11 상태온도 불량', failureCause: '파라미터 입력 실수', o: 5, d: 6, rpn: 60 },
  { no: 4, ap5: 'H', ap6: 'M', special: '★', s: 9, failureMode: '용접 강도 부족', failureCause: '용접 파라미터 이탈', o: 4, d: 5, rpn: 180 },
  { no: 5, ap5: 'L', ap6: 'L', special: undefined, s: 6, failureMode: '외관 스크래치', failureCause: '취급 부주의', o: 5, d: 6, rpn: 180 },
];

const APImprovement: React.FC = () => {
  // AP 레벨에 따른 색상
  const getAPColor = (level: 'H' | 'M' | 'L') => {
    switch (level) {
      case 'H': return '#ef4444'; // red-500
      case 'M': return '#f59e0b'; // amber-500
      case 'L': return '#22c55e'; // green-500
      default: return '#9ca3af'; // gray-400
    }
  };

  // 특수 항목 색상
  const getSpecialColor = (special?: '◇' | '★' | 'SC' | 'CC') => {
    if (special === '◇' || special === 'SC') return '#00838f'; // 공정 특별특성 (청록)
    if (special === '★' || special === 'CC') return '#e65100'; // 제품 특별특성 (주황)
    return 'transparent';
  };

  // RPN 기준으로 정렬 (낮은 순)
  const sortedData = [...sampleData].sort((a, b) => (a.rpn || 0) - (b.rpn || 0));

  // H, M 항목만 필터링 (개선 대상)
  const improvementItems = sortedData.filter(item => item.ap5 === 'H' || item.ap5 === 'M');

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-lg">AP 개선 현황</CardTitle>
        <p className="text-sm text-gray-600">5AP → 6AP 변화 분석 (pfm26-m001)</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* 나비 차트 (Butterfly Chart) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold">5AP</span>
              <span className="text-sm text-gray-500">개선 방향 →</span>
              <span className="text-sm font-semibold">6AP</span>
            </div>

            {improvementItems.map((item) => (
              <div key={item.no} className="flex items-center gap-2 py-2 border-b border-gray-100">
                {/* 5AP 바 */}
                <div className="flex-1 flex justify-end">
                  <div
                    className="h-6 rounded-l flex items-center justify-end pr-2 text-xs text-white font-medium"
                    style={{
                      backgroundColor: getAPColor(item.ap5),
                      width: item.ap5 === 'H' ? '100%' : item.ap5 === 'M' ? '66%' : '33%'
                    }}
                  >
                    {item.ap5}
                  </div>
                </div>

                {/* 중앙 번호 */}
                <div className="w-12 text-center">
                  <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded">
                    #{item.no}
                  </span>
                </div>

                {/* 6AP 바 */}
                <div className="flex-1">
                  <div
                    className="h-6 rounded-r flex items-center justify-start pl-2 text-xs text-white font-medium"
                    style={{
                      backgroundColor: getAPColor(item.ap6),
                      width: item.ap6 === 'H' ? '100%' : item.ap6 === 'M' ? '66%' : '33%'
                    }}
                  >
                    {item.ap6}
                  </div>
                </div>
              </div>
            ))}

            {/* 범례 */}
            <div className="flex justify-center gap-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                <span className="text-xs">High</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
                <span className="text-xs">Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }}></div>
                <span className="text-xs">Low</span>
              </div>
            </div>
          </div>

          {/* 상세 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 px-1">No</th>
                  <th className="text-center py-2 px-1">AP5</th>
                  <th className="text-center py-2 px-1">AP6</th>
                  <th className="text-center py-2 px-1">특성</th>
                  <th className="text-center py-2 px-1">S</th>
                  <th className="text-left py-2 px-2">Failure Mode</th>
                  <th className="text-left py-2 px-2">Failure Cause</th>
                  <th className="text-center py-2 px-1">O</th>
                  <th className="text-center py-2 px-1">D</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.slice(0, 5).map((item) => (
                  <tr key={item.no} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-1 text-center">{item.no}</td>
                    <td className="py-2 px-1">
                      <div className="flex justify-center">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: getAPColor(item.ap5) }}
                        >
                          {item.ap5}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-1">
                      <div className="flex justify-center">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: getAPColor(item.ap6) }}
                        >
                          {item.ap6}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-1">
                      {item.special && (
                        <div className="flex justify-center">
                          <span
                            className="px-2 py-0.5 rounded text-white text-xs"
                            style={{ backgroundColor: getSpecialColor(item.special) }}
                          >
                            {item.special}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-1 text-center font-medium">{item.s}</td>
                    <td className="py-2 px-2 text-xs">{item.failureMode}</td>
                    <td className="py-2 px-2 text-xs">{item.failureCause}</td>
                    <td className="py-2 px-1 text-center">{item.o}</td>
                    <td className="py-2 px-1 text-center">{item.d}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 개선 요약 */}
            <div className="mt-4 p-3 bg-blue-50 rounded">
              <p className="text-xs font-medium text-blue-900 mb-1">개선 성과</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">H → M: </span>
                  <span className="font-semibold text-blue-600">1건</span>
                </div>
                <div>
                  <span className="text-gray-600">M → L: </span>
                  <span className="font-semibold text-green-600">2건</span>
                </div>
                <div>
                  <span className="text-gray-600">유지: </span>
                  <span className="font-semibold text-gray-600">2건</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default APImprovement;