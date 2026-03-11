const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const mapping = {
  'LLD26-001':'FieldIssue','LLD26-002':'RMA','LLD26-003':'ABN','LLD26-004':'ECN',
  'LLD26-005':'FieldIssue','LLD26-006':'CIP','LLD26-007':'RMA','LLD26-008':'DevIssue',
  'LLD26-009':'ABN','LLD26-010':'ECN','LLD26-011':'CIP','LLD26-012':'FieldIssue',
  'LLD26-013':'RMA','LLD26-014':'DevIssue','LLD26-015':'ABN','LLD26-016':'ECN',
  'LLD26-017':'FieldIssue','LLD26-018':'CIP','LLD26-019':'RMA','LLD26-020':'DevIssue',
  'LLD26-021':'ABN','LLD26-022':'FieldIssue','LLD26-023':'ECN','LLD26-024':'RMA',
  'LLD26-025':'CIP','LLD26-026':'DevIssue','LLD26-027':'ABN','LLD26-028':'FieldIssue',
  'LLD26-029':'ECN','LLD26-030':'RMA','LLD26-031':'CIP','LLD26-032':'DevIssue',
  'LLD26-033':'RMA','LLD26-034':'FieldIssue','LLD26-035':'ABN','LLD26-036':'ECN',
  'LLD26-037':'CIP','LLD26-038':'RMA','LLD26-039':'DevIssue','LLD26-040':'ABN',
  'LLD26-041':'FieldIssue','LLD26-042':'ECN','LLD26-043':'RMA','LLD26-044':'DevIssue',
  'LLD26-045':'ABN','LLD26-046':'CIP','LLD26-047':'FieldIssue','LLD26-048':'ECN',
  'LLD26-049':'RMA','LLD26-050':'DevIssue','LLD26-051':'ABN','LLD26-052':'CIP',
  'LLD26-053':'FieldIssue','LLD26-054':'RMA','LLD26-055':'ECN','LLD26-056':'DevIssue',
  'LLD26-057':'ABN','LLD26-058':'CIP','LLD26-059':'FieldIssue','LLD26-060':'ECN',
  'LLD26-061':'RMA','LLD26-062':'CIP','LLD26-063':'DevIssue','LLD26-064':'ABN',
  'LLD26-065':'FieldIssue','LLD26-066':'ECN','LLD26-067':'RMA','LLD26-068':'DevIssue',
  'LLD26-069':'CIP','LLD26-070':'ABN',
};
(async()=>{
  const ops = Object.entries(mapping).map(([lldNo,cls])=>
    prisma.lLDFilterCode.update({where:{lldNo},data:{classification:cls}})
  );
  const results = await prisma.$transaction(ops);
  console.log('Updated:', results.length, 'records');
  const all = await prisma.lLDFilterCode.findMany({select:{lldNo:true,classification:true},orderBy:{lldNo:'asc'}});
  const counts = {};
  all.forEach(r=>{counts[r.classification]=(counts[r.classification]||0)+1});
  console.log('Distribution:', JSON.stringify(counts));
  console.log('Sample (first 10):');
  all.slice(0,10).forEach(r=>console.log(`  ${r.lldNo}: ${r.classification}`));
  await prisma.$disconnect();
})();
