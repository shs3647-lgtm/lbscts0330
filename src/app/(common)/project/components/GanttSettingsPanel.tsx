
import React from 'react';

interface SettingsPanelProps {
  columns: any[];
  hiddenColumns: Record<string, boolean>;
  toggleColumn: (key: string) => void;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ columns, hiddenColumns, toggleColumn, onClose }) => {
  return (
    <div className="absolute right-2 top-2 z-50 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100">
      <div className="px-4 py-2 bg-gray-50 flex justify-between items-center rounded-t-md">
        <span className="text-xs font-bold text-gray-700">컬럼 설정</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      <div className="py-1 max-h-64 overflow-y-auto">
        {columns.filter((col: any) => col.key !== 'taskName').map((col: any) => (
          <div key={col.key} className="block px-4 py-2 text-xs text-gray-700 hover:bg-indigo-50 cursor-pointer flex items-center" onClick={() => toggleColumn(col.key)}>
            <input type="checkbox" checked={!hiddenColumns[col.key]} readOnly className="mr-2 h-3 w-3 text-indigo-600" />
            {col.name}
          </div>
        ))}
      </div>
    </div>
  );
};



