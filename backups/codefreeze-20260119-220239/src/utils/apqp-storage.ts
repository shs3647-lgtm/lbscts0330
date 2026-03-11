/**
 * APQP localStorage 헬퍼
 * 
 * 목적: APQP 프로젝트 데이터 localStorage 저장/불러오기
 * 버전: v1.0.0
 */

import { APQPProject, APQP_STORAGE_KEYS } from '@/types/apqp-project';

/**
 * APQP Storage 클래스
 */
export class APQPStorage {
  /**
   * 프로젝트 상세 정보 저장
   */
  static saveProjectDetail(id: string, project: APQPProject): void {
    try {
      const key = `${APQP_STORAGE_KEYS.PROJECT_PREFIX}${id}`;
      localStorage.setItem(key, JSON.stringify(project));
      console.log('✅ [APQPStorage] 프로젝트 저장 완료:', id);
    } catch (error) {
      console.error('❌ [APQPStorage] 프로젝트 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 프로젝트 상세 정보 불러오기
   */
  static getProjectDetail(id: string): APQPProject | null {
    try {
      const key = `${APQP_STORAGE_KEYS.PROJECT_PREFIX}${id}`;
      const data = localStorage.getItem(key);
      
      if (!data) {
        console.log('⚠️ [APQPStorage] 프로젝트 없음:', id);
        return null;
      }

      const project = JSON.parse(data) as APQPProject;
      console.log('✅ [APQPStorage] 프로젝트 로드 완료:', id);
      return project;
    } catch (error) {
      console.error('❌ [APQPStorage] 프로젝트 로드 실패:', error);
      return null;
    }
  }

  /**
   * 모든 프로젝트 목록 가져오기
   */
  static getAllProjects(): APQPProject[] {
    try {
      const keys = Object.keys(localStorage).filter(k => 
        k.startsWith(APQP_STORAGE_KEYS.PROJECT_PREFIX)
      );

      const projects = keys
        .map(key => {
          try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) as APQPProject : null;
          } catch (err) {
            console.error('❌ [APQPStorage] 프로젝트 파싱 실패:', key, err);
            return null;
          }
        })
        .filter((p): p is APQPProject => p !== null);

      console.log('✅ [APQPStorage] 전체 프로젝트 로드 완료:', projects.length, '개');
      return projects;
    } catch (error) {
      console.error('❌ [APQPStorage] 전체 프로젝트 로드 실패:', error);
      return [];
    }
  }

  /**
   * 프로젝트 삭제
   */
  static deleteProject(id: string): void {
    try {
      const key = `${APQP_STORAGE_KEYS.PROJECT_PREFIX}${id}`;
      localStorage.removeItem(key);
      console.log('✅ [APQPStorage] 프로젝트 삭제 완료:', id);
    } catch (error) {
      console.error('❌ [APQPStorage] 프로젝트 삭제 실패:', error);
      throw error;
    }
  }

  /**
   * 모든 프로젝트 삭제
   */
  static clearAllProjects(): void {
    try {
      const keys = Object.keys(localStorage).filter(k => 
        k.startsWith(APQP_STORAGE_KEYS.PROJECT_PREFIX)
      );

      keys.forEach(key => localStorage.removeItem(key));
      console.log('✅ [APQPStorage] 모든 프로젝트 삭제 완료:', keys.length, '개');
    } catch (error) {
      console.error('❌ [APQPStorage] 모든 프로젝트 삭제 실패:', error);
      throw error;
    }
  }

  /**
   * 프로젝트 존재 여부 확인
   */
  static hasProject(id: string): boolean {
    const key = `${APQP_STORAGE_KEYS.PROJECT_PREFIX}${id}`;
    return localStorage.getItem(key) !== null;
  }

  /**
   * 프로젝트 개수 확인
   */
  static getProjectCount(): number {
    const keys = Object.keys(localStorage).filter(k => 
      k.startsWith(APQP_STORAGE_KEYS.PROJECT_PREFIX)
    );
    return keys.length;
  }
}



















