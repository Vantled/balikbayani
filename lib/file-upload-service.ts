// lib/file-upload-service.ts
// File upload service for BalikBayani Portal

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export interface UploadedFileInfo {
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  originalName: string;
}

export class FileUploadService {
  private static uploadDir = join(process.cwd(), 'uploads');
  private static maxFileSize = 5 * 1024 * 1024; // 5MB
  private static allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/pdf'
  ];

  // Ensure upload directory exists
  private static async ensureUploadDir(): Promise<void> {
    if (!existsSync(this.uploadDir)) {
      await mkdir(this.uploadDir, { recursive: true });
    }
  }

  // Validate file
  private static validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > this.maxFileSize) {
      return { valid: false, error: 'File size exceeds 5MB limit' };
    }

    if (!this.allowedMimeTypes.includes(file.type)) {
      return { valid: false, error: 'File type not allowed. Only JPEG, PNG, and PDF files are accepted' };
    }

    return { valid: true };
  }

  // Generate unique filename
  private static generateFileName(originalName: string, mimeType: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    
    // Get the original file extension
    const lastDotIndex = originalName.lastIndexOf('.');
    const extension = lastDotIndex > 0 ? originalName.substring(lastDotIndex) : 
                     mimeType === 'application/pdf' ? '.pdf' : 
                     mimeType === 'image/jpeg' || mimeType === 'image/jpg' ? '.jpg' : '.png';
    
    // Get the filename without extension
    const nameWithoutExt = lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName;
    
    // Create a safe filename by removing special characters and limiting length
    const safeName = nameWithoutExt
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    
    return `${safeName}_${timestamp}_${randomString}${extension}`;
  }

  // Upload file
  static async uploadFile(
    file: File, 
    applicationId: string, 
    documentType: string
  ): Promise<UploadedFileInfo> {
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Ensure upload directory exists
    await this.ensureUploadDir();

    // Generate unique filename
    const fileName = this.generateFileName(file.name, file.type);
    
    // Create application-specific directory
    const applicationDir = join(this.uploadDir, applicationId);
    if (!existsSync(applicationDir)) {
      await mkdir(applicationDir, { recursive: true });
    }

    // Create document type directory
    const documentDir = join(applicationDir, documentType);
    if (!existsSync(documentDir)) {
      await mkdir(documentDir, { recursive: true });
    }

    // Full file path
    const filePath = join(documentDir, fileName);

    // Convert File to Buffer and save
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await writeFile(filePath, buffer);

    return {
      fileName: file.name, // Use original filename for display
      filePath: filePath.replace(process.cwd(), ''), // Store relative path
      fileSize: file.size,
      mimeType: file.type,
      originalName: file.name
    };
  }

  // Get file path for serving
  static getFilePath(relativePath: string): string {
    return join(process.cwd(), relativePath);
  }

  // Delete file
  static async deleteFile(filePath: string): Promise<void> {
    const fullPath = this.getFilePath(filePath);
    try {
      const { unlink } = await import('fs/promises');
      await unlink(fullPath);
    } catch (error) {
      console.warn('Failed to delete file:', error);
    }
  }
}
