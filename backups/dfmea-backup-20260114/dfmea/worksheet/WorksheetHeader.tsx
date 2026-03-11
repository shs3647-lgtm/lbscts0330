/**
 * @file WorksheetHeader.tsx
 * @description PFMEA 워크시트 헤더 정보 컴포넌트
 * @version 1.0.0
 * @created 2025-12-26
 */

'use client';

import { type PFMEAHeader } from './types';

interface WorksheetHeaderProps {
  header: PFMEAHeader;
  onChange?: (header: PFMEAHeader) => void;
  readOnly?: boolean;
}

/** 워크시트 헤더 정보 */
export function WorksheetHeader({ header, onChange, readOnly = false }: WorksheetHeaderProps) {
  const handleChange = (field: keyof PFMEAHeader, value: string | number) => {
    if (onChange) {
      onChange({ ...header, [field]: value });
    }
  };
  
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h2 className="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
        <span className="text-xl">📋</span>
        Process Failure Modes Effects Analysis (Process FMEA)
      </h2>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 왼쪽 영역 */}
        <div className="space-y-2">
          <HeaderField 
            label="회사" 
            value={header.company} 
            onChange={(v) => handleChange('company', v)} 
            readOnly={readOnly}
          />
          <HeaderField 
            label="고객" 
            value={header.customer} 
            onChange={(v) => handleChange('customer', v)} 
            readOnly={readOnly}
          />
          <HeaderField 
            label="공장" 
            value={header.plant} 
            onChange={(v) => handleChange('plant', v)} 
            readOnly={readOnly}
          />
          <HeaderField 
            label="제품/프로그램" 
            value={header.productProgram} 
            onChange={(v) => handleChange('productProgram', v)} 
            readOnly={readOnly}
          />
        </div>
        
        {/* 오른쪽 영역 */}
        <div className="space-y-2">
          <HeaderField 
            label="FMEA ID" 
            value={header.fmeaId} 
            onChange={(v) => handleChange('fmeaId', v)} 
            readOnly={readOnly}
          />
          <HeaderField 
            label="시작일자" 
            value={header.startDate} 
            onChange={(v) => handleChange('startDate', v)} 
            readOnly={readOnly}
            type="date"
          />
          <HeaderField 
            label="개정번호" 
            value={String(header.revisionNo)} 
            onChange={(v) => handleChange('revisionNo', parseInt(v) || 0)} 
            readOnly={readOnly}
            type="number"
          />
          <HeaderField 
            label="책임자" 
            value={header.responsibility} 
            onChange={(v) => handleChange('responsibility', v)} 
            readOnly={readOnly}
          />
        </div>
        
        {/* 추가 정보 (넓은 화면에서만) */}
        <div className="space-y-2 hidden lg:block">
          <HeaderField 
            label="보안 등급" 
            value={header.securityLevel} 
            onChange={(v) => handleChange('securityLevel', v)} 
            readOnly={readOnly}
          />
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 font-medium">승인자 목록</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {header.approvalList.map((name, idx) => (
                <span 
                  key={idx}
                  className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        {/* 통계 영역 */}
        <div className="space-y-2 hidden lg:block">
          <div className="bg-white/80 rounded-lg p-3 border border-blue-100">
            <div className="text-xs text-slate-500 mb-2">AP 현황</div>
            <div className="flex gap-3">
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">1</div>
                <div className="text-xs text-slate-500">H</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-amber-600">4</div>
                <div className="text-xs text-slate-500">M</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">0</div>
                <div className="text-xs text-slate-500">L</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface HeaderFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  type?: 'text' | 'date' | 'number';
}

function HeaderField({ label, value, onChange, readOnly, type = 'text' }: HeaderFieldProps) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      {readOnly ? (
        <span className="text-sm text-slate-800 font-medium">{value}</span>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm text-slate-800 font-medium bg-white/50 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      )}
    </div>
  );
}

export default WorksheetHeader;













