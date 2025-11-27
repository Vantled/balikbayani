// components/forgot-password-modal.tsx
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { useToast } from '@/hooks/use-toast'
import { X } from 'lucide-react'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

type Step = 'request' | 'verify' | 'reset'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordModal({ isOpen, onClose, onSuccess }: ForgotPasswordModalProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<Step>('request')
  const [identifier, setIdentifier] = useState('')
  const [email, setEmail] = useState('')
  const [otpValue, setOtpValue] = useState('')
  const [verificationToken, setVerificationToken] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(prev => Math.max(prev - 1, 0)), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setStep('request')
      setIdentifier('')
      setEmail('')
      setOtpValue('')
      setVerificationToken(null)
      setNewPassword('')
      setConfirmPassword('')
      setResendCooldown(0)
    }
  }, [isOpen])

  const handleRequestOtp = async () => {
    if (!identifier.trim()) {
      toast({
        title: 'Required field',
        description: 'Please enter your email address or username.',
        variant: 'destructive',
      })
      return
    }

    setSendingOtp(true)
    try {
      const response = await fetch('/api/auth/forgot-password/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        setEmail(data.data?.email || identifier.trim())
        setStep('verify')
        setResendCooldown(data.data?.retryAfterSeconds || 60)
        toast({
          title: 'Verification code sent',
          description: data.message || 'A 6-digit code has been sent to your email address.',
        })
      } else {
        toast({
          title: 'Unable to send code',
          description: data.error || 'Please try again shortly.',
          variant: 'destructive',
        })
        if (data.data?.retryAfterSeconds) {
          setResendCooldown(data.data.retryAfterSeconds)
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send verification code. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSendingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      toast({
        title: 'Incomplete code',
        description: 'Please enter the full 6-digit verification code.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/forgot-password/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpValue }),
      })

      const data = await response.json()

      if (data.success && data.data?.verificationToken) {
        setVerificationToken(data.data.verificationToken)
        setStep('reset')
        toast({
          title: 'Code verified',
          description: 'You can now set your new password.',
        })
      } else {
        toast({
          title: 'Incorrect code',
          description: data.error || 'Please double-check the code and try again.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to verify code. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast({
        title: 'Invalid password',
        description: 'Password must be at least 8 characters long.',
        variant: 'destructive',
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both password fields match.',
        variant: 'destructive',
      })
      return
    }

    if (!verificationToken) {
      toast({
        title: 'Verification required',
        description: 'Please verify your email first.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          verificationToken,
          newPassword,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Password reset successful',
          description: 'You can now sign in with your new password.',
        })
        onClose()
        if (onSuccess) {
          onSuccess()
        }
      } else {
        toast({
          title: 'Reset failed',
          description: data.error || 'Failed to reset password. Please try again.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reset password. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    await handleRequestOtp()
  }

  const handleInteractOutside = (e: Event) => {
    // Prevent closing on outside click for desktop/laptop (screen width >= 640px)
    if (window.innerWidth >= 640) {
      e.preventDefault()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Only close if explicitly requested (Cancel button, X button, or mobile outside click)
      if (!open) {
        // Allow closing on mobile (outside click)
        if (window.innerWidth < 640) {
          onClose()
        }
        // On desktop, onClose is only called by explicit actions (Cancel button, etc.)
        // Outside clicks are prevented by handleInteractOutside
      }
    }}>
      <DialogContent 
        className="w-[95vw] sm:w-full max-w-md"
        onInteractOutside={handleInteractOutside}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Forgot Password</DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            {step === 'request' && 'Enter your email address or username for verification.'}
            {step === 'verify' && `Enter the 6-digit code sent to ${email}`}
            {step === 'reset' && 'Enter your new password below.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {step === 'request' && (
            <>
              <div className="space-y-2">
                <label htmlFor="identifier" className="text-sm font-medium text-gray-700">
                  Email or Username
                </label>
                <Input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your email or username"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleRequestOtp()
                    }
                  }}
                />
                <p className="text-xs text-gray-500">
                  This feature is only available for applicant accounts.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={sendingOtp}
                  className="flex-1 bg-[#0f62fe] hover:bg-[#0c4dcc]"
                >
                  {sendingOtp ? 'Sending...' : 'Send Code'}
                </Button>
              </div>
            </>
          )}

          {step === 'verify' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Verification Code</label>
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={setOtpValue}
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, index) => (
                      <InputOTPSlot key={index} index={index} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <div className="flex items-center justify-between text-xs">
                  <p className="text-gray-500">
                    {resendCooldown > 0
                      ? `You can resend another code in ${resendCooldown}s.`
                      : "Didn't receive the code?"}
                  </p>
                  {resendCooldown === 0 && (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="text-[#0f62fe] hover:underline font-medium"
                    >
                      Resend code
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('request')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={loading || otpValue.length !== 6}
                  className="flex-1 bg-[#0f62fe] hover:bg-[#0c4dcc]"
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </Button>
              </div>
            </>
          )}

          {step === 'reset' && (
            <>
              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                  New Password
                </label>
                <PasswordInput
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  minLength={8}
                />
                <p className="text-xs text-gray-500">Password must be at least 8 characters long.</p>
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  minLength={8}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('verify')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={loading || !newPassword || !confirmPassword}
                  className="flex-1 bg-[#0f62fe] hover:bg-[#0c4dcc]"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

