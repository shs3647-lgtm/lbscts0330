/**
 * @file /admin/settings/approval/page.tsx
 * @description 결재 시스템 환경설정 페이지 (관리자 전용)
 * @created 2026-01-19
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/locale';
import { ADMIN_HOME_PATH } from '@/lib/admin/admin-routes';

// ============================================================================
// 타입 정의
// ============================================================================

interface ApprovalSettings {
  // SMTP 설정
  smtp: {
    enabled: boolean;
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromName: string;
    fromEmail: string;
  };
  // 결재자 자동 지정 규칙
  autoAssign: {
    enabled: boolean;
    createRole: string;      // 작성자 역할 (FMEA 책임자)
    reviewRole: string;      // 검토자 역할 (프로젝트 리더)
    approveRole: string;     // 승인자 역할 (챔피언)
  };
  // 알림 설정
  notification: {
    emailEnabled: boolean;
    inAppEnabled: boolean;
    reminderDays: number;    // N일 후 리마인더
  };
  // 그룹웨어 연동 (선택)
  groupware: {
    type: 'none' | 'naver' | 'kakao' | 'ms365' | 'custom';
    apiUrl: string;
    apiKey: string;
    webhookUrl: string;
  };
}

const defaultSettings: ApprovalSettings = {
  smtp: {
    enabled: false,
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    fromName: 'FMEA 시스템',
    fromEmail: '',
  },
  autoAssign: {
    enabled: true,
    createRole: 'FMEA 책임자',
    reviewRole: '프로젝트 리더',
    approveRole: '챔피언',
  },
  notification: {
    emailEnabled: true,
    inAppEnabled: true,
    reminderDays: 3,
  },
  groupware: {
    type: 'none',
    apiUrl: '',
    apiKey: '',
    webhookUrl: '',
  },
};

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function ApprovalSettingsPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [settings, setSettings] = useState<ApprovalSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [activeTab, setActiveTab] = useState<'smtp' | 'autoAssign' | 'notification' | 'groupware'>('smtp');
  
  // 설정 로드
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    try {
      // localStorage에서 로드 (나중에 DB로 변경 가능)
      const saved = localStorage.getItem('fmea_approval_settings');
      if (saved) {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      }
    } catch (error) {
      console.error('설정 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 설정 저장
  const handleSave = async () => {
    setSaving(true);
    try {
      // localStorage에 저장 (나중에 DB API로 변경)
      localStorage.setItem('fmea_approval_settings', JSON.stringify(settings));
      
      // 환경변수 파일 업데이트 (서버 측에서 처리 필요)
      await fetch('/api/admin/settings/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      }).catch(() => {
        // API가 없어도 localStorage에는 저장됨
      });
      
      alert('✅ 설정이 저장되었습니다.');
    } catch (error) {
      console.error('설정 저장 실패:', error);
      alert('❌ 설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };
  
  // 이메일 테스트
  const handleTestEmail = async () => {
    if (!settings.smtp.user || !settings.smtp.pass) {
      alert('SMTP 사용자와 비밀번호를 입력해주세요.');
      return;
    }
    
    const testEmail = window.prompt('테스트 이메일을 받을 주소를 입력하세요:', settings.smtp.user);
    if (!testEmail) return;
    
    setTestingEmail(true);
    try {
      const res = await fetch('/api/admin/settings/approval/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...settings.smtp, 
          testEmail 
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        alert(`✅ 테스트 이메일이 ${testEmail}로 발송되었습니다.`);
      } else {
        alert(`❌ 이메일 발송 실패: ${data.error}`);
      }
    } catch (error) {
      alert('❌ 이메일 테스트 중 오류가 발생했습니다.\n\n설정을 저장하고 서버를 재시작해주세요.');
    } finally {
      setTestingEmail(false);
    }
  };
  
  // 필드 업데이트 헬퍼
  const updateSmtp = (field: keyof ApprovalSettings['smtp'], value: any) => {
    setSettings(prev => ({ ...prev, smtp: { ...prev.smtp, [field]: value } }));
  };
  
  const updateAutoAssign = (field: keyof ApprovalSettings['autoAssign'], value: any) => {
    setSettings(prev => ({ ...prev, autoAssign: { ...prev.autoAssign, [field]: value } }));
  };
  
  const updateNotification = (field: keyof ApprovalSettings['notification'], value: any) => {
    setSettings(prev => ({ ...prev, notification: { ...prev.notification, [field]: value } }));
  };
  
  const updateGroupware = (field: keyof ApprovalSettings['groupware'], value: any) => {
    setSettings(prev => ({ ...prev, groupware: { ...prev.groupware, [field]: value } }));
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="bg-[#00587a] text-white rounded-t-lg p-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">⚙️ {t('결재 시스템 환경설정')}</h1>
            <p className="text-sm text-gray-200">{t('관리자 전용')} - SMTP, {t('결재자 지정')}, {t('알림 설정')}</p>
          </div>
          <button
            type="button"
            onClick={() => router.replace(ADMIN_HOME_PATH)}
            className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-700 text-sm"
          >
            ← {t('관리 홈')}
          </button>
        </div>
        
        {/* 탭 메뉴 */}
        <div className="bg-white border-b flex">
          {[
            { id: 'smtp', label: `📧 ${t('SMTP 설정')}`, desc: t('이메일 서버') },
            { id: 'autoAssign', label: `👥 ${t('결재자 지정')}`, desc: t('자동 지정 규칙') },
            { id: 'notification', label: `🔔 ${t('알림 설정')}`, desc: t('알림 방식') },
            { id: 'groupware', label: `🏢 ${t('그룹웨어 연동')}`, desc: t('외부 시스템') },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 px-4 text-center border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-transparent hover:bg-gray-50'
              }`}
            >
              <div className="font-semibold text-sm">{tab.label}</div>
              <div className="text-xs text-gray-500">{tab.desc}</div>
            </button>
          ))}
        </div>
        
        {/* 설정 폼 */}
        <div className="bg-white shadow-lg p-6 rounded-b-lg">
          
          {/* SMTP 설정 */}
          {activeTab === 'smtp' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <h2 className="font-bold text-lg">{t('SMTP 이메일 설정')}</h2>
                  <p className="text-sm text-gray-500">{t('결재 요청 이메일 발송을 위한 SMTP 서버 설정')}</p>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.smtp.enabled}
                    onChange={(e) => updateSmtp('enabled', e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="font-semibold">{t('활성화')}</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">{t('SMTP 호스트')}</label>
                  <select
                    value={settings.smtp.host}
                    onChange={(e) => {
                      const presets: Record<string, { host: string; port: number }> = {
                        'smtp.gmail.com': { host: 'smtp.gmail.com', port: 587 },
                        'smtp.naver.com': { host: 'smtp.naver.com', port: 587 },
                        'smtp.daum.net': { host: 'smtp.daum.net', port: 465 },
                        'smtp.kakao.com': { host: 'smtp.kakao.com', port: 465 },
                        'smtp.office365.com': { host: 'smtp.office365.com', port: 587 },
                        'custom': { host: '', port: 25 },
                      };
                      const preset = presets[e.target.value] || presets['custom'];
                      updateSmtp('host', preset.host || e.target.value);
                      updateSmtp('port', preset.port);
                    }}
                    className="w-full p-2 border rounded"
                  >
                    <option value="smtp.gmail.com">Gmail (smtp.gmail.com)</option>
                    <option value="smtp.naver.com">네이버 (smtp.naver.com)</option>
                    <option value="smtp.daum.net">다음/Daum (smtp.daum.net)</option>
                    <option value="smtp.kakao.com">카카오 (smtp.kakao.com)</option>
                    <option value="smtp.office365.com">Microsoft 365</option>
                    <option value="custom">{t('직접 입력')}</option>
                  </select>
                  {settings.smtp.host && !['smtp.gmail.com', 'smtp.naver.com', 'smtp.daum.net', 'smtp.kakao.com', 'smtp.office365.com'].includes(settings.smtp.host) && (
                    <input
                      type="text"
                      value={settings.smtp.host}
                      onChange={(e) => updateSmtp('host', e.target.value)}
                      placeholder="사내 SMTP 서버 주소"
                      className="w-full p-2 border rounded mt-2"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">{t('포트')}</label>
                  <input
                    type="number"
                    value={settings.smtp.port}
                    onChange={(e) => updateSmtp('port', parseInt(e.target.value))}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">{t('SMTP 사용자')} ({t('이메일')})</label>
                  <input
                    type="email"
                    value={settings.smtp.user}
                    onChange={(e) => updateSmtp('user', e.target.value)}
                    placeholder="your-email@company.com"
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">{t('SMTP 비밀번호')} ({t('앱 비밀번호')})</label>
                  <input
                    type="password"
                    value={settings.smtp.pass}
                    onChange={(e) => updateSmtp('pass', e.target.value)}
                    placeholder="앱 비밀번호 입력"
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">{t('발신자 이름')}</label>
                  <input
                    type="text"
                    value={settings.smtp.fromName}
                    onChange={(e) => updateSmtp('fromName', e.target.value)}
                    placeholder="FMEA 시스템"
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.smtp.secure}
                      onChange={(e) => updateSmtp('secure', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">SSL/TLS 사용 (포트 465)</span>
                  </label>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <button
                  onClick={handleTestEmail}
                  disabled={testingEmail || !settings.smtp.enabled}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  {testingEmail ? t('발송 중...') : `📧 ${t('테스트 이메일 발송')}`}
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Gmail 사용 시 <a href="https://myaccount.google.com/apppasswords" target="_blank" className="text-blue-500 underline">앱 비밀번호</a>가 필요합니다.
                </p>
              </div>
            </div>
          )}
          
          {/* 결재자 자동 지정 */}
          {activeTab === 'autoAssign' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <h2 className="font-bold text-lg">{t('결재자 자동 지정 규칙')}</h2>
                  <p className="text-sm text-gray-500">{t('FMEA 등록정보에서 결재자를 자동으로 가져옵니다')}</p>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.autoAssign.enabled}
                    onChange={(e) => updateAutoAssign('enabled', e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="font-semibold">{t('활성화')}</span>
                </label>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">1</span>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold">{t('작성자 역할')}</label>
                      <input
                        type="text"
                        value={settings.autoAssign.createRole}
                        onChange={(e) => updateAutoAssign('createRole', e.target.value)}
                        className="w-full p-2 border rounded mt-1"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 ml-11">FMEA 등록정보의 "FMEA 책임자"가 자동 지정됩니다.</p>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-8 h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center font-bold">2</span>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold">{t('검토자 역할')}</label>
                      <input
                        type="text"
                        value={settings.autoAssign.reviewRole}
                        onChange={(e) => updateAutoAssign('reviewRole', e.target.value)}
                        className="w-full p-2 border rounded mt-1"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 ml-11">FMEA 등록정보의 "검토 책임자"가 자동 지정됩니다.</p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">3</span>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold">{t('승인자 역할')}</label>
                      <input
                        type="text"
                        value={settings.autoAssign.approveRole}
                        onChange={(e) => updateAutoAssign('approveRole', e.target.value)}
                        className="w-full p-2 border rounded mt-1"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 ml-11">FMEA 등록정보의 "승인 책임자"가 자동 지정됩니다.</p>
                </div>
              </div>
              
              <div className="p-4 bg-gray-100 rounded-lg">
                <h3 className="font-semibold mb-2">{t('결재 흐름')}</h3>
                <div className="flex items-center justify-center gap-4 text-sm">
                  <span className="px-3 py-1 bg-blue-200 rounded">{t('작성자 승인')}</span>
                  <span>→</span>
                  <span className="px-3 py-1 bg-yellow-200 rounded">{t('검토자 승인')}</span>
                  <span>→</span>
                  <span className="px-3 py-1 bg-green-200 rounded">{t('승인자 최종승인')}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* 알림 설정 */}
          {activeTab === 'notification' && (
            <div className="space-y-4">
              <div className="pb-4 border-b">
                <h2 className="font-bold text-lg">{t('알림 설정')}</h2>
                <p className="text-sm text-gray-500">{t('결재 요청/결과 알림 방식을 설정합니다')}</p>
              </div>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-semibold">📧 {t('이메일 알림')}</span>
                    <p className="text-sm text-gray-500">{t('결재 요청/승인/반려 시 이메일 발송')}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notification.emailEnabled}
                    onChange={(e) => updateNotification('emailEnabled', e.target.checked)}
                    className="w-5 h-5"
                  />
                </label>
                
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-semibold">🔔 {t('시스템 내 알림')}</span>
                    <p className="text-sm text-gray-500">{t('FMEA 시스템 내 알림 표시')}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notification.inAppEnabled}
                    onChange={(e) => updateNotification('inAppEnabled', e.target.checked)}
                    className="w-5 h-5"
                  />
                </label>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="block font-semibold mb-2">⏰ {t('리마인더 발송')}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings.notification.reminderDays}
                      onChange={(e) => updateNotification('reminderDays', parseInt(e.target.value))}
                      min={0}
                      max={30}
                      className="w-20 p-2 border rounded text-center"
                    />
                    <span>{t('일 후 미처리 시 리마인더 발송')}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">0으로 설정하면 리마인더를 발송하지 않습니다.</p>
                </div>
              </div>
            </div>
          )}
          
          {/* 그룹웨어 연동 */}
          {activeTab === 'groupware' && (
            <div className="space-y-4">
              <div className="pb-4 border-b">
                <h2 className="font-bold text-lg">{t('그룹웨어 연동')}</h2>
                <p className="text-sm text-gray-500">{t('기업 그룹웨어와 결재 시스템을 연동합니다')} ({t('선택사항')})</p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">{t('그룹웨어 유형')}</label>
                <select
                  value={settings.groupware.type}
                  onChange={(e) => updateGroupware('type', e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="none">{t('사용 안함')} ({t('이메일만 사용')})</option>
                  <option value="naver">네이버 웍스 (NAVER WORKS)</option>
                  <option value="kakao">카카오워크 (Kakao Work)</option>
                  <option value="ms365">Microsoft 365</option>
                  <option value="custom">{t('직접 설정')} (API {t('연동')})</option>
                </select>
              </div>
              
              {settings.groupware.type !== 'none' && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-semibold mb-1">API URL</label>
                    <input
                      type="url"
                      value={settings.groupware.apiUrl}
                      onChange={(e) => updateGroupware('apiUrl', e.target.value)}
                      placeholder="https://api.worksmobile.com/v1/..."
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">API Key</label>
                    <input
                      type="password"
                      value={settings.groupware.apiKey}
                      onChange={(e) => updateGroupware('apiKey', e.target.value)}
                      placeholder="API 키 입력"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Webhook URL (선택)</label>
                    <input
                      type="url"
                      value={settings.groupware.webhookUrl}
                      onChange={(e) => updateGroupware('webhookUrl', e.target.value)}
                      placeholder="결재 완료 시 호출할 웹훅 URL"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  
                  <div className="p-3 bg-yellow-100 rounded text-sm">
                    <strong>⚠️ 참고:</strong> 그룹웨어 연동은 각 서비스의 API 문서를 참고하여 설정하세요.
                    <ul className="mt-2 ml-4 list-disc text-xs">
                      <li><a href="https://developers.worksmobile.com/" target="_blank" className="text-blue-600 underline">네이버 웍스 API 문서</a></li>
                      <li><a href="https://docs.kakaoi.ai/kakao_work/" target="_blank" className="text-blue-600 underline">카카오워크 API 문서</a></li>
                      <li><a href="https://docs.microsoft.com/graph/api/" target="_blank" className="text-blue-600 underline">Microsoft Graph API 문서</a></li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* 저장 버튼 */}
          <div className="mt-6 pt-4 border-t flex justify-between items-center">
            <button
              onClick={() => {
                setSettings(defaultSettings);
                alert('기본값으로 초기화되었습니다.');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              🔄 {t('기본값 초기화')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {saving ? t('저장 중...') : `💾 ${t('설정 저장')}`}
            </button>
          </div>
        </div>
        
        {/* 도움말 */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm">
          <h3 className="font-bold mb-2">{t('설정 가이드')}</h3>
          <ol className="list-decimal ml-4 space-y-1">
            <li><strong>SMTP 설정</strong>: 이메일 발송을 위한 필수 설정입니다.</li>
            <li><strong>결재자 자동 지정</strong>: FMEA 등록정보와 연동하여 결재자를 자동으로 지정합니다.</li>
            <li><strong>알림 설정</strong>: 결재 관련 알림 방식을 설정합니다.</li>
            <li><strong>그룹웨어 연동</strong>: 기업 그룹웨어가 있는 경우 연동할 수 있습니다 (선택).</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
