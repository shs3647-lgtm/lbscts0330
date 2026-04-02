/**
 * @file route.ts
 * @description DFMEA Master Dataset API — pfmea/master로 위임
 *
 * DFMEA와 PFMEA는 동일한 Master Dataset 구조를 사용하므로,
 * 모든 요청을 /api/pfmea/master로 내부 위임한다.
 *
 * @created 2026-04-02
 */

export { GET, POST, DELETE, PATCH } from '@/app/api/pfmea/master/route';
