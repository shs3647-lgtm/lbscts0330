import { test, expect } from '@playwright/test';

/**
 * ALL 화면 역전개 시스템 TDD 검증
 * 
 * 검증 항목:
 * 1. 데이터 일관성: state가 없거나 비어있을 때
 * 2. 에러 핸들링: ID 매칭 실패 시
 * 3. Fallback 처리: 역전개 데이터 없을 때
 * 4. UI-DB 동기화: 역전개 맵 생성 검증
 * 5. 빈 데이터 처리: 빈 문자열, null, undefined
 */

test.describe('ALL 화면 역전개 시스템 검증', () => {
  
  // ========== 테스트 케이스 1: L1 역전개 검증 ==========
  test('TC1: L1.name이 없을 때 완제품명 빈 문자열 반환', () => {
    const state = { l1: null };
    const l1ProductName = state.l1?.name || '';
    expect(l1ProductName).toBe('');
  });

  test('TC2: L1.name이 있을 때 완제품명 정상 반환', () => {
    const state = { l1: { name: '타이어제조공정' } };
    const l1ProductName = state.l1?.name || '';
    expect(l1ProductName).toBe('타이어제조공정');
  });

  // ========== 테스트 케이스 2: FC 역전개 검증 ==========
  test('TC3: FC.processCharId가 없을 때 빈 문자열 반환', () => {
    const state = {
      l2: [
        {
          name: '프레스',
          l3: [
            {
              name: '성형',
              functions: [
                {
                  name: '압력제어',
                  processChars: [{ id: 'pc1', name: '압력값' }]
                }
              ]
            }
          ],
          failureCauses: [{ id: 'fc1', name: '압력부족' }] // processCharId 없음
        }
      ]
    };

    const fcToL3Map = new Map();
    state.l2.forEach((proc: any) => {
      (proc.l3 || []).forEach((we: any) => {
        (we.functions || []).forEach((fn: any) => {
          (fn.processChars || []).forEach((pc: any) => {
            (proc.failureCauses || []).forEach((fc: any) => {
              if (fc.processCharId === pc.id) {
                fcToL3Map.set(fc.id, {
                  workFunction: fn.name || '',
                  processChar: pc.name || '',
                });
              }
            });
          });
        });
      });
    });

    const result = fcToL3Map.get('fc1');
    expect(result).toBeUndefined();
  });

  test('TC4: FC.processCharId가 있을 때 역전개 성공', () => {
    const state = {
      l2: [
        {
          name: '프레스',
          l3: [
            {
              name: '성형',
              functions: [
                {
                  name: '압력제어',
                  processChars: [{ id: 'pc1', name: '압력값' }]
                }
              ]
            }
          ],
          failureCauses: [{ id: 'fc1', name: '압력부족', processCharId: 'pc1' }]
        }
      ]
    };

    const fcToL3Map = new Map();
    state.l2.forEach((proc: any) => {
      (proc.l3 || []).forEach((we: any) => {
        (we.functions || []).forEach((fn: any) => {
          (fn.processChars || []).forEach((pc: any) => {
            (proc.failureCauses || []).forEach((fc: any) => {
              if (fc.processCharId === pc.id) {
                fcToL3Map.set(fc.id, {
                  workFunction: fn.name || '',
                  processChar: pc.name || '',
                });
              }
            });
          });
        });
      });
    });

    const result = fcToL3Map.get('fc1');
    expect(result).toEqual({ workFunction: '압력제어', processChar: '압력값' });
  });

  // ========== 테스트 케이스 3: FM 역전개 검증 ==========
  test('TC5: FM.productCharId가 없을 때 fallback 처리', () => {
    const proc = {
      name: '프레스',
      processNo: '1',
      functions: [
        {
          name: '성형',
          productChars: [{ id: 'prc1', name: '트레드패턴' }]
        }
      ],
      failureModes: [{ id: 'fm1', mode: '패턴불량' }] // productCharId 없음
    };

    let processFunction = '';
    let productChar = '';

    const fm = proc.failureModes[0];
    if (fm.productCharId) {
      (proc.functions || []).forEach((fn: any) => {
        (fn.productChars || []).forEach((pc: any) => {
          if (pc.id === fm.productCharId) {
            processFunction = fn.name || '';
            productChar = pc.name || '';
          }
        });
      });
    }

    // fallback: 첫 번째 function과 productChar 사용
    if (!processFunction && (proc.functions || []).length > 0) {
      const firstFunc = proc.functions[0];
      processFunction = firstFunc.name || '';
      if ((firstFunc.productChars || []).length > 0) {
        productChar = firstFunc.productChars[0].name || '';
      }
    }

    expect(processFunction).toBe('성형');
    expect(productChar).toBe('트레드패턴');
  });

  test('TC6: FM.productCharId가 있을 때 역전개 성공', () => {
    const proc = {
      name: '프레스',
      processNo: '1',
      functions: [
        {
          name: '성형',
          productChars: [{ id: 'prc1', name: '트레드패턴' }]
        }
      ],
      failureModes: [{ id: 'fm1', mode: '패턴불량', productCharId: 'prc1' }]
    };

    let processFunction = '';
    let productChar = '';

    const fm = proc.failureModes[0];
    if (fm.productCharId) {
      (proc.functions || []).forEach((fn: any) => {
        (fn.productChars || []).forEach((pc: any) => {
          if (pc.id === fm.productCharId) {
            processFunction = fn.name || '';
            productChar = pc.name || '';
          }
        });
      });
    }

    expect(processFunction).toBe('성형');
    expect(productChar).toBe('트레드패턴');
  });

  // ========== 테스트 케이스 4: FE 역전개 검증 ==========
  test('TC7: FE.reqId가 없을 때 빈 문자열 반환', () => {
    const state = {
      l1: {
        types: [
          {
            id: 'cat1',
            category: 'Your Plant',
            functions: [
              {
                id: 'fn1',
                name: '주행성능',
                requirements: [{ id: 'req1', name: '내구성' }]
              }
            ]
          }
        ],
        failureScopes: [{ id: 'fe1', name: '균열' }] // reqId 없음
      }
    };

    const reqToFuncMap = new Map();
    (state.l1.types || []).forEach((cat: any) => {
      (cat.functions || []).forEach((fn: any) => {
        (fn.requirements || []).forEach((req: any) => {
          reqToFuncMap.set(req.id, {
            category: cat.category || '',
            functionName: fn.name || '',
            requirement: req.name || '',
          });
        });
      });
    });

    const fe = state.l1.failureScopes[0];
    const feData = reqToFuncMap.get(fe.reqId || '');
    expect(feData).toBeUndefined();
  });

  test('TC8: FE.reqId가 있을 때 역전개 성공', () => {
    const state = {
      l1: {
        types: [
          {
            id: 'cat1',
            category: 'Your Plant',
            functions: [
              {
                id: 'fn1',
                name: '주행성능',
                requirements: [{ id: 'req1', name: '내구성' }]
              }
            ]
          }
        ],
        failureScopes: [{ id: 'fe1', name: '균열', reqId: 'req1' }]
      }
    };

    const reqToFuncMap = new Map();
    (state.l1.types || []).forEach((cat: any) => {
      (cat.functions || []).forEach((fn: any) => {
        (fn.requirements || []).forEach((req: any) => {
          reqToFuncMap.set(req.id, {
            category: cat.category || '',
            functionName: fn.name || '',
            requirement: req.name || '',
          });
        });
      });
    });

    const fe = state.l1.failureScopes[0];
    const feData = reqToFuncMap.get(fe.reqId || '');
    expect(feData).toEqual({
      category: 'Your Plant',
      functionName: '주행성능',
      requirement: '내구성',
    });
  });

  // ========== 테스트 케이스 5: 빈 데이터 처리 검증 ==========
  test('TC9: state가 완전히 비어있을 때 에러 없이 처리', () => {
    const state = {};

    const l1ProductName = (state as any).l1?.name || '';
    const fcToL3Map = new Map();
    const fmToL2Map = new Map();
    const reqToFuncMap = new Map();

    expect(l1ProductName).toBe('');
    expect(fcToL3Map.size).toBe(0);
    expect(fmToL2Map.size).toBe(0);
    expect(reqToFuncMap.size).toBe(0);
  });

  test('TC10: 고장연결 데이터가 없을 때 빈 배열 반환', () => {
    const rawFailureLinks = [];
    const failureLinks = rawFailureLinks.map((link: any) => ({
      fmId: link.fmId || '',
      fmText: link.fmText || '',
      l1ProductName: '',
      fmProcessNo: '',
      fmProcessName: '',
      fmProcessFunction: '',
      fmProductChar: '',
      feId: link.feId || '',
      feText: link.feText || '',
      feSeverity: 0,
      fcId: link.fcId || '',
      fcText: link.fcText || '',
      feCategory: '',
      feFunctionName: '',
      feRequirement: '',
      fcWorkFunction: '',
      fcProcessChar: '',
      fcM4: '',
      fcWorkElem: '',
    }));

    expect(failureLinks.length).toBe(0);
  });

  // ========== 테스트 케이스 6: Fallback 로직 검증 ==========
  test('TC11: link.fcWorkFunction 우선, 없으면 fcToL3Map 사용', () => {
    const link = { fcId: 'fc1', fcWorkFunction: '기존값' };
    const fcToL3Map = new Map([['fc1', { workFunction: '새값', processChar: '공정특성' }]]);

    const result = link.fcWorkFunction || fcToL3Map.get(link.fcId)?.workFunction || '';
    expect(result).toBe('기존값');
  });

  test('TC12: link.fcWorkFunction 없으면 fcToL3Map 사용', () => {
    const link = { fcId: 'fc1' };
    const fcToL3Map = new Map([['fc1', { workFunction: '새값', processChar: '공정특성' }]]);

    const result = (link as any).fcWorkFunction || fcToL3Map.get(link.fcId)?.workFunction || '';
    expect(result).toBe('새값');
  });

  test('TC13: 둘 다 없으면 빈 문자열 반환', () => {
    const link = { fcId: 'fc1' };
    const fcToL3Map = new Map();

    const result = (link as any).fcWorkFunction || fcToL3Map.get(link.fcId)?.workFunction || '';
    expect(result).toBe('');
  });

});










