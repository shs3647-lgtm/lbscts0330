/**
 * @file license.ts
 * @description 라이선스 검증 모듈
 * - license.lic 파일을 public.key로 서명 검증 + 만료일 체크
 * - 서버 사이드에서만 실행
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

interface LicenseData {
  company: string;
  expire: string;  // "YYYY-MM-DD" 또는 "YYYY-MM-DD HH:MM"
  issuedAt: string;
}

interface LicenseResult {
  valid: boolean;
  company?: string;
  expire?: string;
  error?: string;
}

// 캐시 (매 요청마다 파일 읽기 방지)
let cachedResult: LicenseResult | null = null;
let cachedAt = 0;
const CACHE_TTL = 60 * 1000; // 1분 캐시

export function verifyLicense(): LicenseResult {
  const now = Date.now();
  if (cachedResult && (now - cachedAt) < CACHE_TTL) {
    return cachedResult;
  }

  const result = doVerify();
  cachedResult = result;
  cachedAt = now;
  return result;
}

function doVerify(): LicenseResult {
  try {
    // 프로젝트 루트에서 파일 로드
    const root = process.cwd();
    const licPath = path.join(root, 'license.lic');
    const keyPath = path.join(root, 'public.key');

    if (!fs.existsSync(licPath)) {
      return { valid: false, error: 'license.lic 파일 없음' };
    }
    if (!fs.existsSync(keyPath)) {
      return { valid: false, error: 'public.key 파일 없음' };
    }

    // 파일 읽기
    const licContent = JSON.parse(fs.readFileSync(licPath, 'utf8'));
    const publicKey = fs.readFileSync(keyPath, 'utf8');

    const { data, signature } = licContent;
    if (!data || !signature) {
      return { valid: false, error: '라이선스 파일 형식 오류' };
    }

    // 서명 검증
    const verify = crypto.createVerify('SHA256');
    verify.update(JSON.stringify(data));
    const isValid = verify.verify(publicKey, signature, 'base64');

    if (!isValid) {
      return { valid: false, error: '라이선스 서명 불일치 (위변조 감지)' };
    }

    // 만료일 체크
    const licenseData = data as LicenseData;
    const expireStr = licenseData.expire;
    let expireDate: Date;

    if (expireStr.includes(' ')) {
      // "YYYY-MM-DD HH:MM" 형식
      const [datePart, timePart] = expireStr.split(' ');
      expireDate = new Date(`${datePart}T${timePart}:00Z`);
    } else {
      // "YYYY-MM-DD" 형식 → 당일 23:59:59 UTC
      expireDate = new Date(`${expireStr}T23:59:59Z`);
    }

    if (new Date() > expireDate) {
      return {
        valid: false,
        company: licenseData.company,
        expire: licenseData.expire,
        error: '라이선스 만료',
      };
    }

    return {
      valid: true,
      company: licenseData.company,
      expire: licenseData.expire,
    };
  } catch (e) {
    return { valid: false, error: `라이선스 검증 오류: ${e instanceof Error ? e.message : '알 수 없는 오류'}` };
  }
}
