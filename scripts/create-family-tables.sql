CREATE TABLE IF NOT EXISTS pfmea_pfm26_f001.l1_structures (
  id TEXT PRIMARY KEY,
  "fmeaId" TEXT NOT NULL,
  name TEXT,
  confirmed BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS pfmea_pfm26_f001.l2_structures (
  id TEXT PRIMARY KEY,
  "fmeaId" TEXT NOT NULL,
  "l1Id" TEXT,
  no TEXT,
  name TEXT,
  "order" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS pfmea_pfm26_f001.fmea_legacy_data (
  id TEXT PRIMARY KEY,
  "fmeaId" TEXT NOT NULL,
  data JSONB,
  version INTEGER DEFAULT 1,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);












