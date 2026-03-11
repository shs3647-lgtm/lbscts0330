/**
 * 매뉴얼 이미지 생성 스크립트
 * Usage: node docs/매뉴얼사진/generate-screenshot.js
 *
 * HTML 모킹업을 Puppeteer로 PNG 변환
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname);

// ============================================================
// 공통 스타일
// ============================================================
const COMMON_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Malgun Gothic', 'Segoe UI', Arial, sans-serif; background: #f0f2f5; }
  .header { background: linear-gradient(135deg, #1e3a5f, #2d5a8e); color: #fff; height: 48px; display: flex; align-items: center; padding: 0 16px; }
  .header .logo { font-weight: 700; font-size: 16px; letter-spacing: 1px; }
  .header .logo span { color: #60a5fa; }
  .header .nav { display: flex; gap: 2px; margin-left: 24px; }
  .header .nav a { color: #cbd5e1; font-size: 12px; padding: 6px 12px; border-radius: 4px 4px 0 0; text-decoration: none; }
  .header .nav a.active { background: rgba(255,255,255,0.15); color: #fff; font-weight: 600; }
  .header .right { margin-left: auto; display: flex; align-items: center; gap: 12px; font-size: 12px; color: #94a3b8; }
  .sidebar { position: fixed; left: 0; top: 48px; width: 200px; height: calc(100% - 48px); background: #1e293b; color: #e2e8f0; padding: 8px 0; overflow-y: auto; }
  .sidebar .menu-group { padding: 8px 12px 4px; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
  .sidebar .menu-item { display: flex; align-items: center; gap: 8px; padding: 8px 16px; font-size: 12px; color: #94a3b8; cursor: pointer; border-left: 3px solid transparent; }
  .sidebar .menu-item:hover { background: rgba(255,255,255,0.05); color: #e2e8f0; }
  .sidebar .menu-item.active { background: rgba(59,130,246,0.15); color: #60a5fa; border-left-color: #3b82f6; font-weight: 600; }
  .main { margin-left: 200px; margin-top: 48px; }
  .menubar { background: #1e293b; padding: 4px 12px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
  .menubar .btn { font-size: 11px; padding: 4px 10px; border-radius: 4px; border: none; cursor: pointer; color: #fff; }
  .menubar .btn-blue { background: rgba(59,130,246,0.5); }
  .menubar .btn-green { background: rgba(34,197,94,0.5); }
  .menubar .btn-yellow { background: rgba(234,179,8,0.5); }
  .menubar .btn-purple { background: rgba(168,85,247,0.5); }
  .menubar .btn-active { background: rgba(234,179,8,0.8); color: #000; font-weight: 700; }
  .menubar .sep { width: 1px; height: 20px; background: #475569; margin: 0 4px; }
  .tab-bar { background: #f8fafc; border-bottom: 2px solid #e2e8f0; display: flex; padding: 0 12px; }
  .tab-bar .tab { padding: 8px 16px; font-size: 12px; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; }
  .tab-bar .tab.active { color: #1d4ed8; border-bottom-color: #1d4ed8; font-weight: 600; }
  table.ws { width: 100%; border-collapse: collapse; font-size: 11px; }
  table.ws th, table.ws td { border: 1px solid #ccc; padding: 3px 6px; vertical-align: middle; white-space: nowrap; }
  .annotation { position: absolute; background: #ef4444; color: #fff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 12px; z-index: 10; white-space: nowrap; }
  .annotation::after { content: ''; position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid #ef4444; }
  .annotation.blue { background: #2563eb; }
  .annotation.blue::after { border-top-color: #2563eb; }
  .annotation.green { background: #16a34a; }
  .annotation.green::after { border-top-color: #16a34a; }
  .annotation.right::after { bottom: auto; top: 50%; right: -6px; left: auto; transform: translateY(-50%); border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-left: 6px solid #ef4444; border-right: none; }
`;

// ============================================================
// 1. 워크시트 ALL 탭 — 리스크분석 + RPN
// ============================================================
function page17_worksheet_all_tab() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${COMMON_STYLES}
</style></head><body style="width:1440px;height:900px;overflow:hidden;position:relative;">

<!-- Header -->
<div class="header">
  <div class="logo">SMART <span>FMEA</span> System</div>
  <div class="nav">
    <a href="#">APQP</a>
    <a class="active" href="#">PFMEA</a>
    <a href="#">DFMEA</a>
    <a href="#">CP</a>
    <a href="#">PFD</a>
  </div>
  <div class="right">
    <span>홍길동 (품질관리팀)</span>
    <span style="background:#3b82f6;padding:4px 8px;border-radius:4px;color:#fff;">로그아웃</span>
  </div>
</div>

<!-- Sidebar -->
<div class="sidebar">
  <div class="menu-group">PFMEA</div>
  <div class="menu-item">프로젝트 등록</div>
  <div class="menu-item">Import</div>
  <div class="menu-item active">워크시트</div>
  <div class="menu-item">개정관리</div>
  <div class="menu-group">연동</div>
  <div class="menu-item">CP 관리계획서</div>
  <div class="menu-item">PFD 공정흐름도</div>
</div>

<!-- Main Area -->
<div class="main">
  <!-- Menu Bar -->
  <div class="menubar">
    <select style="font-size:11px;padding:3px 6px;background:#334155;color:#fff;border:1px solid #475569;border-radius:4px;">
      <option>P-25-001 | 브레이크 패드 ASSY | Master</option>
    </select>
    <div class="sep"></div>
    <button class="btn btn-blue">저장</button>
    <button class="btn btn-blue">Export</button>
    <button class="btn btn-blue">PDF</button>
    <div class="sep"></div>
    <button class="btn btn-green">SOD기준</button>
    <button class="btn btn-purple">5AP</button>
    <button class="btn btn-purple">6AP</button>
    <button class="btn btn-active">RPN</button>
    <div class="sep"></div>
    <button class="btn btn-green">CP연동</button>
    <button class="btn btn-green">PFD연동</button>
  </div>

  <!-- Tab Bar -->
  <div class="tab-bar">
    <div class="tab">구조</div>
    <div class="tab">1L기능</div>
    <div class="tab">2L기능</div>
    <div class="tab">3L기능</div>
    <div class="tab">1L영향</div>
    <div class="tab">2L형태</div>
    <div class="tab">3L원인</div>
    <div class="tab">고장연결</div>
    <div class="tab active" style="color:#d97706;border-bottom-color:#d97706;">ALL</div>
    <div class="tab">최적화</div>
  </div>

  <!-- Worksheet Table -->
  <div style="overflow-x:auto;padding:0;">
    <table class="ws">
      <!-- Step Header Row -->
      <thead>
        <tr>
          <th colspan="4" style="background:#1976d2;color:#fff;text-align:center;font-size:10px;">2단계: 구조분석</th>
          <th colspan="5" style="background:#2e7d32;color:#fff;text-align:center;font-size:10px;">3단계: 기능분석</th>
          <th colspan="6" style="background:#f57c00;color:#fff;text-align:center;font-size:10px;">4단계: 고장분석</th>
          <th colspan="7" style="background:#6a1b9a;color:#fff;text-align:center;font-size:10px;">5단계: 리스크분석</th>
          <th colspan="15" style="background:#2e7d32;color:#fff;text-align:center;font-size:10px;">6단계: 최적화</th>
        </tr>
        <!-- Group Header -->
        <tr style="font-size:10px;">
          <th colspan="2" style="background:#bbdefb;">1. 완제품(1L)</th>
          <th style="background:#c8e6c9;">2. 공정(2L)</th>
          <th style="background:#ffe0b2;">3. 작업요소(3L)</th>
          <th style="background:#bbdefb;">1L 기능</th>
          <th style="background:#c8e6c9;">2L 기능</th>
          <th style="background:#c8e6c9;">제품특성</th>
          <th style="background:#ffe0b2;">3L 기능</th>
          <th style="background:#ffe0b2;">공정특성</th>
          <th style="background:#bbdefb;">고장영향(FE)</th>
          <th style="background:#bbdefb;color:#c62828;font-weight:700;">심각도</th>
          <th style="background:#c8e6c9;">고장형태(FM)</th>
          <th style="background:#ffe0b2;">고장원인(FC)</th>
          <th style="background:#ffe0b2;">4M</th>
          <th style="background:#ffe0b2;">현재 발생도</th>
          <!-- Risk Analysis -->
          <th style="background:#e1bee7;">예방관리</th>
          <th style="background:#e1bee7;">발생도</th>
          <th style="background:#e1bee7;">검출관리</th>
          <th style="background:#e1bee7;">검출도</th>
          <th style="background:#e1bee7;font-weight:700;">AP</th>
          <th style="background:#fff9c4;font-weight:700;color:#b45309;">RPN</th>
          <th style="background:#e1bee7;">특별특성</th>
          <!-- Optimization (abbreviated) -->
          <th style="background:#c8e6c9;">예방관리개선</th>
          <th style="background:#c8e6c9;">검출관리개선</th>
          <th style="background:#c8e6c9;">책임자</th>
          <th style="background:#c8e6c9;">목표완료일</th>
          <th style="background:#c8e6c9;">상태</th>
          <th style="background:#c8e6c9;">개선결과</th>
          <th style="background:#c8e6c9;">완료일</th>
          <th style="background:#ffe0b2;">심각도</th>
          <th style="background:#ffe0b2;">발생도</th>
          <th style="background:#ffe0b2;">검출도</th>
          <th style="background:#ffe0b2;">특별특성</th>
          <th style="background:#ffe0b2;font-weight:700;">AP</th>
          <th style="background:#fff9c4;font-weight:700;color:#b45309;">RPN</th>
          <th style="background:#ffe0b2;">비고</th>
        </tr>
      </thead>
      <tbody>
        <!-- Row 1 -->
        <tr style="height:28px;">
          <td rowspan="6" style="background:#e3f2fd;text-align:center;font-weight:600;writing-mode:vertical-rl;width:20px;">YP</td>
          <td rowspan="6" style="background:#e3f2fd;font-size:10px;">브레이크<br>패드 ASSY</td>
          <td rowspan="3" style="background:#e8f5e9;font-size:10px;">10<br>프레스 성형</td>
          <td style="background:#fff3e0;font-size:10px;">
            <span style="background:#ffebee;color:#d32f2f;padding:1px 4px;border-radius:2px;font-size:9px;">MN</span>
            프레스 조작
          </td>
          <td rowspan="6" style="background:#e3f2fd;font-size:10px;">제동력 전달</td>
          <td rowspan="3" style="background:#e8f5e9;font-size:10px;">소재를 금형에<br>투입하여 성형</td>
          <td rowspan="3" style="background:#e8f5e9;font-size:10px;">외관 품질</td>
          <td style="background:#fff3e0;font-size:10px;">장비 세팅<br>확인</td>
          <td style="background:#fff3e0;font-size:10px;">프레스 압력</td>
          <td rowspan="3" style="background:#e3f2fd;font-size:10px;">브레이크 성능<br>저하 → 제동거리<br>증가</td>
          <td rowspan="3" style="background:#e8f5e9;text-align:center;font-weight:700;color:#c62828;font-size:14px;">8</td>
          <td rowspan="3" style="background:#c8e6c9;font-size:10px;">패드 두께 불균일</td>
          <!-- FC rows -->
          <td style="background:#fff3e0;font-size:10px;">프레스 압력 부족</td>
          <td style="background:#fff3e0;text-align:center;font-size:9px;"><span style="background:#ffebee;color:#d32f2f;padding:1px 3px;border-radius:2px;">MN</span></td>
          <td style="background:#fff3e0;text-align:center;font-size:10px;">5</td>
          <!-- Risk Analysis -->
          <td style="background:#f3e5f5;font-size:10px;">작업표준서 교육</td>
          <td style="background:#f3e5f5;text-align:center;font-weight:700;color:#f57f17;">5</td>
          <td style="background:#f3e5f5;font-size:10px;">초물검사</td>
          <td style="background:#f3e5f5;text-align:center;font-weight:700;color:#f57f17;">4</td>
          <td style="background:#ef5350;text-align:center;color:#fff;font-weight:700;">H</td>
          <td style="background:#fff9c4;text-align:center;font-weight:700;color:#f57f17;">160</td>
          <td style="background:#f3e5f5;text-align:center;"></td>
          <!-- Optimization -->
          <td style="background:#e8f5e9;font-size:9px;">압력 자동감지<br>센서 설치</td>
          <td style="background:#e8f5e9;font-size:9px;">자동검사 장비<br>도입</td>
          <td style="background:#e8f5e9;font-size:9px;text-align:center;">김공정</td>
          <td style="background:#e8f5e9;font-size:9px;text-align:center;">2026-06-30</td>
          <td style="background:#e8f5e9;font-size:9px;text-align:center;color:#16a34a;">완료</td>
          <td style="background:#e8f5e9;font-size:9px;">센서 설치 완료</td>
          <td style="background:#e8f5e9;font-size:9px;text-align:center;">2026-06-28</td>
          <td style="background:#fff3e0;text-align:center;font-weight:700;color:#c62828;font-size:12px;">8</td>
          <td style="background:#fff3e0;text-align:center;font-weight:700;color:#2e7d32;font-size:12px;">3</td>
          <td style="background:#fff3e0;text-align:center;font-weight:700;color:#2e7d32;font-size:12px;">3</td>
          <td style="background:#fff3e0;text-align:center;"></td>
          <td style="background:#66bb6a;text-align:center;color:#fff;font-weight:700;">L</td>
          <td style="background:#fff9c4;text-align:center;font-weight:700;color:#2e7d32;">72</td>
          <td style="background:#fff3e0;"></td>
        </tr>
        <!-- Row 2 -->
        <tr style="height:28px;">
          <td style="background:#fff8e1;font-size:10px;">
            <span style="background:#e3f2fd;color:#1565c0;padding:1px 4px;border-radius:2px;font-size:9px;">MC</span>
            금형 관리
          </td>
          <td style="background:#fff8e1;font-size:10px;">금형 점검<br>실시</td>
          <td style="background:#fff8e1;font-size:10px;">금형 마모량</td>
          <td style="background:#fff8e1;font-size:10px;">금형 마모</td>
          <td style="background:#fff8e1;text-align:center;font-size:9px;"><span style="background:#e3f2fd;color:#1565c0;padding:1px 3px;border-radius:2px;">MC</span></td>
          <td style="background:#fff8e1;text-align:center;font-size:10px;">4</td>
          <td style="background:#f3e5f5;font-size:10px;">금형 정기보전</td>
          <td style="background:#f3e5f5;text-align:center;font-weight:700;color:#f57f17;">4</td>
          <td style="background:#f3e5f5;font-size:10px;">치수 검사</td>
          <td style="background:#f3e5f5;text-align:center;font-weight:700;color:#f57f17;">5</td>
          <td style="background:#ef5350;text-align:center;color:#fff;font-weight:700;">H</td>
          <td style="background:#fff9c4;text-align:center;font-weight:700;color:#f57f17;">160</td>
          <td style="background:#f3e5f5;text-align:center;"></td>
          <td style="background:#e8f5e9;font-size:9px;">마모 센서 부착</td>
          <td style="background:#e8f5e9;font-size:9px;">SPC 관리도 적용</td>
          <td style="background:#e8f5e9;font-size:9px;text-align:center;">이설비</td>
          <td style="background:#e8f5e9;font-size:9px;text-align:center;">2026-07-15</td>
          <td style="background:#e8f5e9;font-size:9px;text-align:center;color:#b45309;">진행중</td>
          <td style="background:#e8f5e9;font-size:9px;"></td>
          <td style="background:#e8f5e9;font-size:9px;text-align:center;"></td>
          <td style="background:#fff3e0;text-align:center;font-weight:700;color:#c62828;font-size:12px;">8</td>
          <td style="background:#fff3e0;text-align:center;font-weight:700;color:#2e7d32;font-size:12px;">2</td>
          <td style="background:#fff3e0;text-align:center;font-weight:700;color:#2e7d32;font-size:12px;">3</td>
          <td style="background:#fff3e0;text-align:center;"></td>
          <td style="background:#66bb6a;text-align:center;color:#fff;font-weight:700;">L</td>
          <td style="background:#fff9c4;text-align:center;font-weight:700;color:#2e7d32;">48</td>
          <td style="background:#fff3e0;"></td>
        </tr>
        <!-- Row 3 -->
        <tr style="height:28px;">
          <td style="background:#fff3e0;font-size:10px;">
            <span style="background:#e8f5e9;color:#2e7d32;padding:1px 4px;border-radius:2px;font-size:9px;">IM</span>
            이형제 도포
          </td>
          <td style="background:#fff3e0;font-size:10px;">이형제<br>적정량 도포</td>
          <td style="background:#fff3e0;font-size:10px;">이형제 농도</td>
          <td style="background:#fff3e0;font-size:10px;">이형제 부적합</td>
          <td style="background:#fff3e0;text-align:center;font-size:9px;"><span style="background:#e8f5e9;color:#2e7d32;padding:1px 3px;border-radius:2px;">IM</span></td>
          <td style="background:#fff3e0;text-align:center;font-size:10px;">3</td>
          <td style="background:#f3e5f5;font-size:10px;">농도 관리기준</td>
          <td style="background:#f3e5f5;text-align:center;font-weight:700;color:#2e7d32;">3</td>
          <td style="background:#f3e5f5;font-size:10px;">입고검사</td>
          <td style="background:#f3e5f5;text-align:center;font-weight:700;color:#f57f17;">6</td>
          <td style="background:#ffeb3b;text-align:center;color:#000;font-weight:700;">M</td>
          <td style="background:#fff9c4;text-align:center;font-weight:700;color:#f57f17;">144</td>
          <td style="background:#f3e5f5;text-align:center;"></td>
          <td style="background:#e8f5e9;font-size:9px;">자동도포기 도입</td>
          <td style="background:#e8f5e9;font-size:9px;">N/A</td>
          <td style="background:#e8f5e9;font-size:9px;text-align:center;">박부자재</td>
          <td style="background:#e8f5e9;font-size:9px;text-align:center;">2026-08-01</td>
          <td style="background:#e8f5e9;font-size:9px;text-align:center;color:#dc2626;">미착수</td>
          <td style="background:#e8f5e9;font-size:9px;"></td>
          <td style="background:#e8f5e9;font-size:9px;text-align:center;"></td>
          <td style="background:#fff3e0;text-align:center;font-size:11px;color:#999;">8</td>
          <td style="background:#fff3e0;text-align:center;font-size:11px;color:#999;">-</td>
          <td style="background:#fff3e0;text-align:center;font-size:11px;color:#999;">-</td>
          <td style="background:#fff3e0;text-align:center;"></td>
          <td style="background:#fff3e0;text-align:center;color:#999;">-</td>
          <td style="background:#fff9c4;text-align:center;color:#999;">-</td>
          <td style="background:#fff3e0;"></td>
        </tr>
        <!-- Row 4-6: Second Process -->
        <tr style="height:28px;">
          <td rowspan="3" style="background:#e8f5e9;font-size:10px;">20<br>열처리</td>
          <td style="background:#fff3e0;font-size:10px;">
            <span style="background:#ffebee;color:#d32f2f;padding:1px 4px;border-radius:2px;font-size:9px;">MN</span>
            로 투입
          </td>
          <td rowspan="3" style="background:#e8f5e9;font-size:10px;">규정 온도에서<br>열처리 실시</td>
          <td rowspan="3" style="background:#e8f5e9;font-size:10px;">경도</td>
          <td style="background:#fff3e0;font-size:10px;">온도 설정<br>확인</td>
          <td style="background:#fff3e0;font-size:10px;">로 온도</td>
          <td rowspan="3" style="background:#e3f2fd;font-size:10px;">패드 파손 →<br>제동력 상실</td>
          <td rowspan="3" style="background:#e8f5e9;text-align:center;font-weight:700;color:#c62828;font-size:14px;">9</td>
          <td rowspan="3" style="background:#c8e6c9;font-size:10px;">경도 부족</td>
          <td style="background:#fff3e0;font-size:10px;">온도 설정 오류</td>
          <td style="background:#fff3e0;text-align:center;font-size:9px;"><span style="background:#ffebee;color:#d32f2f;padding:1px 3px;border-radius:2px;">MN</span></td>
          <td style="background:#fff3e0;text-align:center;font-size:10px;">4</td>
          <td style="background:#f3e5f5;font-size:10px;">작업자 교육</td>
          <td style="background:#f3e5f5;text-align:center;font-weight:700;color:#f57f17;">6</td>
          <td style="background:#f3e5f5;font-size:10px;">경도 시험</td>
          <td style="background:#f3e5f5;text-align:center;font-weight:700;color:#f57f17;">4</td>
          <td style="background:#ef5350;text-align:center;color:#fff;font-weight:700;">H</td>
          <td style="background:#fff9c4;text-align:center;font-weight:700;color:#c62828;">216</td>
          <td style="background:#f3e5f5;text-align:center;font-size:9px;font-weight:700;color:#ef5350;">CC</td>
          <td style="background:#e8f5e9;font-size:9px;">Fool-proof<br>시스템 도입</td>
          <td style="background:#e8f5e9;font-size:9px;">100% 자동<br>경도 검사</td>
          <td style="background:#e8f5e9;font-size:9px;text-align:center;">최안전</td>
          <td style="background:#e8f5e9;font-size:9px;text-align:center;">2026-05-30</td>
          <td style="background:#e8f5e9;font-size:9px;text-align:center;color:#16a34a;">완료</td>
          <td style="background:#e8f5e9;font-size:9px;">시스템 적용<br>완료</td>
          <td style="background:#e8f5e9;font-size:9px;text-align:center;">2026-05-28</td>
          <td style="background:#fff3e0;text-align:center;font-weight:700;color:#c62828;font-size:12px;">9</td>
          <td style="background:#fff3e0;text-align:center;font-weight:700;color:#2e7d32;font-size:12px;">2</td>
          <td style="background:#fff3e0;text-align:center;font-weight:700;color:#2e7d32;font-size:12px;">2</td>
          <td style="background:#fff3e0;text-align:center;font-size:9px;font-weight:700;color:#ef5350;">CC</td>
          <td style="background:#66bb6a;text-align:center;color:#fff;font-weight:700;">L</td>
          <td style="background:#fff9c4;text-align:center;font-weight:700;color:#2e7d32;">36</td>
          <td style="background:#fff3e0;"></td>
        </tr>
        <tr style="height:28px;">
          <td style="background:#fff8e1;font-size:10px;">
            <span style="background:#e3f2fd;color:#1565c0;padding:1px 4px;border-radius:2px;font-size:9px;">MC</span>
            로(Furnace)
          </td>
          <td style="background:#fff8e1;font-size:10px;">로 온도<br>관리</td>
          <td style="background:#fff8e1;font-size:10px;">히터 출력</td>
          <td style="background:#fff8e1;font-size:10px;">히터 열화</td>
          <td style="background:#fff8e1;text-align:center;font-size:9px;"><span style="background:#e3f2fd;color:#1565c0;padding:1px 3px;border-radius:2px;">MC</span></td>
          <td style="background:#fff8e1;text-align:center;font-size:10px;">3</td>
          <td style="background:#f3e5f5;font-size:10px;">설비 정기보전</td>
          <td style="background:#f3e5f5;text-align:center;font-weight:700;color:#2e7d32;">3</td>
          <td style="background:#f3e5f5;font-size:10px;">온도 기록계</td>
          <td style="background:#f3e5f5;text-align:center;font-weight:700;color:#2e7d32;">3</td>
          <td style="background:#66bb6a;text-align:center;color:#fff;font-weight:700;">L</td>
          <td style="background:#fff9c4;text-align:center;font-weight:700;color:#2e7d32;">81</td>
          <td style="background:#f3e5f5;text-align:center;"></td>
          <td colspan="14" style="background:#f1f5f9;text-align:center;color:#94a3b8;font-size:10px;">AP=L → 최적화 불필요</td>
          <td style="background:#fff3e0;"></td>
        </tr>
        <tr style="height:28px;">
          <td style="background:#fff3e0;font-size:10px;">
            <span style="background:#fff3e0;color:#f57c00;padding:1px 4px;border-radius:2px;font-size:9px;">EN</span>
            작업환경
          </td>
          <td style="background:#fff3e0;font-size:10px;">환경온도<br>관리</td>
          <td style="background:#fff3e0;font-size:10px;">실내 온도</td>
          <td style="background:#fff3e0;font-size:10px;">환경 온도 변동</td>
          <td style="background:#fff3e0;text-align:center;font-size:9px;"><span style="background:#fff3e0;color:#f57c00;padding:1px 3px;border-radius:2px;">EN</span></td>
          <td style="background:#fff3e0;text-align:center;font-size:10px;">2</td>
          <td style="background:#f3e5f5;font-size:10px;">환기시스템</td>
          <td style="background:#f3e5f5;text-align:center;font-weight:700;color:#2e7d32;">2</td>
          <td style="background:#f3e5f5;font-size:10px;">온습도 모니터</td>
          <td style="background:#f3e5f5;text-align:center;font-weight:700;color:#2e7d32;">2</td>
          <td style="background:#66bb6a;text-align:center;color:#fff;font-weight:700;">L</td>
          <td style="background:#fff9c4;text-align:center;font-weight:700;color:#2e7d32;">36</td>
          <td style="background:#f3e5f5;text-align:center;"></td>
          <td colspan="14" style="background:#f1f5f9;text-align:center;color:#94a3b8;font-size:10px;">AP=L → 최적화 불필요</td>
          <td style="background:#fff3e0;"></td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- Annotations -->
<div class="annotation blue" style="top:100px;left:220px;">ALL 탭 = 2~6단계 통합 뷰</div>
<div class="annotation" style="top:55px;right:180px;">RPN 버튼 활성화 (노란색)</div>
<div class="annotation green" style="top:175px;right:55px;">RPN 컬럼 (S x O x D)</div>
<div class="annotation" style="bottom:130px;left:760px;">AP=H: 빨강 | AP=M: 노랑 | AP=L: 초록</div>
<div class="annotation blue" style="bottom:45px;left:320px;">4M 배지: MN(사람)빨강 MC(설비)파랑 IM(부자재)초록 EN(환경)주황</div>

</body></html>`;
}

// ============================================================
// 2. 워크시트 화면 구성 개요
// ============================================================
function page10_worksheet_layout() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${COMMON_STYLES}
.zone { position: absolute; border: 3px dashed; border-radius: 8px; display: flex; align-items: flex-start; justify-content: flex-start; padding: 4px 8px; }
.zone-label { font-size: 13px; font-weight: 700; padding: 2px 8px; border-radius: 4px; color: #fff; }
</style></head><body style="width:1440px;height:900px;overflow:hidden;position:relative;">

<!-- Header -->
<div class="header">
  <div class="logo">SMART <span>FMEA</span> System</div>
  <div class="nav">
    <a href="#">APQP</a>
    <a class="active" href="#">PFMEA</a>
    <a href="#">DFMEA</a>
    <a href="#">CP</a>
    <a href="#">PFD</a>
  </div>
  <div class="right"><span>홍길동</span></div>
</div>
<div class="sidebar">
  <div class="menu-group">PFMEA</div>
  <div class="menu-item">프로젝트 등록</div>
  <div class="menu-item">Import</div>
  <div class="menu-item active">워크시트</div>
</div>
<div class="main">
  <div class="menubar">
    <select style="font-size:11px;padding:3px 6px;background:#334155;color:#fff;border:1px solid #475569;border-radius:4px;"><option>P-25-001 | 브레이크 패드 ASSY</option></select>
    <div class="sep"></div>
    <button class="btn btn-blue">저장</button>
    <button class="btn btn-blue">Export</button>
    <button class="btn btn-blue">PDF</button>
    <div class="sep"></div>
    <button class="btn btn-green">SOD기준</button>
    <button class="btn btn-purple">5AP</button>
    <button class="btn btn-purple">6AP</button>
    <button class="btn btn-yellow">RPN</button>
  </div>
  <div class="tab-bar">
    <div class="tab">구조</div><div class="tab">1L기능</div><div class="tab">2L기능</div><div class="tab">3L기능</div>
    <div class="tab">1L영향</div><div class="tab">2L형태</div><div class="tab">3L원인</div>
    <div class="tab">고장연결</div><div class="tab active" style="color:#d97706;border-bottom-color:#d97706;">ALL</div><div class="tab">최적화</div>
  </div>
  <div style="height:calc(100% - 120px);background:#fff;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:24px;">
    워크시트 데이터 영역
  </div>
</div>

<!-- Zone Overlays -->
<div class="zone" style="top:0;left:0;width:1440px;height:48px;border-color:#ef4444;">
  <span class="zone-label" style="background:#ef4444;">A 상단 헤더 (네비게이션)</span>
</div>
<div class="zone" style="top:48px;left:0;width:200px;height:852px;border-color:#3b82f6;">
  <span class="zone-label" style="background:#3b82f6;">B 사이드바 (모듈 메뉴)</span>
</div>
<div class="zone" style="top:48px;left:200px;width:1240px;height:36px;border-color:#f59e0b;">
  <span class="zone-label" style="background:#f59e0b;">C 메뉴바 (프로젝트 선택 + 기능 버튼)</span>
</div>
<div class="zone" style="top:84px;left:200px;width:1240px;height:36px;border-color:#8b5cf6;">
  <span class="zone-label" style="background:#8b5cf6;">D 탭바 (2~6단계 분석 탭)</span>
</div>
<div class="zone" style="top:120px;left:200px;width:1240px;height:780px;border-color:#10b981;">
  <span class="zone-label" style="background:#10b981;">E 워크시트 (데이터 테이블)</span>
</div>

</body></html>`;
}

// ============================================================
// 3. 프로젝트 등록 화면
// ============================================================
function page07_project_register() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${COMMON_STYLES}
.form-area { padding: 24px; max-width: 1000px; margin: 0 auto; }
.form-title { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 16px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
.form-section { background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 16px; overflow: hidden; }
.form-section-title { background: #f1f5f9; padding: 10px 16px; font-weight: 600; font-size: 13px; color: #334155; border-bottom: 1px solid #e2e8f0; }
.form-row { display: flex; border-bottom: 1px solid #f1f5f9; }
.form-row:last-child { border-bottom: none; }
.form-label { width: 160px; background: #f8fafc; padding: 10px 16px; font-size: 12px; font-weight: 600; color: #475569; display: flex; align-items: center; border-right: 1px solid #e2e8f0; }
.form-label .req { color: #ef4444; margin-left: 4px; }
.form-value { flex: 1; padding: 8px 16px; display: flex; align-items: center; }
.form-input { width: 100%; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; }
.form-select { padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; background: #fff; }
.form-btn { padding: 8px 24px; border: none; border-radius: 4px; font-size: 13px; font-weight: 600; cursor: pointer; }
.form-btn-primary { background: #3b82f6; color: #fff; }
.form-btn-secondary { background: #e2e8f0; color: #475569; }
</style></head><body style="width:1440px;height:960px;overflow:hidden;position:relative;">

<div class="header">
  <div class="logo">SMART <span>FMEA</span> System</div>
  <div class="nav"><a href="#">APQP</a><a class="active" href="#">PFMEA</a><a href="#">DFMEA</a><a href="#">CP</a></div>
  <div class="right"><span>홍길동</span></div>
</div>
<div class="sidebar">
  <div class="menu-group">PFMEA</div>
  <div class="menu-item active">프로젝트 등록</div>
  <div class="menu-item">Import</div>
  <div class="menu-item">워크시트</div>
</div>
<div class="main">
  <div class="form-area">
    <div class="form-title">PFMEA 프로젝트 등록 (1단계: 기획 및 준비)</div>

    <div class="form-section">
      <div class="form-section-title">기본 정보</div>
      <div class="form-row">
        <div class="form-label">FMEA 유형<span class="req">*</span></div>
        <div class="form-value"><select class="form-select"><option>P-FMEA (공정 FMEA)</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-label">FMEA ID<span class="req">*</span></div>
        <div class="form-value"><input class="form-input" value="P-25-001" style="width:200px;" /></div>
      </div>
      <div class="form-row">
        <div class="form-label">주제/범위<span class="req">*</span></div>
        <div class="form-value"><input class="form-input" value="브레이크 패드 ASSY + 프레스 성형 ~ 최종검사" /></div>
      </div>
      <div class="form-row">
        <div class="form-label">고객사</div>
        <div class="form-value"><select class="form-select"><option>현대자동차</option></select></div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">제품/공정 정보</div>
      <div class="form-row">
        <div class="form-label">제품명<span class="req">*</span></div>
        <div class="form-value"><input class="form-input" value="브레이크 패드 ASSY" style="width:300px;" /></div>
      </div>
      <div class="form-row">
        <div class="form-label">도면번호</div>
        <div class="form-value"><input class="form-input" value="BP-2025-A001" style="width:200px;" /></div>
      </div>
      <div class="form-row">
        <div class="form-label">공장</div>
        <div class="form-value"><select class="form-select"><option>평택공장</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-label">모델연도</div>
        <div class="form-value"><input class="form-input" value="2026" style="width:100px;" /></div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">팀 구성</div>
      <div class="form-row">
        <div class="form-label">FMEA 책임자<span class="req">*</span></div>
        <div class="form-value"><input class="form-input" value="홍길동 (품질관리팀 과장)" style="width:300px;" /></div>
      </div>
      <div class="form-row">
        <div class="form-label">CFT 멤버</div>
        <div class="form-value">
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
            <span style="background:#dbeafe;color:#1d4ed8;padding:3px 8px;border-radius:12px;font-size:11px;">김공정 (생산기술)</span>
            <span style="background:#dbeafe;color:#1d4ed8;padding:3px 8px;border-radius:12px;font-size:11px;">이설비 (설비보전)</span>
            <span style="background:#dbeafe;color:#1d4ed8;padding:3px 8px;border-radius:12px;font-size:11px;">박부자재 (구매)</span>
            <span style="background:#dbeafe;color:#1d4ed8;padding:3px 8px;border-radius:12px;font-size:11px;">최안전 (안전관리)</span>
            <span style="background:#e2e8f0;color:#64748b;padding:3px 8px;border-radius:12px;font-size:11px;cursor:pointer;">+ 추가</span>
          </div>
        </div>
      </div>
    </div>

    <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;">
      <button class="form-btn form-btn-secondary">목록으로</button>
      <button class="form-btn form-btn-primary">등록</button>
    </div>
  </div>
</div>

<!-- Annotations -->
<div class="annotation blue" style="top:78px;left:500px;">1단계(기획 및 준비) = 프로젝트 등록</div>
<div class="annotation" style="top:210px;right:60px;">FMEA ID: 자동채번 또는 수동입력</div>
<div class="annotation green" style="bottom:180px;right:60px;">CFT 멤버: 다부문팀 구성 필수</div>

</body></html>`;
}

// ============================================================
// 4. Import 화면
// ============================================================
function page09_import() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${COMMON_STYLES}
.import-area { display: flex; height: calc(100vh - 84px); }
.import-left { width: 50%; border-right: 2px solid #e2e8f0; display: flex; flex-direction: column; }
.import-right { width: 50%; display: flex; flex-direction: column; }
.import-header { background: #f1f5f9; padding: 8px 12px; font-size: 13px; font-weight: 600; color: #334155; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8px; }
.import-content { flex: 1; padding: 12px; overflow: auto; }
.dropzone { border: 2px dashed #94a3b8; border-radius: 8px; padding: 32px; text-align: center; background: #f8fafc; margin-bottom: 16px; }
.dropzone-icon { font-size: 36px; color: #94a3b8; margin-bottom: 8px; }
.preview-table { width: 100%; border-collapse: collapse; font-size: 10px; }
.preview-table th { background: #1e40af; color: #fff; padding: 4px 6px; text-align: center; white-space: nowrap; }
.preview-table td { border: 1px solid #d1d5db; padding: 3px 6px; }
.verify-bar { background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 8px 12px; margin: 8px 0; font-size: 11px; }
.verify-item { display: flex; justify-content: space-between; padding: 2px 0; }
.verify-ok { color: #16a34a; font-weight: 600; }
.verify-warn { color: #dc2626; font-weight: 600; }
.badge { padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: 600; }
</style></head><body style="width:1440px;height:900px;overflow:hidden;position:relative;">

<div class="header">
  <div class="logo">SMART <span>FMEA</span> System</div>
  <div class="nav"><a href="#">APQP</a><a class="active" href="#">PFMEA</a><a href="#">DFMEA</a></div>
  <div class="right"><span>홍길동</span></div>
</div>
<div class="sidebar">
  <div class="menu-group">PFMEA</div>
  <div class="menu-item">프로젝트 등록</div>
  <div class="menu-item active">Import</div>
  <div class="menu-item">워크시트</div>
</div>
<div class="main">
  <div class="import-area">
    <!-- Left: Upload & Template List -->
    <div class="import-left">
      <div class="import-header">
        <span style="font-size:16px;">📁</span> 기초정보 Import
        <span style="margin-left:auto;background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:4px;font-size:10px;">P-25-001</span>
      </div>
      <div class="import-content">
        <div class="dropzone">
          <div class="dropzone-icon">📤</div>
          <div style="font-size:13px;color:#475569;font-weight:600;">엑셀 파일을 드래그 & 드롭하세요</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:4px;">또는 <span style="color:#3b82f6;cursor:pointer;">파일 선택</span> (.xlsx, .xls)</div>
        </div>

        <div style="font-size:12px;font-weight:600;color:#334155;margin-bottom:8px;">업로드된 템플릿</div>
        <div style="border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
          <div style="display:flex;align-items:center;padding:8px 12px;background:#f0f9ff;border-bottom:1px solid #e2e8f0;">
            <span style="font-size:14px;margin-right:8px;">📊</span>
            <div>
              <div style="font-size:12px;font-weight:600;">브레이크패드_기초정보.xlsx</div>
              <div style="font-size:10px;color:#64748b;">2026-02-15 | 6 시트 | 128 항목</div>
            </div>
            <span class="badge" style="margin-left:auto;background:#dcfce7;color:#16a34a;">파싱 완료</span>
          </div>
        </div>

        <div class="verify-bar" style="margin-top:12px;">
          <div style="font-weight:600;margin-bottom:4px;">📋 Import 검증 결과</div>
          <div class="verify-item"><span>A1 완제품명</span><span class="verify-ok">✓ 1건</span></div>
          <div class="verify-item"><span>A2 공정명</span><span class="verify-ok">✓ 12건</span></div>
          <div class="verify-item"><span>A3 1L 기능</span><span class="verify-ok">✓ 5건</span></div>
          <div class="verify-item"><span>B1 작업요소</span><span class="verify-ok">✓ 48건</span></div>
          <div class="verify-item"><span>C1 고장영향(FE)</span><span class="verify-ok">✓ 15건</span></div>
          <div class="verify-item"><span>C2 고장형태(FM)</span><span class="verify-ok">✓ 24건</span></div>
          <div class="verify-item"><span>C3 고장원인(FC)</span><span class="verify-ok">✓ 62건</span></div>
          <div class="verify-item"><span>A6 검출관리(DC)</span><span class="verify-ok">✓ 62건</span></div>
          <div class="verify-item"><span>B5 예방관리(PC)</span><span class="verify-ok">✓ 62건</span></div>
        </div>
      </div>
    </div>

    <!-- Right: Preview -->
    <div class="import-right">
      <div class="import-header">
        <span style="font-size:16px;">👁️</span> 미리보기
        <div style="margin-left:auto;display:flex;gap:4px;">
          <button class="btn btn-blue" style="font-size:10px;padding:3px 8px;">A1</button>
          <button class="btn btn-blue" style="font-size:10px;padding:3px 8px;">A2</button>
          <button class="btn btn-green" style="font-size:10px;padding:3px 8px;background:rgba(34,197,94,0.7);">B1</button>
          <button class="btn" style="font-size:10px;padding:3px 8px;background:rgba(249,115,22,0.7);">C2</button>
          <button class="btn" style="font-size:10px;padding:3px 8px;background:rgba(249,115,22,0.5);">C3</button>
        </div>
      </div>
      <div class="import-content">
        <div style="font-size:11px;color:#475569;margin-bottom:8px;"><strong>시트: C3 고장원인(FC)</strong> — 62건 파싱됨</div>
        <table class="preview-table">
          <thead>
            <tr>
              <th style="width:30px;">No</th>
              <th>공정번호</th>
              <th>공정명</th>
              <th>구분</th>
              <th>4M</th>
              <th>고장원인</th>
              <th>현재 발생도</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align:center;">1</td>
              <td style="text-align:center;">10</td>
              <td>프레스 성형</td>
              <td style="text-align:center;">YP</td>
              <td style="text-align:center;"><span class="badge" style="background:#ffebee;color:#d32f2f;">MN</span></td>
              <td>프레스 압력 부족</td>
              <td style="text-align:center;">5</td>
            </tr>
            <tr style="background:#f8fafc;">
              <td style="text-align:center;">2</td>
              <td style="text-align:center;">10</td>
              <td>프레스 성형</td>
              <td style="text-align:center;">YP</td>
              <td style="text-align:center;"><span class="badge" style="background:#e3f2fd;color:#1565c0;">MC</span></td>
              <td>금형 마모</td>
              <td style="text-align:center;">4</td>
            </tr>
            <tr>
              <td style="text-align:center;">3</td>
              <td style="text-align:center;">10</td>
              <td>프레스 성형</td>
              <td style="text-align:center;">YP</td>
              <td style="text-align:center;"><span class="badge" style="background:#e8f5e9;color:#2e7d32;">IM</span></td>
              <td>이형제 부적합</td>
              <td style="text-align:center;">3</td>
            </tr>
            <tr style="background:#f8fafc;">
              <td style="text-align:center;">4</td>
              <td style="text-align:center;">20</td>
              <td>열처리</td>
              <td style="text-align:center;">YP</td>
              <td style="text-align:center;"><span class="badge" style="background:#ffebee;color:#d32f2f;">MN</span></td>
              <td>온도 설정 오류</td>
              <td style="text-align:center;">4</td>
            </tr>
            <tr>
              <td style="text-align:center;">5</td>
              <td style="text-align:center;">20</td>
              <td>열처리</td>
              <td style="text-align:center;">YP</td>
              <td style="text-align:center;"><span class="badge" style="background:#e3f2fd;color:#1565c0;">MC</span></td>
              <td>히터 열화</td>
              <td style="text-align:center;">3</td>
            </tr>
            <tr style="background:#f8fafc;">
              <td style="text-align:center;">6</td>
              <td style="text-align:center;">20</td>
              <td>열처리</td>
              <td style="text-align:center;">YP</td>
              <td style="text-align:center;"><span class="badge" style="background:#fff3e0;color:#f57c00;">EN</span></td>
              <td>환경 온도 변동</td>
              <td style="text-align:center;">2</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end;">
          <button class="btn btn-blue" style="padding:6px 16px;font-size:12px;">워크시트에 반영</button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Annotations -->
<div class="annotation blue" style="top:75px;left:310px;">엑셀 파일 드래그&드롭 업로드</div>
<div class="annotation green" style="top:370px;left:230px;">14항목 자동 검증 (건수 확인)</div>
<div class="annotation" style="top:75px;right:100px;">시트별 미리보기 (탭 전환)</div>

</body></html>`;
}

// ============================================================
// 5. 로그인 화면
// ============================================================
function page04_login() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${COMMON_STYLES}
.login-bg { width: 100%; height: 100%; background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e293b 100%); display: flex; align-items: center; justify-content: center; }
.login-card { background: #fff; border-radius: 16px; padding: 40px 48px; width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.login-logo { text-align: center; margin-bottom: 24px; }
.login-logo h1 { font-size: 28px; color: #1e293b; }
.login-logo h1 span { color: #3b82f6; }
.login-logo p { color: #64748b; font-size: 12px; margin-top: 4px; }
.login-field { margin-bottom: 16px; }
.login-field label { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px; }
.login-field input { width: 100%; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 13px; }
.login-btn { width: 100%; padding: 12px; background: #3b82f6; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 8px; }
.login-footer { text-align: center; margin-top: 16px; font-size: 12px; color: #64748b; }
.login-footer a { color: #3b82f6; text-decoration: none; }
</style></head><body style="width:1440px;height:900px;overflow:hidden;position:relative;">
<div class="login-bg">
  <div class="login-card">
    <div class="login-logo">
      <h1>SMART <span>FMEA</span></h1>
      <p>AIAG-VDA FMEA 1st Edition 기반 품질관리 시스템</p>
    </div>
    <div class="login-field">
      <label>이메일</label>
      <input type="email" placeholder="user@company.com" value="hong@company.com" />
    </div>
    <div class="login-field">
      <label>비밀번호</label>
      <input type="password" placeholder="비밀번호 입력" value="••••••••" />
    </div>
    <button class="login-btn">로그인</button>
    <div class="login-footer">
      계정이 없으신가요? <a href="#">회원가입</a>
    </div>
  </div>
</div>

<div class="annotation blue" style="top:280px;right:380px;">이메일 = 로그인 ID</div>
<div class="annotation" style="top:350px;right:380px;">최초 비밀번호 = 전화번호(숫자만)</div>
<div class="annotation green" style="bottom:300px;right:380px;">관리자 승인 후 로그인 가능</div>

</body></html>`;
}

// ============================================================
// 메인 실행
// ============================================================
const PAGES = [
  { fn: page04_login,           name: '04_로그인_화면',          width: 1440, height: 900 },
  { fn: page07_project_register, name: '07_프로젝트등록_화면',    width: 1440, height: 960 },
  { fn: page09_import,          name: '09_Import_기초정보',      width: 1440, height: 900 },
  { fn: page10_worksheet_layout, name: '10_워크시트_화면구성',    width: 1440, height: 900 },
  { fn: page17_worksheet_all_tab, name: '17_ALL탭_리스크분석_RPN', width: 1440, height: 900 },
];

(async () => {
  console.log('🚀 매뉴얼 이미지 생성 시작...');

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-device-scale-factor=1'],
  });

  for (const page of PAGES) {
    const pg = await browser.newPage();
    await pg.setViewport({ width: page.width, height: page.height, deviceScaleFactor: 2 });

    const html = page.fn();
    await pg.setContent(html, { waitUntil: 'networkidle0' });

    const outPath = path.join(OUTPUT_DIR, `${page.name}.png`);
    await pg.screenshot({ path: outPath, fullPage: false });
    await pg.close();

    const stats = fs.statSync(outPath);
    console.log(`  ✅ ${page.name}.png (${(stats.size / 1024).toFixed(0)} KB)`);
  }

  await browser.close();
  console.log(`\n✅ 완료! ${PAGES.length}개 이미지 → ${OUTPUT_DIR}`);
})();
