// Sample billing export used by the seed script, the import UI, and docs.
// Amounts are in dollars; dates are ISO (any parseable date works).

export const SAMPLE_CSV = `externalId,name,email,phone,invoiceNumber,description,amount,issuedAt,dueAt
MRN-1001,Marcus Chen,marcus.chen@example.com,555-0141,INV-1001,Emergency room visit,1240.00,2026-07-01,2026-07-30
MRN-1002,Aisha Patel,aisha.patel@example.com,555-0142,INV-1002,Outpatient radiology,860.00,2026-07-05,2026-08-04
MRN-1003,Diego Ramirez,diego.ramirez@example.com,555-0143,INV-1003,Lab work — CBC panel,215.50,2026-07-12,2026-08-11
MRN-1004,Emily Johnson,emily.johnson@example.com,555-0144,INV-1004,Physical therapy (3 sessions),490.00,2026-07-18,2026-08-17
MRN-1005,Tom Okafor,tom.okafor@example.com,555-0145,INV-1005,Specialist consultation,150.00,2026-07-22,2026-08-21
`;
