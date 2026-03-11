/**
 * APQP 파일 I/O 핸들러
 * 
 * 목적: APQP JSON/Excel 저장/불러오기 로직 표준화
 * 버전: v1.0.0
 * 생성: 2025-11-15
 * 패턴: FMEA/Project 핸들러 패턴 재사용
 */

import { APQPStorage } from '@/packages/utils/apqp-storage';
import { APQPProject } from '@/packages/types/apqp-project';
import ExcelJS from 'exceljs';

/**
 * 파일명 생성 헬퍼
 * 
 * APQP 규칙: apqp-{projectId}-{yymmdd-hhmmss}
 * 예: apqp-PJ-001-251115-143022.json
 */
function generateAPQPFileName(projectId: string, extension: 'json' | 'xlsx'): string {
  const now = new Date();
  const yymmdd = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const hhmmss = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  
  const baseName = `apqp-${projectId || 'project'}-${yymmdd}-${hhmmss}`;
  return extension === 'json'
    ? `${baseName}.json`
    : `${baseName}.xlsx`;
}

/**
 * JSON 저장 핸들러 (APQP)
 * 
 * @pattern FMEA File System Access API 패턴 재사용
 * @flow localStorage 저장 → showSaveFilePicker → createWritable → write → close (폴더 선택 가능)
 * @fallback Blob + createElement('a') + download (브라우저 다운로드 폴더)
 * @note v3.25.1: localStorage 저장 추가
 */
export function createAPQPSaveJSON(apqpCurrentProject: APQPProject | null) {
  return async () => {
    
    if (!apqpCurrentProject) {
      alert('저장할 APQP 프로젝트가 없습니다.');
      return;
    }

    try {
      // 🔥 v3.25.1: localStorage에 먼저 저장
      APQPStorage.saveProjectDetail(apqpCurrentProject.id, apqpCurrentProject);

      const jsonString = JSON.stringify(apqpCurrentProject, null, 2);
      const suggestedFilename = generateAPQPFileName(apqpCurrentProject.id, 'json');

      // 🔥 File System Access API로 저장 위치 선택 (Chrome/Edge)
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: suggestedFilename,
            types: [{
              description: 'JSON 파일',
              accept: {
                'application/json': ['.json']
              }
            }]
          });


          // 파일 쓰기
          const writable = await handle.createWritable();
          await writable.write(jsonString);
          await writable.close();

          alert(
            `✅ APQP 저장 완료!\n\n` +
            `프로젝트: ${apqpCurrentProject.projectName}\n` +
            `📁 localStorage 저장됨\n` +
            `📄 파일 저장됨: ${handle.name}`
          );
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') {
            alert(
              `✅ APQP localStorage 저장 완료!\n\n` +
              `프로젝트: ${apqpCurrentProject.projectName}\n` +
              `⚠️ 파일 저장은 취소되었습니다.`
            );
            return;
          }
          console.error('❌ FileSystemAPI 오류:', err);
          // Fallback으로 기본 다운로드 실행
        }
      }

      // Fallback: 기본 다운로드 (브라우저 다운로드 폴더)
      const blob = new Blob([jsonString], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = suggestedFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);

      alert(
        `✅ APQP 저장 완료!\n\n` +
        `프로젝트: ${apqpCurrentProject.projectName}\n` +
        `📁 localStorage 저장됨\n` +
        `📄 파일 저장됨: ${suggestedFilename}`
      );
    } catch (error) {
      console.error('❌ APQP JSON 저장 실패:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };
}

/**
 * JSON 불러오기 핸들러 (APQP)
 * 
 * @pattern FMEA/Project 표준 패턴 재사용
 * @flow createElement('input') → onchange → FileReader → parse → validate → callback
 */
export function createAPQPLoadJSON(
  setApqpCurrentProject: (project: APQPProject) => void,
  setApqpSelectedProjectId: (id: string) => void
) {
  return () => {

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const data = JSON.parse(event.target.result) as APQPProject;

          // 기본 검증
          if (!data.id || !data.projectName) {
            alert('잘못된 APQP 프로젝트 형식입니다.');
            return;
          }

          // 상태 업데이트
          setApqpCurrentProject(data);
          setApqpSelectedProjectId(data.id);

          // localStorage 저장
          APQPStorage.saveProjectDetail(data.id, data);

          alert(`APQP 프로젝트 불러오기 완료!\n프로젝트: ${data.projectName}`);
        } catch (error) {
          console.error('❌ APQP JSON 파싱 실패:', error);
          alert('파일 읽기 중 오류가 발생했습니다.');
        }
      };

      reader.readAsText(file);
    };

    // 🔥 핵심: DOM에 추가 후 클릭
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  };
}

/**
 * Excel 저장 핸들러 (APQP)
 * 
 * @pattern FMEA File System Access API 패턴 재사용
 * @flow ExcelJS → showSaveFilePicker → createWritable → write → close (폴더 선택 가능)
 * @fallback Blob + createElement('a') + download (브라우저 다운로드 폴더)
 */
export function createAPQPExportExcel(apqpCurrentProject: APQPProject | null) {
  return async () => {

    if (!apqpCurrentProject) {
      alert('저장할 APQP 프로젝트가 없습니다.');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('APQP');

      // 헤더 설정
      worksheet.columns = [
        { header: 'Stage', key: 'stage', width: 20 },
        { header: 'Activity', key: 'activity', width: 30 },
        { header: 'Plan Start', key: 'planStart', width: 12 },
        { header: 'Plan Finish', key: 'planFinish', width: 12 },
        { header: 'Act Start', key: 'actStart', width: 12 },
        { header: 'Act Finish', key: 'actFinish', width: 12 },
        { header: 'State', key: 'state', width: 8 },
        { header: 'Department', key: 'department', width: 15 },
        { header: 'Owner', key: 'owner', width: 15 },
      ];

      // 헤더 스타일
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };

      // 프로젝트 정보 추가
      worksheet.addRow({
        stage: 'Project Info',
        activity: apqpCurrentProject.projectName,
        planStart: apqpCurrentProject.customer,
        planFinish: apqpCurrentProject.productName,
        actStart: apqpCurrentProject.startDate,
        actFinish: apqpCurrentProject.endDate,
        state: apqpCurrentProject.status,
      });

      // Activity 데이터 추가
      apqpCurrentProject.stages?.forEach((stage: any) => {
        stage.activities?.forEach((activity: any, index: number) => {
          worksheet.addRow({
            stage: index === 0 ? stage.label : '',  // 🔥 stage.name → stage.label 수정
            activity: activity.name,
            planStart: activity.planStart || '',
            planFinish: activity.planFinish || '',
            actStart: activity.actStart || '',
            actFinish: activity.actFinish || '',
            state: activity.state || 'G',
            department: activity.department || '',
            owner: activity.owner || '',
          });
        });
      });

      // Excel 버퍼 생성
      const buffer = await workbook.xlsx.writeBuffer();
      const suggestedFilename = generateAPQPFileName(apqpCurrentProject.id, 'xlsx');

      // 🔥 File System Access API로 저장 위치 선택 (Chrome/Edge)
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: suggestedFilename,
            types: [{
              description: 'Excel 파일',
              accept: {
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
              }
            }]
          });


          // 파일 쓰기
          const writable = await handle.createWritable();
          await writable.write(buffer);
          await writable.close();

          alert(
            `✅ APQP Excel 저장 완료!\n` +
            `파일명: ${handle.name}\n` +
            `프로젝트: ${apqpCurrentProject.projectName}`
          );
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') {
            return;
          }
          console.error('❌ FileSystemAPI 오류:', err);
          // Fallback으로 기본 다운로드 실행
        }
      }

      // Fallback: 기본 다운로드 (브라우저 다운로드 폴더)
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = suggestedFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);

      alert('APQP Excel이 저장되었습니다!');
    } catch (error) {
      console.error('❌ APQP Excel 저장 실패:', error);
      alert('Excel 저장 중 오류가 발생했습니다.');
    }
  };
}

/**
 * Excel 불러오기 핸들러 (APQP)
 * 
 * @pattern FMEA Excel Import 패턴 재사용
 * @flow File Input → ExcelJS 파싱 → APQPProject 복원 → 상태 업데이트 + localStorage 저장
 */
export function createAPQPImportExcel(
  setApqpCurrentProject: (project: APQPProject) => void,
  setApqpSelectedProjectId: (id: string) => void
) {
  return async () => {

    // 1. 파일 선택 입력 생성
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';

    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        // 2. 파일 읽기
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        const worksheet = workbook.getWorksheet('APQP');
        if (!worksheet) {
          alert('❌ APQP 워크시트를 찾을 수 없습니다.');
          return;
        }


        // 3. 프로젝트 정보 추출 (Row 2: Project Info)
        const projectInfoRow = worksheet.getRow(2);
        const values = projectInfoRow.values as any[];
        

        // 🔥 ExcelJS는 1-based 인덱싱: values[0] = undefined, values[1] = A열, values[2] = B열
        const projectInfo = {
          projectName: String(values[2] || '').trim(),  // B열: Activity (projectName)
          customer: String(values[3] || '').trim(),     // C열: Plan Start (customer)
          productName: String(values[4] || '').trim(),  // D열: Plan Finish (productName)
          startDate: String(values[5] || '').trim(),    // E열: Act Start (startDate)
          endDate: String(values[6] || '').trim(),      // F열: Act Finish (endDate)
          status: String(values[7] || 'Active').trim()  // G열: State (status)
        };


        // 🔥 필수 검증: projectName이 비어있으면 중단
        if (!projectInfo.projectName) {
          alert('❌ Excel 파일에 프로젝트 이름이 없습니다.\nRow 2의 Activity 컬럼을 확인하세요.');
          console.error('❌ projectName이 비어있음. Import 중단.');
          return;
        }

        // 4. Activity 데이터 추출 (Row 3부터)
        const stagesMap: { [key: string]: { id: string; label: string; activities: any[] } } = {};
        let activityCounter = 0;
        let currentStageLabel = '';

        
        worksheet.eachRow((row: any, rowNumber: number) => {
          if (rowNumber <= 2) return; // 헤더 + Project Info 스킵

          const rowValues = row.values as any[];
          
          // 🔥 ExcelJS는 1-based 인덱싱: rowValues[0] = undefined, rowValues[1] = A열
          const stageName = String(rowValues[1] || '').trim();      // A열: Stage
          const activityName = String(rowValues[2] || '').trim();   // B열: Activity
          
          if (rowNumber <= 5) {  // 처음 3개 데이터 행만 상세 로그
          }

          // Stage 그룹 생성 (Stage 이름이 있을 때)
          if (stageName) {
            currentStageLabel = stageName;
            
            if (!stagesMap[stageName]) {
              const stageId = `stage-${Object.keys(stagesMap).length + 1}`;
              stagesMap[stageName] = {
                id: stageId,
                label: stageName,
                activities: []
              };
            }
          }

          // Activity 추가 (Activity 이름이 있을 때)
          if (activityName) {
            // Stage가 없으면 기본 Stage 생성
            if (!currentStageLabel) {
              currentStageLabel = 'Default Stage';
              if (!stagesMap[currentStageLabel]) {
                stagesMap[currentStageLabel] = {
                  id: 'stage-default',
                  label: currentStageLabel,
                  activities: []
                };
              }
            }

            activityCounter++;
            const currentStage = stagesMap[currentStageLabel];

            if (currentStage) {
              const activity = {
                id: `activity-${activityCounter}`,
                name: activityName,
                stageId: currentStage.id,
                planStart: String(rowValues[3] || '').trim(),
                planFinish: String(rowValues[4] || '').trim(),
                actStart: String(rowValues[5] || '').trim(),
                actFinish: String(rowValues[6] || '').trim(),
                state: String(rowValues[7] || 'G').trim(),
                department: String(rowValues[8] || '').trim(),
                owner: String(rowValues[9] || '').trim()
              };

              currentStage.activities.push(activity);
              if (activityCounter <= 3) {  // 처음 3개만 상세 로그
              }
            }
          }
        });

        Object.keys(stagesMap).forEach((key) => {
        });

        // 5. APQPProject 객체 생성
        const stages = Object.values(stagesMap).map((stage, index) => ({
          id: stage.id,
          label: stage.label,
          expanded: true, // 기본적으로 펼침
          activities: stage.activities
        }));

        // 🔥 빈 데이터 검증
        if (stages.length === 0) {
          alert('❌ Excel 파일에 Stage 데이터가 없습니다.\nRow 3부터 데이터를 확인하세요.');
          console.error('❌ stages.length === 0. Import 중단.');
          return;
        }

        if (activityCounter === 0) {
          alert('❌ Excel 파일에 Activity 데이터가 없습니다.\nRow 3부터 Activity 컬럼을 확인하세요.');
          console.error('❌ activityCounter === 0. Import 중단.');
          return;
        }

        const projectId = `PJ-${String(Date.now()).slice(-6)}`;
        const loadedProject: APQPProject = {
          id: projectId,
          projectName: projectInfo.projectName,
          customer: projectInfo.customer,
          factory: '',
          productName: projectInfo.productName,
          startDate: projectInfo.startDate,
          endDate: projectInfo.endDate,
          status: projectInfo.status,
          stages: stages,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'Import'
        };


        // 6. 상태 업데이트
        setApqpCurrentProject(loadedProject);
        setApqpSelectedProjectId(loadedProject.id);

        // 7. localStorage 저장
        APQPStorage.saveProjectDetail(loadedProject.id, loadedProject);

        alert(
          `✅ APQP Excel 불러오기 완료!\n\n` +
          `프로젝트명: ${loadedProject.projectName}\n` +
          `프로젝트 ID: ${loadedProject.id}\n` +
          `고객사: ${loadedProject.customer}\n` +
          `Stages: ${stages.length}개\n` +
          `Activities: ${activityCounter}개\n\n` +
          `📁 localStorage 저장 완료\n` +
          `🔄 화면에 자동으로 표시됩니다.`
        );
      } catch (error) {
        console.error('❌ APQP Excel 불러오기 실패:', error);
        alert('Excel 불러오기 중 오류가 발생했습니다: ' + (error as Error).message);
      }
    };

    // 🔥 핵심: DOM에 추가 후 클릭
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  };
}

/**
 * 빈 APQP 프로젝트 생성 함수
 * 
 * @purpose 신규 버튼 클릭 시 빈 시트 생성 (구조는 유지, 데이터는 비움)
 * @pattern APQP 표준 Stage/Activity 구조 유지
 * @version v3.25.1
 */
export function createEmptyAPQPProject(projectName: string): APQPProject {
  const now = new Date();
  const projectId = `PJ-${String(now.getTime()).slice(-6)}`; // PJ-123456 형식
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const endDate = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 6개월 후

  return {
    id: projectId,
    projectName: projectName,
    customer: '',
    factory: '',
    productName: '',
    startDate: today,
    endDate: endDate,
    status: 'Active',
    stages: [
      {
        id: 'stage-1',
        label: 'Stage 1: 계획 및 정의',
        expanded: true,
        activities: [
          { id: 'activity-1-1', name: '', stageId: 'stage-1' },
          { id: 'activity-1-2', name: '', stageId: 'stage-1' },
          { id: 'activity-1-3', name: '', stageId: 'stage-1' }
        ]
      },
      {
        id: 'stage-2',
        label: 'Stage 2: 제품 설계 및 개발',
        expanded: true,
        activities: [
          { id: 'activity-2-1', name: '', stageId: 'stage-2' },
          { id: 'activity-2-2', name: '', stageId: 'stage-2' },
          { id: 'activity-2-3', name: '', stageId: 'stage-2' }
        ]
      },
      {
        id: 'stage-3',
        label: 'Stage 3: 공정 설계 및 개발',
        expanded: true,
        activities: [
          { id: 'activity-3-1', name: '', stageId: 'stage-3' },
          { id: 'activity-3-2', name: '', stageId: 'stage-3' },
          { id: 'activity-3-3', name: '', stageId: 'stage-3' }
        ]
      },
      {
        id: 'stage-4',
        label: 'Stage 4: 제품 및 공정 검증',
        expanded: true,
        activities: [
          { id: 'activity-4-1', name: '', stageId: 'stage-4' },
          { id: 'activity-4-2', name: '', stageId: 'stage-4' },
          { id: 'activity-4-3', name: '', stageId: 'stage-4' }
        ]
      },
      {
        id: 'stage-5',
        label: 'Stage 5: 양산 준비',
        expanded: true,
        activities: [
          { id: 'activity-5-1', name: '', stageId: 'stage-5' },
          { id: 'activity-5-2', name: '', stageId: 'stage-5' },
          { id: 'activity-5-3', name: '', stageId: 'stage-5' }
        ]
      }
    ],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    createdBy: 'System'
  };
}

/**
 * 신규 APQP 프로젝트 생성 핸들러
 * 
 * @purpose ActionBar 신규 버튼 클릭 시 호출
 * @flow 프로젝트명 입력 → 빈 프로젝트 생성 → 화면에만 표시 (localStorage 저장 안 함)
 * @note 사용자가 "저장" 버튼을 클릭해야 localStorage에 저장됨
 */
export function createAPQPNewProject(
  setApqpCurrentProject: (project: APQPProject) => void,
  setApqpSelectedProjectId: (id: string) => void
) {
  return () => {

    const projectName = prompt('새 APQP 프로젝트 이름을 입력하세요:', '신규 프로젝트');
    
    if (!projectName || projectName.trim() === '') {
      return;
    }

    try {
      // 빈 APQP 프로젝트 생성
      const newProject = createEmptyAPQPProject(projectName.trim());

      // 🔥 localStorage 저장 안 함 - 화면에만 표시
      // APQPStorage.saveProjectDetail(newProject.id, newProject); // 주석 처리

      // 상태 업데이트 (화면에만 표시)
      setApqpCurrentProject(newProject);
      setApqpSelectedProjectId(newProject.id);

      alert(
        `✅ 새 APQP 빈 시트 생성 완료!\n\n` +
        `프로젝트명: ${newProject.projectName}\n` +
        `프로젝트 ID: ${newProject.id}\n` +
        `시작일: ${newProject.startDate}\n` +
        `종료일: ${newProject.endDate}\n\n` +
        `⚠️ "저장" 버튼을 클릭하면 localStorage에 저장됩니다.`
      );
    } catch (error) {
      console.error('❌ APQP 프로젝트 생성 실패:', error);
      alert('프로젝트 생성 중 오류가 발생했습니다.');
    }
  };
}

