// lib/docx-common.ts
import type { DirectHireApplication, Document } from './types'

type CommonDocxData = {
  data: Record<string, any>
  jsCtx: Record<string, any>
}

function mk(value: any) {
  const str = value == null ? '' : String(value)
  const fn: any = () => str
  fn.toString = () => str
  return fn
}

export function buildDirectHireDocxData(application: DirectHireApplication, documents?: Document[]): CommonDocxData {
  const evalMeta = safeParse((application as any).evaluation_meta)
  const interviewMeta = safeParse((application as any).status_checklist?.for_interview_meta) || safeParse((application as any).for_interview_meta)
  const confirmMeta = safeParse((application as any).status_checklist?.for_confirmation_meta) || safeParse((application as any).confirmation_meta)

  const createdAtIso = new Date(((application as any)?.created_at || Date.now())).toISOString().slice(0,10)

  const CHECK = '\u2713'
  const EMPTY = '\u00A0'
  const verifierType = String(confirmMeta.verifier_type || '').toUpperCase()
  const isMWO = verifierType === 'MWO'
  const isPePcg = verifierType === 'PEPCG'
  const isOthers = verifierType === 'OTHERS'
  const check = (present: boolean) => (present ? CHECK : EMPTY)

  const salaryCurrency = (application as any).salary_currency || 'USD'

  const hasAny = (...types: string[]) => {
    if (!documents || documents.length === 0) return false
    const lower = types.map(t => t.toLowerCase())
    return documents.some(d => lower.includes(String((d as any).document_type || '').toLowerCase()))
  }

  const getMeta = (...types: string[]) => {
    if (!documents || documents.length === 0) return {}
    const lower = types.map(t => t.toLowerCase())
    const doc = documents.find(d => lower.includes(String((d as any).document_type || '').toLowerCase())) as any
    return (doc?.meta as any) || {}
  }

  // Get document metadata by parsing the meta field
  const getDocumentMeta = (documentType: string) => {
    if (!documents || documents.length === 0) return {}
    const doc = documents.find(d => String((d as any).document_type || '').toLowerCase() === documentType.toLowerCase()) as any
    if (!doc || !doc.meta) return {}
    
    try {
      return typeof doc.meta === 'string' ? JSON.parse(doc.meta) : doc.meta
    } catch {
      return {}
    }
  }

  const passportPresent = hasAny('passport', 'valid_passport', 'passport_copy')
  const visaPresent = hasAny('work_visa', 'visa', 'visa_work_permit', 'entry_permit')
  const employmentContractPresent = hasAny('employment_contract', 'offer_of_employment')
  const countrySpecificPresent = hasAny('country_specific')
  const tesdaPresent = hasAny('tesda_license', 'tesda', 'prc_license')
  const complianceFormPresent = hasAny('compliance_form')
  const medicalCertificatePresent = hasAny('medical_certificate')
  const peosCertificatePresent = hasAny('peos_certificate')
  const clearanceDocPresent = hasAny('clearance')
  const insuranceCoveragePresent = hasAny('insurance_coverage')
  const eregistrationPresent = hasAny('eregistration')
  const pdosCertificatePresent = hasAny('pdos_certificate')
  const ecMeta = getDocumentMeta('employment_contract') || getMeta('employment_contract', 'offer_of_employment')
  const ecChoice: string = ecMeta.ec_verified_polo_check || ecMeta.ec_verification || ''
  const ecVerifiedPolo = ecChoice === 'POLO' || ecChoice === 'verified_polo'
  const ecVerifiedPeConsulate = ecChoice === 'PE/Consulate for countries with no POLO' || ecChoice === 'verified_pe_consulate'
  const ecApostillePoloVerification = ecChoice === 'Apostille with POLO Verification' || ecChoice === 'apostille_polo_verification'
  const ecApostillePeAck = ecChoice === 'Apostille with PE Acknowledgement' || ecChoice === 'apostille_pe_ack'
  const ecNotarizedDfa = ecChoice === 'Notarized Employment Contract for DFA' || ecChoice === 'notarized_dfa'
  const ecNoticeAppointmentSpain = ecChoice === 'Notice of Appointment with confirmation from SPAIN Embassy for JET Recipients' || ecChoice === 'notice_appointment_spain'
  const ecConfirmationSem = ecChoice === 'Employment Contract with confirmation from SEM' || ecChoice === 'confirmation_sem'

  console.log('[buildDirectHireDocxData] interviewMeta:', interviewMeta)
  console.log('[buildDirectHireDocxData] processed_workers_principal:', interviewMeta.processed_workers_principal)
  console.log('[buildDirectHireDocxData] processed_workers_las:', interviewMeta.processed_workers_las)
  
  const principalVal = (
    interviewMeta.processed_workers_principal !== undefined ? interviewMeta.processed_workers_principal :
    interviewMeta.no_of_processed_workers_in_principal !== undefined ? interviewMeta.no_of_processed_workers_in_principal :
    interviewMeta.processed_workers_principal_count !== undefined ? interviewMeta.processed_workers_principal_count :
    interviewMeta.principal !== undefined ? interviewMeta.principal : ''
  )
  const lasVal = (
    interviewMeta.processed_workers_las !== undefined ? interviewMeta.processed_workers_las :
    interviewMeta.landbased_accreditation_system !== undefined ? interviewMeta.landbased_accreditation_system :
    interviewMeta.las !== undefined ? interviewMeta.las : ''
  )
  
  console.log('[buildDirectHireDocxData] principalVal:', principalVal)
  console.log('[buildDirectHireDocxData] lasVal:', lasVal)

  const data = {
    // Identity and basic fields
    control_number: application.control_number,
    name: application.name,
    email: (application as any).email || '',
    cellphone: (application as any).cellphone || '',
    sex: application.sex,
    job_type: (application as any).job_type || '',
    employer: (application as any).employer || '',
    jobsite: application.jobsite,
    position: application.position,
    salary: String((application as any).salary ?? ''),
    salary_currency: salaryCurrency,
    evaluator: application.evaluator || '',
    created_date: createdAtIso,
    date: createdAtIso,
    DATE: createdAtIso,

    // Passport fields
    passport_number: getDocumentMeta('passport').passport_number || evalMeta.passport_number || confirmMeta.passport_number || (application as any).passport_number || 'TO BE PROVIDED',
    passport_expiry: formatDateForDocx(getDocumentMeta('passport').passport_expiry || evalMeta.passport_expiry || confirmMeta.passport_expiry || (application as any).passport_expiry || 'TO BE PROVIDED'),
    passport_check: passportPresent ? CHECK : EMPTY,
    passport_attached: passportPresent ? 'ATTACHED' : EMPTY,

    // Visa fields
    visa_category: getDocumentMeta('work_visa').visa_category || '',
    visa_type: extractVisaCode(getDocumentMeta('work_visa').visa_type || (getMeta('work_visa', 'visa', 'visa_work_permit', 'entry_permit').visa_type
      || evalMeta.visa_type || confirmMeta.visa_type || (application as any).visa_type || 'TO BE PROVIDED')),
    visa_validity: formatDateForDocx(getDocumentMeta('work_visa').visa_validity || (getMeta('work_visa', 'visa', 'visa_work_permit', 'entry_permit').visa_validity
      || evalMeta.visa_validity || confirmMeta.visa_validity || (application as any).visa_validity || 'TO BE PROVIDED')),
    visa_number: getDocumentMeta('work_visa').visa_number || (getMeta('work_visa', 'visa', 'visa_work_permit', 'entry_permit').visa_number
      || evalMeta.visa_number || confirmMeta.visa_number || (application as any).visa_number || 'TO BE PROVIDED'),
    work_visa_check: visaPresent ? CHECK : EMPTY,
    visa_attached: visaPresent ? 'ATTACHED' : EMPTY,
    employment_contract_check: employmentContractPresent ? CHECK : EMPTY,
    employment_contract_attached: employmentContractPresent ? 'ATTACHED' : EMPTY,
    ec_verified_polo_check: ecVerifiedPolo ? CHECK : EMPTY,
    ec_verified_pe_consulate_check: ecVerifiedPeConsulate ? CHECK : EMPTY,
    ec_apostille_polo_verification_check: ecApostillePoloVerification ? CHECK : EMPTY,
    ec_apostille_pe_ack_check: ecApostillePeAck ? CHECK : EMPTY,
    ec_notarized_dfa_check: ecNotarizedDfa ? CHECK : EMPTY,
    ec_notice_appointment_spain_check: ecNoticeAppointmentSpain ? CHECK : EMPTY,
    ec_confirmation_sem_check: ecConfirmationSem ? CHECK : EMPTY,
    ec_issued_date: formatDateForDocx(ecMeta.ec_issued_date || ''),
    country_specific_check: countrySpecificPresent ? CHECK : EMPTY,
    country_specific_attached: countrySpecificPresent ? 'ATTACHED' : EMPTY,

    // Other checklist items
    tesda_license_check: tesdaPresent ? CHECK : EMPTY,
    tesda_license_attached: tesdaPresent ? 'ATTACHED' : EMPTY,
    compliance_form_check: complianceFormPresent ? CHECK : EMPTY,
    compliance_form_attached: complianceFormPresent ? 'ATTACHED' : EMPTY,
    medical_certificate_check: medicalCertificatePresent ? CHECK : EMPTY,
    medical_certificate_attached: medicalCertificatePresent ? 'ATTACHED' : EMPTY,
    peos_certificate_check: peosCertificatePresent ? CHECK : EMPTY,
    peos_certificate_attached: peosCertificatePresent ? 'ATTACHED' : EMPTY,
    clearance_check: clearanceDocPresent ? CHECK : EMPTY,
    clearance_attached: clearanceDocPresent ? 'ATTACHED' : EMPTY,
    insurance_coverage_check: insuranceCoveragePresent ? CHECK : EMPTY,
    insurance_coverage_attached: insuranceCoveragePresent ? 'ATTACHED' : EMPTY,
    eregistration_check: eregistrationPresent ? CHECK : EMPTY,
    eregistration_attached: eregistrationPresent ? 'ATTACHED' : EMPTY,
    pdos_certificate_check: pdosCertificatePresent ? CHECK : EMPTY,
    pdos_certificate_attached: pdosCertificatePresent ? 'ATTACHED' : EMPTY,

    // Evaluation
    evaluation_date: evalMeta.evaluation_date || '',
    evaluation_notes: evalMeta.evaluation_notes || '',
    evaluation_status: evalMeta.evaluation_status || '',

    // Interview
    processed_workers_principal: String(principalVal ?? ''),
    processed_workers_las: String(lasVal ?? ''),
    // Aliases for template compatibility
    no_of_processed_workers_in_principal: interviewMeta.processed_workers_principal || '',
    landbased_accreditation_system: interviewMeta.processed_workers_las || '',
    interview_date: interviewMeta.interview_date || '',
    interview_notes: interviewMeta.interview_notes || '',

    // Confirmation
    confirmation_date: confirmMeta.confirmation_date || '',
    confirmation_notes: confirmMeta.confirmation_notes || '',
    confirmation_status: confirmMeta.confirmation_status || '',
    verifier_type: verifierType || '',
    verified_date: confirmMeta.verified_date || '',
    pe_pcg_verified_date: isPePcg ? (confirmMeta.verified_date || '') : '',
    mwo_verified_date: isMWO ? (confirmMeta.verified_date || '') : '',
    mwo_check: check(isMWO),
    pe_pcg_check: check(isPePcg),
    others_check: check(isOthers),
    mwo_office: isMWO ? (confirmMeta.verifier_office || '') : '',
    pe_pcg_city: isPePcg ? (confirmMeta.pe_pcg_city || '') : '',
    others_text: isOthers ? (confirmMeta.others_text || '') : '',
    
    // Screenshot fields for attachment_screenshots
    image_screenshot1: (() => {
      const screenshot1Doc = documents?.find(d => String((d as any).document_type || '').toLowerCase() === 'for_interview_screenshot')
      return screenshot1Doc ? (screenshot1Doc as any).file_path : (interviewMeta.screenshot_url || interviewMeta.verification_image_url || '')
    })(),
    image_screenshot2: (() => {
      const screenshot2Doc = documents?.find(d => String((d as any).document_type || '').toLowerCase() === 'confirmation_verification_image')
      return screenshot2Doc ? (screenshot2Doc as any).file_path : (confirmMeta.verification_image_url || '')
    })(),
  }

  const jsCtx = {
    // Expose common variables as callable + string
    name: mk(application.name || ''),
    applicant_name: mk(application.name || ''),
    position: mk(application.position || ''),
    jobsite: mk(application.jobsite || ''),
    employer: mk((application as any).employer || ''),
    evaluator: mk(application.evaluator || ''),
    created_date: mk(data.created_date),
    date: mk(data.date),
    DATE: mk(data.DATE),
    email: mk(data.email),
    cellphone: mk(data.cellphone),
    passport_number: mk(data.passport_number),
    passport_expiry: mk(data.passport_expiry),
    passport_check: mk(data.passport_check),
    passport_attached: mk(data.passport_attached),
    visa_category: mk(data.visa_category),
    visa_type: mk(data.visa_type),
    visa_validity: mk(data.visa_validity),
    visa_number: mk(data.visa_number),
    work_visa_check: mk(data.work_visa_check),
    visa_attached: mk(data.visa_attached),
    employment_contract_check: mk(data.employment_contract_check),
    employment_contract_attached: mk(data.employment_contract_attached),
    ec_verified_polo_check: mk(data.ec_verified_polo_check),
    ec_verified_pe_consulate_check: mk(data.ec_verified_pe_consulate_check),
    ec_apostille_polo_verification_check: mk(data.ec_apostille_polo_verification_check),
    ec_apostille_pe_ack_check: mk(data.ec_apostille_pe_ack_check),
    ec_notarized_dfa_check: mk(data.ec_notarized_dfa_check),
    ec_notice_appointment_spain_check: mk(data.ec_notice_appointment_spain_check),
    ec_confirmation_sem_check: mk(data.ec_confirmation_sem_check),
    ec_issued_date: mk(data.ec_issued_date),
    country_specific_check: mk(data.country_specific_check),
    country_specific_attached: mk(data.country_specific_attached),
    tesda_license_check: mk(data.tesda_license_check),
    tesda_license_attached: mk(data.tesda_license_attached),
    compliance_form_check: mk(data.compliance_form_check),
    compliance_form_attached: mk(data.compliance_form_attached),
    medical_certificate_check: mk(data.medical_certificate_check),
    medical_certificate_attached: mk(data.medical_certificate_attached),
    peos_certificate_check: mk(data.peos_certificate_check),
    peos_certificate_attached: mk(data.peos_certificate_attached),
    clearance_check: mk(data.clearance_check),
    clearance_attached: mk(data.clearance_attached),
    insurance_coverage_check: mk(data.insurance_coverage_check),
    insurance_coverage_attached: mk(data.insurance_coverage_attached),
    eregistration_check: mk(data.eregistration_check),
    eregistration_attached: mk(data.eregistration_attached),
    pdos_certificate_check: mk(data.pdos_certificate_check),
    pdos_certificate_attached: mk(data.pdos_certificate_attached),
    processed_workers_principal: mk(data.processed_workers_principal),
    processed_workers_las: mk(data.processed_workers_las),
    no_of_processed_workers_in_principal: mk(data.no_of_processed_workers_in_principal),
    landbased_accreditation_system: mk(data.landbased_accreditation_system),
    verified_date: mk(data.verified_date),
    pe_pcg_verified_date: mk(data.pe_pcg_verified_date),
    mwo_verified_date: mk(data.mwo_verified_date),
    mwo_office: mk(data.mwo_office),
    pe_pcg_city: mk(data.pe_pcg_city),
    others_text: mk(data.others_text),
    mwo_check: mk(data.mwo_check),
    pe_pcg_check: mk(data.pe_pcg_check),
    others_check: mk(data.others_check),
    
    // Screenshot fields for attachment_screenshots
    image_screenshot1: mk(data.image_screenshot1),
    image_screenshot2: mk(data.image_screenshot2),
  }

  return { data, jsCtx }
}

function safeParse(raw: any): any {
  if (!raw) return {}
  try {
    if (typeof raw === 'string') return JSON.parse(raw)
    return raw
  } catch {
    return {}
  }
}

// Helper function to extract visa code from full visa type
function extractVisaCode(visaType: string): string {
  if (!visaType || visaType === 'TO BE PROVIDED') return visaType
  
  // Extract the code part (e.g., "H-1B" from "H-1B – Skilled Workers / Professionals")
  const match = visaType.match(/^([A-Z0-9-]+)/)
  return match ? match[1] : visaType
}

// Helper function to format date as "11 SEPTEMBER 2025"
function formatDateForDocx(dateString: string): string {
  if (!dateString || dateString === 'TO BE PROVIDED') return dateString
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    
    const day = date.getDate()
    const monthNames = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ]
    const month = monthNames[date.getMonth()]
    const year = date.getFullYear()
    
    return `${day} ${month} ${year}`
  } catch {
    return dateString
  }
}


