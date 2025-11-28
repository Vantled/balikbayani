// components/pdf-viewer-modal.tsx
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"

interface DocumentViewerModalProps {
  isOpen: boolean
  onClose: () => void
  documentId?: string
  documentName: string
  fileBlob?: Blob
}

export default function DocumentViewerModal({ isOpen, onClose, documentId, documentName, fileBlob }: DocumentViewerModalProps) {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null)

  // Truncate filename to 15 characters while preserving extension
  const getTruncatedFileName = (fileName: string): string => {
    const lastDotIndex = fileName.lastIndexOf('.')
    if (lastDotIndex === -1) {
      // No extension found
      return fileName.length > 15 ? `${fileName.substring(0, 15)}...` : fileName
    }
    const baseName = fileName.substring(0, lastDotIndex)
    const extension = fileName.substring(lastDotIndex)
    if (baseName.length > 15) {
      return `${baseName.substring(0, 15)}...${extension}`
    }
    return fileName
  }

  useEffect(() => {
    if (isOpen && (documentId || fileBlob)) {
      loadDocument()
    } else {
      // Clean up when modal closes
      if (documentUrl) {
        URL.revokeObjectURL(documentUrl)
        setDocumentUrl(null)
      }
      setError(null)
      setFileType(null)
    }
  }, [isOpen, documentId, fileBlob])

  const loadDocument = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (fileBlob) {
        // Use the provided file blob (for new uploads)
        const url = URL.createObjectURL(fileBlob)
        setDocumentUrl(url)
        
        // Determine file type from blob
        if (fileBlob.type.includes('pdf')) {
          setFileType('pdf')
        } else if (fileBlob.type.includes('image')) {
          setFileType('image')
        } else {
          setError('This file type is not supported for preview. Please download the document to view it.')
          return
        }
      } else if (documentId) {
        // Use the view endpoint for existing documents (same as Balik Manggagawa)
        const viewUrl = `/api/documents/${documentId}/view`
        setDocumentUrl(viewUrl)
        
        // Determine file type from document name
        const fileName = documentName.toLowerCase()
        if (fileName.endsWith('.pdf')) {
          setFileType('pdf')
        } else if (fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) {
          setFileType('image')
        } else {
          setError('This file type is not supported for preview. Please download the document to view it.')
          return
        }
      } else {
        throw new Error('No document source provided')
      }
    } catch (err) {
      setError('Failed to load document')
      console.error('Error loading document:', err)
    } finally {
      setLoading(false)
    }
  }



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] h-[70vh] max-h-[70vh] p-0 rounded-2xl overflow-hidden z-[70] md:w-full md:h-[90vh] md:max-h-[90vh]">
        <div className="bg-[#1976D2] text-white px-4 py-3 md:px-6 md:py-4 flex items-center justify-between gap-2">
          <DialogTitle className="text-base md:text-lg font-bold flex items-center gap-2 truncate flex-1 min-w-0">
            <span>{fileType === 'image' ? '🖼️' : '📄'}</span>
            <span className="truncate" title={documentName}>
              {getTruncatedFileName(documentName)}
            </span>
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-blue-600 flex-shrink-0">
              <X className="h-5 w-5" />
            </Button>
          </DialogClose>
        </div>
        
        <div className="h-[calc(70vh-64px)] md:h-[calc(90vh-80px)] relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading {fileType === 'image' ? 'image' : 'document'}...</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <p className="text-red-600 mb-2">{error}</p>
                <Button onClick={loadDocument} variant="outline">
                  Retry
                </Button>
              </div>
            </div>
          )}
          
          {documentUrl && !loading && !error && (
            <>
              {fileType === 'pdf' && (
                <div className="w-full h-full flex items-center justify-center bg-gray-50 p-2 md:p-0 overflow-auto">
                  <div className="scale-75 md:scale-100 origin-top-left md:origin-center w-full h-full flex items-center justify-center">
                    <iframe
                      src={documentUrl}
                      className="w-full h-full border-0"
                      title={documentName}
                    />
                  </div>
                </div>
              )}
              {fileType === 'image' && (
                <div className="w-full h-full flex items-center justify-center bg-gray-50 p-2 md:p-4 overflow-auto">
                  <div className="scale-75 md:scale-100 origin-center">
                    <img
                      src={documentUrl}
                      alt={documentName}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
