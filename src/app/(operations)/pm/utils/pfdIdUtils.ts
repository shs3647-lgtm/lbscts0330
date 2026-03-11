// PM 모듈용 PFD ID 유틸 re-export (PFD 모듈과 공유)
export {
  isValidPfdNo, generatePFDId, isLinked, isSolo, getLinkGroupNo,
  setLinked, setSolo, generateLinkedCpNo, generateLinkedPfmeaId,
  generateLinkedPfdNo, migrateLegacyId,
} from '@/app/(fmea-core)/pfd/utils/pfdIdUtils';
