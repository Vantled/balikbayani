# Direct Hire Backend Implementation

## Overview
The direct hire page now has a complete backend implementation that stores data in the PostgreSQL database. The system automatically generates control numbers following the specified template format.

## Features Implemented

### 1. Database Integration
- **API Routes**: Created RESTful API endpoints for CRUD operations
  - `GET /api/direct-hire` - Fetch applications with filtering and pagination
  - `POST /api/direct-hire` - Create new applications
  - `GET /api/direct-hire/[id]` - Get specific application
  - `PUT /api/direct-hire/[id]` - Update application
  - `DELETE /api/direct-hire/[id]` - Delete application

### 2. Automatic Control Number Generation
- **Template**: `DHPSW-ROIVA-YYYY-MMDD-MMM-YYY`
  - `YYYY` = Current year (2025)
  - `MM` = Month (01-12)
  - `DD` = Day (01-31)
  - `MMM` = Monthly count (001-999)
  - `YYY` = Yearly count (001-999)

- **Example**: `DHPSW-ROIVA-2025-0812-001-013`
  - Created on August 12, 2025
  - 1st application this month
  - 13th application this year

### 3. Data Fields Stored
The following fields are stored in the database:
- **Control Number** (auto-generated)
- **Name** (required)
- **Sex** (male/female, required)
- **Salary** (USD, required)
- **Status** (pending/evaluated/for_confirmation/for_interview/approved/rejected)
- **Jobsite** (required)
- **Position** (required)
- **Evaluator** (optional)
- **Created/Updated timestamps**

### 4. Frontend Integration
- **Custom Hook**: `useDirectHireApplications()` for state management
- **Real-time Updates**: Applications list refreshes automatically
- **Loading States**: Shows loading indicators during API calls
- **Error Handling**: Displays error messages via toast notifications
- **Form Validation**: Required fields validation before submission

### 5. User Interface Updates
- **Create Modal**: Updated to remove manual control number input
- **Table Display**: Shows real database data with proper formatting
- **Search Functionality**: Filters applications by name or control number
- **Status Badges**: Color-coded status indicators
- **Delete Confirmation**: Confirms before deleting applications

## Database Schema
The `direct_hire_applications` table includes:
```sql
CREATE TABLE direct_hire_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    sex VARCHAR(10) NOT NULL CHECK (sex IN ('male', 'female')),
    salary DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    jobsite VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    evaluator VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## API Response Format
All API endpoints return consistent JSON responses:
```json
{
  "success": true,
  "data": { /* application data */ },
  "message": "Success message",
  "error": "Error message (if any)"
}
```

## Usage
1. **Create Application**: Click "Create" button → Fill form → Control number auto-generated
2. **View Applications**: Table displays all applications with search/filter
3. **Edit Application**: Click "Edit" in actions menu (coming soon)
4. **Delete Application**: Click "Delete" → Confirm → Removed from database
5. **Search**: Use search bar to filter by name or control number

## Next Steps
- [ ] Implement edit functionality
- [ ] Add document upload support
- [ ] Implement advanced filtering
- [ ] Add export functionality (PDF/Excel)
- [ ] Add audit logging for all operations
