// app/applicant/start/direct-hire/page.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DirectHireApplicantForm from './direct-hire-form'
import ApplicantHeader from '@/components/applicant-header'
import { AuthService } from '@/lib/services/auth-service'
import { db } from '@/lib/database'

export default async function ApplicantStartDirectHirePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; corrections?: string }>
}) {
  const params = await searchParams
  const editApplicationId = params.edit
  const isCorrectionMode = params.corrections === 'true'
  
  const cookieStore = await cookies()
  const userCookie = cookieStore.get('bb_user')
  const token = cookieStore.get('bb_auth_token')?.value
  
  if (!userCookie || !token) {
    redirect('/login?from=/applicant/start/direct-hire')
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

  // Validate session and get user ID from database
  const validatedUser = await AuthService.validateSession(token)
  if (!validatedUser || validatedUser.role !== 'applicant') {
    redirect('/login?from=/applicant/start/direct-hire')
  }

  // If editing, fetch application data
  let applicationData: any = null
  let correctionFields: string[] = []
  if (editApplicationId && isCorrectionMode) {
    const appResult = await db.query(
      'SELECT id, needs_correction, correction_fields FROM direct_hire_applications WHERE id = $1 AND applicant_user_id = $2 AND deleted_at IS NULL',
      [editApplicationId, validatedUser.id]
    )
    if (appResult.rows.length > 0) {
      applicationData = appResult.rows[0]
      if (applicationData.needs_correction && applicationData.correction_fields) {
        try {
          correctionFields = Array.isArray(applicationData.correction_fields) 
            ? applicationData.correction_fields 
            : JSON.parse(applicationData.correction_fields || '[]')
        } catch {
          correctionFields = []
        }
      }
    } else {
      redirect('/applicant/status')
    }
  } else {
    // Check if applicant already has an active Direct Hire application (ignore soft-deleted)
    const existingApp = await db.query(
      'SELECT id FROM direct_hire_applications WHERE applicant_user_id = $1 AND deleted_at IS NULL LIMIT 1',
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
          <p className="text-sm uppercase tracking-[0.3em] text-[#0f62fe] font-semibold">Direct Hire Application</p>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Provide your details</h1>
          <p className="text-gray-600 text-base md:text-lg">
            Complete the form below. Once submitted, your application receives a control number and moves directly to the Direct Hire monitoring table.
          </p>
        </div>

        <DirectHireApplicantForm
          defaultEmail={user?.email}
          defaultNames={defaultNames}
          applicationId={editApplicationId}
          needsCorrection={isCorrectionMode && applicationData?.needs_correction}
          correctionFields={correctionFields}
        />
      </div>
    </section>
    </>
  )
}

