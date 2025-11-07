// lib/server/serializers/balik-manggagawa.ts
// Field selection for BM clearance audit logs.

export const serializeBalikManggagawaClearance = (clearance: any) => ({
  id: clearance.id,
  control_number: clearance.control_number,
  name_of_worker: clearance.name_of_worker,
  employer: clearance.employer,
  destination: clearance.destination,
  clearance_type: clearance.clearance_type ?? null,
  status: clearance.status ?? null,
  evaluator: clearance.evaluator ?? null,
  salary: clearance.salary ?? null,
  salary_currency: clearance.salary_currency ?? null,
  deleted_at: clearance.deleted_at ?? null,
});

