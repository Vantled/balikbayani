// utils/fileHandling.ts
import { DocFiles, DocMetadata } from './formValidation'

// Drag and drop handlers
export const handleDragOver = (e: React.DragEvent, key: string, setDragOver: (key: string | null) => void) => {
  e.preventDefault()
  setDragOver(key)
}

export const handleDragLeave = (e: React.DragEvent, setDragOver: (key: string | null) => void) => {
  e.preventDefault()
  setDragOver(null)
}

export const handleDrop = (
  e: React.DragEvent, 
  key: string, 
  setDragOver: (key: string | null) => void,
  handleDocChange: (key: keyof DocFiles, file: File | null) => void,
  toast: (options: any) => void
) => {
  e.preventDefault()
  setDragOver(null)
  
  const files = Array.from(e.dataTransfer.files)
  if (files.length > 0) {
    const file = files[0]
    // Check if file type is allowed
    const isAllowedType = file.type.startsWith('image/') || file.type === 'application/pdf'
    if (isAllowedType) {
      handleDocChange(key as keyof DocFiles, file)
    } else {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload only PDF, PNG, or JPEG files',
        variant: 'destructive'
      })
    }
  }
}

// Clipboard paste handlers
export const handlePasteFromClipboard = async (
  screenshotKey: 'screenshot1' | 'screenshot2',
  setDocFiles: (fn: (prev: DocFiles) => DocFiles) => void,
  setDocMetadata: (fn: (prev: DocMetadata) => DocMetadata) => void,
  toast: (options: any) => void
) => {
  try {
    if (!navigator.clipboard || typeof navigator.clipboard.read !== 'function') {
      toast({
        title: 'Clipboard Not Supported',
        description: 'Your browser does not support clipboard access. Please use the file upload instead.',
        variant: 'destructive'
      })
      return
    }

    const clipboardItems = await navigator.clipboard.read()
    let imageFound = false

    for (const clipboardItem of clipboardItems) {
      for (const type of clipboardItem.types) {
        if (type.startsWith('image/')) {
          const blob = await clipboardItem.getType(type)
          const file = new File([blob], `screenshot-${Date.now()}.${type.split('/')[1]}`, { type })
          
          // Store the file in docFiles
          setDocFiles(prev => ({ ...prev, [screenshotKey]: file }))
          
          // Create a preview URL for the screenshot
          const url = URL.createObjectURL(file)
          setDocMetadata(prev => ({ ...prev, [`${screenshotKey}_url`]: url }))
          
          toast({
            title: 'Screenshot Pasted',
            description: 'Image has been pasted from clipboard successfully.',
          })
          imageFound = true
          break
        }
      }
      if (imageFound) break
    }

    if (!imageFound) {
      toast({
        title: 'No Image Found',
        description: 'No image found in clipboard. Please copy an image first.',
        variant: 'destructive'
      })
    }
  } catch (error) {
    console.error('Error pasting from clipboard:', error)
    toast({
      title: 'Paste Failed',
      description: 'Failed to paste image from clipboard. Please try using file upload instead.',
      variant: 'destructive'
    })
  }
}

// Check clipboard support
export const checkClipboardSupport = (): boolean => {
  return !!(navigator.clipboard && typeof navigator.clipboard.read === 'function')
}

// File type validation
export const isValidFileType = (file: File): boolean => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
  return allowedTypes.includes(file.type)
}

// Visa number validation (uppercase alphanumeric only)
export const validateVisaNumber = (value: string): string => {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}
