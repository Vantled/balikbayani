// lib/server/serializers/direct-hire.ts
// Shared serializers for direct hire application audit logging.

export const serializeDirectHireApplication = (application: any) => ({
  id: application.id,
  control_number: application.control_number,
  name: application.name,
  email: application.email ?? null,
  cellphone: application.cellphone ?? null,
  sex: application.sex ?? null,
  status: application.status,
  jobsite: application.jobsite,
  position: application.position,
  job_type: application.job_type ?? null,
  evaluator: application.evaluator,
  employer: application.employer,
  salary: application.salary,
  raw_salary: application.raw_salary ?? null,
  salary_currency: application.salary_currency,
  deleted_at: application.deleted_at ?? null,
  status_checklist: application.status_checklist ?? null,
});

