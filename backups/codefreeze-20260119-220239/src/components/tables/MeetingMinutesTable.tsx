/**
 * MeetingMinutesTable.tsx
 * 
 * 목적: 회의록 관리 테이블 컴포넌트
 * 컬럼: No, 날짜, 프로젝트명, 회의내용, 직급, 작성자, 회의록 첨부, 삭제
 */

'use client';

import React, { useState, useRef } from 'react';
import { MeetingMinute } from '@/types/project-revision';
import { UserSelectModal } from '@/components/modals/UserSelectModal';
import { UserInfo } from '@/types/user';

interface MeetingMinutesTableProps {
  meetingMinutes: MeetingMinute[];
  onUpdateField: (id: string, field: keyof MeetingMinute, value: unknown) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  maxVisibleRows?: number;
}

export const MeetingMinutesTable: React.FC<MeetingMinutesTableProps> = ({
  meetingMinutes,
  onUpdateField,
  onDelete,
  onAdd,
  maxVisibleRows = 10,
}) => {
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAuthorClick = (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    setUserModalOpen(true);
  };

  const handleUserSelect = (user: UserInfo) => {
    if (!selectedMeetingId) return;
    onUpdateField(selectedMeetingId, 'author', user.name || '');
    onUpdateField(selectedMeetingId, 'authorPosition', user.position || '');
    setUserModalOpen(false);
    setSelectedMeetingId(null);
  };

  const handleFileAttach = (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMeetingId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const fileData = event.target?.result as string;
      onUpdateField(selectedMeetingId, 'attachment', {
        fileName: file.name,
        fileData: fileData,
        fileSize: file.size,
      });
      setSelectedMeetingId(null);
      alert(`파일 "${file.name}"이 첨부되었습니다.`);
    };
    reader.readAsDataURL(file);
    
    // 파일 입력 초기화
    if (e.target) e.target.value = '';
  };

  const handleFileDownload = (meeting: MeetingMinute) => {
    if (!meeting.attachment) return;
    const link = document.createElement('a');
    link.href = meeting.attachment.fileData;
    link.download = meeting.attachment.fileName;
    link.click();
  };

  const handleFileRemove = (meetingId: string) => {
    if (!confirm('첨부파일을 삭제하시겠습니까?')) return;
    onUpdateField(meetingId, 'attachment', undefined);
  };

  const scrollHeight = 36 + (maxVisibleRows * 32); // 헤더 + 행들

  return (
    <>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span>📝</span>
          <h3 className="text-sm font-bold text-gray-700">회의록 관리</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onAdd}
            className="px-3 py-1.5 bg-green-100 border border-green-500 text-green-700 text-xs rounded hover:bg-green-200"
          >
            + 추가
          </button>
          <button
            onClick={() => {
              const lastMeeting = meetingMinutes[meetingMinutes.length - 1];
              if (lastMeeting && meetingMinutes.length > 0) {
                onDelete(lastMeeting.id);
              }
            }}
            disabled={meetingMinutes.length <= 1}
            className="px-3 py-1.5 bg-red-100 border border-red-400 text-red-600 text-xs rounded hover:bg-red-200 disabled:opacity-50"
          >
            − 삭제
          </button>
          <button
            className="px-3 py-1.5 bg-[#1976d2] text-white text-xs font-semibold rounded hover:bg-[#1565c0]"
          >
            💾 저장
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="rounded-lg overflow-hidden border border-gray-400 bg-white">
        <div style={{ height: `${scrollHeight}px` }} className="overflow-y-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#00587a] text-white">
                <th className="border border-white px-2 py-2 text-center align-middle font-semibold w-10">No</th>
                <th className="border border-white px-2 py-2 text-center align-middle font-semibold w-24">날짜</th>
                <th className="border border-white px-2 py-2 text-center align-middle font-semibold w-36">프로젝트명</th>
                <th className="border border-white px-2 py-2 text-center align-middle font-semibold">회의내용</th>
                <th className="border border-white px-2 py-2 text-center align-middle font-semibold w-14">직급</th>
                <th className="border border-white px-2 py-2 text-center align-middle font-semibold w-16">작성자</th>
                <th className="border border-white px-2 py-2 text-center align-middle font-semibold w-28">첨부파일</th>
                <th className="border border-white px-2 py-2 text-center align-middle font-semibold w-10">🗑️</th>
              </tr>
            </thead>
            <tbody>
              {meetingMinutes.map((meeting, index) => (
                <tr key={meeting.id} className={index % 2 === 0 ? 'bg-[#e0f2fb]' : 'bg-white'}>
                  <td className="border border-gray-300 px-2 py-1 text-center align-middle font-bold text-[#00587a]">
                    {meeting.no}
                  </td>
                  <td className="border border-gray-300 px-1 py-0.5">
                    <input
                      type="date"
                      value={meeting.date}
                      onChange={(e) => onUpdateField(meeting.id, 'date', e.target.value)}
                      className={`w-full h-7 px-1 text-xs border-0 focus:outline-none text-center ${
                        index % 2 === 0 ? 'bg-[#e0f2fb]' : 'bg-white'
                      }`}
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-0.5">
                    <input
                      type="text"
                      value={meeting.projectName}
                      onChange={(e) => onUpdateField(meeting.id, 'projectName', e.target.value)}
                      placeholder="프로젝트명"
                      className={`w-full h-7 px-2 text-xs border-0 focus:outline-none ${
                        index % 2 === 0 ? 'bg-[#e0f2fb]' : 'bg-white'
                      }`}
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-0.5">
                    <input
                      type="text"
                      value={meeting.content}
                      onChange={(e) => onUpdateField(meeting.id, 'content', e.target.value)}
                      placeholder="회의 내용"
                      className={`w-full h-7 px-2 text-xs border-0 focus:outline-none ${
                        index % 2 === 0 ? 'bg-[#e0f2fb]' : 'bg-white'
                      }`}
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-0.5">
                    <input
                      type="text"
                      value={meeting.authorPosition}
                      readOnly
                      placeholder="직급"
                      className={`w-full h-7 px-1 text-xs border-0 focus:outline-none text-center text-gray-500 ${
                        index % 2 === 0 ? 'bg-[#e0f2fb]' : 'bg-white'
                      }`}
                    />
                  </td>
                  <td 
                    className="border border-gray-300 px-1 py-0.5 cursor-pointer"
                    onClick={() => handleAuthorClick(meeting.id)}
                    title="클릭하여 작성자 선택"
                  >
                    <input
                      type="text"
                      value={meeting.author}
                      readOnly
                      placeholder="🔍"
                      className={`w-full h-7 px-1 text-xs border-0 focus:outline-none text-center cursor-pointer text-[#00587a] underline ${
                        index % 2 === 0 ? 'bg-[#e0f2fb]' : 'bg-white'
                      }`}
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-0.5 text-center">
                    {meeting.attachment ? (
                      <div className="flex gap-1 justify-center items-center">
                        <span 
                          className="text-xs text-[#00587a] cursor-pointer underline truncate max-w-[70px]"
                          onClick={() => handleFileDownload(meeting)}
                          title={meeting.attachment.fileName}
                        >
                          {meeting.attachment.fileName}
                        </span>
                        <button
                          onClick={() => handleFileRemove(meeting.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                          title="첨부파일 삭제"
                        >
                          ❌
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleFileAttach(meeting.id)}
                        className="text-[#00587a] hover:text-blue-700 text-sm"
                        title="파일 첨부"
                      >
                        📎
                      </button>
                    )}
                  </td>
                  <td className="border border-gray-300 px-1 py-0.5 text-center">
                    <button
                      onClick={() => onDelete(meeting.id)}
                      className="text-gray-500 hover:text-red-500 text-sm"
                      title="회의록 삭제"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
              {meetingMinutes.length === 0 && (
                <tr>
                  <td colSpan={8} className="border border-gray-300 px-4 py-8 text-center text-gray-400">
                    회의록이 없습니다. &quot;+ 회의록 추가&quot; 버튼을 클릭하여 추가하세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.hwp"
      />

      {/* 사용자 선택 모달 */}
      <UserSelectModal
        isOpen={userModalOpen}
        onClose={() => {
          setUserModalOpen(false);
          setSelectedMeetingId(null);
        }}
        onSelect={handleUserSelect}
      />
    </>
  );
};

export default MeetingMinutesTable;

