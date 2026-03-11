/**
 * @file page.tsx
 * @description 이메일 설정 관리 페이지 (고객사별 SMTP 설정)
 * @created 2026-01-26
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Save, TestTube, Building2, Check, X, Loader2 } from 'lucide-react';
import { FixedLayout, PFMEATopNav } from '@/components/layout';
import { useLocale } from '@/lib/locale';

interface EmailConfig {
    id: string;
    customerName: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    fromEmail: string;
    fromName: string;
    isActive: boolean;
}

// 기본 이메일 설정
const DEFAULT_CONFIGS: EmailConfig[] = [
    {
        id: 'default',
        customerName: '기본 (시스템)',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: '',
        smtpPass: '',
        fromEmail: 'noreply@fmea.local',
        fromName: 'FMEA System',
        isActive: true,
    },
    {
        id: 'hyundai',
        customerName: '현대자동차',
        smtpHost: 'smtp.hyundai.com',
        smtpPort: 587,
        smtpUser: '',
        smtpPass: '',
        fromEmail: 'fmea@hyundai.com',
        fromName: 'FMEA 현대차',
        isActive: false,
    },
    {
        id: 'kia',
        customerName: '기아자동차',
        smtpHost: 'smtp.kia.com',
        smtpPort: 587,
        smtpUser: '',
        smtpPass: '',
        fromEmail: 'fmea@kia.com',
        fromName: 'FMEA 기아',
        isActive: false,
    },
];

export default function EmailSettingsPage() {
    const { t } = useLocale();
    const [configs, setConfigs] = useState<EmailConfig[]>(DEFAULT_CONFIGS);
    const [selectedId, setSelectedId] = useState('default');
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

    const selectedConfig = configs.find(c => c.id === selectedId) || configs[0];

    // 설정 변경
    const updateConfig = (field: keyof EmailConfig, value: any) => {
        setConfigs(prev => prev.map(c =>
            c.id === selectedId ? { ...c, [field]: value } : c
        ));
    };

    // 설정 저장
    const handleSave = async () => {
        setSaving(true);
        setSaveResult(null);

        try {
            const res = await fetch('/api/admin/email-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: selectedConfig }),
            });
            const data = await res.json();
            setSaveResult({ success: data.success, message: data.message || '저장 완료' });
        } catch (err) {
            setSaveResult({ success: false, message: '저장 실패' });
        } finally {
            setSaving(false);
        }
    };

    // 테스트 이메일 발송
    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);

        try {
            const res = await fetch('/api/admin/email-settings/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: selectedConfig }),
            });
            const data = await res.json();
            setTestResult({ success: data.success, message: data.message });
        } catch (err) {
            setTestResult({ success: false, message: '테스트 실패' });
        } finally {
            setTesting(false);
        }
    };

    return (
        <FixedLayout topNav={<PFMEATopNav />} showSidebar={true}>
            <div className="p-6 max-w-5xl mx-auto">
                {/* 헤더 */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Mail className="w-7 h-7 text-blue-600" />
                        {t('이메일 설정')} ({t('고객사별')})
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {t('비밀번호 재설정, 알림 이메일 발송을 위한 SMTP 설정')}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* 왼쪽: 고객사 목록 */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-md border border-gray-200">
                            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                                    <Building2 className="w-4 h-4" /> {t('고객사 선택')}
                                </h3>
                            </div>
                            <div className="p-2">
                                {configs.map(config => (
                                    <button
                                        key={config.id}
                                        onClick={() => { setSelectedId(config.id); setTestResult(null); setSaveResult(null); }}
                                        className={`w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center justify-between transition-colors ${selectedId === config.id
                                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                                : 'hover:bg-gray-100 text-gray-700'
                                            }`}
                                    >
                                        <span className="text-sm font-medium">{config.customerName}</span>
                                        {config.isActive && (
                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 오른쪽: 설정 폼 */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-lg shadow-md border border-gray-200">
                            <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
                                <h3 className="font-bold text-white">
                                    📧 {selectedConfig.customerName} {t('설정')}
                                </h3>
                            </div>

                            <div className="p-4 space-y-4">
                                {/* SMTP 설정 */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('SMTP 호스트')}</label>
                                        <input
                                            type="text"
                                            value={selectedConfig.smtpHost}
                                            onChange={(e) => updateConfig('smtpHost', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="smtp.gmail.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('SMTP 포트')}</label>
                                        <input
                                            type="number"
                                            value={selectedConfig.smtpPort}
                                            onChange={(e) => updateConfig('smtpPort', parseInt(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="587"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('SMTP 사용자')} ({t('이메일')})</label>
                                        <input
                                            type="email"
                                            value={selectedConfig.smtpUser}
                                            onChange={(e) => updateConfig('smtpUser', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="your-email@gmail.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('SMTP 비밀번호')} ({t('앱 비밀번호')})</label>
                                        <input
                                            type="password"
                                            value={selectedConfig.smtpPass}
                                            onChange={(e) => updateConfig('smtpPass', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="••••••••••••"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('발신자 이메일')}</label>
                                        <input
                                            type="email"
                                            value={selectedConfig.fromEmail}
                                            onChange={(e) => updateConfig('fromEmail', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="noreply@company.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('발신자 이름')}</label>
                                        <input
                                            type="text"
                                            value={selectedConfig.fromName}
                                            onChange={(e) => updateConfig('fromName', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="FMEA System"
                                        />
                                    </div>
                                </div>

                                {/* 활성화 토글 */}
                                <div className="flex items-center gap-3 py-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedConfig.isActive}
                                            onChange={(e) => updateConfig('isActive', e.target.checked)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">{t('이 설정 활성화')}</span>
                                    </label>
                                </div>

                                {/* 결과 메시지 */}
                                {testResult && (
                                    <div className={`p-3 rounded-lg flex items-center gap-2 ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                        }`}>
                                        {testResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                        {testResult.message}
                                    </div>
                                )}

                                {saveResult && (
                                    <div className={`p-3 rounded-lg flex items-center gap-2 ${saveResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                        }`}>
                                        {saveResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                        {saveResult.message}
                                    </div>
                                )}

                                {/* 버튼들 */}
                                <div className="flex gap-3 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={handleTest}
                                        disabled={testing}
                                        className="flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                                    >
                                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                                        {t('테스트 이메일 발송')}
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        {t('설정 저장')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 안내 */}
                        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h4 className="font-bold text-yellow-800 mb-2">{t('Gmail 사용 시 안내')}</h4>
                            <ul className="text-sm text-yellow-700 space-y-1">
                                <li>• {t('Google 계정에서 2단계 인증을 활성화하세요.')}</li>
                                <li>• {t('앱 비밀번호를 생성하여 SMTP 비밀번호로 사용하세요.')}</li>
                                <li>• {t('설정: Google 계정 → 보안 → 2단계 인증 → 앱 비밀번호')}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </FixedLayout>
    );
}
