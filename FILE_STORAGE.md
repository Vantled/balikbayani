# File Storage System - BalikBayani Portal

## Overview

The BalikBayani Portal uses a **hybrid file storage approach**:
- **Database**: Stores file metadata (PostgreSQL)
- **Filesystem**: Stores actual files (local directory)

This approach provides the best balance of performance, scalability, and data integrity for a government agency system.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   PostgreSQL    │    │   Filesystem    │
│   (Upload)      │───▶│   (Metadata)    │    │   (Files)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        │
                              └────────────┬───────────┘
                                           │
                                    ┌─────────────────┐
                                    │   File Path     │
                                    │   Reference     │
                                    └─────────────────┘
```

## Database Schema

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL,
    application_type VARCHAR(50) NOT NULL, -- 'direct_hire', 'gov_to_gov', etc.
    document_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,  -- Relative path to file
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## File Storage Structure

```
uploads/
├── direct_hire/
│   └── {application_id}/
│       ├── {uuid}.pdf
│       ├── {uuid}.jpg
│       └── {uuid}.docx
├── gov_to_gov/
│   └── {application_id}/
│       └── {uuid}.pdf
├── balik_manggagawa/
│   └── {application_id}/
│       └── {uuid}.pdf
└── information_sheet/
    └── {application_id}/
        └── {uuid}.pdf
```

## Supported File Types

- **PDF Documents**: `.pdf`
- **Images**: `.jpg`, `.jpeg`, `.png`, `.gif`
- **Word Documents**: `.doc`, `.docx`
- **Excel Files**: `.xls`, `.xlsx`

## API Endpoints

### Upload Document
```http
POST /api/documents/upload
Content-Type: multipart/form-data

Form Data:
- file: File to upload
- applicationId: UUID of the application
- applicationType: Type of application ('direct_hire', 'gov_to_gov', etc.)
- documentType: Type of document ('passport', 'contract', 'medical', etc.)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "application_id": "uuid",
    "application_type": "direct_hire",
    "document_type": "passport",
    "file_name": "passport.pdf",
    "file_path": "direct_hire/uuid/uuid.pdf",
    "file_size": 1024000,
    "mime_type": "application/pdf",
    "uploaded_at": "2024-01-01T00:00:00Z"
  },
  "message": "Document uploaded successfully"
}
```

### Download Document
```http
GET /api/documents/{documentId}/download
```

**Response:** File download with appropriate headers

## File Upload Service

The `FileUploadService` class provides:

### Methods

- `saveFile(file, applicationType, applicationId)`: Save uploaded file
- `deleteFile(relativePath)`: Delete file from filesystem
- `getFileInfo(relativePath)`: Get file information
- `validateFileType(mimeType)`: Validate file type
- `getAllowedFileTypes()`: Get list of allowed file types

### Features

- **Automatic directory creation**: Creates application-specific directories
- **Unique filenames**: Uses UUID to prevent conflicts
- **File type validation**: Ensures only allowed file types
- **Size validation**: Enforces maximum file size limits
- **Cleanup**: Removes empty directories when files are deleted

## Configuration

### Environment Variables

```env
# File Upload Configuration
UPLOAD_DIR=./uploads                    # Upload directory path
MAX_FILE_SIZE=10485760                  # Maximum file size (10MB)
```

### File Size Limits

- **Default**: 10MB per file
- **Configurable**: Via `MAX_FILE_SIZE` environment variable
- **Validation**: Applied during upload

## Security Features

### File Validation
- **Type checking**: Only allowed MIME types
- **Size limits**: Prevents large file uploads
- **Path sanitization**: Prevents directory traversal attacks

### Access Control
- **Database records**: All file access logged
- **Audit trail**: File operations tracked in audit logs
- **User permissions**: File access tied to application ownership

## Usage Examples

### Frontend Upload
```javascript
const uploadDocument = async (file, applicationId, applicationType, documentType) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('applicationId', applicationId);
  formData.append('applicationType', applicationType);
  formData.append('documentType', documentType);

  const response = await fetch('/api/documents/upload', {
    method: 'POST',
    body: formData
  });

  return response.json();
};
```

### Frontend Download
```javascript
const downloadDocument = async (documentId) => {
  const response = await fetch(`/api/documents/${documentId}/download`);
  
  if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.pdf';
    a.click();
    window.URL.revokeObjectURL(url);
  }
};
```

## Backup Strategy

### Database Backup
- Regular PostgreSQL backups include document metadata
- Document records are included in database exports

### File Backup
- Upload directory should be backed up separately
- Consider using cloud storage for production
- Implement file synchronization for disaster recovery

## Production Considerations

### Cloud Storage
For production, consider migrating to cloud storage:

```javascript
// Example: AWS S3 integration
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});
```

### CDN Integration
- Serve files through CDN for better performance
- Implement caching headers
- Use signed URLs for secure access

### Monitoring
- Monitor disk space usage
- Track file upload/download metrics
- Implement file access logging

## Troubleshooting

### Common Issues

1. **File not found**: Check if file exists in filesystem
2. **Permission denied**: Verify upload directory permissions
3. **Disk space**: Monitor available storage
4. **File size exceeded**: Check `MAX_FILE_SIZE` configuration

### Debug Commands

```bash
# Check upload directory
ls -la ./uploads

# Check file permissions
chmod 755 ./uploads

# Monitor disk usage
df -h ./uploads
```

## Migration Guide

### From Database Storage
If migrating from database-stored files:

1. Export files from database
2. Save to filesystem using `FileUploadService`
3. Update database records with file paths
4. Verify file integrity

### To Cloud Storage
For cloud migration:

1. Upload files to cloud storage
2. Update file paths in database
3. Implement cloud storage service
4. Update download endpoints

---

This file storage system provides a robust, scalable solution for document management in the BalikBayani Portal while maintaining data integrity and security standards required for government systems.
