// lib/services/notification-service.ts
import { db } from '@/lib/database'

export interface Notification {
  id: string
  user_id: string
  type: 'status_change' | 'application_deleted'
  title: string
  message: string
  application_type: 'direct_hire' | 'balik_manggagawa' | 'gov_to_gov' | null
  application_id: string | null
  is_read: boolean
  created_at: string
  read_at: string | null
}

export class NotificationService {
  /**
   * Create a notification for an applicant
   */
  static async createNotification(
    userId: string,
    type: 'status_change' | 'application_deleted',
    title: string,
    message: string,
    applicationType?: 'direct_hire' | 'balik_manggagawa' | 'gov_to_gov',
    applicationId?: string
  ): Promise<Notification> {
    const result = await db.query(
      `INSERT INTO applicant_notifications 
       (user_id, type, title, message, application_type, application_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, type, title, message, applicationType || null, applicationId || null]
    )

    return result.rows[0]
  }

  /**
   * Get notifications for a user
   */
  static async getNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ notifications: Notification[]; total: number }> {
    const notificationsResult = await db.query(
      `SELECT * FROM applicant_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    )

    const countResult = await db.query(
      'SELECT COUNT(*) FROM applicant_notifications WHERE user_id = $1',
      [userId]
    )

    return {
      notifications: notificationsResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const result = await db.query(
      'SELECT COUNT(*) FROM applicant_notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    )

    return parseInt(result.rows[0].count, 10)
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await db.query(
      `UPDATE applicant_notifications
       SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [notificationId, userId]
    )

    return result.rows.length > 0
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<number> {
    const result = await db.query(
      `UPDATE applicant_notifications
       SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_read = FALSE
       RETURNING id`,
      [userId]
    )

    return result.rows.length
  }

  /**
   * Create status change notification
   */
  static async notifyStatusChange(
    userId: string,
    applicationType: 'direct_hire' | 'balik_manggagawa' | 'gov_to_gov',
    applicationId: string,
    oldStatus: string,
    newStatus: string,
    controlNumber?: string
  ): Promise<Notification> {
    const appTypeNames = {
      direct_hire: 'Direct Hire',
      balik_manggagawa: 'Balik Manggagawa',
      gov_to_gov: 'Gov-to-Gov',
    }

    const title = `${appTypeNames[applicationType]} Application Status Updated`
    const message = `Your ${appTypeNames[applicationType]} application${controlNumber ? ` (${controlNumber})` : ''} status has been updated. Check Track Status for detailed information.`

    return this.createNotification(
      userId,
      'status_change',
      title,
      message,
      applicationType,
      applicationId
    )
  }

  /**
   * Create application deleted notification
   */
  static async notifyApplicationDeleted(
    userId: string,
    applicationType: 'direct_hire' | 'balik_manggagawa' | 'gov_to_gov',
    applicationId: string,
    controlNumber?: string
  ): Promise<Notification> {
    const appTypeNames = {
      direct_hire: 'Direct Hire',
      balik_manggagawa: 'Balik Manggagawa',
      gov_to_gov: 'Gov-to-Gov',
    }

    const title = `${appTypeNames[applicationType]} Application Deleted`
    const message = `Your ${appTypeNames[applicationType]} application${controlNumber ? ` (${controlNumber})` : ''} has been deleted. You can now submit a new application.`

    return this.createNotification(
      userId,
      'application_deleted',
      title,
      message,
      applicationType,
      applicationId
    )
  }
}

