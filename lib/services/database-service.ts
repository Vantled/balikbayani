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
  JobFairContact,
  JobFairEmail,
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
  static async createBalikManggagawaClearance(clearanceData: {
    nameOfWorker: string;
    sex: 'male' | 'female';
    employer: string;
    destination: string;
    salary: number;
    clearanceType: string;
    position?: string | null;
    monthsYears?: string | null;
    withPrincipal?: string | null;
    newPrincipalName?: string | null;
    employmentDuration?: string | null;
    dateArrival?: string | null;
    dateDeparture?: string | null;
    placeDateEmployment?: string | null;
    dateBlacklisting?: string | null;
    totalDeployedOfws?: number | null;
    reasonBlacklisting?: string | null;
    yearsWithPrincipal?: number | null;
    employmentStartDate?: string | null;
    processingDate?: string | null;
    remarks?: string | null;
    noOfMonthsYears?: string | null;
    dateOfDeparture?: string | null;
    activeEmailAddress?: string | null;
    activePhMobileNumber?: string | null;
    evaluator?: string | null;
  }): Promise<BalikManggagawaClearance> {
    // Generate control number based on clearance type with monthly and yearly sequences
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    // counts per type within current month and within current year
    const { rows: monthlyRows } = await db.query(
      `SELECT COUNT(*)
       FROM balik_manggagawa_clearance
       WHERE clearance_type = $1
         AND EXTRACT(YEAR FROM created_at) = $2
         AND EXTRACT(MONTH FROM created_at) = $3`,
      [clearanceData.clearanceType, year, parseInt(month)]
    );
    const { rows: yearlyRows } = await db.query(
      `SELECT COUNT(*)
       FROM balik_manggagawa_clearance
       WHERE clearance_type = $1
         AND EXTRACT(YEAR FROM created_at) = $2`,
      [clearanceData.clearanceType, year]
    );
    const monthlyCount = String(parseInt(monthlyRows[0].count) + 1).padStart(3, '0');
    const yearlyCount = String(parseInt(yearlyRows[0].count) + 1).padStart(3, '0');

    // Prefix and delimiter mapping per type (matches provided examples)
    let prefix = '';
    let delimiter = ' ';
    switch (clearanceData.clearanceType) {
      case 'watchlisted_employer':
        prefix = 'WE';
        delimiter = ' ';
        break;
      case 'seafarer_position':
        prefix = 'SP';
        delimiter = '-';
        break;
      case 'non_compliant_country':
        prefix = 'NCC';
        delimiter = ' ';
        break;
      case 'no_verified_contract':
        prefix = 'NVEC';
        delimiter = '-';
        break;
      case 'for_assessment_country':
        prefix = 'FAC';
        delimiter = ' ';
        break;
      case 'critical_skill':
        prefix = 'CS';
        delimiter = '-';
        break;
      case 'watchlisted_similar_name':
        prefix = 'WSN';
        delimiter = '-';
        break;
      default:
        prefix = 'BM';
        delimiter = '-';
    }

    const controlNumber = `${prefix}${delimiter}${year}-${month}${day}-${monthlyCount}-${yearlyCount}`;
    
    const { rows } = await db.query(
      `INSERT INTO balik_manggagawa_clearance (
        control_number, name_of_worker, sex, employer, destination, salary, clearance_type,
        position, months_years, with_principal, new_principal_name, employment_duration,
        date_arrival, date_departure, place_date_employment, date_blacklisting,
        total_deployed_ofws, reason_blacklisting, years_with_principal, employment_start_date, processing_date, remarks,
        no_of_months_years, date_of_departure, active_email_address, active_ph_mobile_number, evaluator
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,$12,
        $13,$14,$15,$16,
        $17,$18,$19,$20,$21,$22,
        $23,$24,$25,$26,$27
      ) RETURNING *`,
      [
        controlNumber, clearanceData.nameOfWorker, clearanceData.sex, clearanceData.employer, clearanceData.destination, clearanceData.salary, clearanceData.clearanceType,
        clearanceData.position ?? null, clearanceData.monthsYears ?? null, clearanceData.withPrincipal ?? null, clearanceData.newPrincipalName ?? null, clearanceData.employmentDuration ?? null,
        clearanceData.dateArrival ?? null, clearanceData.dateDeparture ?? null, clearanceData.placeDateEmployment ?? null, clearanceData.dateBlacklisting ?? null,
        clearanceData.totalDeployedOfws ?? null, clearanceData.reasonBlacklisting ?? null, clearanceData.yearsWithPrincipal ?? null, clearanceData.employmentStartDate ?? null, clearanceData.processingDate ?? null, clearanceData.remarks ?? null,
        clearanceData.noOfMonthsYears ?? null, clearanceData.dateOfDeparture ?? null, clearanceData.activeEmailAddress ?? null, clearanceData.activePhMobileNumber ?? null, clearanceData.evaluator ?? null
      ]
    );
    return rows[0];
  }

  static async getBalikManggagawaClearances(filters: {
    page: number;
    limit: number;
    search?: string;
    clearanceType?: string;
    sex?: string;
    dateFrom?: string;
    dateTo?: string;
    jobsite?: string;
    position?: string;
    include_deleted?: boolean;
    show_deleted_only?: boolean;
  }): Promise<PaginatedResponse<BalikManggagawaClearance>> {
    let query = `
      SELECT c.*, p.personal_letter_file, p.valid_passport_file, p.work_visa_file,
             p.employment_contract_file, p.employment_certificate_file, p.last_arrival_email_file,
             p.flight_ticket_file, p.documents_completed, p.completed_at
      FROM balik_manggagawa_clearance c
      LEFT JOIN balik_manggagawa_processing p ON c.id = p.clearance_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Handle deleted records logic
    if (filters.show_deleted_only) {
      // Show only deleted records
      query += ' AND c.deleted_at IS NOT NULL';
    } else if (!filters.include_deleted) {
      // Exclude deleted by default
      query += ' AND c.deleted_at IS NULL';
    }

    if (filters.search) {
      query += ` AND (c.name_of_worker ILIKE $${paramIndex} OR c.control_number ILIKE $${paramIndex} OR c.employer ILIKE $${paramIndex} OR c.destination ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.clearanceType) {
      const types = String(filters.clearanceType).split(',').filter(Boolean)
      if (types.length > 0) {
        query += ` AND c.clearance_type = ANY($${paramIndex}::text[])`;
        params.push(types);
        paramIndex++;
      }
    }

    if (filters.sex) {
      const sexes = String(filters.sex).split(',').filter(Boolean)
      if (sexes.length > 0) {
        query += ` AND c.sex = ANY($${paramIndex}::text[])`;
        params.push(sexes);
        paramIndex++;
      }
    }

    if (filters.dateFrom && filters.dateTo) {
      query += ` AND c.created_at::date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(filters.dateFrom, filters.dateTo);
      paramIndex += 2;
    }

    // Only show clearances that are completed (have documents_completed = true) or don't have processing records
    query += ` AND (p.documents_completed = true OR p.documents_completed IS NULL)`;

    // Get total count
    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM');
    const { rows: countRows } = await db.query(countQuery, params);
    const total = parseInt(countRows[0].count);

    // Add pagination and ordering
    query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(filters.limit, (filters.page - 1) * filters.limit);

    const { rows } = await db.query(query, params);

    return {
      data: rows,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit)
      }
    };
  }

  static async getBalikManggagawaClearanceById(id: string): Promise<BalikManggagawaClearance | null> {
    const { rows } = await db.query(`
      SELECT c.*, p.personal_letter_file, p.valid_passport_file, p.work_visa_file,
             p.employment_contract_file, p.employment_certificate_file, p.last_arrival_email_file,
             p.flight_ticket_file, p.documents_completed, p.completed_at
      FROM balik_manggagawa_clearance c
      LEFT JOIN balik_manggagawa_processing p ON c.id = p.clearance_id
      WHERE c.id = $1 AND c.deleted_at IS NULL
    `, [id]);
    return rows[0] || null;
  }

  static async updateBalikManggagawaClearance(id: string, clearanceData: {
    nameOfWorker: string;
    sex: 'male' | 'female';
    employer: string;
    destination: string;
    salary: number;
    clearanceType: string;
    position?: string | null;
    monthsYears?: string | null;
    withPrincipal?: string | null;
    newPrincipalName?: string | null;
    employmentDuration?: string | null;
    dateArrival?: string | null;
    dateDeparture?: string | null;
    placeDateEmployment?: string | null;
    dateBlacklisting?: string | null;
    totalDeployedOfws?: number | null;
    reasonBlacklisting?: string | null;
    yearsWithPrincipal?: number | null;
    remarks?: string | null;
  }): Promise<BalikManggagawaClearance | null> {
    const { rows } = await db.query(
      `UPDATE balik_manggagawa_clearance SET
        name_of_worker = $1, sex = $2, employer = $3, destination = $4, salary = $5, clearance_type = $6,
        position = $7, months_years = $8, with_principal = $9, new_principal_name = $10, employment_duration = $11,
        date_arrival = $12, date_departure = $13, place_date_employment = $14, date_blacklisting = $15,
        total_deployed_ofws = $16, reason_blacklisting = $17, years_with_principal = $18, remarks = $19
       WHERE id = $20 RETURNING *`,
      [
        clearanceData.nameOfWorker, clearanceData.sex, clearanceData.employer, clearanceData.destination, clearanceData.salary, clearanceData.clearanceType,
        clearanceData.position ?? null, clearanceData.monthsYears ?? null, clearanceData.withPrincipal ?? null, clearanceData.newPrincipalName ?? null, clearanceData.employmentDuration ?? null,
        clearanceData.dateArrival ?? null, clearanceData.dateDeparture ?? null, clearanceData.placeDateEmployment ?? null, clearanceData.dateBlacklisting ?? null,
        clearanceData.totalDeployedOfws ?? null, clearanceData.reasonBlacklisting ?? null, clearanceData.yearsWithPrincipal ?? null, clearanceData.remarks ?? null,
        id
      ]
    );
    return rows[0] || null;
  }

  static async deleteBalikManggagawaClearance(id: string): Promise<boolean> {
    const { rowCount } = await db.query('UPDATE balik_manggagawa_clearance SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [id]);
    return (rowCount || 0) > 0;
  }

  static async restoreBalikManggagawaClearance(id: string): Promise<boolean> {
    const { rowCount } = await db.query('UPDATE balik_manggagawa_clearance SET deleted_at = NULL WHERE id = $1', [id]);
    return (rowCount || 0) > 0;
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

  static async createBalikManggagawaProcessing(processingData: {
    nameOfWorker: string;
    sex: 'male' | 'female';
    address: string;
    destination: string;
    clearanceType?: string;
    clearanceId?: string;
  }): Promise<BalikManggagawaProcessing> {
    // Generate OR number OR-YYYY-#### (daily incremental not required here)
    const now = new Date();
    const year = now.getFullYear();
    const { rows: countRows } = await db.query('SELECT COUNT(*) FROM balik_manggagawa_processing WHERE EXTRACT(YEAR FROM created_at) = $1', [year]);
    const seq = String(parseInt(countRows[0].count) + 1).padStart(4, '0');
    const orNumber = `OR-${year}-${seq}`;

    const { rows } = await db.query(
      'INSERT INTO balik_manggagawa_processing (or_number, name_of_worker, sex, address, destination, clearance_type, clearance_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [orNumber, processingData.nameOfWorker, processingData.sex, processingData.address, processingData.destination, processingData.clearanceType || null, processingData.clearanceId || null]
    );
    return rows[0];
  }

  static async getBalikManggagawaProcessingById(id: string): Promise<BalikManggagawaProcessing | null> {
    const { rows } = await db.query(`
      SELECT p.*, c.control_number as clearance_control_number, c.employer, c.salary, 
             c.position, c.date_arrival, c.remarks
      FROM balik_manggagawa_processing p
      LEFT JOIN balik_manggagawa_clearance c ON p.clearance_id = c.id
      WHERE p.id = $1
    `, [id]);
    return rows[0] || null;
  }

  static async updateBalikManggagawaProcessing(id: string, data: {
    nameOfWorker?: string;
    sex?: 'male' | 'female';
    address?: string;
    destination?: string;
    personalLetterFile?: string;
    validPassportFile?: string;
    workVisaFile?: string;
    employmentContractFile?: string;
    employmentCertificateFile?: string;
    lastArrivalEmailFile?: string;
    flightTicketFile?: string;
    documentsCompleted?: boolean;
  }): Promise<BalikManggagawaProcessing | null> {
    const { rows } = await db.query(
      `UPDATE balik_manggagawa_processing SET 
        name_of_worker = COALESCE($1, name_of_worker), 
        sex = COALESCE($2, sex), 
        address = COALESCE($3, address), 
        destination = COALESCE($4, destination),
        personal_letter_file = COALESCE($5, personal_letter_file),
        valid_passport_file = COALESCE($6, valid_passport_file),
        work_visa_file = COALESCE($7, work_visa_file),
        employment_contract_file = COALESCE($8, employment_contract_file),
        employment_certificate_file = COALESCE($9, employment_certificate_file),
        last_arrival_email_file = COALESCE($10, last_arrival_email_file),
        flight_ticket_file = COALESCE($11, flight_ticket_file),
        documents_completed = COALESCE($12, documents_completed),
        completed_at = CASE WHEN $12 = true THEN NOW() ELSE completed_at END,
        updated_at = NOW() 
       WHERE id = $13 RETURNING *`,
      [
        data.nameOfWorker, data.sex, data.address, data.destination,
        data.personalLetterFile, data.validPassportFile, data.workVisaFile,
        data.employmentContractFile, data.employmentCertificateFile,
        data.lastArrivalEmailFile, data.flightTicketFile, data.documentsCompleted,
        id
      ]
    );
    return rows[0] || null;
  }

  static async deleteBalikManggagawaProcessing(id: string): Promise<boolean> {
    const { rowCount } = await db.query('DELETE FROM balik_manggagawa_processing WHERE id = $1', [id]);
    return (rowCount || 0) > 0;
  }

  static async getProcessingRecords(
    pagination: PaginationOptions = { page: 1, limit: 10 },
    filters?: { search?: string; types?: string; sexes?: string; dateFrom?: string; dateTo?: string; destination?: string; address?: string }
  ): Promise<PaginatedResponse<BalikManggagawaProcessing>> {
    let query = `
      SELECT p.*, c.control_number as clearance_control_number,
             CASE WHEN p.personal_letter_file IS NOT NULL THEN 1 ELSE 0 END +
             CASE WHEN p.valid_passport_file IS NOT NULL THEN 1 ELSE 0 END +
             CASE WHEN p.work_visa_file IS NOT NULL THEN 1 ELSE 0 END +
             CASE WHEN p.employment_contract_file IS NOT NULL THEN 1 ELSE 0 END +
             CASE WHEN p.employment_certificate_file IS NOT NULL THEN 1 ELSE 0 END +
             CASE WHEN p.last_arrival_email_file IS NOT NULL THEN 1 ELSE 0 END +
             CASE WHEN p.flight_ticket_file IS NOT NULL THEN 1 ELSE 0 END as documents_submitted
      FROM balik_manggagawa_processing p
      LEFT JOIN balik_manggagawa_clearance c ON p.clearance_id = c.id
      WHERE (p.documents_completed = false OR p.documents_completed IS NULL)
        AND p.clearance_type IN ('for_assessment_country', 'non_compliant_country', 'watchlisted_similar_name')
    `;
    const params: any[] = [];
    let idx = 1;

    if (filters?.search) {
      query += ` AND (p.name_of_worker ILIKE $${idx} OR p.or_number ILIKE $${idx} OR p.destination ILIKE $${idx} OR p.address ILIKE $${idx})`;
      params.push(`%${filters.search}%`);
      idx++;
    }

    if (filters?.types) {
      const types = String(filters.types).split(',').filter(Boolean)
      if (types.length > 0) {
        query += ` AND p.clearance_type = ANY($${idx}::text[])`;
        params.push(types);
        idx++;
      }
    }

    if (filters?.sexes) {
      const sexes = String(filters.sexes).split(',').filter(Boolean);
      if (sexes.length > 0) {
        query += ` AND p.sex = ANY($${idx}::text[])`;
        params.push(sexes);
        idx++;
      }
    }

    if (filters?.dateFrom && filters?.dateTo) {
      query += ` AND p.created_at::date BETWEEN $${idx} AND $${idx + 1}`;
      params.push(filters.dateFrom, filters.dateTo);
      idx += 2;
    }

    if (filters?.destination) {
      query += ` AND p.destination ILIKE $${idx}`;
      params.push(`%${filters.destination}%`);
      idx++;
    }

    if (filters?.address) {
      query += ` AND p.address ILIKE $${idx}`;
      params.push(`%${filters.address}%`);
      idx++;
    }

    // Count
    const countQuery = `SELECT COUNT(*) FROM (${query}) q`;

    // Pagination
    query += ` ORDER BY p.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(pagination.limit, (pagination.page - 1) * pagination.limit);

    const { rows } = await db.query(query, params);
    const { rows: countRows } = await db.query(countQuery, params.slice(0, params.length - 2));
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

  static async moveProcessingToClearance(processingId: string): Promise<boolean> {
    try {
      // Get the processing record
      const processingRecord = await this.getBalikManggagawaProcessingById(processingId);
      if (!processingRecord || !processingRecord.documents_completed) {
        return false;
      }

      // Update the clearance record to mark it as completed
      if (processingRecord.clearance_id) {
        await db.query(
          'UPDATE balik_manggagawa_clearance SET status = $1, updated_at = NOW() WHERE id = $2',
          ['completed', processingRecord.clearance_id]
        );
      }

      return true;
    } catch (error) {
      console.error('Error moving processing to clearance:', error);
      return false;
    }
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
  static async createJobFair(jobFairData: Omit<JobFair, 'id' | 'created_at' | 'updated_at' | 'contacts' | 'emails' | 'is_rescheduled'> & { contacts: Omit<JobFairContact, 'id' | 'job_fair_id' | 'created_at' | 'updated_at'>[], emails: Omit<JobFairEmail, 'id' | 'job_fair_id' | 'created_at' | 'updated_at'>[] }): Promise<JobFair | null> {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      // Insert job fair - handle case where is_rescheduled column might not exist yet
      let jobFairRows: any;
      try {
        const result = await client.query(
          'INSERT INTO job_fairs (date, venue, office_head, is_rescheduled) VALUES ($1, $2, $3, $4) RETURNING *',
          [jobFairData.date, jobFairData.venue, jobFairData.office_head, false]
        );
        jobFairRows = result;
      } catch (error: any) {
        // If is_rescheduled column doesn't exist, try without it
        if (error.message && error.message.includes('is_rescheduled')) {
          const result = await client.query(
            'INSERT INTO job_fairs (date, venue, office_head) VALUES ($1, $2, $3) RETURNING *',
            [jobFairData.date, jobFairData.venue, jobFairData.office_head]
          );
          jobFairRows = result;
        } else {
          throw error;
        }
      }
      
      const jobFair = jobFairRows.rows[0];
      
      // Insert emails if provided
      if (jobFairData.emails && jobFairData.emails.length > 0) {
        for (const email of jobFairData.emails) {
          await client.query(
            'INSERT INTO job_fair_emails (job_fair_id, email_address) VALUES ($1, $2)',
            [jobFair.id, email.email_address]
          );
        }
      }
      
      // Insert contacts if provided
      if (jobFairData.contacts && jobFairData.contacts.length > 0) {
        for (const contact of jobFairData.contacts) {
          await client.query(
            'INSERT INTO job_fair_contacts (job_fair_id, contact_category, contact_number) VALUES ($1, $2, $3)',
            [jobFair.id, contact.contact_category, contact.contact_number]
          );
        }
      }
      
      await client.query('COMMIT');
      
      // Return job fair with contacts
      return await this.getJobFairById(jobFair.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getJobFairs(pagination: PaginationOptions & { search?: string; showDeletedOnly?: boolean } = { page: 1, limit: 10 }): Promise<PaginatedResponse<JobFair>> {
    let query = 'SELECT * FROM job_fairs';
    let countQuery = 'SELECT COUNT(*) FROM job_fairs';
    const params: any[] = [];
    let paramIndex = 1;

    // Handle soft delete filtering
    let whereConditions: string[] = [];
    
    if (pagination.showDeletedOnly) {
      whereConditions.push(`deleted_at IS NOT NULL`);
    } else {
      whereConditions.push(`deleted_at IS NULL`);
    }

    if (pagination.search && pagination.search.trim()) {
      whereConditions.push(`(venue ILIKE $${paramIndex} OR office_head ILIKE $${paramIndex})`);
      params.push(`%${pagination.search.trim()}%`);
      paramIndex++;
    }

    if (whereConditions.length > 0) {
      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
      query += ` ${whereClause}`;
      countQuery += ` ${whereClause}`;
    }

    query += ` ORDER BY date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pagination.limit, (pagination.page - 1) * pagination.limit);

    const { rows } = await db.query(query, params);
    const { rows: countRows } = await db.query(countQuery, params.slice(0, paramIndex - 1));
    const total = parseInt(countRows[0].count);

    // Get contacts and emails for all job fairs
    const jobFairIds = rows.map(row => row.id);
    let contacts: any[] = [];
    let emails: any[] = [];
    if (jobFairIds.length > 0) {
      const placeholders = jobFairIds.map((_, index) => `$${index + 1}`).join(',');
      const { rows: contactRows } = await db.query(
        `SELECT * FROM job_fair_contacts WHERE job_fair_id IN (${placeholders}) ORDER BY job_fair_id, created_at ASC`,
        jobFairIds
      );
      contacts = contactRows;
      
      const { rows: emailRows } = await db.query(
        `SELECT * FROM job_fair_emails WHERE job_fair_id IN (${placeholders}) ORDER BY job_fair_id, created_at ASC`,
        jobFairIds
      );
      emails = emailRows;
    }

    // Group contacts by job fair id
    const contactsByJobFairId = contacts.reduce((acc, contact) => {
      if (!acc[contact.job_fair_id]) {
        acc[contact.job_fair_id] = [];
      }
      acc[contact.job_fair_id].push(contact);
      return acc;
    }, {});

    // Group emails by job fair id
    const emailsByJobFairId = emails.reduce((acc, email) => {
      if (!acc[email.job_fair_id]) {
        acc[email.job_fair_id] = [];
      }
      acc[email.job_fair_id].push(email);
      return acc;
    }, {});

    // Add contacts and emails to job fairs and ensure is_rescheduled field exists
    const jobFairsWithContacts = rows.map(jobFair => ({
      ...jobFair,
      is_rescheduled: jobFair.is_rescheduled || false, // Default to false if column doesn't exist
      contacts: contactsByJobFairId[jobFair.id] || [],
      emails: emailsByJobFairId[jobFair.id] || []
    }));

    return {
      data: jobFairsWithContacts,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      }
    };
  }

  static async getJobFairById(id: string): Promise<JobFair | null> {
    const { rows } = await db.query('SELECT * FROM job_fairs WHERE id = $1', [id]);
    if (!rows[0]) return null;
    
    // Get contacts for this job fair
    const { rows: contactRows } = await db.query(
      'SELECT * FROM job_fair_contacts WHERE job_fair_id = $1 ORDER BY created_at ASC',
      [id]
    );
    
    // Get emails for this job fair
    const { rows: emailRows } = await db.query(
      'SELECT * FROM job_fair_emails WHERE job_fair_id = $1 ORDER BY created_at ASC',
      [id]
    );
    
    return {
      ...rows[0],
      is_rescheduled: rows[0].is_rescheduled || false, // Default to false if column doesn't exist
      contacts: contactRows,
      emails: emailRows
    };
  }

  static async updateJobFair(id: string, jobFairData: Omit<JobFair, 'id' | 'created_at' | 'updated_at' | 'contacts' | 'emails' | 'is_rescheduled'> & { contacts: Omit<JobFairContact, 'id' | 'job_fair_id' | 'created_at' | 'updated_at'>[], emails: Omit<JobFairEmail, 'id' | 'job_fair_id' | 'created_at' | 'updated_at'>[] }): Promise<JobFair | null> {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      // Get the original job fair to check if date changed
      const { rows: originalJobFair } = await client.query('SELECT date FROM job_fairs WHERE id = $1', [id]);
      
      // Check if the date has changed (indicating rescheduling)
      const isRescheduled = originalJobFair[0] && originalJobFair[0].date.getTime() !== new Date(jobFairData.date).getTime();
      
      // Update job fair - handle case where is_rescheduled column might not exist yet
      let rows;
      try {
        const result = await client.query(
          'UPDATE job_fairs SET date = $1, venue = $2, office_head = $3, is_rescheduled = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
          [jobFairData.date, jobFairData.venue, jobFairData.office_head, isRescheduled, id]
        );
        rows = result.rows;
      } catch (error: any) {
        // If is_rescheduled column doesn't exist, try without it
        if (error.message && error.message.includes('is_rescheduled')) {
          const result = await client.query(
            'UPDATE job_fairs SET date = $1, venue = $2, office_head = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
            [jobFairData.date, jobFairData.venue, jobFairData.office_head, id]
          );
          rows = result.rows;
        } else {
          throw error;
        }
      }
      
      if (!rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }
      
      // Delete existing emails and contacts
      await client.query('DELETE FROM job_fair_emails WHERE job_fair_id = $1', [id]);
      await client.query('DELETE FROM job_fair_contacts WHERE job_fair_id = $1', [id]);
      
      // Insert new emails if provided
      if (jobFairData.emails && jobFairData.emails.length > 0) {
        for (const email of jobFairData.emails) {
          await client.query(
            'INSERT INTO job_fair_emails (job_fair_id, email_address) VALUES ($1, $2)',
            [id, email.email_address]
          );
        }
      }
      
      // Insert new contacts if provided
      if (jobFairData.contacts && jobFairData.contacts.length > 0) {
        for (const contact of jobFairData.contacts) {
          await client.query(
            'INSERT INTO job_fair_contacts (job_fair_id, contact_category, contact_number) VALUES ($1, $2, $3)',
            [id, contact.contact_category, contact.contact_number]
          );
        }
      }
      
      await client.query('COMMIT');
      
      // Return updated job fair with contacts
      return await this.getJobFairById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteJobFair(id: string): Promise<JobFair | null> {
    const { rows } = await db.query('UPDATE job_fairs SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *', [id]);
    return rows[0] || null;
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

  static async getJobFairMonitoring(pagination: PaginationOptions & { search?: string } = { page: 1, limit: 10 }): Promise<PaginatedResponse<JobFairMonitoring>> {
    let query = 'SELECT * FROM job_fair_monitoring';
    let countQuery = 'SELECT COUNT(*) FROM job_fair_monitoring';
    const params: any[] = [];
    let paramIndex = 1;

    if (pagination.search && pagination.search.trim()) {
      const searchCondition = `WHERE venue ILIKE $${paramIndex}`;
      query += ` ${searchCondition}`;
      countQuery += ` ${searchCondition}`;
      params.push(`%${pagination.search.trim()}%`);
      paramIndex++;
    }

    query += ` ORDER BY date_of_job_fair DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pagination.limit, (pagination.page - 1) * pagination.limit);

    const { rows } = await db.query(query, params);
    const { rows: countRows } = await db.query(countQuery, params.slice(0, paramIndex - 1));
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

  static async getJobFairMonitoringById(id: string): Promise<JobFairMonitoring | null> {
    const { rows } = await db.query('SELECT * FROM job_fair_monitoring WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async updateJobFairMonitoring(id: string, monitoringData: Omit<JobFairMonitoring, 'id' | 'created_at' | 'updated_at'>): Promise<JobFairMonitoring | null> {
    const { rows } = await db.query(
      'UPDATE job_fair_monitoring SET date_of_job_fair = $1, venue = $2, no_of_invited_agencies = $3, no_of_agencies_with_jfa = $4, male_applicants = $5, female_applicants = $6, total_applicants = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
      [monitoringData.date_of_job_fair, monitoringData.venue, monitoringData.no_of_invited_agencies, monitoringData.no_of_agencies_with_jfa, monitoringData.male_applicants, monitoringData.female_applicants, monitoringData.total_applicants, id]
    );
    return rows[0] || null;
  }

  static async deleteJobFairMonitoring(id: string): Promise<JobFairMonitoring | null> {
    const { rows } = await db.query('DELETE FROM job_fair_monitoring WHERE id = $1 RETURNING *', [id]);
    return rows[0] || null;
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
  static async getDashboardStats(dateFrom?: string, dateTo?: string) {
    const stats = await db.transaction(async (client) => {
      const dateFilterDH = dateFrom && dateTo ? ` AND created_at::date BETWEEN $1::date AND $2::date` : ''
      const dateParamsDH: any[] = []
      if (dateFrom && dateTo) { dateParamsDH.push(dateFrom, dateTo) }

      const [
        directHireCount,
        directHireMaleCount,
        directHireFemaleCount,
        clearanceCount,
        clearanceMaleCount,
        clearanceFemaleCount,
        govToGovCount,
        infoSheetCount,
        pendingUsersCount
      ] = await Promise.all([
        client.query(`SELECT COUNT(*) FROM direct_hire_applications WHERE deleted_at IS NULL${dateFilterDH}`, dateParamsDH),
        client.query(`SELECT COUNT(*) FROM direct_hire_applications WHERE deleted_at IS NULL AND LOWER(sex) = 'male'${dateFilterDH}`, dateParamsDH),
        client.query(`SELECT COUNT(*) FROM direct_hire_applications WHERE deleted_at IS NULL AND LOWER(sex) = 'female'${dateFilterDH}`, dateParamsDH),
        client.query(`SELECT COUNT(*) FROM balik_manggagawa_clearance WHERE deleted_at IS NULL${dateFrom && dateTo ? ' AND created_at::date BETWEEN $1::date AND $2::date' : ''}`, dateFrom && dateTo ? [dateFrom, dateTo] : []),
        client.query(`SELECT COUNT(*) FROM balik_manggagawa_clearance WHERE deleted_at IS NULL AND LOWER(sex) = 'male'${dateFrom && dateTo ? ' AND created_at::date BETWEEN $1::date AND $2::date' : ''}`, dateFrom && dateTo ? [dateFrom, dateTo] : []),
        client.query(`SELECT COUNT(*) FROM balik_manggagawa_clearance WHERE deleted_at IS NULL AND LOWER(sex) = 'female'${dateFrom && dateTo ? ' AND created_at::date BETWEEN $1::date AND $2::date' : ''}`, dateFrom && dateTo ? [dateFrom, dateTo] : []),
        client.query(`SELECT COUNT(*) FROM gov_to_gov_applications${dateFrom && dateTo ? ' WHERE created_at::date BETWEEN $1::date AND $2::date' : ''}`, dateFrom && dateTo ? [dateFrom, dateTo] : []),
        client.query(`SELECT COUNT(*) FROM information_sheet_records${dateFrom && dateTo ? ' WHERE created_at::date BETWEEN $1::date AND $2::date' : ''}`, dateFrom && dateTo ? [dateFrom, dateTo] : []),
        client.query('SELECT COUNT(*) FROM users WHERE is_approved = false')
      ]);

      return {
        directHire: parseInt(directHireCount.rows[0].count),
        directHireMale: parseInt(directHireMaleCount.rows[0].count),
        directHireFemale: parseInt(directHireFemaleCount.rows[0].count),
        clearance: parseInt(clearanceCount.rows[0].count),
        clearanceMale: parseInt(clearanceMaleCount.rows[0].count),
        clearanceFemale: parseInt(clearanceFemaleCount.rows[0].count),
        govToGov: parseInt(govToGovCount.rows[0].count),
        infoSheet: parseInt(infoSheetCount.rows[0].count),
        pendingUsers: parseInt(pendingUsersCount.rows[0].count)
      };
    });

    return stats;
  }

  // Timeline Data for Charts
  static async getTimelineData(months: number = 6) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    
    const timelineData = await db.transaction(async (client) => {
      const labels: string[] = [];
      const directHireData: number[] = [];
      const clearanceData: number[] = [];
      const govToGovData: number[] = [];
      const infoSheetData: number[] = [];

      // Generate labels and data for each month
      for (let i = 0; i < months; i++) {
        const currentDate = new Date(startDate);
        currentDate.setMonth(startDate.getMonth() + i);
        
        const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'short' });
        labels.push(monthLabel);
        
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        // Get counts for each category for this month
        const [
          directHireCount,
          clearanceCount,
          govToGovCount,
          infoSheetCount
        ] = await Promise.all([
          client.query(
            'SELECT COUNT(*) FROM direct_hire_applications WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2',
            [monthStart, monthEnd]
          ),
          client.query(
            'SELECT COUNT(*) FROM balik_manggagawa_clearance WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2',
            [monthStart, monthEnd]
          ),
          client.query(
            'SELECT COUNT(*) FROM gov_to_gov_applications WHERE created_at >= $1 AND created_at <= $2',
            [monthStart, monthEnd]
          ),
          client.query(
            'SELECT COUNT(*) FROM information_sheet_records WHERE created_at >= $1 AND created_at <= $2',
            [monthStart, monthEnd]
          )
        ]);

        directHireData.push(parseInt(directHireCount.rows[0].count));
        clearanceData.push(parseInt(clearanceCount.rows[0].count));
        govToGovData.push(parseInt(govToGovCount.rows[0].count));
        infoSheetData.push(parseInt(infoSheetCount.rows[0].count));
      }

      return {
        labels,
        datasets: [
          {
            label: "Direct Hire",
            data: directHireData,
            borderColor: "#1976D2",
            backgroundColor: "#1976D2"
          },
          {
            label: "Balik Manggagawa",
            data: clearanceData,
            borderColor: "#4CAF50",
            backgroundColor: "#4CAF50"
          },
          {
            label: "Gov to Gov",
            data: govToGovData,
            borderColor: "#FF9800",
            backgroundColor: "#FF9800"
          },
          {
            label: "Information Sheet",
            data: infoSheetData,
            borderColor: "#00BCD4",
            backgroundColor: "#00BCD4"
          }
        ]
      };
    });

    return timelineData;
  }

  // Get last modified time for a table
  static async getTableLastModified(tableName: string): Promise<Date | null> {
    try {
      console.log(`DatabaseService: Getting last modified for table ${tableName}`);
      const { rows } = await db.query(
        'SELECT last_modified_at FROM table_last_modified WHERE table_name = $1',
        [tableName]
      );
      console.log(`DatabaseService: Found ${rows.length} rows for ${tableName}:`, rows[0]);
      return rows[0]?.last_modified_at || null;
    } catch (error) {
      console.error(`Error getting last modified time for table ${tableName}:`, error);
      return null;
    }
  }
}
