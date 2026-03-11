/**
 * @file LinkageTag.tsx
 * @description 연동 태그 컴포넌트 - 클릭 시 해당 등록화면으로 이동
 * @version 1.0.0
 * @created 2026-01-27
 */

'use client';

import { useRouter } from 'next/navigation';
import { LinkageTagProps, LINKAGE_COLORS, LINKAGE_URLS } from './types';

/**
 * 연동 태그 컴포넌트
 * - 태그 또는 ID 클릭 시 해당 등록화면으로 이동
 * - 잠금 상태일 때 🔒 아이콘 표시
 * - X 버튼으로 연동 해제
 */
export function LinkageTag({
    type,
    id,
    locked = false,
    onRemove,
    onNavigate,
    showRemoveButton = true,
}: LinkageTagProps) {
    const router = useRouter();
    const colors = LINKAGE_COLORS[type];
    const baseUrl = LINKAGE_URLS[type];

    const handleNavigate = () => {
        if (onNavigate) {
            onNavigate();
        } else {
            router.push(`${baseUrl}?id=${id.toLowerCase()}`);
        }
    };

    return (
        <div className="flex items-center gap-1">
            {/* 잠금 아이콘 */}
            {locked && (
                <span className={`${colors.text} text-xs`} title="연동됨 (변경 불가)">🔒</span>
            )}

            {/* 태그 배지 */}
            <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${colors.bg} ${colors.bgHover} cursor-pointer transition-colors`}
                onClick={handleNavigate}
                title={`${type} 등록화면으로 이동`}
            >
                {type}
            </span>

            {/* ID */}
            <span
                className={`text-xs font-semibold ${colors.text} cursor-pointer hover:underline`}
                onClick={handleNavigate}
                title={`${type} 등록화면으로 이동`}
            >
                {id}
            </span>

            {/* 삭제 버튼 */}
            {showRemoveButton && !locked && onRemove && (
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="text-red-500 hover:text-red-700 text-[10px] ml-0.5"
                    title="연동 해제"
                >
                    ✕
                </button>
            )}
        </div>
    );
}

export default LinkageTag;
