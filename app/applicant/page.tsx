// app/applicant/page.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ApplicantHeader from '@/components/applicant-header'

type SearchParams = { [key: string]: string | string[] | undefined }

export default async function ApplicantHomePage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const cookieStore = await cookies()
  const params = searchParams ? await searchParams : undefined
  const userCookie = cookieStore.get('bb_user')
  if (!userCookie) {
    redirect('/login?from=/applicant')
  }

  let userRole: string | null = null
  try {
    const parsed = JSON.parse(userCookie.value)
    userRole = parsed?.role || null
  } catch {
    userRole = null
  }

  if (userRole !== 'applicant') {
    redirect('/dashboard')
  }

  const submittedModule = typeof params?.submitted === 'string' ? params.submitted : undefined
  const controlNumber = typeof params?.control === 'string' ? params.control : undefined

  return (
    <>
      <ApplicantHeader />
      <section className="min-h-[calc(100vh-4rem)] bg-[#eaf3fc] flex items-center justify-center px-4 py-16 pt-20">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl p-8 md:p-12 text-center space-y-6">
        {submittedModule === 'direct-hire' && controlNumber && (
          <div className="rounded-2xl border border-[#cfe0ff] bg-[#f5f8ff] px-4 py-3 text-sm text-left text-[#0f62fe] shadow-inner">
            <p className="font-semibold">Direct Hire application submitted!</p>
            <p>Your control number is <span className="font-mono font-bold">{controlNumber}</span>. Keep it for reference.</p>
          </div>
        )}
        <p className="text-sm uppercase tracking-[0.3em] text-[#0f62fe] font-semibold">Applicant Portal</p>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          Welcome to BalikBayani Portal!
        </h1>
        <p className="text-base md:text-lg text-gray-600 leading-relaxed">
          Manage your overseas application in one secure workspace. Start a new application or track the progress of your existing submissions for Direct Hire, Balik Manggagawa, Gov-to-Gov, and Information Sheet services.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 sm:justify-center">
          <Link
            href="/applicant/start"
            className="px-6 py-3 rounded-xl bg-[#0f62fe] text-white font-semibold shadow hover:bg-[#0c4dcc] transition-all text-center"
          >
            Start Application
          </Link>
          <Link
            href="/applicant/status"
            className="px-6 py-3 rounded-xl border border-[#0f62fe] text-[#0f62fe] font-semibold hover:bg-[#e5edff] transition-all text-center"
          >
            Track Status
          </Link>
        </div>
      </div>
    </section>
    </>
  )
}

