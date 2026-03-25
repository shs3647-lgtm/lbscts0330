/**
 * @file epDevice.ts
 * @description EP검사장치 (Error Proofing / 자동검사 장치) 타입 정의
 *
 * Excel 구조:
 * | 공정번호 | 공정명 | 구분 | 장치명 | 기능/목적 |
 * | 10 | 자재입고 | 자동검사 | 바코드 스캔 시스템 | 자재 LOT·사양 자동 확인 |
 * | 10 | 자재입고 | Error Proof | 자재코드 불일치 차단 인터록 | 오자재 투입 방지 |
 */

// EP검사장치 구분
export type EPDeviceCategory = 'Error Proof' | '자동검사' | '없음';

// EP검사장치 데이터
export interface EPDevice {
  id: string;
  epNo?: string;           // EP번호: 마스터=EPM-XXX, CP별=EP-{CPID}-XXX
  isMaster?: boolean;      // 마스터 여부 (true=마스터, false=CP별)
  cpNo?: string;           // CP 번호 (CP별 관리 시)
  fmeaId?: string;         // FMEA ID (FMEA별 관리 시)
  processNo: string;       // 공정번호
  processName: string;     // 공정명
  category: EPDeviceCategory;  // 구분 (Error Proof / 자동검사)
  deviceName: string;      // 장치명
  purpose: string;         // 기능/목적
  createdAt?: Date;
  updatedAt?: Date;
}

// 공정별 EP검사장치 그룹
export interface EPDeviceByProcess {
  processNo: string;
  processName: string;
  devices: EPDevice[];
  hasEP: boolean;          // Error Proof 장치 존재 여부
  hasAutoInspect: boolean; // 자동검사 장치 존재 여부
}

// EP검사장치 목록 전체
export interface EPDeviceStore {
  devices: EPDevice[];
  lastUpdated: string;
}

// 빈 EP검사장치 생성
export function createEmptyEPDevice(
  processNo: string = '',
  processName: string = '',
  category: EPDeviceCategory = 'Error Proof',
  isMaster: boolean = false,
  cpNo?: string
): EPDevice {
  return {
    id: `ep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    epNo: '', // 저장 시 자동 생성
    isMaster,
    cpNo: isMaster ? undefined : cpNo,
    processNo,
    processName,
    category,
    deviceName: '',
    purpose: '',
    createdAt: new Date(),
  };
}

// 공정번호로 EP검사장치 그룹화
export function groupDevicesByProcess(devices: EPDevice[]): EPDeviceByProcess[] {
  const processMap = new Map<string, EPDeviceByProcess>();

  devices.forEach(device => {
    const key = device.processNo;
    if (!processMap.has(key)) {
      processMap.set(key, {
        processNo: device.processNo,
        processName: device.processName,
        devices: [],
        hasEP: false,
        hasAutoInspect: false,
      });
    }

    const group = processMap.get(key)!;
    group.devices.push(device);

    if (device.category === 'Error Proof') {
      group.hasEP = true;
    } else if (device.category === '자동검사') {
      group.hasAutoInspect = true;
    }
  });

  // 공정번호 순 정렬
  return Array.from(processMap.values()).sort((a, b) => {
    const numA = parseInt(a.processNo, 10);
    const numB = parseInt(b.processNo, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.processNo.localeCompare(b.processNo, 'ko');
  });
}

// 특정 공정의 EP검사장치 필터링
export function getDevicesForProcess(
  devices: EPDevice[],
  processNo: string,
  category?: EPDeviceCategory
): EPDevice[] {
  return devices.filter(d => {
    if (d.processNo !== processNo) return false;
    if (category && d.category !== category) return false;
    return true;
  });
}

// localStorage 키
export const EP_DEVICE_STORAGE_KEY = 'pfmea_ep_devices';

// EP검사장치 저장
export function saveEPDevices(devices: EPDevice[]): void {
  const store: EPDeviceStore = {
    devices,
    lastUpdated: new Date().toISOString(),
  };
  localStorage.setItem(EP_DEVICE_STORAGE_KEY, JSON.stringify(store));
}

// EP검사장치 로드
export function loadEPDevices(): EPDevice[] {
  try {
    const stored = localStorage.getItem(EP_DEVICE_STORAGE_KEY);
    if (!stored) return [];
    const store: EPDeviceStore = JSON.parse(stored);
    return store.devices || [];
  } catch (e) {
    console.error('EP검사장치 로드 오류:', e);
    return [];
  }
}
