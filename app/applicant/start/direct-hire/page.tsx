// app/applicant/start/direct-hire/page.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DirectHireApplicantForm from './direct-hire-form'
import ApplicantHeader from '@/components/applicant-header'
import { AuthService } from '@/lib/services/auth-service'
import { db } from '@/lib/database'

export default async function ApplicantStartDirectHirePage() {
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

  // Check if applicant already has a Direct Hire application
  const existingApp = await db.query(
    'SELECT id FROM direct_hire_applications WHERE applicant_user_id = $1 LIMIT 1',
    [validatedUser.id]
  )

  if (existingApp.rows.length > 0) {
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
          <p className="text-sm uppercase tracking-[0.3em] text-[#0f62fe] font-semibold">Direct Hire Application</p>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Provide your details</h1>
          <p className="text-gray-600 text-base md:text-lg">
            Complete the form below. Once submitted, your application receives a control number and moves directly to the Direct Hire monitoring table.
          </p>
        </div>

        <DirectHireApplicantForm
          defaultEmail={user?.email}
          defaultNames={defaultNames}
        />
      </div>
    </section>
    </>
  )
}

