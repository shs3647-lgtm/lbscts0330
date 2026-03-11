'use client';

/**
 * @file pfd/list/page.tsx
 * @description PFD 목록 페이지
 * @module pfd/list
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface PfdItem {
  id: string;
  pfdNo: string;
  partName: string | null;
  partNo: string | null;
  subject: string | null;
  customerName: string | null;
  status: string;
  fmeaId: string | null;
  cpNo: string | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function PfdListPage() {
  const [pfds, setPfds] = useState<PfdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPfds();
  }, []);

  const fetchPfds = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      
      const res = await fetch(`/api/pfd?${params.toString()}`);
      const result = await res.json();
      
      if (result.success) {
        setPfds(result.data);
      } else {
        setError(result.error || '데이터 조회 실패');
      }
    } catch (err: any) {
      setError(err.message || '네트워크 오류');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPfds();
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-600',
      active: 'bg-green-100 text-green-700',
      locked: 'bg-yellow-100 text-yellow-700',
      obsolete: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      draft: '초안',
      active: '활성',
      locked: '잠금',
      obsolete: '폐기',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
              ← 대시보드
            </Link>
            <h1 className="text-xl font-bold text-gray-900">PFD 목록</h1>
          </div>
          <Link
            href="/pfd/worksheet"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + 새 PFD 작성
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="PFD 번호, 부품명, 제목으로 검색..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
            >
              검색
            </button>
          </div>
        </form>

        {/* Error State */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            데이터 로딩 중...
          </div>
        ) : pfds.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 mb-4">등록된 PFD가 없습니다</p>
            <Link
              href="/pfd/worksheet"
              className="text-blue-600 hover:underline"
            >
              새 PFD 작성하기
            </Link>
          </div>
        ) : (
          /* Table */
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    PFD 번호
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    부품명
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    제목
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    고객사
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    상태
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    항목수
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    연결
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pfds.map((pfd) => (
                  <tr key={pfd.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {pfd.pfdNo}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {pfd.partName || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {pfd.subject || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {pfd.customerName || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(pfd.status)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">
                      {pfd.itemCount}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <div className="flex justify-center gap-2">
                        {pfd.fmeaId && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                            FMEA
                          </span>
                        )}
                        {pfd.cpNo && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            CP
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/pfd/worksheet?pfdNo=${pfd.pfdNo}`}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        열기
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
