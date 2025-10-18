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
      <DialogContent className="max-w-6xl w-full h-[90vh] p-0 rounded-2xl overflow-hidden z-[70]">
        <div className="bg-[#1976D2] text-white px-6 py-4 flex items-center justify-between">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <span>{fileType === 'image' ? '🖼️' : '📄'}</span>
            {documentName}
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-blue-600">
              <X className="h-5 w-5" />
            </Button>
          </DialogClose>
        </div>
        
        <div className="h-[calc(90vh-80px)] relative">
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
                <iframe
                  src={documentUrl}
                  className="w-full h-full border-0"
                  title={documentName}
                />
              )}
              {fileType === 'image' && (
                <div className="w-full h-full flex items-center justify-center bg-gray-50 p-4">
                  <img
                    src={documentUrl}
                    alt={documentName}
                    className="max-w-full max-h-full object-contain"
                    style={{ maxHeight: 'calc(90vh - 120px)' }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
