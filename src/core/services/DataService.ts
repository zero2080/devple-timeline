import type { CaseData } from '../../types';
import { Case } from '../models/Case';

/**
 * DataService - 데이터 로딩 및 캐싱 관리
 */
export class DataService {
  private static caseCache: Map<string, Case> = new Map();

  /**
   * JSON 파일에서 사건 데이터 로드
   */
  static async loadCase(caseId: string): Promise<Case> {
    // 캐시 확인
    if (this.caseCache.has(caseId)) {
      return this.caseCache.get(caseId)!;
    }

    try {
      // Dynamic import로 JSON 로드
      const data: CaseData = await import(`../../data/cases/${caseId}.json`);
      const caseInstance = new Case(data);

      // 유효성 검증
      if (!caseInstance.validate()) {
        throw new Error(`Invalid case data for: ${caseId}`);
      }

      // 캐시 저장
      this.caseCache.set(caseId, caseInstance);
      return caseInstance;
    } catch (error) {
      console.error(`Failed to load case: ${caseId}`, error);
      throw error;
    }
  }

  /**
   * 외부 API에서 사건 데이터 로드 (향후 확장)
   */
  static async loadCaseFromAPI(apiUrl: string, caseId: string): Promise<Case> {
    try {
      const response = await fetch(`${apiUrl}/cases/${caseId}`);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data: CaseData = await response.json();
      const caseInstance = new Case(data);

      if (!caseInstance.validate()) {
        throw new Error(`Invalid case data from API: ${caseId}`);
      }

      this.caseCache.set(caseId, caseInstance);
      return caseInstance;
    } catch (error) {
      console.error(`Failed to load case from API: ${caseId}`, error);
      throw error;
    }
  }

  /**
   * 사용 가능한 사건 목록 조회 (향후 확장)
   */
  static async listCases(): Promise<string[]> {
    // TODO: 실제 구현에서는 manifest 파일 또는 API 호출
    return ['noir-cafe'];
  }

  /**
   * 캐시 초기화
   */
  static clearCache(): void {
    this.caseCache.clear();
  }
}
