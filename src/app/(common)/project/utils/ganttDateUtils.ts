
export const DAY_WIDTH = 1.5;  // 🔥 12개월 최적화 (2 → 1.5, 365일 ≈ 438px)
export const ROW_HEIGHT = 35;  // 🔥 행 높이 (40 → 35)

export const parseDate = (dateStr: string) => (dateStr ? new Date(dateStr) : null);

export const getDuration = (start: Date | null, end: Date | null) => {
  if (!start || !end) return 0;
  const diffTime = Math.abs(end.getTime() - start.getTime());
  // + 1 day to include both start and end day
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

export const formatDateToInput = (date: Date | null) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateCompact = (dateStr: string) => {
  if (!dateStr) return '';
  const date = parseDate(dateStr);
  if (!date) return '';
  const year = String(date.getFullYear()).slice(2); // 24
  const month = String(date.getMonth() + 1).padStart(2, '0'); // 01
  const day = String(date.getDate()).padStart(2, '0'); // 01
  return `${year}/${month}/${day}`;
};

// 날짜 집계 함수 (Bottom-up Aggregation)
export const calculateRollupDates = (tasks: any[]) => {
  // Deep copy to avoid mutation during iteration if not intended (though we will return new array)
  const newTasks = JSON.parse(JSON.stringify(tasks));

  // Level이 깊은 순서대로 정렬 (내림차순)하여 하위부터 처리
  // 하지만 단순히 정렬하면 인덱스가 섞이므로, Map을 사용하여 처리하는 것이 좋음
  // 또는, 반복적으로 부모를 찾아 올라가는 방식 사용
  // 가장 확실한 방법: Tree 구조로 변환 후 Post-order Traversal -> 다시 Flat 변환
  // 여기서는 간단하게: 전체 데이터를 순회하며 부모-자식 맵핑 -> 최대 깊이 계산 -> 깊은 레벨부터 위로 올라가며 집계

  // 1. 레벨별로 그룹화
  const levels: Record<number, any[]> = {};
  let maxLevel = 0;

  newTasks.forEach((task: any) => {
    if (!levels[task.level]) levels[task.level] = [];
    levels[task.level].push(task);
    if (task.level > maxLevel) maxLevel = task.level;
  });

  // 2. 가장 깊은 레벨부터 0레벨까지 역순으로 순회
  for (let i = maxLevel; i >= 0; i--) {
    const currentLevelTasks = levels[i];
    if (!currentLevelTasks) continue;

    // 각 태스크의 부모를 찾아 집계 데이터 갱신
    // 이 레벨의 태스크들은 "이미 집계가 완료된" 상태여야 함 (하위 레벨 루프에서 처리됨)
    // 따라서 이 루프에서는 "자신의 부모"를 갱신함

    // 부모 ID별로 자식들을 모음
    const parentMap: Record<string, any[]> = {};

    currentLevelTasks.forEach((task: any) => {
      if (task.parentId) {
        if (!parentMap[task.parentId]) parentMap[task.parentId] = [];
        parentMap[task.parentId].push(task);
      }
    });

    // 각 부모에 대해 집계 수행
    Object.keys(parentMap).forEach(parentId => {
      const parentTask = newTasks.find((t: any) => t.id === parentId);
      if (!parentTask) return;

      const children = parentMap[parentId];

      // Plan Start: Min
      const pStarts = children.map((c: any) => parseDate(c.planStart)?.getTime()).filter((t: any) => t !== undefined && !isNaN(t)) as number[];
      if (pStarts.length > 0) {
        parentTask.planStart = formatDateToInput(new Date(Math.min(...pStarts)));
      }

      // Plan Finish: Max
      const pFinishes = children.map((c: any) => parseDate(c.planFinish)?.getTime()).filter((t: any) => t !== undefined && !isNaN(t)) as number[];
      if (pFinishes.length > 0) {
        parentTask.planFinish = formatDateToInput(new Date(Math.max(...pFinishes)));
      }

      // Act Start: Min
      const aStarts = children.map((c: any) => parseDate(c.actStart)?.getTime()).filter((t: any) => t !== undefined && !isNaN(t)) as number[];
      if (aStarts.length > 0) {
        parentTask.actStart = formatDateToInput(new Date(Math.min(...aStarts)));
      }

      // Act Finish: Max
      const aFinishes = children.map((c: any) => parseDate(c.actFinish)?.getTime()).filter((t: any) => t !== undefined && !isNaN(t)) as number[];
      if (aFinishes.length > 0) {
        parentTask.actFinish = formatDateToInput(new Date(Math.max(...aFinishes)));
      }
    });
  }

  return newTasks;
};
