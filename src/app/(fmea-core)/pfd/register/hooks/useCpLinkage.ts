
import { useState } from 'react';
import { LinkedCpItem, PFDType } from '../../types/pfdRegister';
import { generateLinkedCpNo } from '../../utils/pfdIdUtils';

export function useCpLinkage(pfdId: string, pfdType: PFDType) {
    const [cpManageModalOpen, setCpManageModalOpen] = useState(false);
    const [linkedCpList, setLinkedCpList] = useState<LinkedCpItem[]>([]);

    const openCpManageModal = () => {
        // ★ 자동 생성 제거 (2026-02-05) - 모달에서 선택한 경우에만 연동됨
        setCpManageModalOpen(true);
    };

    const addLinkedCp = (targetCpType: PFDType) => {
        if (!pfdId) return;

        // ★ 다음 번호 계산 (cpl26-f001 → cpl26-f002, cpl26-f003...)
        // 기존 CP 목록에서 가장 높은 번호 찾기
        const baseId = generateLinkedCpNo(pfdId); // cpl26-f001
        const basePrefix = baseId.replace(/\d{3}$/, ''); // cpl26-f

        // 현재 목록에서 같은 prefix를 가진 CP들의 번호 추출
        const existingNums = linkedCpList
            .filter(cp => cp.cpId.startsWith(basePrefix))
            .map(cp => {
                const match = cp.cpId.match(/(\d{3})$/);
                return match ? parseInt(match[1], 10) : 0;
            });

        // 가장 높은 번호 + 1
        const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
        const newCpId = `${basePrefix}${String(nextNum).padStart(3, '0')}`; // cpl26-f002

        setLinkedCpList([...linkedCpList, {
            cpId: newCpId,
            cpType: targetCpType,
            status: 'pending',
        }]);
    };

    const removeLinkedCp = (cpId: string) => {
        // ★ 자동 생성 삭제 불가 로직 제거 (2026-02-05)
        const cp = linkedCpList.find(c => c.cpId === cpId);
        if (cp?.status === 'linked') {
            if (!confirm('이미 연동된 CP입니다. 연동을 해제하시겠습니까?')) return;
        }
        setLinkedCpList(linkedCpList.filter(c => c.cpId !== cpId));
    };

    return {
        cpManageModalOpen,
        setCpManageModalOpen,
        linkedCpList,
        setLinkedCpList,
        openCpManageModal,
        addLinkedCp,
        removeLinkedCp
    };
}
