import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import Image from "next/image"

export default function LoginForm() {
  return (
    <Card className="w-full max-w-md p-6 bg-white">
      <div className="flex flex-col items-center mb-6">
        <div className="w-16 h-16 mb-4 relative">
          <Image src="/dmw-logo.png" alt="DMW Logo" fill style={{ objectFit: "contain" }} />
        </div>
        <h1 className="text-2xl font-bold text-[#1976D2]">BalikBayani Portal</h1>
        <p className="text-sm text-gray-500">Sign in to your account</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" placeholder="Enter your username" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" placeholder="Enter your password" />
        </div>

        <Button className="w-full bg-[#1976D2] hover:bg-[#1565C0]">Sign In</Button>
      </div>

      <div className="mt-4 text-center">
        <a href="#" className="text-sm text-[#1976D2] hover:underline">
          Forgot password?
        </a>
      </div>
    </Card>
  )
}
