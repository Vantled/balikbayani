// app/applicant/start/gov-to-gov/page.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ApplicantHeader from '@/components/applicant-header'
import GovToGovApplicantForm from './gov-to-gov-form'
import { AuthService } from '@/lib/services/auth-service'
import { db } from '@/lib/database'

export default async function ApplicantStartGovToGovPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; corrections?: string }>
}) {
  const params = await searchParams
  const editId = params.edit
  const isCorrectionMode = params.corrections === 'true'

  const cookieStore = await cookies()
  const userCookie = cookieStore.get('bb_user')
  const token = cookieStore.get('bb_auth_token')?.value

  if (!userCookie || !token) {
    redirect('/login?from=/applicant/start/gov-to-gov')
  }

  let user: any = null
  try {
    user = JSON.parse(userCookie.value)
  } catch {
    user = null
  }

  if (!user || user.role !== 'applicant') {
    redirect('/dashboard')
  }

  const validatedUser = await AuthService.validateSession(token)
  if (!validatedUser || validatedUser.role !== 'applicant') {
    redirect('/login?from=/applicant/start/gov-to-gov')
  }

  // If editing, fetch application data
  let correctionFields: string[] = []
  let needsCorrection = false
  let applicationId: string | null = null
  if (editId) {
    const appResult = await db.query(
      `SELECT id, needs_correction, correction_fields 
       FROM gov_to_gov_applications 
       WHERE id = $1 AND applicant_user_id = $2 AND deleted_at IS NULL`,
      [editId, validatedUser.id]
    )
    if (appResult.rows.length > 0) {
      applicationId = appResult.rows[0].id
      needsCorrection = appResult.rows[0].needs_correction || false
      if (needsCorrection && appResult.rows[0].correction_fields) {
        try {
          correctionFields = Array.isArray(appResult.rows[0].correction_fields)
            ? appResult.rows[0].correction_fields
            : JSON.parse(appResult.rows[0].correction_fields || '[]')
        } catch {
          correctionFields = []
        }
      }
    } else {
      redirect('/applicant/status')
    }
  } else {
    // Check if applicant already has an active Gov-to-Gov application
    const existingApp = await db.query(
      'SELECT id FROM gov_to_gov_applications WHERE applicant_user_id = $1 AND deleted_at IS NULL LIMIT 1',
      [validatedUser.id]
    )
    if (existingApp.rows.length > 0) {
      redirect('/applicant/status')
    }
  }

  const preferredUser = validatedUser || user

  // Use separate name fields if available, otherwise fall back to parsing full_name
  const defaultNames = {
    first: (preferredUser?.first_name || '').trim() || ((preferredUser?.full_name || '').split(/\s+/)[0] || ''),
    last:
      (preferredUser?.last_name || '').trim() ||
      ((preferredUser?.full_name || '').split(/\s+/).length > 1
        ? (preferredUser?.full_name || '').split(/\s+/).slice(-1)[0]
        : ''),
    middle: (preferredUser?.middle_name || '').trim() || '',
  }

  return (
    <>
      <ApplicantHeader />
      <section className="min-h-[calc(100vh-4rem)] bg-[#eaf3fc] px-4 py-16 pt-20">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-[#0f62fe] font-semibold">Gov-to-Gov Application</p>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Provide your details</h1>
            <p className="text-gray-600 text-base md:text-lg">
              Complete this form to submit your Gov-to-Gov application. Once submitted, our processing team will review your information and update the status in your portal.
            </p>
          </div>

          <GovToGovApplicantForm
            defaultEmail={user?.email}
            defaultNames={defaultNames}
            applicationId={applicationId || undefined}
            needsCorrection={needsCorrection}
            correctionFields={correctionFields}
          />
        </div>
      </section>
    </>
  )
}

