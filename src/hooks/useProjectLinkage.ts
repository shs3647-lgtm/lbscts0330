/**
 * useProjectLinkage 훅 - 프로젝트 연동 상태 관리
 */

export function useProjectLinkage() {
    const actions = {
        selectProject: (projectId: string) => {
        },
        selectModule: (projectId: string, moduleType: 'PFD' | 'FMEA' | 'CP' | 'WS' | 'PM') => {
        },
    };

    return { actions };
}
