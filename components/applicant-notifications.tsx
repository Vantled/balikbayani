// components/applicant-notifications.tsx
"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"

interface Notification {
  id: string
  type: 'status_change' | 'application_deleted'
  title: string
  message: string
  application_type: 'direct_hire' | 'balik_manggagawa' | 'gov_to_gov' | null
  application_id: string | null
  is_read: boolean
  created_at: string
  read_at: string | null
}

export default function ApplicantNotifications() {
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/applicant/notifications?limit=20', {
        credentials: 'include',
      })
      const data = await response.json()

      if (data.success) {
        setNotifications(data.data.notifications || [])
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/applicant/notifications/unread-count', {
        credentials: 'include',
      })
      const data = await response.json()

      if (data.success) {
        setUnreadCount(data.data.count || 0)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  useEffect(() => {
    fetchNotifications()
    fetchUnreadCount()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount()
      if (open) {
        fetchNotifications()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [open])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/applicant/notifications/${notificationId}/read`, {
        method: 'PUT',
        credentials: 'include',
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/applicant/notifications/mark-all-read', {
        method: 'PUT',
        credentials: 'include',
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive',
      })
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id)
    }

    // Navigate to status page if application exists, with query param to open specific accordion
    if (notification.application_id) {
      setOpen(false)
      let openParam = ''
      if (notification.application_type === 'direct_hire') {
        openParam = '?open=direct-hire'
      } else if (notification.application_type === 'balik_manggagawa') {
        openParam = '?open=balik-manggagawa'
      } else if (notification.application_type === 'gov_to_gov') {
        openParam = '?open=gov-to-gov'
      }
      window.location.href = `/applicant/status${openParam}`
    }
  }

  return (
    <Popover open={open} onOpenChange={async (isOpen) => {
      setOpen(isOpen)
      if (isOpen) {
        await fetchNotifications()
        // Mark all as read when modal opens (if there are unread notifications)
        const hasUnread = notifications.some(n => !n.is_read) || unreadCount > 0
        if (hasUnread) {
          await handleMarkAllAsRead()
          await fetchUnreadCount()
        }
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[90vw] max-w-sm sm:w-96 p-0 mx-3 sm:mx-0"
        align="end"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
        </div>
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">No notifications</div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                      !notification.is_read ? 'bg-blue-500' : 'bg-transparent'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

