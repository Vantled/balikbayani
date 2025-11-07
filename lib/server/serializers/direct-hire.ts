// lib/server/serializers/direct-hire.ts
// Shared serializers for direct hire application audit logging.

export const serializeDirectHireApplication = (application: any) => ({
  id: application.id,
  control_number: application.control_number,
  name: application.name,
  status: application.status,
  jobsite: application.jobsite,
  position: application.position,
  evaluator: application.evaluator,
  employer: application.employer,
  salary: application.salary,
  salary_currency: application.salary_currency,
  deleted_at: application.deleted_at ?? null,
  status_checklist: application.status_checklist ?? null,
});

