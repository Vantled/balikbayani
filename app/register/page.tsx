// app/register/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { useToast } from '@/hooks/use-toast'
import {
  register,
  requestRegistrationOtp,
  verifyRegistrationOtp,
} from '@/lib/auth'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FormState = {
  firstName: string
  middleName: string
  lastName: string
  email: string
  username: string
  password: string
  confirmPassword: string
}

const initialFormState: FormState = {
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
}

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [formData, setFormData] = useState<FormState>(initialFormState)
  const [otpValue, setOtpValue] = useState('')
  const [verificationToken, setVerificationToken] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const normalizedEmail = useMemo(
    () => formData.email.trim().toLowerCase(),
    [formData.email]
  )

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(prev => Math.max(prev - 1, 0)), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  useEffect(() => {
    setOtpSent(false)
    setVerificationToken(null)
    setOtpValue('')
  }, [normalizedEmail])

  const updateField = (field: keyof FormState, value: string) => {
    const nameFields: (keyof FormState)[] = ['firstName', 'middleName', 'lastName']
    const nextValue = nameFields.includes(field) ? value.toUpperCase() : value
    setFormData(prev => ({ ...prev, [field]: nextValue }))
  }

  const handleSendOtp = async () => {
    if (!normalizedEmail || !emailPattern.test(normalizedEmail)) {
      toast({
        title: 'Invalid email',
        description: 'Enter a valid email address before requesting a code.',
        variant: 'destructive',
      })
      return
    }

    setSendingOtp(true)
    try {
      const result = await requestRegistrationOtp(normalizedEmail)
      if (result.success) {
        setOtpSent(true)
        setResendCooldown(60)
        toast({
          title: 'Verification code sent',
          description: `We emailed a 6-digit code to ${normalizedEmail}.`,
        })
      } else {
        if (result.retryAfterSeconds) {
          setResendCooldown(result.retryAfterSeconds)
        }
        toast({
          title: 'Unable to send code',
          description: result.error || 'Please try again shortly.',
          variant: 'destructive',
        })
      }
    } finally {
      setSendingOtp(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please provide at least your first and last names.',
        variant: 'destructive',
      })
      return
    }

    if (otpValue.length !== 6) {
      toast({
        title: 'Incomplete code',
        description: 'Enter the full 6-digit verification code.',
        variant: 'destructive',
      })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Re-enter your password so both fields match.',
        variant: 'destructive',
      })
      return
    }

    const composedFullName = [
      formData.firstName.trim(),
      formData.middleName.trim(),
      formData.lastName.trim(),
    ].filter(Boolean).join(' ')

    const formattedFullName = composedFullName.toUpperCase()

    setRegistering(true)
    try {
      const verificationResult = await verifyRegistrationOtp(normalizedEmail, otpValue)
      if (!verificationResult.success || !verificationResult.verificationToken) {
        toast({
          title: 'Incorrect code',
          description: verificationResult.error || 'Please double-check the code and try again.',
          variant: 'destructive',
        })
        return
      }

      setVerificationToken(verificationResult.verificationToken)

      const result = await register({
        username: formData.username.trim().toLowerCase(),
        email: normalizedEmail,
        password: formData.password,
        full_name: formattedFullName,
        verification_token: verificationResult.verificationToken,
      })

      if (result.success) {
        toast({
          title: 'Account created',
          description: 'You can now sign in to the BalikBayani Portal.',
        })
        router.push('/login?registered=true')
      } else {
        toast({
          title: 'Registration failed',
          description: result.error || 'Please review your details and try again.',
          variant: 'destructive',
        })
      }
    } finally {
      setRegistering(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#eaf3fc] flex flex-col">
      <header className="w-full fixed top-0 left-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col">
          <span className="text-2xl font-bold text-[#1976D2] drop-shadow-sm">BalikBayani Portal</span>
          <span className="text-sm text-gray-600 mt-1">Department of Migrant Workers</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pt-28 pb-10">
        <div className="w-full max-w-6xl grid gap-6 lg:grid-cols-[3fr,2fr]">
          <section className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <Image
                src="/dmw-logo.png"
                alt="Department of Migrant Workers Logo"
                width={56}
                height={56}
                className="rounded-full border"
              />
              <div>
                <h1 className="text-2xl font-bold text-[#0f62fe]">Create your applicant account</h1>
                <p className="text-sm text-gray-500">
                  Register once and manage your Direct Hire, Balik Manggagawa, Gov-to-Gov, or Information Sheet applications.
                </p>
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                    First name
                  </label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={event => updateField('firstName', event.target.value)}
                    placeholder="JUAN"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="middleName" className="text-sm font-medium text-gray-700">
                    Middle name
                  </label>
                  <Input
                    id="middleName"
                    value={formData.middleName}
                    onChange={event => updateField('middleName', event.target.value)}
                    placeholder="REYES"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                    Last name
                  </label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={event => updateField('lastName', event.target.value)}
                    placeholder="DELA CRUZ"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium text-gray-700">
                  Username
                </label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={event => updateField('username', event.target.value)}
                  placeholder="juandelacruz"
                  required
                />
                <p className="text-xs text-gray-500">Use lowercase letters, numbers, dots, or hyphens.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <PasswordInput
                    id="password"
                    value={formData.password}
                    onChange={event => updateField('password', event.target.value)}
                    placeholder="Enter your password"
                    minLength={8}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                    Confirm password
                  </label>
                  <PasswordInput
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={event => updateField('confirmPassword', event.target.value)}
                    placeholder="Confirm your password"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={event => updateField('email', event.target.value)}
                    placeholder="you@example.com"
                    required
                    className="sm:flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || resendCooldown > 0}
                    className="sm:w-auto"
                  >
                    {sendingOtp ? 'Sending...' : otpSent ? 'Resend code' : 'Send code'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  {resendCooldown > 0
                    ? `You can resend another code in ${resendCooldown}s.`
                    : 'A 6-digit code will be sent to your email.'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Verification code</label>
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={setOtpValue}
                  disabled={!otpSent}
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, index) => (
                      <InputOTPSlot key={index} index={index} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#1976D2] hover:bg-[#0f62fe]"
                disabled={registering}
              >
                {registering ? 'Creating account...' : 'Create account'}
              </Button>

              <p className="text-sm text-center text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-[#0f62fe] font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </section>

          <aside className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">What you can do</h2>
              <p className="text-sm text-gray-500 mt-1">
                Applicants can submit one request per module. Each application stays in sync with staff workflows.
              </p>
              <ul className="mt-4 space-y-3 text-sm text-gray-600">
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[#0f62fe]" />
                  Track Direct Hire, Balik Manggagawa, Gov-to-Gov, or Information Sheet submissions.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[#0f62fe]" />
                  Receive a control number after submitting your application.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[#0f62fe]" />
                  Update personal information securely during first login.
                </li>
              </ul>
            </div>
            <div className="bg-[#f4f8ff] border border-[#d3e3ff] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[#0f62fe] uppercase tracking-wide">
                Registration checklist
              </h3>
              <ol className="mt-3 space-y-2 text-sm text-gray-700 list-decimal list-inside">
                <li>Fill out your name, username, and password.</li>
                <li>Verify your email using the 6-digit OTP.</li>
                <li>Confirm your credentials and submit.</li>
              </ol>
              <p className="text-xs text-gray-500 mt-3">
                Keep your email and password secure. You&apos;ll need them to access your status board.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

