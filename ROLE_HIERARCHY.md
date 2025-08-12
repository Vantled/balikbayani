# Role Hierarchy System

## Overview

The BalikBayani Portal implements a comprehensive role-based access control (RBAC) system with three hierarchical user roles:

- **Superadmin** (Highest): Full system access including user management
- **Admin** (High): Most administrative controls
- **Staff** (Normal): Same capabilities as Admin

## User Roles and Capabilities

### Superadmin
- ✅ **User Management**: Create, view, edit, and deactivate user accounts
- ✅ **Role Management**: Assign and modify user roles
- ✅ **System Administration**: Full access to all system features
- ✅ **Data Integrity**: Maintains audit trails and prevents data loss
- ✅ **Privacy Protection**: Names and emails are anonymized for privacy

### Admin
- ✅ **System Operations**: Access to all operational features
- ✅ **Data Management**: Manage application data and records
- ❌ **User Management**: Cannot create or manage user accounts

### Staff
- ✅ **System Operations**: Same capabilities as Admin
- ✅ **Data Management**: Manage application data and records
- ❌ **User Management**: Cannot create or manage user accounts

## Implementation Details

### Database Schema

The `users` table includes:
```sql
role VARCHAR(20) NOT NULL DEFAULT 'staff' CHECK (role IN ('superadmin', 'admin', 'staff')),
is_active BOOLEAN DEFAULT true,
```

### Authentication & Authorization

- **Session-based authentication** using secure tokens
- **Role-based middleware** protecting sensitive routes
- **Audit logging** for all user management actions
- **Data integrity** through deactivation instead of deletion

### Privacy Features

#### Name Anonymization
- Shows only first 3 letters of each word in names
- Remaining characters are replaced with asterisks (*)
- Examples:
  - "John Doe" → "Joh* Doe"
  - "Maria Santos Cruz" → "Mar** San*** Cru*"
  - "Juan" → "Jua*"
  - "Ana" → "Ana" (unchanged if ≤3 letters)
  - "Super Administrator" → "Sup*** Adm********"
  - "Administrator" → "Adm********"

#### Email Anonymization
- Shows only first 3 characters of the entire email
- Remaining characters are replaced with asterisks (*)
- Examples:
  - "john.doe@example.com" → "joh****************"
  - "admin@balikbayani.gov.ph" → "adm*********************"
  - "maria@test.org" → "mar***********"

#### Username Anonymization
- Shows only first 3 characters of the username
- Remaining characters are replaced with asterisks (*)
- Examples:
  - "john_doe" → "joh*****"
  - "superadmin" → "sup*******"
  - "admin_user" → "adm*******"

## API Endpoints

### User Management (Superadmin Only)

#### GET `/api/users`
- **Purpose**: Retrieve all users with anonymized data
- **Authentication**: Required (Superadmin only)
- **Response**: List of users with anonymized names and emails

#### POST `/api/users`
- **Purpose**: Create new user account
- **Authentication**: Required (Superadmin only)
- **Body**: `{ username, email, password, full_name, role }`
- **Audit**: Logs user creation with creator information

#### PUT `/api/users/[id]`
- **Purpose**: Update user role
- **Authentication**: Required (Superadmin only)
- **Body**: `{ role }`
- **Protection**: Cannot change own role

#### PUT `/api/users/[id]/deactivate`
- **Purpose**: Deactivate user (maintains data integrity)
- **Authentication**: Required (Superadmin only)
- **Features**: 
  - Sets `is_active = false`
  - Invalidates all user sessions
  - Maintains all user data and relationships
  - Can be reversed later

#### PUT `/api/users/[id]/activate`
- **Purpose**: Reactivate previously deactivated user
- **Authentication**: Required (Superadmin only)
- **Features**: Sets `is_active = true`

#### PUT `/api/profile`
- **Purpose**: Update user profile information and password
- **Authentication**: Required (All authenticated users)
- **Body**: `{ email, username, current_password, new_password? }`
- **Features**: 
  - Updates personal information (email and username only)
  - **Current password required for all changes** (security verification)
  - Password change requires current password verification
  - Email and username uniqueness validation
  - Audit logging of all changes

## Security Features

### Session Management
- **Secure token generation** using UUID v4
- **Automatic session expiration** (24 hours)
- **Session invalidation** on user deactivation
- **Cookie-based authentication** for web interface

### Data Protection
- **Password hashing** using bcrypt (12 rounds)
- **Role-based access control** at API level
- **Audit logging** for all sensitive operations
- **Input validation** and sanitization

### Privacy Protection
- **Name anonymization** in user lists
- **Email anonymization** in user lists
- **Username anonymization** in user lists
- **Hover-to-reveal functionality** for temporary access to full information
- **Full data retention** for compliance
- **Reversible operations** (deactivation vs deletion)

## User Interface

### Navigation Integration
- **Header component** provides consistent navigation
- **Role-based menu items** (User Management for Superadmin only)
- **Active page highlighting** in navigation
- **Responsive design** for mobile and desktop

### User Management Page
- **Anonymized display** of user information with hover-to-reveal functionality
- **Role-based actions** (Edit role, Deactivate/Activate)
- **Status indicators** (Active, Deactivated, Pending)
- **Confirmation dialogs** for destructive actions
- **Real-time feedback** with toast notifications
- **Hover-to-reveal**: Hold eye icon to temporarily reveal anonymized information
- **Columns**: Name, Username, Email, Role, Status, Last Login, Actions

### Profile Management
- **Account Information**: Update email and username (full name is read-only)
- **Security Verification**: **Current password modal for general changes** (username/email updates)
- **Password Security**: Change password with current password field and confirm password modal
- **Validation**: Email format validation and duplicate checking
- **Account Status**: Display role, status, approval, and last login
- **Security**: Current password required for all changes, confirm password modal for password changes
- **Real-time Updates**: Profile changes are immediately reflected in the UI and persisted across browser sessions
- **Audit Logging**: All profile changes are logged for security

## Migration and Setup

### Database Migration
```bash
npm run db:role-migrate
```

### Set Superadmin Password
```bash
npm run db:set-superadmin-password
```

### Default Credentials
- **Username**: `superadmin`
- **Password**: `superadmin123`

## Best Practices

### User Management
1. **Always deactivate** instead of deleting users
2. **Maintain audit trails** for compliance
3. **Use anonymization** for privacy protection
4. **Regular role reviews** for security

### Security
1. **Strong passwords** for all accounts
2. **Regular session cleanup** of expired tokens
3. **Monitor audit logs** for suspicious activity
4. **Limit superadmin accounts** to essential personnel

### Data Integrity
1. **Preserve user relationships** through deactivation
2. **Maintain historical data** for reporting
3. **Use soft deletes** for all user data
4. **Regular backups** of user management data

## Testing

### Available Test Scripts
```bash
npm run test:role-hierarchy      # Test role hierarchy functions
npm run test:complete-auth       # Test complete authentication flow
npm run test:user-management     # Test user management features
npm run test:profile            # Test profile functionality
npm run debug:session           # Debug session authentication
```

### Test Coverage
- ✅ Role-based authorization
- ✅ User creation and management
- ✅ Session validation
- ✅ Deactivation/activation flow
- ✅ Name and email anonymization
- ✅ API endpoint security
- ✅ Profile management and password changes

## Troubleshooting

### Common Issues

#### 401 Unauthorized on User Management
- Ensure logged in as superadmin
- Check session token validity
- Verify cookie-based authentication

#### User Not Found
- Check if user was deactivated
- Verify user ID in database
- Check audit logs for user status

#### Permission Denied
- Verify user role is superadmin
- Check role hierarchy implementation
- Ensure proper session validation

### Debug Commands
```bash
npm run debug:session           # Check active sessions
npm run test:auth              # Test authentication flow
npm run db:check-admin         # Verify admin user status
```

## Future Enhancements

### Planned Features
- **Bulk user operations** for efficiency
- **Advanced filtering** in user management
- **User activity monitoring** and reporting
- **Enhanced audit trail** with detailed logs
- **Role-based dashboard** customization

### Security Improvements
- **Multi-factor authentication** (MFA)
- **IP-based access controls**
- **Advanced session management**
- **Real-time security monitoring**

---

This system provides a robust, secure, and privacy-conscious user management solution that maintains data integrity while protecting user privacy through anonymization techniques.
