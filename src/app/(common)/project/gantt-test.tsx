'use client';

import React, { useRef } from 'react';
import GanttChartView, { GanttChartRef } from './components/GanttChartView';

/**
 * 간트 차트 테스트 페이지 (독립 실행)
 * - packages 의존성 없음
 * - 간트 차트 UI 개선 확인용
 */
export default function GanttTestPage() {
    const ganttRef = useRef<GanttChartRef>(null);

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            background: '#ffffff',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* 헤더 */}
            <div style={{
                height: '60px',
                background: 'linear-gradient(to bottom, #005a8d 0%, #004d7a 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                <h1 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
                    📊 Gantt Chart - UI 개선 테스트
                </h1>
            </div>

            {/* 액션 바 */}
            <div style={{
                height: '50px',
                background: '#f5f6fb',
                borderBottom: '1px solid #e1e4e8',
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                gap: '10px'
            }}>
                <button
                    onClick={() => ganttRef.current?.saveData()}
                    style={{
                        padding: '6px 16px',
                        background: '#16a34a',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600'
                    }}
                >
                    💾 저장
                </button>
                <button
                    onClick={() => ganttRef.current?.loadData()}
                    style={{
                        padding: '6px  16px',
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600'
                    }}
                >
                    📂 열기
                </button>
                <button
                    onClick={() => ganttRef.current?.exportExcel()}
                    style={{
                        padding: '6px 16px',
                        background: '#8b5cf6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600'
                    }}
                >
                    📤 Excel 내보내기
                </button>
                <button
                    onClick={() => ganttRef.current?.importExcel()}
                    style={{
                        padding: '6px 16px',
                        background: '#f97316',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600'
                    }}
                >
                    📥 Excel 가져오기
                </button>
                <button
                    onClick={() => ganttRef.current?.toggleSettings()}
                    style={{
                        padding: '6px 16px',
                        background: '#64748b',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600'
                    }}
                >
                    ⚙️ 설정
                </button>
            </div>

            {/* 간트 차트 */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <GanttChartView ref={ganttRef} visible={true} isPreview={false} />
            </div>
        </div>
    );
}
