# Direct Hire Document Requirements System

## Overview

The Direct Hire Document Requirements system ensures that applications cannot be marked as "Evaluated" until all required documents have been uploaded and verified. This system implements a comprehensive checklist of required and optional documents based on POEA standards.

## Features

### Document Requirements Checklist

The system includes the following document requirements:

#### Required Documents (Must be uploaded and verified)
1. **Passport** - with validity period of not less than one (1) year (POEA Advisory 42, series of 2019)
2. **Valid Work Visa/Entry/Work Permit** - whichever is applicable per country
3. **Employment Contract or Offer of Employment** - Original Copy verified by:
   - POLO
   - PE/Consulate for countries with no POLO
   - Apostille with POLO Verification
   - Apostille with PE Acknowledgement
   - Notarized Employment Contract for DFA
   - Notice of Appointment with confirmation from SPAIN Embassy for JET Recipients
   - Employment Contract with confirmation from SEM
4. **TESDA NC II/PRC License**

#### Optional Documents
5. **Additional country-specific requirements**
6. **Compliance Form**
7. **Valid Medical Certificate** from DOH-accredited medical clinic
8. **Pre-Employment Orientation Seminar Certificate (PEOS)**
9. **Clearance**
10. **Proof of certificate of insurance coverage**
11. **E-Registration Account**
12. **Pre-Departure Orientation Seminar Certificate** issued by OWWA

### Status Management

- **New applications** start with status "pending" (not "evaluated")
- **Document Requirements button** appears for applications that are not "evaluated" or "draft"
- **Status can only be changed to "evaluated"** after all required documents are uploaded and verified
- **Real-time validation** ensures required documents are completed before status update

### File Management

- **Supported formats**: JPEG, PNG, PDF
- **Maximum file size**: 5MB per file
- **File validation** with user-friendly error messages
- **Document preview** capability
- **Secure storage** in database with proper indexing

## Implementation Details

### Database Schema

#### New Table: `direct_hire_documents`
```sql
CREATE TABLE direct_hire_documents (
    id SERIAL PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES direct_hire_applications(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_data BYTEA NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Updated Table: `direct_hire_applications`
```sql
ALTER TABLE direct_hire_applications 
ADD COLUMN documents_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
```

### API Endpoints

#### `GET /api/direct-hire/[id]/documents`
- Retrieves all documents for a specific application
- Returns document metadata (name, type, creation date)

#### `POST /api/direct-hire/[id]/documents`
- Uploads a new document
- Validates file type and size
- Stores file in database with proper metadata

#### `PUT /api/direct-hire/[id]/documents`
- Updates application document completion status
- Marks when all required documents are completed

#### `PUT /api/direct-hire/[id]/status`
- Updates application status
- Only allows "evaluated" status when documents are complete

### Components

#### `DirectHireDocumentRequirements`
- Main component for document requirements interface
- Handles file uploads and validation
- Manages document checklist state
- Provides real-time completion tracking

#### Integration with `DirectHireApplicationsTable`
- Adds "Document Requirements" button to status column
- Integrates with existing status management system
- Maintains consistent UI/UX patterns

## Usage

### For Staff Users

1. **View Applications**: Navigate to Direct Hire page
2. **Access Document Requirements**: Click "Document Requirements" button for pending applications
3. **Upload Documents**: Use upload button for each requirement
4. **Verify Documents**: Check off completed requirements
5. **Complete Evaluation**: Mark as evaluated when all required documents are verified

### For Administrators

1. **Monitor Progress**: Track document completion across applications
2. **Review Uploads**: Access uploaded documents for verification
3. **Status Management**: Oversee status transitions and compliance

## Security Features

- **Authentication required** for all document operations
- **File type validation** prevents malicious uploads
- **File size limits** prevent abuse
- **Database constraints** ensure data integrity
- **Audit trail** for all document operations

## Migration

To implement this system:

1. **Run the migration script**:
   ```bash
   npx tsx scripts/run-direct-hire-migration.ts
   ```

2. **Restart the application** to load new components

3. **Verify database changes**:
   - Check `direct_hire_documents` table exists
   - Verify new columns in `direct_hire_applications`

## Benefits

- **Compliance**: Ensures POEA standards are met
- **Quality Control**: Prevents incomplete applications from being evaluated
- **Audit Trail**: Complete record of document submissions
- **User Experience**: Clear guidance on requirements and progress
- **Efficiency**: Streamlined document verification process

## Future Enhancements

- **Bulk document upload** for multiple files
- **Document templates** for common requirements
- **Automated validation** using AI/ML
- **Integration** with external verification services
- **Advanced reporting** on document completion rates
