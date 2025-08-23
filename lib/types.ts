// lib/types.ts

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash?: string;
  full_name: string;
  role: 'superadmin' | 'admin' | 'staff';
  is_approved: boolean;
  is_active: boolean;
  last_login?: string;
  failed_login_attempts?: number;
  account_locked_until?: string;
  password_changed_at?: string;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  user: Omit<User, 'password_hash'>;
  token: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SessionValidationRequest {
  token: string;
}

export interface LogoutRequest {
  token: string;
}

export interface DirectHireApplication {
  id: string;
  control_number: string;
  name: string;
  sex: 'male' | 'female';
  salary: number;
  status: 'draft' | 'pending' | 'evaluated' | 'for_confirmation' | 'emailed_to_dhad' | 'received_from_dhad' | 'for_interview' | 'approved' | 'rejected';
  jobsite: string;
  position: string;
  job_type: 'household' | 'professional';
  evaluator: string;
  employer: string;
  status_checklist: {
    evaluated: { checked: boolean; timestamp?: string };
    for_confirmation: { checked: boolean; timestamp?: string };
    emailed_to_dhad: { checked: boolean; timestamp?: string };
    received_from_dhad: { checked: boolean; timestamp?: string };
    for_interview: { checked: boolean; timestamp?: string };
  };
  personal_info?: PersonalInfo;
  employment_info?: EmploymentInfo;
  documents?: Document[];
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface PersonalInfo {
  id: string;
  application_id: string;
  last_name: string;
  first_name: string;
  middle_name?: string;
  date_of_birth: Date;
  age: number;
  height: number;
  weight: number;
  educational_attainment: string;
  present_address: string;
  email_address: string;
  contact_number: string;
}

export interface EmploymentInfo {
  id: string;
  application_id: string;
  employer_name: string;
  employer_address: string;
  position: string;
  salary: number;
  contract_start_date: Date;
  contract_end_date: Date;
  job_site: string;
}

export interface BalikManggagawaClearance {
  id: string;
  control_number: string;
  name_of_worker: string;
  sex: 'male' | 'female';
  employer: string;
  destination: string;
  salary: number;
  clearance_type: 'watchlisted_employer' | 'seafarer_position' | 'non_compliant_country' | 'no_verified_contract' | 'for_assessment_country' | 'critical_skill' | 'watchlisted_similar_name';
  status?: string;
  // New fields for template
  no_of_months_years?: string;
  date_of_departure?: Date;
  // Contact info for Watchlisted OFW
  active_email_address?: string;
  active_ph_mobile_number?: string;
  evaluator?: string;
  // Processing document fields (when linked from processing)
  personal_letter_file?: string;
  valid_passport_file?: string;
  work_visa_file?: string;
  employment_contract_file?: string;
  employment_certificate_file?: string;
  last_arrival_email_file?: string;
  flight_ticket_file?: string;
  documents_completed?: boolean;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface BalikManggagawaProcessing {
  id: string;
  or_number: string;
  name_of_worker: string;
  sex: 'male' | 'female';
  address: string;
  destination: string;
  clearance_type?: string;
  clearance_id?: string;
  personal_letter_file?: string;
  valid_passport_file?: string;
  work_visa_file?: string;
  employment_contract_file?: string;
  employment_certificate_file?: string;
  last_arrival_email_file?: string;
  flight_ticket_file?: string;
  documents_completed?: boolean;
  completed_at?: Date;
  documents_submitted?: number;
  counter_monitoring: CounterMonitoring[];
  created_at: Date;
  updated_at: Date;
}

export interface CounterMonitoring {
  id: string;
  processing_id: string;
  counter_number: string;
  time_in: Date[];
  remarks: string;
}

export interface GovToGovApplication {
  id: string;
  last_name: string;
  first_name: string;
  middle_name?: string;
  sex: 'male' | 'female';
  date_of_birth: Date;
  age: number;
  height: number;
  weight: number;
  educational_attainment: string;
  present_address: string;
  email_address: string;
  contact_number: string;
  passport_number: string;
  passport_validity: Date;
  id_presented: string;
  id_number: string;
  with_taiwan_work_experience: boolean;
  taiwan_work_experience?: TaiwanWorkExperience;
  with_job_experience: boolean;
  other_job_experience?: JobExperience;
  created_at: Date;
  updated_at: Date;
}

export interface TaiwanWorkExperience {
  id: string;
  application_id: string;
  company_name: string;
  year_started: number;
  year_ended: number;
}

export interface JobExperience {
  id: string;
  application_id: string;
  company_name: string;
  year_started: number;
  year_ended: number;
}

export interface InformationSheetRecord {
  id: string;
  family_name: string;
  first_name: string;
  middle_name?: string;
  gender: 'male' | 'female';
  jobsite: string;
  name_of_agency: string;
  purpose: 'employment' | 'owwa' | 'legal' | 'loan' | 'visa' | 'balik_manggagawa' | 'reduced_travel_tax' | 'philhealth' | 'others';
  purpose_others?: string;
  worker_category: 'landbased_newhire' | 'rehire_balik_manggagawa' | 'seafarer';
  requested_record: 'information_sheet' | 'oec' | 'employment_contract';
  documents_presented: string[];
  documents_others?: string;
  actions_taken: ActionsTaken;
  time_received: Date;
  time_released: Date;
  total_pct: number;
  remarks?: string;
  remarks_others?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ActionsTaken {
  id: string;
  record_id: string;
  year: number;
  ofw_records_released: 'print_out' | 'copy_of_original' | 'digital_image' | 'cert_no_record';
  no_of_records_retrieved: number;
}

export interface JobFairContact {
  id: string;
  job_fair_id: string;
  contact_category: string;
  contact_number: string;
  created_at: Date;
  updated_at: Date;
}

export interface JobFairEmail {
  id: string;
  job_fair_id: string;
  email_address: string;
  created_at: Date;
  updated_at: Date;
}

export interface JobFair {
  id: string;
  date: Date;
  venue: string;
  office_head: string;
  is_rescheduled: boolean;
  deleted_at?: Date | null;
  emails?: JobFairEmail[];
  contacts?: JobFairContact[];
  created_at: Date;
  updated_at: Date;
}

export interface PesoContact {
  id: string;
  province: string;
  peso_office: string;
  office_head: string;
  email: string;
  contact_number: string;
  emails?: PesoContactEmail[];
  contacts?: PesoContactContact[];
  created_at: Date;
  updated_at: Date;
}

export interface PesoContactEmail {
  email_address: string;
}

export interface PesoContactContact {
  contact_category: string;
  contact_number: string;
}

export interface PraContact {
  id: string;
  name_of_pras: string;
  pra_contact_person: string;
  office_head: string;
  email: string;
  contact_number: string;
  emails?: PraContactEmail[];
  contacts?: PraContactContact[];
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface PraContactEmail {
  email_address: string;
}

export interface PraContactContact {
  contact_category: string;
  contact_number: string;
}

export interface JobFairMonitoring {
  id: string;
  date_of_job_fair: Date;
  venue: string;
  no_of_invited_agencies: number;
  no_of_agencies_with_jfa: number;
  male_applicants: number;
  female_applicants: number;
  total_applicants: number;
  created_at: Date;
  updated_at: Date;
}

export interface Document {
  id: string;
  application_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values?: any;
  new_values?: any;
  ip_address: string;
  user_agent: string;
  created_at: Date;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Filter and search types
export interface FilterOptions {
  search?: string;
  status?: string;
  date_from?: Date;
  date_to?: Date;
  sex?: 'male' | 'female';
  clearance_type?: string;
  purpose?: string;
  worker_category?: string;
  include_deleted?: boolean;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}
