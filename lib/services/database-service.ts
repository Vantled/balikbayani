// lib/services/database-service.ts
import { db } from '../database';
import { 
  User, 
  DirectHireApplication, 
  BalikManggagawaClearance,
  BalikManggagawaProcessing,
  GovToGovApplication,
  InformationSheetRecord,
  JobFair,
  PesoContact,
  PraContact,
  JobFairMonitoring,
  Document,
  AuditLog,
  FilterOptions,
  PaginationOptions,
  PaginatedResponse
} from '../types';

export class DatabaseService {
  // Get preview counts for direct hire control number
  static async getDirectHireControlNumberPreview(): Promise<{ monthlyCount: number; yearlyCount: number }> {
    const now = new Date();
    const year = now.getFullYear();
    
    // Get count for this month
    const monthStart = new Date(year, now.getMonth(), 1);
    const monthEnd = new Date(year, now.getMonth() + 1, 0);
    
    const { rows: monthCount } = await db.query(
      'SELECT COUNT(*) FROM direct_hire_applications WHERE created_at >= $1 AND created_at <= $2',
      [monthStart, monthEnd]
    );
    
    const monthlyCount = parseInt(monthCount[0].count) + 1;
    
    // Get count for this year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    
    const { rows: yearCount } = await db.query(
      'SELECT COUNT(*) FROM direct_hire_applications WHERE created_at >= $1 AND created_at <= $2',
      [yearStart, yearEnd]
    );
    
    const yearlyCount = parseInt(yearCount[0].count) + 1;
    
    return { monthlyCount, yearlyCount };
  }

  // Generate control number for direct hire applications
  static async generateDirectHireControlNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const monthDay = `${month}${day}`;
    
    const { monthlyCount, yearlyCount } = await this.getDirectHireControlNumberPreview();
    
    const monthlyCountStr = String(monthlyCount).padStart(3, '0');
    const yearlyCountStr = String(yearlyCount).padStart(3, '0');
    
    return `DHPSW-ROIVA-${year}-${monthDay}-${monthlyCountStr}-${yearlyCountStr}`;
  }

  // User Management
  static async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const { rows } = await db.query(
      'INSERT INTO users (username, email, password_hash, full_name, role, is_approved) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [userData.username, userData.email, userData.password_hash, userData.full_name, userData.role, userData.is_approved]
    );
    return rows[0];
  }

  static async getUserById(id: string): Promise<User | null> {
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async getUserByUsername(username: string): Promise<User | null> {
    const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    return rows[0] || null;
  }

  static async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = Object.values(updates);
    const { rows } = await db.query(
      `UPDATE users SET ${fields} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0] || null;
  }

  static async getPendingUsers(): Promise<User[]> {
    const { rows } = await db.query('SELECT * FROM users WHERE is_approved = false ORDER BY created_at DESC');
    return rows;
  }

  // Direct Hire Applications
  static async createDirectHireApplication(data: {
    control_number: string;
    name: string;
    sex: 'male' | 'female';
    salary: number;
    status: string;
    jobsite: string;
    position: string;
    job_type: 'household' | 'professional';
    evaluator: string;
    employer: string;
    status_checklist: any;
  }): Promise<DirectHireApplication> {
    const query = `
      INSERT INTO direct_hire_applications 
      (control_number, name, sex, salary, status, jobsite, position, job_type, evaluator, employer, status_checklist)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      data.control_number,
      data.name,
      data.sex,
      data.salary,
      data.status,
      data.jobsite,
      data.position,
      data.job_type,
      data.evaluator,
      data.employer,
      JSON.stringify(data.status_checklist)
    ];
    
    const { rows } = await db.query(query, values);
    const result = rows[0];
    
    // Parse status_checklist JSONB field
    result.status_checklist = result.status_checklist ? JSON.parse(JSON.stringify(result.status_checklist)) : null;
    
    return result;
  }

  static async getDirectHireApplications(filters: FilterOptions = {}, pagination: PaginationOptions = { page: 1, limit: 10 }): Promise<PaginatedResponse<DirectHireApplication>> {
    let query = 'SELECT * FROM direct_hire_applications WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Exclude deleted by default
    if (!filters.include_deleted) {
      query += ' AND deleted_at IS NULL';
    }

    if (filters.search) {
      query += ` AND (name ILIKE $${paramIndex} OR control_number ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.sex) {
      query += ` AND sex = $${paramIndex}`;
      params.push(filters.sex);
      paramIndex++;
    }

    if (filters.date_from) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(filters.date_from);
      paramIndex++;
    }

    if (filters.date_to) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(filters.date_to);
      paramIndex++;
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const { rows: countRows } = await db.query(countQuery, params);
    const total = parseInt(countRows[0].count);

    // Add pagination and ordering
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pagination.limit, (pagination.page - 1) * pagination.limit);

    const { rows } = await db.query(query, params);

    // Parse status_checklist JSONB field for each row
    const parsedRows = rows.map(row => ({
      ...row,
      status_checklist: row.status_checklist ? JSON.parse(JSON.stringify(row.status_checklist)) : null
    }));

    return {
      data: parsedRows,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      }
    };
  }

  static async getDirectHireApplicationById(id: string): Promise<DirectHireApplication | null> {
    const { rows } = await db.query('SELECT * FROM direct_hire_applications WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (!rows[0]) return null;
    
    // Parse status_checklist JSONB field
    const row = rows[0];
    return {
      ...row,
      status_checklist: row.status_checklist ? JSON.parse(JSON.stringify(row.status_checklist)) : null
    };
  }

  static async updateDirectHireApplication(id: string, updateData: Partial<DirectHireApplication>): Promise<DirectHireApplication | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic query based on provided fields
    if (updateData.name !== undefined) { fields.push(`name = $${paramCount++}`); values.push(updateData.name); }
    if (updateData.sex !== undefined) { fields.push(`sex = $${paramCount++}`); values.push(updateData.sex); }
    if (updateData.salary !== undefined) { fields.push(`salary = $${paramCount++}`); values.push(updateData.salary); }
    if (updateData.status !== undefined) { fields.push(`status = $${paramCount++}`); values.push(updateData.status); }
    if (updateData.jobsite !== undefined) { fields.push(`jobsite = $${paramCount++}`); values.push(updateData.jobsite); }
    if (updateData.position !== undefined) { fields.push(`position = $${paramCount++}`); values.push(updateData.position); }
    if (updateData.job_type !== undefined) { fields.push(`job_type = $${paramCount++}`); values.push(updateData.job_type); }
    if (updateData.evaluator !== undefined) { fields.push(`evaluator = $${paramCount++}`); values.push(updateData.evaluator); }
    if ((updateData as any).employer !== undefined) { fields.push(`employer = $${paramCount++}`); values.push((updateData as any).employer); }
    if (updateData.status_checklist !== undefined) { fields.push(`status_checklist = $${paramCount++}`); values.push(JSON.stringify(updateData.status_checklist)); }

    if (fields.length === 0) { return null; }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE direct_hire_applications 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const { rows } = await db.query(query, values);
    if (rows.length === 0) return null;

    const result = rows[0];
    result.status_checklist = result.status_checklist ? JSON.parse(JSON.stringify(result.status_checklist)) : null;
    return result;
  }

  static async deleteDirectHireApplication(id: string): Promise<boolean> {
    const { rowCount } = await db.query('UPDATE direct_hire_applications SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [id]);
    return (rowCount || 0) > 0;
  }

  static async restoreDirectHireApplication(id: string): Promise<boolean> {
    const { rowCount } = await db.query('UPDATE direct_hire_applications SET deleted_at = NULL WHERE id = $1', [id]);
    return (rowCount || 0) > 0;
  }

  // Balik Manggagawa Clearance
  static async createClearance(clearanceData: Omit<BalikManggagawaClearance, 'id' | 'created_at' | 'updated_at'>): Promise<BalikManggagawaClearance> {
    const { rows } = await db.query(
      'INSERT INTO balik_manggagawa_clearance (control_number, name_of_worker, sex, employer, destination, salary, clearance_type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [clearanceData.control_number, clearanceData.name_of_worker, clearanceData.sex, clearanceData.employer, clearanceData.destination, clearanceData.salary, clearanceData.clearance_type]
    );
    return rows[0];
  }

  static async getClearances(filters: FilterOptions = {}, pagination: PaginationOptions = { page: 1, limit: 10 }): Promise<PaginatedResponse<BalikManggagawaClearance>> {
    let query = 'SELECT * FROM balik_manggagawa_clearance WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.search) {
      query += ` AND (name_of_worker ILIKE $${paramIndex} OR control_number ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.clearance_type) {
      query += ` AND clearance_type = $${paramIndex}`;
      params.push(filters.clearance_type);
      paramIndex++;
    }

    if (filters.sex) {
      query += ` AND sex = $${paramIndex}`;
      params.push(filters.sex);
      paramIndex++;
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const { rows: countRows } = await db.query(countQuery, params);
    const total = parseInt(countRows[0].count);

    // Add pagination and ordering
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pagination.limit, (pagination.page - 1) * pagination.limit);

    const { rows } = await db.query(query, params);

    return {
      data: rows,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      }
    };
  }

  // Balik Manggagawa Processing
  static async createProcessing(processingData: Omit<BalikManggagawaProcessing, 'id' | 'created_at' | 'updated_at'>): Promise<BalikManggagawaProcessing> {
    const { rows } = await db.query(
      'INSERT INTO balik_manggagawa_processing (or_number, name_of_worker, sex, address, destination) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [processingData.or_number, processingData.name_of_worker, processingData.sex, processingData.address, processingData.destination]
    );
    return rows[0];
  }

  static async getProcessingRecords(pagination: PaginationOptions = { page: 1, limit: 10 }): Promise<PaginatedResponse<BalikManggagawaProcessing>> {
    const { rows } = await db.query(
      'SELECT * FROM balik_manggagawa_processing ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [pagination.limit, (pagination.page - 1) * pagination.limit]
    );

    const { rows: countRows } = await db.query('SELECT COUNT(*) FROM balik_manggagawa_processing');
    const total = parseInt(countRows[0].count);

    return {
      data: rows,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      }
    };
  }

  // Gov to Gov Applications
  static async createGovToGovApplication(appData: Omit<GovToGovApplication, 'id' | 'created_at' | 'updated_at'>): Promise<GovToGovApplication> {
    const { rows } = await db.query(
      `INSERT INTO gov_to_gov_applications (
        last_name, first_name, middle_name, sex, date_of_birth, age, height, weight,
        educational_attainment, present_address, email_address, contact_number,
        passport_number, passport_validity, id_presented, id_number,
        with_taiwan_work_experience, with_job_experience
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
      [
        appData.last_name, appData.first_name, appData.middle_name, appData.sex,
        appData.date_of_birth, appData.age, appData.height, appData.weight,
        appData.educational_attainment, appData.present_address, appData.email_address,
        appData.contact_number, appData.passport_number, appData.passport_validity,
        appData.id_presented, appData.id_number, appData.with_taiwan_work_experience,
        appData.with_job_experience
      ]
    );
    return rows[0];
  }

  static async getGovToGovApplications(filters: FilterOptions = {}, pagination: PaginationOptions = { page: 1, limit: 10 }): Promise<PaginatedResponse<GovToGovApplication>> {
    let query = 'SELECT * FROM gov_to_gov_applications WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.search) {
      query += ` AND (last_name ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.sex) {
      query += ` AND sex = $${paramIndex}`;
      params.push(filters.sex);
      paramIndex++;
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const { rows: countRows } = await db.query(countQuery, params);
    const total = parseInt(countRows[0].count);

    // Add pagination and ordering
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pagination.limit, (pagination.page - 1) * pagination.limit);

    const { rows } = await db.query(query, params);

    return {
      data: rows,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      }
    };
  }

  // Information Sheet Records
  static async createInformationSheetRecord(recordData: Omit<InformationSheetRecord, 'id' | 'created_at' | 'updated_at'>): Promise<InformationSheetRecord> {
    const { rows } = await db.query(
      `INSERT INTO information_sheet_records (
        family_name, first_name, middle_name, gender, jobsite, name_of_agency,
        purpose, purpose_others, worker_category, requested_record,
        documents_presented, documents_others, time_received, time_released,
        total_pct, remarks, remarks_others
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
      [
        recordData.family_name, recordData.first_name, recordData.middle_name,
        recordData.gender, recordData.jobsite, recordData.name_of_agency,
        recordData.purpose, recordData.purpose_others, recordData.worker_category,
        recordData.requested_record, recordData.documents_presented,
        recordData.documents_others, recordData.time_received, recordData.time_released,
        recordData.total_pct, recordData.remarks, recordData.remarks_others
      ]
    );
    return rows[0];
  }

  static async getInformationSheetRecords(filters: FilterOptions = {}, pagination: PaginationOptions = { page: 1, limit: 10 }): Promise<PaginatedResponse<InformationSheetRecord>> {
    let query = 'SELECT * FROM information_sheet_records WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.search) {
      query += ` AND (family_name ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.purpose) {
      query += ` AND purpose = $${paramIndex}`;
      params.push(filters.purpose);
      paramIndex++;
    }

    if (filters.worker_category) {
      query += ` AND worker_category = $${paramIndex}`;
      params.push(filters.worker_category);
      paramIndex++;
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const { rows: countRows } = await db.query(countQuery, params);
    const total = parseInt(countRows[0].count);

    // Add pagination and ordering
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pagination.limit, (pagination.page - 1) * pagination.limit);

    const { rows } = await db.query(query, params);

    return {
      data: rows,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      }
    };
  }

  // Job Fairs
  static async createJobFair(jobFairData: Omit<JobFair, 'id' | 'created_at' | 'updated_at'>): Promise<JobFair> {
    const { rows } = await db.query(
      'INSERT INTO job_fairs (date, venue, office_head, email_for_invitation, contact_number) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [jobFairData.date, jobFairData.venue, jobFairData.office_head, jobFairData.email_for_invitation, jobFairData.contact_number]
    );
    return rows[0];
  }

  static async getJobFairs(pagination: PaginationOptions = { page: 1, limit: 10 }): Promise<PaginatedResponse<JobFair>> {
    const { rows } = await db.query(
      'SELECT * FROM job_fairs ORDER BY date DESC LIMIT $1 OFFSET $2',
      [pagination.limit, (pagination.page - 1) * pagination.limit]
    );

    const { rows: countRows } = await db.query('SELECT COUNT(*) FROM job_fairs');
    const total = parseInt(countRows[0].count);

    return {
      data: rows,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      }
    };
  }

  // PESO Contacts
  static async createPesoContact(contactData: Omit<PesoContact, 'id' | 'created_at' | 'updated_at'>): Promise<PesoContact> {
    const { rows } = await db.query(
      'INSERT INTO peso_contacts (province, peso_office, office_head, email, contact_number) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [contactData.province, contactData.peso_office, contactData.office_head, contactData.email, contactData.contact_number]
    );
    return rows[0];
  }

  static async getPesoContacts(pagination: PaginationOptions = { page: 1, limit: 10 }): Promise<PaginatedResponse<PesoContact>> {
    const { rows } = await db.query(
      'SELECT * FROM peso_contacts ORDER BY province ASC LIMIT $1 OFFSET $2',
      [pagination.limit, (pagination.page - 1) * pagination.limit]
    );

    const { rows: countRows } = await db.query('SELECT COUNT(*) FROM peso_contacts');
    const total = parseInt(countRows[0].count);

    return {
      data: rows,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      }
    };
  }

  // PRA Contacts
  static async createPraContact(contactData: Omit<PraContact, 'id' | 'created_at' | 'updated_at'>): Promise<PraContact> {
    const { rows } = await db.query(
      'INSERT INTO pra_contacts (name_of_pras, pra_contact_person, office_head, email, contact_number) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [contactData.name_of_pras, contactData.pra_contact_person, contactData.office_head, contactData.email, contactData.contact_number]
    );
    return rows[0];
  }

  static async getPraContacts(pagination: PaginationOptions = { page: 1, limit: 10 }): Promise<PaginatedResponse<PraContact>> {
    const { rows } = await db.query(
      'SELECT * FROM pra_contacts ORDER BY name_of_pras ASC LIMIT $1 OFFSET $2',
      [pagination.limit, (pagination.page - 1) * pagination.limit]
    );

    const { rows: countRows } = await db.query('SELECT COUNT(*) FROM pra_contacts');
    const total = parseInt(countRows[0].count);

    return {
      data: rows,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      }
    };
  }

  // Job Fair Monitoring
  static async createJobFairMonitoring(monitoringData: Omit<JobFairMonitoring, 'id' | 'created_at' | 'updated_at'>): Promise<JobFairMonitoring> {
    const { rows } = await db.query(
      'INSERT INTO job_fair_monitoring (date_of_job_fair, venue, no_of_invited_agencies, no_of_agencies_with_jfa, male_applicants, female_applicants, total_applicants) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [monitoringData.date_of_job_fair, monitoringData.venue, monitoringData.no_of_invited_agencies, monitoringData.no_of_agencies_with_jfa, monitoringData.male_applicants, monitoringData.female_applicants, monitoringData.total_applicants]
    );
    return rows[0];
  }

  static async getJobFairMonitoring(pagination: PaginationOptions = { page: 1, limit: 10 }): Promise<PaginatedResponse<JobFairMonitoring>> {
    const { rows } = await db.query(
      'SELECT * FROM job_fair_monitoring ORDER BY date_of_job_fair DESC LIMIT $1 OFFSET $2',
      [pagination.limit, (pagination.page - 1) * pagination.limit]
    );

    const { rows: countRows } = await db.query('SELECT COUNT(*) FROM job_fair_monitoring');
    const total = parseInt(countRows[0].count);

    return {
      data: rows,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      }
    };
  }

  // Documents
  static async createDocument(documentData: Omit<Document, 'id' | 'uploaded_at' | 'updated_at'>): Promise<Document> {
    const { rows } = await db.query(
      'INSERT INTO documents (application_id, application_type, document_type, file_name, file_path, file_size, mime_type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [documentData.application_id, documentData.application_type, documentData.document_type, documentData.file_name, documentData.file_path, documentData.file_size, documentData.mime_type]
    );
    return rows[0];
  }

  static async getDocumentById(id: string): Promise<Document | null> {
    const { rows } = await db.query('SELECT * FROM documents WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async getDocumentsByApplication(applicationId: string, applicationType: string): Promise<Document[]> {
    const { rows } = await db.query(
      'SELECT * FROM documents WHERE application_id = $1 AND application_type = $2 ORDER BY uploaded_at DESC',
      [applicationId, applicationType]
    );
    return rows;
  }

  // Audit Logs
  static async createAuditLog(logData: Omit<AuditLog, 'id' | 'created_at'>): Promise<AuditLog> {
    const { rows } = await db.query(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [logData.user_id, logData.action, logData.table_name, logData.record_id, logData.old_values, logData.new_values, logData.ip_address, logData.user_agent]
    );
    return rows[0];
  }

  static async getAuditLogs(userId?: string, pagination: PaginationOptions = { page: 1, limit: 10 }): Promise<PaginatedResponse<AuditLog>> {
    let query = 'SELECT * FROM audit_logs';
    const params: any[] = [];
    let paramIndex = 1;

    if (userId) {
      query += ` WHERE user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const { rows: countRows } = await db.query(countQuery, params);
    const total = parseInt(countRows[0].count);

    // Add pagination and ordering
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pagination.limit, (pagination.page - 1) * pagination.limit);

    const { rows } = await db.query(query, params);

    return {
      data: rows,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      }
    };
  }

  // Dashboard Statistics
  static async getDashboardStats() {
    const stats = await db.transaction(async (client) => {
      const [
        directHireCount,
        clearanceCount,
        govToGovCount,
        infoSheetCount,
        pendingUsersCount
      ] = await Promise.all([
        client.query('SELECT COUNT(*) FROM direct_hire_applications'),
        client.query('SELECT COUNT(*) FROM balik_manggagawa_clearance'),
        client.query('SELECT COUNT(*) FROM gov_to_gov_applications'),
        client.query('SELECT COUNT(*) FROM information_sheet_records'),
        client.query('SELECT COUNT(*) FROM users WHERE is_approved = false')
      ]);

      return {
        directHire: parseInt(directHireCount.rows[0].count),
        clearance: parseInt(clearanceCount.rows[0].count),
        govToGov: parseInt(govToGovCount.rows[0].count),
        infoSheet: parseInt(infoSheetCount.rows[0].count),
        pendingUsers: parseInt(pendingUsersCount.rows[0].count)
      };
    });

    return stats;
  }
}
