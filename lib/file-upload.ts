// lib/file-upload.ts
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedFile {
  originalName: string;
  filename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

export class FileUploadService {
  private static uploadDir = process.env.UPLOAD_DIR || './uploads';
  private static maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB

  /**
   * Initialize upload directory
   */
  static async initializeUploadDir(): Promise<void> {
    const uploadPath = path.resolve(this.uploadDir);
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log(`Created upload directory: ${uploadPath}`);
    }
  }

  /**
   * Save uploaded file to filesystem
   */
  static async saveFile(
    file: Express.Multer.File,
    applicationType: string,
    applicationId: string
  ): Promise<UploadedFile> {
    await this.initializeUploadDir();

    // Validate file size
    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSize} bytes`);
    }

    // Create application-specific directory
    const appDir = path.join(this.uploadDir, applicationType, applicationId);
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(appDir, uniqueFilename);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    return {
      originalName: file.originalname,
      filename: uniqueFilename,
      filePath: path.relative(this.uploadDir, filePath),
      fileSize: file.size,
      mimeType: file.mimetype
    };
  }

  /**
   * Get file path for serving
   */
  static getFilePath(relativePath: string): string {
    return path.join(this.uploadDir, relativePath);
  }

  /**
   * Delete file from filesystem
   */
  static async deleteFile(relativePath: string): Promise<void> {
    const fullPath = this.getFilePath(relativePath);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      
      // Try to remove empty directories
      const dir = path.dirname(fullPath);
      if (fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
      }
    }
  }

  /**
   * Get file info
   */
  static getFileInfo(relativePath: string): { exists: boolean; size?: number; stats?: fs.Stats } {
    const fullPath = this.getFilePath(relativePath);
    
    if (!fs.existsSync(fullPath)) {
      return { exists: false };
    }

    const stats = fs.statSync(fullPath);
    return {
      exists: true,
      size: stats.size,
      stats
    };
  }

  /**
   * Validate file type
   */
  static validateFileType(mimeType: string): boolean {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    return allowedTypes.includes(mimeType);
  }

  /**
   * Get allowed file types
   */
  static getAllowedFileTypes(): string[] {
    return [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
  }
}

export default FileUploadService;
