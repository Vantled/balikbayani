// app/applicant/start/gov-to-gov/page.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ApplicantHeader from '@/components/applicant-header'
import GovToGovApplicantForm from './gov-to-gov-form'
import { AuthService } from '@/lib/services/auth-service'
import { db } from '@/lib/database'

export default async function ApplicantStartGovToGovPage() {
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

  const existing = await db.query(
    'SELECT id FROM gov_to_gov_applications WHERE applicant_user_id = $1 LIMIT 1',
    [validatedUser.id]
  )

  if (existing.rows.length > 0) {
    redirect('/applicant/status')
  }

  const fullName = (user?.full_name || '').trim()
  const nameParts = fullName.split(/\s+/).filter(Boolean)
  const defaultNames = {
    first: nameParts[0] || '',
    last: nameParts.length > 1 ? nameParts[nameParts.length - 1] : '',
    middle: nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '',
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
          />
        </div>
      </section>
    </>
  )
}

