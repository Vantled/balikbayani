// lib/services/auth-service.ts
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { User } from '../types';

export interface LoginResult {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
  error?: string;
}

export interface SessionInfo {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly SESSION_DURATION_HOURS = 24;
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION_MINUTES = 30;

  /**
   * Hash a password securely
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Register a new user
   */
  static async registerUser(userData: {
    username: string;
    email: string;
    password: string;
    full_name: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Check if user already exists
      const existingUser = await db.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [userData.username, userData.email]
      );

      if (existingUser.rows.length > 0) {
        return { success: false, error: 'Username or email already exists' };
      }

      // Hash password
      const passwordHash = await this.hashPassword(userData.password);

      // Create user with default role as 'staff'
      const result = await db.query(
        `INSERT INTO users (username, email, password_hash, full_name, role, is_approved)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userData.username, userData.email, passwordHash, userData.full_name, 'staff', false]
      );

      const user = result.rows[0];
      return { success: true, user };

    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  }

  /**
   * Create a new user (Superadmin only)
   */
  static async createUser(userData: {
    username: string;
    email: string;
    password: string;
    full_name: string;
    role: 'superadmin' | 'admin' | 'staff';
    createdBy: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Check if user already exists
      const existingUser = await db.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [userData.username, userData.email]
      );

      if (existingUser.rows.length > 0) {
        return { success: false, error: 'Username or email already exists' };
      }

      // Hash password
      const passwordHash = await this.hashPassword(userData.password);

      // Create user
      const result = await db.query(
        `INSERT INTO users (username, email, password_hash, full_name, role, is_approved, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [userData.username, userData.email, passwordHash, userData.full_name, userData.role, true, userData.createdBy]
      );

      const user = result.rows[0];
      
      // Log user creation
      await this.logAuditEvent(userData.createdBy, 'USER_CREATED', 'users', user.id, null, { role: userData.role });

      return { success: true, user };

    } catch (error) {
      console.error('User creation error:', error);
      return { success: false, error: 'User creation failed' };
    }
  }

  /**
   * Get all users (Superadmin only)
   */
  static async getAllUsers(): Promise<{ success: boolean; users?: User[]; error?: string }> {
    try {
      const result = await db.query(
        `SELECT u.*
         FROM users u
         ORDER BY u.created_at DESC`
      );

      return { success: true, users: result.rows };

    } catch (error) {
      console.error('Get users error:', error);
      return { success: false, error: 'Failed to retrieve users' };
    }
  }

  /**
   * Update user role (Superadmin only)
   */
  static async updateUserRole(
    userId: string, 
    newRole: 'superadmin' | 'admin' | 'staff', 
    updatedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Prevent superadmin from changing their own role
      if (userId === updatedBy) {
        return { success: false, error: 'Cannot change your own role' };
      }

      const result = await db.query(
        'UPDATE users SET role = $1 WHERE id = $2 RETURNING *',
        [newRole, userId]
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'User not found' };
      }

      await this.logAuditEvent(updatedBy, 'USER_ROLE_UPDATED', 'users', userId, { role: result.rows[0].role }, { role: newRole });

      return { success: true };

    } catch (error) {
      console.error('Role update error:', error);
      return { success: false, error: 'Role update failed' };
    }
  }

  /**
   * Delete user (Superadmin only)
   */
  static async deleteUser(userId: string, deletedBy: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Prevent superadmin from deleting themselves
      if (userId === deletedBy) {
        return { success: false, error: 'Cannot delete your own account' };
      }

      // Check if user exists
      const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return { success: false, error: 'User not found' };
      }

      // Delete user (this will cascade to related records)
      await db.query('DELETE FROM users WHERE id = $1', [userId]);

      await this.logAuditEvent(deletedBy, 'USER_DELETED', 'users', userId, userResult.rows[0], null);

      return { success: true };

    } catch (error) {
      console.error('User deletion error:', error);
      return { success: false, error: 'User deletion failed' };
    }
  }

  /**
   * Deactivate user (Superadmin only) - maintains data integrity
   */
  static async deactivateUser(userId: string, deactivatedBy: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user exists
      const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return { success: false, error: 'User not found' };
      }

      const user = userResult.rows[0];

      // Check if user is already deactivated
      if (!user.is_active) {
        return { success: false, error: 'User is already deactivated' };
      }

      // Deactivate user by setting is_active to false
      await db.query('UPDATE users SET is_active = false WHERE id = $1', [userId]);

      // Invalidate all active sessions for this user
      await db.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);

      await this.logAuditEvent(deactivatedBy, 'USER_DEACTIVATED', 'users', userId, { is_active: true }, { is_active: false });

      return { success: true };

    } catch (error) {
      console.error('User deactivation error:', error);
      return { success: false, error: 'User deactivation failed' };
    }
  }

  /**
   * Activate user (Superadmin only) - reactivates previously deactivated user
   */
  static async activateUser(userId: string, activatedBy: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user exists
      const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return { success: false, error: 'User not found' };
      }

      const user = userResult.rows[0];

      // Check if user is already active
      if (user.is_active) {
        return { success: false, error: 'User is already active' };
      }

      // Activate user by setting is_active to true
      await db.query('UPDATE users SET is_active = true WHERE id = $1', [userId]);

      await this.logAuditEvent(activatedBy, 'USER_ACTIVATED', 'users', userId, { is_active: false }, { is_active: true });

      return { success: true };

    } catch (error) {
      console.error('User activation error:', error);
      return { success: false, error: 'User activation failed' };
    }
  }

  /**
   * Authenticate user login
   */
  static async loginUser(
    username: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResult> {
    try {
      // Get user by username
      const userResult = await db.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );

      if (userResult.rows.length === 0) {
        return { success: false, error: 'Invalid credentials' };
      }

      const user = userResult.rows[0];

      // Check if account is locked
      if (user.account_locked_until && new Date() < user.account_locked_until) {
        return { success: false, error: 'Account is temporarily locked' };
      }

      // Check if account is active
      if (!user.is_active) {
        return { success: false, error: 'Account is deactivated' };
      }

      // Check if account is approved
      if (!user.is_approved) {
        return { success: false, error: 'Account pending approval' };
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.password_hash);

      if (!isValidPassword) {
        // Increment failed login attempts
        await this.incrementFailedLoginAttempts(user.id);
        return { success: false, error: 'Invalid credentials' };
      }

      // Reset failed login attempts on successful login
      await this.resetFailedLoginAttempts(user.id);

      // Update last login
      await db.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Create session
      const session = await this.createSession(user.id, ipAddress, userAgent);

      // Log successful login
      await this.logAuditEvent(user.id, 'LOGIN', 'users', user.id, null, null, ipAddress, userAgent);

      return {
        success: true,
        user,
        token: session.token
      };

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  }

  /**
   * Create a new session
   */
  static async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SessionInfo> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.SESSION_DURATION_HOURS);

    const result = await db.query(
      `INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, token, ipAddress, userAgent, expiresAt]
    );

    const session = result.rows[0];
    
    // Return with the correct property names for SessionInfo interface
    return {
      id: session.id,
      userId: session.user_id,
      token: session.session_token,
      expiresAt: session.expires_at,
      ipAddress: session.ip_address,
      userAgent: session.user_agent
    };
  }

  /**
   * Validate session token
   */
  static async validateSession(token: string): Promise<User | null> {
    try {
      const sessionResult = await db.query(
        `SELECT s.*, u.* FROM user_sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.session_token = $1 AND s.expires_at > CURRENT_TIMESTAMP`,
        [token]
      );

      if (sessionResult.rows.length === 0) {
        return null;
      }

      const session = sessionResult.rows[0];

      // Check if user is still active and approved
      if (!session.is_active || !session.is_approved) {
        await this.invalidateSession(token);
        return null;
      }

      return session;

    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  /**
   * Invalidate session (logout)
   */
  static async invalidateSession(token: string): Promise<void> {
    await db.query(
      'DELETE FROM user_sessions WHERE session_token = $1',
      [token]
    );
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<void> {
    await db.query(
      'DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP'
    );
  }

  /**
   * Increment failed login attempts
   */
  private static async incrementFailedLoginAttempts(userId: string): Promise<void> {
    const result = await db.query(
      'UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1 RETURNING failed_login_attempts',
      [userId]
    );

    const failedAttempts = result.rows[0]?.failed_login_attempts || 0;

    // Lock account if max attempts reached
    if (failedAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      const lockoutUntil = new Date();
      lockoutUntil.setMinutes(lockoutUntil.getMinutes() + this.LOCKOUT_DURATION_MINUTES);

      await db.query(
        'UPDATE users SET account_locked_until = $1 WHERE id = $2',
        [lockoutUntil, userId]
      );
    }
  }

  /**
   * Reset failed login attempts
   */
  private static async resetFailedLoginAttempts(userId: string): Promise<void> {
    await db.query(
      'UPDATE users SET failed_login_attempts = 0, account_locked_until = NULL WHERE id = $1',
      [userId]
    );
  }

  /**
   * Log audit event
   */
  static async logAuditEvent(
    userId: string,
    action: string,
    tableName: string,
    recordId: string,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, action, tableName, recordId, oldValues, newValues, ipAddress, userAgent]
    );
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current user
      const userResult = await db.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return { success: false, error: 'User not found' };
      }

      const user = userResult.rows[0];

      // Verify current password
      const isValidPassword = await this.verifyPassword(currentPassword, user.password_hash);
      if (!isValidPassword) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password
      await db.query(
        'UPDATE users SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newPasswordHash, userId]
      );

      // Log password change
      await this.logAuditEvent(userId, 'PASSWORD_CHANGE', 'users', userId);

      return { success: true };

    } catch (error) {
      console.error('Password change error:', error);
      return { success: false, error: 'Password change failed' };
    }
  }

  /**
   * Approve user account (admin only)
   */
  static async approveUser(userId: string, approvedBy: string): Promise<{ success: boolean; error?: string }> {
    try {
      await db.query(
        'UPDATE users SET is_approved = TRUE WHERE id = $1',
        [userId]
      );

      await this.logAuditEvent(approvedBy, 'USER_APPROVED', 'users', userId);

      return { success: true };

    } catch (error) {
      console.error('User approval error:', error);
      return { success: false, error: 'User approval failed' };
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<User | null> {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Get user by ID error:', error);
      return null;
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Get user by email error:', error);
      return null;
    }
  }

  /**
   * Get user by username
   */
  static async getUserByUsername(username: string): Promise<User | null> {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Get user by username error:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(
    userId: string,
    updateData: {
      full_name?: string;
      email?: string;
      username?: string;
      password_hash?: string;
      password_changed_at?: string;
    }
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      // Build dynamic update query
      if (updateData.full_name !== undefined) {
        fields.push(`full_name = $${paramIndex++}`);
        values.push(updateData.full_name);
      }
      if (updateData.email !== undefined) {
        fields.push(`email = $${paramIndex++}`);
        values.push(updateData.email);
      }
      if (updateData.username !== undefined) {
        fields.push(`username = $${paramIndex++}`);
        values.push(updateData.username);
      }
      if (updateData.password_hash !== undefined) {
        fields.push(`password_hash = $${paramIndex++}`);
        values.push(updateData.password_hash);
      }
      if (updateData.password_changed_at !== undefined) {
        fields.push(`password_changed_at = $${paramIndex++}`);
        values.push(updateData.password_changed_at);
      }

      if (fields.length === 0) {
        return { success: false, error: 'No fields to update' };
      }

      // Add updated_at timestamp
      fields.push(`updated_at = CURRENT_TIMESTAMP`);

      // Add user ID to values
      values.push(userId);

      const query = `
        UPDATE users 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return { success: false, error: 'User not found' };
      }

      return { success: true, user: result.rows[0] };

    } catch (error) {
      console.error('Update user profile error:', error);
      return { success: false, error: 'Profile update failed' };
    }
  }
}

export default AuthService;
