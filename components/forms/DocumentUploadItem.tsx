// components/forms/DocumentUploadItem.tsx
import React from 'react'
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { DocFiles, DocMetadata } from '@/utils/formValidation'
import { getPassportMinDate, getVisaValidityMinDate, getMaxDate } from '@/utils/formValidation'
import { validateVisaNumber } from '@/utils/fileHandling'

interface DocumentUploadItemProps {
  documentKey: keyof DocFiles
  title: string
  isRequired?: boolean
  children?: React.ReactNode
  docFiles: DocFiles
  docMetadata: DocMetadata
  setDocFiles: (fn: (prev: DocFiles) => DocFiles) => void
  setDocMetadata: (fn: (prev: DocMetadata) => DocMetadata) => void
  dragOver: string | null
  handleDragOver: (e: React.DragEvent, key: keyof DocFiles) => void
  handleDragLeave: (e: React.DragEvent) => void
  handleDrop: (e: React.DragEvent, key: keyof DocFiles) => void
  handleDocChange: (key: keyof DocFiles, file: File | null) => void
  documentMetadataErrors?: {[key: string]: string}
  clearDocumentMetadataError?: (fieldName: string) => void
}

export const DocumentUploadItem: React.FC<DocumentUploadItemProps> = ({
  documentKey,
  title,
  isRequired = true,
  children,
  docFiles,
  docMetadata,
  setDocFiles,
  setDocMetadata,
  dragOver,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleDocChange,
  documentMetadataErrors = {},
  clearDocumentMetadataError
}) => {
  const file = docFiles[documentKey]
  const isDragOver = dragOver === documentKey
  const isUploaded = file && (file as any).uploaded === true
  const fileName = file ? (file as any).name || file.name : ''
  
  return (
    <div 
      className={`bg-white p-4 rounded-lg border transition-all duration-200 ${
        isDragOver 
          ? 'border-blue-400 bg-blue-50 shadow-lg' 
          : 'border-gray-200 hover:shadow-md'
      }`}
        onDragOver={(e) => handleDragOver(e, documentKey)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, documentKey)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div className="flex-shrink-0">
            {file ? (
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            ) : (
              <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
            )}
          </div>
          <div className="flex-1">
            <h5 className="text-sm font-medium text-gray-900">{title}</h5>
            {file && (
              <div className="mt-2">
                <p className="text-xs text-green-600 flex items-center">
                  <span className="w-1 h-1 bg-green-500 rounded-full mr-2"></span>
                  {isUploaded ? `Previously uploaded: ${fileName}` : fileName}
                </p>
                {children}
              </div>
            )}
            {isDragOver && !file && (
              <p className="text-xs text-blue-600 mt-1 flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Drop file here
              </p>
            )}
          </div>
        </div>
        <label htmlFor={`${documentKey}-upload`} className="cursor-pointer">
          <div className={`flex items-center space-x-2 px-3 py-2 rounded transition-colors ${
            isDragOver 
              ? 'bg-blue-200 text-blue-800' 
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm font-medium">{isUploaded ? 'Replace' : 'Upload'}</span>
            <input
              id={`${documentKey}-upload`}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => handleDocChange(documentKey, e.target.files?.[0] || null)}
            />
          </div>
        </label>
      </div>
    </div>
  )
}

// Specialized components for different document types
export const PassportUploadItem: React.FC<Omit<DocumentUploadItemProps, 'children'>> = (props) => {
  return (
    <DocumentUploadItem {...props}>
      <div className="mt-3 grid grid-cols-2 gap-2 max-w-md">
        <div>
          <Label className="text-xs text-gray-600">Passport Number</Label>
          <Input 
            type="text" 
            className={`text-xs h-8 ${props.documentMetadataErrors?.passport_number ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'}`}
            placeholder="e.g., P1234567"
            value={props.docMetadata.passport_number}
            onChange={(e) => {
              props.setDocMetadata(prev => ({ ...prev, passport_number: e.target.value }))
              props.clearDocumentMetadataError?.('passport_number')
            }}
          />
          {props.documentMetadataErrors?.passport_number && (
            <p className="text-xs text-red-500 mt-1">{props.documentMetadataErrors.passport_number}</p>
          )}
        </div>
        <div>
          <Label className="text-xs text-gray-600">Expiry Date</Label>
          <Input 
            type="date" 
            className={`text-xs h-8 ${props.documentMetadataErrors?.passport_expiry ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'}`}
            value={props.docMetadata.passport_expiry}
            onChange={(e) => {
              props.setDocMetadata(prev => ({ ...prev, passport_expiry: e.target.value }))
              props.clearDocumentMetadataError?.('passport_expiry')
            }}
            min={getPassportMinDate()}
          />
          {props.documentMetadataErrors?.passport_expiry && (
            <p className="text-xs text-red-500 mt-1">{props.documentMetadataErrors.passport_expiry}</p>
          )}
        </div>
      </div>
    </DocumentUploadItem>
  )
}

export const WorkVisaUploadItem: React.FC<Omit<DocumentUploadItemProps, 'children'>> = (props) => {
  return (
    <DocumentUploadItem {...props}>
      <div className="mt-3 space-y-2 max-w-md">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-gray-600">Visa Category</Label>
            <select 
              className={`w-full border rounded px-2 py-2 text-xs h-9 ${props.documentMetadataErrors?.visa_category ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'}`}
              value={props.docMetadata.visa_category}
              onChange={(e) => {
                props.setDocMetadata(prev => ({ 
                  ...prev, 
                  visa_category: e.target.value,
                  visa_type: '' // Reset visa type when category changes
                }))
                props.clearDocumentMetadataError?.('visa_category')
              }}
            >
              <option value="">----</option>
              <option value="Temporary Work Visas (Non-Immigrant)">Temporary Work Visas (Non-Immigrant)</option>
              <option value="Immigrant Work Visas (Employment-Based Green Cards)">Immigrant Work Visas (Employment-Based Green Cards)</option>
              <option value="Family / Dependent Visas">Family / Dependent Visas</option>
              <option value="Others">Others</option>
            </select>
            {props.documentMetadataErrors?.visa_category && (
              <p className="text-xs text-red-500 mt-1">{props.documentMetadataErrors.visa_category}</p>
            )}
          </div>
          <div>
            <Label className="text-xs text-gray-600">Visa Type</Label>
            {props.docMetadata.visa_category === 'Temporary Work Visas (Non-Immigrant)' ? (
              <select 
                className={`w-full border rounded px-2 py-2 text-xs h-9 ${props.documentMetadataErrors?.visa_type ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'}`}
                value={props.docMetadata.visa_type}
                onChange={(e) => {
                  props.setDocMetadata(prev => ({ ...prev, visa_type: e.target.value }))
                  props.clearDocumentMetadataError?.('visa_type')
                }}
              >
                <option value="">----</option>
                <option value="H-1B – Skilled Workers / Professionals">H-1B – Skilled Workers / Professionals</option>
                <option value="H-2A – Temporary Agricultural Workers">H-2A – Temporary Agricultural Workers</option>
                <option value="H-2B – Temporary Non-Agricultural Workers">H-2B – Temporary Non-Agricultural Workers</option>
                <option value="H-3 – Trainees (non-medical, non-academic)">H-3 – Trainees (non-medical, non-academic)</option>
                <option value="L-1 – Intra-Company Transfers">L-1 – Intra-Company Transfers</option>
                <option value="O-1 – Individuals with Extraordinary Ability">O-1 – Individuals with Extraordinary Ability</option>
                <option value="P-1 – Athletes / Entertainers">P-1 – Athletes / Entertainers</option>
                <option value="TN – NAFTA/USMCA Professionals">TN – NAFTA/USMCA Professionals</option>
              </select>
            ) : props.docMetadata.visa_category === 'Immigrant Work Visas (Employment-Based Green Cards)' ? (
              <select 
                className={`w-full border rounded px-2 py-2 text-xs h-9 ${props.documentMetadataErrors?.visa_type ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'}`}
                value={props.docMetadata.visa_type}
                onChange={(e) => {
                  props.setDocMetadata(prev => ({ ...prev, visa_type: e.target.value }))
                  props.clearDocumentMetadataError?.('visa_type')
                }}
              >
                <option value="">----</option>
                <option value="EB-1 – Priority Workers">EB-1 – Priority Workers</option>
                <option value="EB-2 – Professionals with Advanced Degrees">EB-2 – Professionals with Advanced Degrees</option>
                <option value="EB-3 – Skilled Workers, Professionals, and Other Workers">EB-3 – Skilled Workers, Professionals, and Other Workers</option>
                <option value="EB-4 – Special Immigrants">EB-4 – Special Immigrants</option>
                <option value="EB-5 – Immigrant Investors">EB-5 – Immigrant Investors</option>
              </select>
            ) : props.docMetadata.visa_category === 'Family / Dependent Visas' ? (
              <select 
                className={`w-full border rounded px-2 py-2 text-xs h-9 ${props.documentMetadataErrors?.visa_type ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'}`}
                value={props.docMetadata.visa_type}
                onChange={(e) => {
                  props.setDocMetadata(prev => ({ ...prev, visa_type: e.target.value }))
                  props.clearDocumentMetadataError?.('visa_type')
                }}
              >
                <option value="">----</option>
                <option value="H-4 – Dependents of H Visa Holders">H-4 – Dependents of H Visa Holders</option>
                <option value="L-2 – Dependents of L-1 Holders">L-2 – Dependents of L-1 Holders</option>
                <option value="K-1 – Fiancé(e) of U.S. Citizen">K-1 – Fiancé(e) of U.S. Citizen</option>
                <option value="IR/CR Categories – Immediate Relative Immigrant Visas">IR/CR Categories – Immediate Relative Immigrant Visas</option>
              </select>
            ) : props.docMetadata.visa_category === 'Others' ? (
                <Input 
                  type="text" 
                  className={`text-xs h-9 ${props.documentMetadataErrors?.visa_type ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'}`}
                  placeholder="Enter custom visa type"
                  value={props.docMetadata.visa_type}
                  onChange={(e) => {
                    props.setDocMetadata(prev => ({ ...prev, visa_type: e.target.value }))
                    props.clearDocumentMetadataError?.('visa_type')
                  }}
                />
            ) : (
              <Input 
                type="text" 
                className="text-xs border-gray-300 h-9" 
                placeholder="Select category first"
                disabled
              />
            )}
            {props.documentMetadataErrors?.visa_type && (
              <p className="text-xs text-red-500 mt-1">{props.documentMetadataErrors.visa_type}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-gray-600">Visa Number</Label>
              <Input 
                type="text" 
                className={`text-xs h-9 ${props.documentMetadataErrors?.visa_number ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'}`}
                placeholder="e.g., V123456"
                value={props.docMetadata.visa_number}
                onChange={(e) => {
                  const value = validateVisaNumber(e.target.value)
                  props.setDocMetadata(prev => ({ ...prev, visa_number: value }))
                  props.clearDocumentMetadataError?.('visa_number')
                }}
              />
              {props.documentMetadataErrors?.visa_number && (
                <p className="text-xs text-red-500 mt-1">{props.documentMetadataErrors.visa_number}</p>
              )}
          </div>
          <div>
            <Label className="text-xs text-gray-600">Validity</Label>
            <Input 
              type="date" 
              className={`text-xs h-9 ${props.documentMetadataErrors?.visa_validity ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'}`}
              value={props.docMetadata.visa_validity}
              onChange={(e) => {
                props.setDocMetadata(prev => ({ ...prev, visa_validity: e.target.value }))
                props.clearDocumentMetadataError?.('visa_validity')
              }}
              min={getVisaValidityMinDate()}
            />
            {props.documentMetadataErrors?.visa_validity && (
              <p className="text-xs text-red-500 mt-1">{props.documentMetadataErrors.visa_validity}</p>
            )}
          </div>
        </div>
      </div>
    </DocumentUploadItem>
  )
}

export const EmploymentContractUploadItem: React.FC<Omit<DocumentUploadItemProps, 'children'>> = (props) => {
  return (
    <DocumentUploadItem {...props}>
      <div className="mt-3 grid grid-cols-2 gap-2 max-w-md">
        <div>
          <Label className="text-xs text-gray-600">Issued Date</Label>
          <Input 
            type="date" 
            className={`text-xs h-8 ${props.documentMetadataErrors?.ec_issued_date ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'}`}
            value={props.docMetadata.ec_issued_date}
            onChange={(e) => {
              props.setDocMetadata(prev => ({ ...prev, ec_issued_date: e.target.value }))
              props.clearDocumentMetadataError?.('ec_issued_date')
            }}
            max={getMaxDate()}
          />
          {props.documentMetadataErrors?.ec_issued_date && (
            <p className="text-xs text-red-500 mt-1">{props.documentMetadataErrors.ec_issued_date}</p>
          )}
        </div>
        <div>
          <Label className="text-xs text-gray-600">Verification Type</Label>
          <select 
            className={`w-full border rounded px-2 py-2 text-xs h-8 ${props.documentMetadataErrors?.ec_verification ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'}`}
            value={props.docMetadata.ec_verification}
            onChange={(e) => {
              props.setDocMetadata(prev => ({ ...prev, ec_verification: e.target.value }))
              props.clearDocumentMetadataError?.('ec_verification')
            }}
          >
            <option value="">----</option>
            <option value="POLO">POLO</option>
            <option value="PE/Consulate for countries with no POLO">PE/Consulate for countries with no POLO</option>
            <option value="Apostille with POLO Verification">Apostille with POLO Verification</option>
            <option value="Apostille with PE Acknowledgement">Apostille with PE Acknowledgement</option>
            <option value="Notarized Employment Contract for DFA">Notarized Employment Contract for DFA</option>
            <option value="Notice of Appointment with confirmation from SPAIN Embassy for JET Recipients">Notice of Appointment with confirmation from SPAIN Embassy for JET Recipients</option>
            <option value="Employment Contract with confirmation from SEM">Employment Contract with confirmation from SEM</option>
          </select>
          {props.documentMetadataErrors?.ec_verification && (
            <p className="text-xs text-red-500 mt-1">{props.documentMetadataErrors.ec_verification}</p>
          )}
        </div>
      </div>
    </DocumentUploadItem>
  )
}
