// app/applicant/start/balik-manggagawa/page.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ApplicantHeader from '@/components/applicant-header'
import BalikManggagawaApplicantForm from './balik-manggagawa-form'
import AuthService from '@/lib/services/auth-service'
import { db } from '@/lib/database'

export default async function ApplicantStartBalikManggagawaPage() {
  const cookieStore = await cookies()
  const userCookie = cookieStore.get('bb_user')
  const token = cookieStore.get('bb_auth_token')?.value

  if (!userCookie || !token) {
    redirect('/login?from=/applicant/start/balik-manggagawa')
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
    redirect('/login?from=/applicant/start/balik-manggagawa')
  }

  // Only block when there is an active (not soft-deleted) BM application
  const existingApp = await db.query(
    'SELECT id FROM balik_manggagawa_clearance WHERE applicant_user_id = $1 AND deleted_at IS NULL LIMIT 1',
    [validatedUser.id]
  )

  if (existingApp.rows.length > 0) {
    redirect('/applicant/status')
  }

  const preferredUser = validatedUser || user

  // Use separate name fields from the authenticated user; fall back to parsing full_name for legacy records
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
            <p className="text-sm uppercase tracking-[0.3em] text-[#0f62fe] font-semibold">Balik Manggagawa</p>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Update your clearance details</h1>
            <p className="text-gray-600 text-base md:text-lg max-w-3xl mx-auto">
              Provide your new job information so we can generate a Balik Manggagawa control number and keep your clearance status in sync with the processing team.
            </p>
          </div>

          <BalikManggagawaApplicantForm
            defaultNames={defaultNames}
          />
        </div>
      </section>
    </>
  )
}

