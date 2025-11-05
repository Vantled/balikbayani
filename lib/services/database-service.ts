// lib/services/database-service.ts
import { db } from '../database';
import { 
  User, 
  UserPermission,
  PermissionUpdateRequest,
  DirectHireApplication, 
  BalikManggagawaClearance,
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

  static async getUserByEmail(email: string): Promise<User | null> {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
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
    email?: string;
    cellphone?: string;
    sex: 'male' | 'female';
    salary: number;
    status: string;
    jobsite: string;
    position: string;
    job_type: 'household' | 'professional';
    evaluator: string;
    employer: string;
    status_checklist: any;
    salary_currency?: string;
    raw_salary?: number;
  }): Promise<DirectHireApplication> {
    // debug logs removed
    const query = `
      INSERT INTO direct_hire_applications 
      (control_number, name, email, cellphone, sex, salary, status, jobsite, position, job_type, evaluator, employer, status_checklist, salary_currency, raw_salary)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
    
    const values = [
      data.control_number,
      data.name,
      data.email || null,
      data.cellphone || null,
      data.sex,
      data.salary,
      data.status,
      data.jobsite,
      data.position,
      data.job_type,
      data.evaluator,
      data.employer,
      JSON.stringify(data.status_checklist),
      data.salary_currency || 'USD',
      data.raw_salary || data.salary
    ];
    
    // debug logs removed
    
    const { rows } = await db.query(query, values);
    const result = rows[0];
    
    // Parse status_checklist JSONB field
    result.status_checklist = result.status_checklist ? JSON.parse(JSON.stringify(result.status_checklist)) : null;
    
    // debug logs removed
    return result;
  }

  static async getDirectHireApplications(filters: FilterOptions = {}, pagination: PaginationOptions = { page: 1, limit: 10 }): Promise<PaginatedResponse<DirectHireApplication>> {
    // debug logs removed
    let query = 'SELECT * FROM direct_hire_applications WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Deleted filtering is now handled in the comprehensive filter logic below

    // Handle finished/processing filters
    const showFinished = filters.include_finished === true;
    const showProcessing = filters.include_processing === true;
    const showDeleted = filters.include_deleted === true;
    
    // If status filters are active, skip the main toggle logic
    if (!filters.status || filters.status.length === 0) {
      // If only one filter is active, show only that type
      if (showDeleted && !showFinished && !showProcessing) {
        // Show only deleted applications
        query += ' AND deleted_at IS NOT NULL';
      } else if (showFinished && !showDeleted && !showProcessing) {
        // Show only finished applications - check status checklist for completed items
        query += ` AND deleted_at IS NULL 
          AND status_checklist IS NOT NULL 
          AND (status_checklist->'evaluated'->>'checked') = 'true'
          AND (status_checklist->'for_confirmation'->>'checked') = 'true'
          AND (status_checklist->'emailed_to_dhad'->>'checked') = 'true'
          AND (status_checklist->'received_from_dhad'->>'checked') = 'true'
          AND (status_checklist->'for_interview'->>'checked') = 'true'`;
      } else if (showProcessing && !showDeleted && !showFinished) {
        // Show only processing applications - not all checklist items are checked
        query += ` AND deleted_at IS NULL 
          AND (status_checklist IS NULL 
          OR (status_checklist->'evaluated'->>'checked') = 'false'
          OR (status_checklist->'for_confirmation'->>'checked') = 'false'
          OR (status_checklist->'emailed_to_dhad'->>'checked') = 'false'
          OR (status_checklist->'received_from_dhad'->>'checked') = 'false'
          OR (status_checklist->'for_interview'->>'checked') = 'false')`;
      } else if (showDeleted && showFinished && !showProcessing) {
        // Show both deleted and finished
        query += ` AND (deleted_at IS NOT NULL 
          OR (deleted_at IS NULL 
          AND status_checklist IS NOT NULL 
          AND (status_checklist->'evaluated'->>'checked') = 'true'
          AND (status_checklist->'for_confirmation'->>'checked') = 'true'
          AND (status_checklist->'emailed_to_dhad'->>'checked') = 'true'
          AND (status_checklist->'received_from_dhad'->>'checked') = 'true'
          AND (status_checklist->'for_interview'->>'checked') = 'true'))`;
      } else if (showDeleted && showProcessing && !showFinished) {
        // Show both deleted and processing
        query += ` AND (deleted_at IS NOT NULL 
          OR (deleted_at IS NULL 
          AND (status_checklist IS NULL 
          OR (status_checklist->'evaluated'->>'checked') = 'false'
          OR (status_checklist->'for_confirmation'->>'checked') = 'false'
          OR (status_checklist->'emailed_to_dhad'->>'checked') = 'false'
          OR (status_checklist->'received_from_dhad'->>'checked') = 'false'
          OR (status_checklist->'for_interview'->>'checked') = 'false')))`;
      } else if (showFinished && showProcessing && !showDeleted) {
        // Show both finished and processing (but not deleted)
        query += ` AND deleted_at IS NULL`;
      } else if (showDeleted && showFinished && showProcessing) {
        // Show all types
        // No additional filter needed
      } else {
        // Default case: show only processing applications (not deleted, not finished)
        query += ` AND deleted_at IS NULL 
          AND (status_checklist IS NULL 
          OR (status_checklist->'evaluated'->>'checked')::boolean = false
          OR (status_checklist->'for_confirmation'->>'checked')::boolean = false
          OR (status_checklist->'emailed_to_dhad'->>'checked')::boolean = false
          OR (status_checklist->'received_from_dhad'->>'checked')::boolean = false
          OR (status_checklist->'for_interview'->>'checked')::boolean = false)`;
      }
    }

    if (filters.search) {
      query += ` AND (name ILIKE $${paramIndex} OR control_number ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Additional key:value filters parsed from search bar
    if ((filters as any).jobsite) {
      query += ` AND jobsite ILIKE $${paramIndex}`;
      params.push(`%${(filters as any).jobsite}%`);
      paramIndex++;
    }
    if ((filters as any).position) {
      query += ` AND position ILIKE $${paramIndex}`;
      params.push(`%${(filters as any).position}%`);
      paramIndex++;
    }
    if ((filters as any).evaluator) {
      query += ` AND evaluator ILIKE $${paramIndex}`;
      params.push(`%${(filters as any).evaluator}%`);
      paramIndex++;
    }
    if ((filters as any).control_number) {
      query += ` AND control_number ILIKE $${paramIndex}`;
      params.push(`%${(filters as any).control_number}%`);
      paramIndex++;
    }

    // Handle status filters - explicit selections take precedence over main toggles
    if (filters.status && filters.status.length > 0) {
      const statusConditions: string[] = []
      const selectedStatuses = new Set(filters.status)
      const selectedFinished = selectedStatuses.has('finished')
      const selectedDeleted = selectedStatuses.has('deleted')

      for (const status of filters.status) {
        if (status === 'deleted') {
          statusConditions.push('deleted_at IS NOT NULL')
        } else if (status === 'finished') {
          // Finished = all checklist items completed (moved to finished table)
          statusConditions.push(`(status_checklist IS NOT NULL 
            AND (status_checklist->'evaluated'->>'checked') = 'true'
            AND (status_checklist->'for_confirmation'->>'checked') = 'true'
            AND (status_checklist->'emailed_to_dhad'->>'checked') = 'true'
            AND (status_checklist->'received_from_dhad'->>'checked') = 'true'
            AND (status_checklist->'for_interview'->>'checked') = 'true')`)
        } else if (status === 'draft') {
          // Draft as direct status
          statusConditions.push(`status = 'draft'`)
        } else if (status === 'pending') {
          // Pending = status pending and not yet evaluated
          statusConditions.push(`(status = 'pending' AND (status_checklist IS NULL OR (status_checklist->'evaluated'->>'checked') = 'false'))`)
        } else if (['approved', 'rejected'].includes(status)) {
          // Direct status values
          statusConditions.push(`status = '${status}'`)
        } else {
          // Checklist status values
          statusConditions.push(`(status_checklist->'${status}'->>'checked') = 'true'`)
        }
      }
      
      if (statusConditions.length > 0) {
        query += ` AND (${statusConditions.join(' OR ')})`;
        // Exclude deleted rows unless 'deleted' explicitly selected
        if (!selectedDeleted) {
          query += ` AND deleted_at IS NULL`;
        }
        // Exclude finished rows unless 'finished' explicitly selected
        if (!selectedFinished) {
          query += ` AND NOT (status_checklist IS NOT NULL 
            AND (status_checklist->'evaluated'->>'checked') = 'true'
            AND (status_checklist->'for_confirmation'->>'checked') = 'true'
            AND (status_checklist->'emailed_to_dhad'->>'checked') = 'true'
            AND (status_checklist->'received_from_dhad'->>'checked') = 'true'
            AND (status_checklist->'for_interview'->>'checked') = 'true')`;
        }
      }
    } else {
      // Default behavior when no status filter is applied
      if (!showDeleted) {
        query += ` AND deleted_at IS NULL`;
      }
    }

    if (filters.sex) {
      query += ` AND sex = $${paramIndex}`;
      params.push(filters.sex);
      // debug logs removed
      paramIndex++;
    }

    if ((filters as any).date_from) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push((filters as any).date_from);
      paramIndex++;
    }

    if ((filters as any).date_to) {
      // Make end date inclusive (end of day)
      query += ` AND created_at <= ($${paramIndex}::date + INTERVAL '1 day' - INTERVAL '1 millisecond')`;
      params.push((filters as any).date_to);
      paramIndex++;
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const { rows: countRows } = await db.query(countQuery, params);
    const total = parseInt(countRows[0].count);

    // Add pagination and ordering
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pagination.limit, (pagination.page - 1) * pagination.limit);

    // debug logs removed
    
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
    if ((updateData as any).email !== undefined) { fields.push(`email = $${paramCount++}`); values.push((updateData as any).email); }
    if ((updateData as any).cellphone !== undefined) { fields.push(`cellphone = $${paramCount++}`); values.push((updateData as any).cellphone); }
    if (updateData.sex !== undefined) { fields.push(`sex = $${paramCount++}`); values.push(updateData.sex); }
    if (updateData.salary !== undefined) { fields.push(`salary = $${paramCount++}`); values.push(updateData.salary); }
    if ((updateData as any).raw_salary !== undefined) { fields.push(`raw_salary = $${paramCount++}`); values.push((updateData as any).raw_salary); }
    if ((updateData as any).salary_currency !== undefined) { fields.push(`salary_currency = $${paramCount++}`); values.push((updateData as any).salary_currency); }
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

    let rowsResult;
    try {
      const { rows } = await db.query(query, values);
      rowsResult = rows;
    } catch (err: any) {
      // If columns do not exist yet (older DBs), add them and retry once
      if (err && err.code === '42703') {
        try {
          await db.query(`ALTER TABLE direct_hire_applications ADD COLUMN IF NOT EXISTS email VARCHAR(255);`);
          await db.query(`ALTER TABLE direct_hire_applications ADD COLUMN IF NOT EXISTS cellphone VARCHAR(20);`);
          const { rows } = await db.query(query, values);
          rowsResult = rows;
        } catch (err2) {
          throw err2;
        }
      } else {
        throw err;
      }
    }
    if (!rowsResult || rowsResult.length === 0) return null;

    const result = rowsResult[0];
    result.status_checklist = result.status_checklist ? JSON.parse(JSON.stringify(result.status_checklist)) : null;
    return result;
  }

  static async deleteDirectHireApplication(id: string): Promise<boolean> {
    const { rowCount } = await db.query('UPDATE direct_hire_applications SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [id]);
    return (rowCount || 0) > 0;
  }

  static async permanentlyDeleteDirectHireApplication(id: string): Promise<boolean> {
    // First delete related documents
    await db.query('DELETE FROM documents WHERE application_id = $1 AND application_type = $2', [id, 'direct_hire']);
    
    // Then permanently delete the application
    const { rowCount } = await db.query('DELETE FROM direct_hire_applications WHERE id = $1', [id]);
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
    clearanceType?: string | null;
    rawSalary?: number | null;
    salaryCurrency?: string | null;
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
    let monthlyRows, yearlyRows;
    if (clearanceData.clearanceType) {
      ({ rows: monthlyRows } = await db.query(
        `SELECT COUNT(*)
         FROM balik_manggagawa_clearance
         WHERE clearance_type = $1
           AND EXTRACT(YEAR FROM created_at) = $2
           AND EXTRACT(MONTH FROM created_at) = $3`,
        [clearanceData.clearanceType, year, parseInt(month)]
      ));
      ({ rows: yearlyRows } = await db.query(
        `SELECT COUNT(*)
         FROM balik_manggagawa_clearance
         WHERE clearance_type = $1
           AND EXTRACT(YEAR FROM created_at) = $2`,
        [clearanceData.clearanceType, year]
      ));
    } else {
      ({ rows: monthlyRows } = await db.query(
        `SELECT COUNT(*)
         FROM balik_manggagawa_clearance
         WHERE clearance_type IS NULL
           AND EXTRACT(YEAR FROM created_at) = $1
           AND EXTRACT(MONTH FROM created_at) = $2`,
        [year, parseInt(month)]
      ));
      ({ rows: yearlyRows } = await db.query(
        `SELECT COUNT(*)
         FROM balik_manggagawa_clearance
         WHERE clearance_type IS NULL
           AND EXTRACT(YEAR FROM created_at) = $1`,
        [year]
      ));
    }
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
    
    const insertSql = `
      INSERT INTO balik_manggagawa_clearance (
        control_number, name_of_worker, sex, employer, destination, salary, clearance_type,
        raw_salary, salary_currency,
        position, months_years, with_principal, new_principal_name, employment_duration,
        date_arrival, date_departure, place_date_employment, date_blacklisting,
        total_deployed_ofws, reason_blacklisting, years_with_principal, employment_start_date, processing_date, remarks,
        no_of_months_years, date_of_departure, active_email_address, active_ph_mobile_number, evaluator
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,
        $10,$11,$12,$13,$14,
        $15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,
        $25,$26,$27,$28,$29
      ) RETURNING *`;
    const insertParams = [
      controlNumber, clearanceData.nameOfWorker, clearanceData.sex, clearanceData.employer, clearanceData.destination, clearanceData.salary, (clearanceData.clearanceType ?? null),
      (clearanceData.rawSalary ?? clearanceData.salary ?? null), (clearanceData.salaryCurrency ?? null),
      clearanceData.position ?? null, clearanceData.monthsYears ?? null, clearanceData.withPrincipal ?? null, clearanceData.newPrincipalName ?? null, clearanceData.employmentDuration ?? null,
      clearanceData.dateArrival ?? null, clearanceData.dateDeparture ?? null, clearanceData.placeDateEmployment ?? null, clearanceData.dateBlacklisting ?? null,
      clearanceData.totalDeployedOfws ?? null, clearanceData.reasonBlacklisting ?? null, clearanceData.yearsWithPrincipal ?? null, clearanceData.employmentStartDate ?? null, clearanceData.processingDate ?? null, clearanceData.remarks ?? null,
      clearanceData.noOfMonthsYears ?? null, clearanceData.dateOfDeparture ?? null, clearanceData.activeEmailAddress ?? null, clearanceData.activePhMobileNumber ?? null, clearanceData.evaluator ?? null
    ];

    let rows;
    try {
      ({ rows } = await db.query(insertSql, insertParams));
    } catch (err: any) {
      if (err && err.code === '42703') {
        // Missing columns - add them and retry once
        await db.query(`ALTER TABLE balik_manggagawa_clearance ADD COLUMN IF NOT EXISTS raw_salary DECIMAL(12,2)`);
        await db.query(`ALTER TABLE balik_manggagawa_clearance ADD COLUMN IF NOT EXISTS salary_currency VARCHAR(10)`);
        ({ rows } = await db.query(insertSql, insertParams));
      } else {
        throw err;
      }
    }
    // Default newly created BM application to For Approval
    if (rows[0]?.id) {
      try {
        await db.query('UPDATE balik_manggagawa_clearance SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['for_approval', rows[0].id])
        const { rows: updated } = await db.query('SELECT * FROM balik_manggagawa_clearance WHERE id = $1', [rows[0].id])
        return updated[0] || rows[0]
      } catch {
        // Fallback to original row if update fails
        return rows[0]
      }
    }
    return rows[0];
  }

  static async getBalikManggagawaClearances(filters: {
    page: number;
    limit: number;
    search?: string;
    clearanceType?: string;
    sex?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    jobsite?: string;
    position?: string;
    include_deleted?: boolean;
    show_deleted_only?: boolean;
  }): Promise<PaginatedResponse<BalikManggagawaClearance>> {
    let query = `
      SELECT c.*
      FROM balik_manggagawa_clearance c
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

    if (filters.status) {
      const statuses = String(filters.status).split(',').filter(Boolean)
      if (statuses.length > 0) {
        query += ` AND c.status = ANY($${paramIndex}::text[])`;
        params.push(statuses);
        paramIndex++;
      }
    }

    if (filters.dateFrom && filters.dateTo) {
      query += ` AND c.created_at::date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(filters.dateFrom, filters.dateTo);
      paramIndex += 2;
    }

    if (filters.jobsite) {
      query += ` AND c.destination ILIKE $${paramIndex}`;
      params.push(`%${filters.jobsite}%`);
      paramIndex++;
    }

    if (filters.position) {
      query += ` AND c.position ILIKE $${paramIndex}`;
      params.push(`%${filters.position}%`);
      paramIndex++;
    }

    // Only show clearances that are completed (have documents_completed = true) or don't have processing records
    // Temporarily commented out to debug pagination
    // query += ` AND (p.documents_completed = true OR p.documents_completed IS NULL)`;


    // Get total count - use a simpler count query
    let countQuery = `SELECT COUNT(*) FROM balik_manggagawa_clearance c WHERE 1=1`;
    const countParams: any[] = [];
    let countParamIndex = 1;

    // Handle deleted records logic for count
    if (filters.show_deleted_only) {
      countQuery += ' AND c.deleted_at IS NOT NULL';
    } else if (!filters.include_deleted) {
      countQuery += ' AND c.deleted_at IS NULL';
    }

    if (filters.search) {
      countQuery += ` AND (c.name_of_worker ILIKE $${countParamIndex} OR c.control_number ILIKE $${countParamIndex} OR c.employer ILIKE $${countParamIndex} OR c.destination ILIKE $${countParamIndex})`;
      countParams.push(`%${filters.search}%`);
      countParamIndex++;
    }

    if (filters.clearanceType) {
      const types = String(filters.clearanceType).split(',').filter(Boolean)
      if (types.length > 0) {
        countQuery += ` AND c.clearance_type = ANY($${countParamIndex}::text[])`;
        countParams.push(types);
        countParamIndex++;
      }
    }

    if (filters.sex) {
      const sexes = String(filters.sex).split(',').filter(Boolean)
      if (sexes.length > 0) {
        countQuery += ` AND c.sex = ANY($${countParamIndex}::text[])`;
        countParams.push(sexes);
        countParamIndex++;
      }
    }

    if (filters.status) {
      const statuses = String(filters.status).split(',').filter(Boolean)
      if (statuses.length > 0) {
        countQuery += ` AND c.status = ANY($${countParamIndex}::text[])`;
        countParams.push(statuses);
        countParamIndex++;
      }
    }

    if (filters.dateFrom && filters.dateTo) {
      countQuery += ` AND c.created_at::date BETWEEN $${countParamIndex} AND $${countParamIndex + 1}`;
      countParams.push(filters.dateFrom, filters.dateTo);
      countParamIndex += 2;
    }

    if (filters.jobsite) {
      countQuery += ` AND c.destination ILIKE $${countParamIndex}`;
      countParams.push(`%${filters.jobsite}%`);
      countParamIndex++;
    }

    if (filters.position) {
      countQuery += ` AND c.position ILIKE $${countParamIndex}`;
      countParams.push(`%${filters.position}%`);
      countParamIndex++;
    }
    const { rows: countRows } = await db.query(countQuery, countParams);
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
      SELECT c.*
      FROM balik_manggagawa_clearance c
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
    rawSalary?: number | null;
    salaryCurrency?: string | null;
    jobType?: string | null;
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
    try {
      const { rows } = await db.query(
        `UPDATE balik_manggagawa_clearance SET
          name_of_worker = $1, sex = $2, employer = $3, destination = $4, salary = $5, raw_salary = $6, salary_currency = $7, job_type = $8, clearance_type = $9,
          position = $10, months_years = $11, with_principal = $12, new_principal_name = $13, employment_duration = $14,
          date_arrival = $15, date_departure = $16, place_date_employment = $17, date_blacklisting = $18,
          total_deployed_ofws = $19, reason_blacklisting = $20, years_with_principal = $21, remarks = $22
         WHERE id = $23 RETURNING *`,
        [
          clearanceData.nameOfWorker, clearanceData.sex, clearanceData.employer, clearanceData.destination, clearanceData.salary, clearanceData.rawSalary ?? null, clearanceData.salaryCurrency ?? null, clearanceData.jobType ?? null, clearanceData.clearanceType,
          clearanceData.position ?? null, clearanceData.monthsYears ?? null, clearanceData.withPrincipal ?? null, clearanceData.newPrincipalName ?? null, clearanceData.employmentDuration ?? null,
          clearanceData.dateArrival ?? null, clearanceData.dateDeparture ?? null, clearanceData.placeDateEmployment ?? null, clearanceData.dateBlacklisting ?? null,
          clearanceData.totalDeployedOfws ?? null, clearanceData.reasonBlacklisting ?? null, clearanceData.yearsWithPrincipal ?? null, clearanceData.remarks ?? null,
          id
        ]
      );
      return rows[0] || null;
    } catch (error: any) {
      // If job_type column doesn't exist, try without it
      if (error.code === '42703' && error.message.includes('job_type')) {
        console.log('job_type column not found, adding it dynamically...');
        try {
          // Add the column
          await db.query(`
            ALTER TABLE balik_manggagawa_clearance
            ADD COLUMN IF NOT EXISTS job_type VARCHAR(20)
          `);
          
          // Add constraint (check if it exists first)
          try {
            await db.query(`
              ALTER TABLE balik_manggagawa_clearance
              ADD CONSTRAINT balik_manggagawa_clearance_job_type_check
              CHECK (job_type IN ('professional', 'household') OR job_type IS NULL)
            `);
          } catch (constraintError: any) {
            // Constraint might already exist, ignore the error
            if (!constraintError.message.includes('already exists')) {
              throw constraintError;
            }
          }
          
          // Retry the original query
          const { rows } = await db.query(
            `UPDATE balik_manggagawa_clearance SET
              name_of_worker = $1, sex = $2, employer = $3, destination = $4, salary = $5, raw_salary = $6, salary_currency = $7, job_type = $8, clearance_type = $9,
              position = $10, months_years = $11, with_principal = $12, new_principal_name = $13, employment_duration = $14,
              date_arrival = $15, date_departure = $16, place_date_employment = $17, date_blacklisting = $18,
              total_deployed_ofws = $19, reason_blacklisting = $20, years_with_principal = $21, remarks = $22
             WHERE id = $23 RETURNING *`,
            [
              clearanceData.nameOfWorker, clearanceData.sex, clearanceData.employer, clearanceData.destination, clearanceData.salary, clearanceData.rawSalary ?? null, clearanceData.salaryCurrency ?? null, clearanceData.jobType ?? null, clearanceData.clearanceType,
              clearanceData.position ?? null, clearanceData.monthsYears ?? null, clearanceData.withPrincipal ?? null, clearanceData.newPrincipalName ?? null, clearanceData.employmentDuration ?? null,
              clearanceData.dateArrival ?? null, clearanceData.dateDeparture ?? null, clearanceData.placeDateEmployment ?? null, clearanceData.dateBlacklisting ?? null,
              clearanceData.totalDeployedOfws ?? null, clearanceData.reasonBlacklisting ?? null, clearanceData.yearsWithPrincipal ?? null, clearanceData.remarks ?? null,
              id
            ]
          );
          return rows[0] || null;
        } catch (retryError) {
          console.error('Failed to add job_type column:', retryError);
          throw retryError;
        }
      }
      throw error;
    }
  }

  static async updateBalikManggagawaStatus(
    id: string,
    data: {
      status?: string | null;
      clearanceType?: string | null;
      newPrincipalName?: string | null;
      employmentDuration?: string | null;
      dateArrival?: string | null;
      dateDeparture?: string | null;
      remarks?: string | null;
      monthsYears?: string | null;
      employmentStartDate?: string | null;
      processingDate?: string | null;
      placeDateEmployment?: string | null;
      totalDeployedOfws?: string | null;
      dateBlacklisting?: string | null;
      reasonBlacklisting?: string | null;
      yearsWithPrincipal?: string | null;
      activeEmailAddress?: string | null;
      activePhMobileNumber?: string | null;
    }
  ): Promise<BalikManggagawaClearance | null> {
    // Build dynamic set parts for flexible updates
    const setParts: string[] = []
    const values: any[] = []
    let idx = 1
    if (data.status !== undefined) { setParts.push(`status = $${idx++}`); values.push(data.status) }
    if (data.clearanceType !== undefined) { setParts.push(`clearance_type = $${idx++}`); values.push(data.clearanceType) }
    if (data.newPrincipalName !== undefined) { setParts.push(`new_principal_name = $${idx++}`); values.push(data.newPrincipalName) }
    if (data.employmentDuration !== undefined) { setParts.push(`employment_duration = $${idx++}`); values.push(data.employmentDuration) }
    if (data.dateArrival !== undefined) { setParts.push(`date_arrival = $${idx++}`); values.push(data.dateArrival) }
    if (data.dateDeparture !== undefined) { setParts.push(`date_departure = $${idx++}`); values.push(data.dateDeparture) }
    if (data.remarks !== undefined) { setParts.push(`remarks = $${idx++}`); values.push(data.remarks) }
    if (data.monthsYears !== undefined) { setParts.push(`months_years = $${idx++}`); values.push(data.monthsYears) }
    if (data.employmentStartDate !== undefined) { setParts.push(`employment_start_date = $${idx++}`); values.push(data.employmentStartDate) }
    if (data.processingDate !== undefined) { setParts.push(`processing_date = $${idx++}`); values.push(data.processingDate) }
    if (data.placeDateEmployment !== undefined) { setParts.push(`place_date_employment = $${idx++}`); values.push(data.placeDateEmployment) }
    if (data.totalDeployedOfws !== undefined) { setParts.push(`total_deployed_ofws = $${idx++}`); values.push(data.totalDeployedOfws) }
    if (data.dateBlacklisting !== undefined) { setParts.push(`date_blacklisting = $${idx++}`); values.push(data.dateBlacklisting) }
    if (data.reasonBlacklisting !== undefined) { setParts.push(`reason_blacklisting = $${idx++}`); values.push(data.reasonBlacklisting) }
    if (data.yearsWithPrincipal !== undefined) { setParts.push(`years_with_principal = $${idx++}`); values.push(data.yearsWithPrincipal) }
    if (data.activeEmailAddress !== undefined) { setParts.push(`active_email_address = $${idx++}`); values.push(data.activeEmailAddress) }
    if (data.activePhMobileNumber !== undefined) { setParts.push(`active_ph_mobile_number = $${idx++}`); values.push(data.activePhMobileNumber) }
    if (setParts.length === 0) return await this.getBalikManggagawaClearanceById(id)
    setParts.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)
    const query = `UPDATE balik_manggagawa_clearance SET ${setParts.join(', ')} WHERE id = $${idx} RETURNING *`
    const { rows } = await db.query(query, values)
    return rows[0] || null
  }

  static async deleteBalikManggagawaClearance(id: string): Promise<boolean> {
    const { rowCount } = await db.query('UPDATE balik_manggagawa_clearance SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [id]);
    return (rowCount || 0) > 0;
  }

  static async restoreBalikManggagawaClearance(id: string): Promise<boolean> {
    const { rowCount } = await db.query('UPDATE balik_manggagawa_clearance SET deleted_at = NULL WHERE id = $1', [id]);
    return (rowCount || 0) > 0;
  }

  static async permanentlyDeleteBalikManggagawaClearance(id: string): Promise<boolean> {
    // First delete related documents
    await db.query('DELETE FROM documents WHERE application_id = $1 AND application_type = $2', [id, 'balik_manggagawa']);
    
    // Then permanently delete the clearance
    const { rowCount } = await db.query('DELETE FROM balik_manggagawa_clearance WHERE id = $1', [id]);
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

  // Gov to Gov Applications
  static async createGovToGovApplication(appData: Omit<GovToGovApplication, 'id' | 'created_at' | 'updated_at'>): Promise<GovToGovApplication> {
    const { rows } = await db.query(
      `INSERT INTO gov_to_gov_applications (
        last_name, first_name, middle_name, sex, date_of_birth, age, height, weight,
        educational_attainment, present_address, email_address, contact_number,
        passport_number, passport_validity, id_presented, id_number,
        with_taiwan_work_experience, with_job_experience,
        taiwan_company, taiwan_year_started, taiwan_year_ended,
        other_company, other_year_started, other_year_ended,
        date_received_by_region, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26) RETURNING *`,
      [
        appData.last_name, appData.first_name, appData.middle_name, appData.sex,
        appData.date_of_birth, appData.age, appData.height, appData.weight,
        appData.educational_attainment, appData.present_address, appData.email_address,
        appData.contact_number, appData.passport_number, appData.passport_validity,
        appData.id_presented, appData.id_number, appData.with_taiwan_work_experience,
        appData.with_job_experience,
        (appData as any).taiwan_company || null, (appData as any).taiwan_year_started || null, (appData as any).taiwan_year_ended || null,
        (appData as any).other_company || null, (appData as any).other_year_started || null, (appData as any).other_year_ended || null,
        (appData as any).date_received_by_region ? new Date((appData as any).date_received_by_region) : null,
        (appData as any).remarks || null
      ]
    );
    return rows[0];
  }

  static async getGovToGovApplications(filters: FilterOptions = {}, pagination: PaginationOptions = { page: 1, limit: 10 }): Promise<PaginatedResponse<GovToGovApplication>> {
    let query = 'SELECT * FROM gov_to_gov_applications WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Handle soft delete filtering
    if (filters.include_active === false && filters.include_deleted === false) {
      // Show nothing when both are false
      query += ` AND 1=0`; // This will return no results
    } else if (filters.include_active === false) {
      // Show only deleted records when include_active is false (regardless of include_deleted)
      query += ` AND deleted_at IS NOT NULL`;
    } else if (filters.include_deleted === true) {
      // Show all records (including deleted) when include_deleted is true
    } else {
      // Default: show only active records (not deleted)
      query += ` AND deleted_at IS NULL`;
    }

    if (filters.search) {
      const searchTerm = filters.search.trim();
      
      // Check if search term contains key:value pattern
      if (searchTerm.includes(':')) {
        const [key, value] = searchTerm.split(':', 2);
        const fieldKey = key.trim().toLowerCase();
        const searchValue = value.trim();
        
        // Map field keys to database columns
        const fieldMap: Record<string, string> = {
          'name': 'CONCAT(last_name, \' \', first_name, \' \', COALESCE(middle_name, \'\'))',
          'firstname': 'first_name',
          'lastname': 'last_name',
          'email': 'email_address',
          'contact': 'contact_number',
          'passport': 'passport_number',
          'sex': 'sex',
          'education': 'educational_attainment',
          'address': 'present_address',
          'id': 'id_number',
          'idpresented': 'id_presented',
          'company': 'taiwan_company',
          'taiwancompany': 'taiwan_company',
          'othercompany': 'other_company',
          'remarks': 'remarks'
        };
        
        const dbField = fieldMap[fieldKey];
        if (dbField) {
          // Special handling for sex field - use exact match
          if (fieldKey === 'sex') {
            query += ` AND ${dbField} = $${paramIndex}`;
            params.push(searchValue.toLowerCase());
          } else if (fieldKey === 'name') {
            // Special handling for name - search across concatenated name fields
            query += ` AND ${dbField} ILIKE $${paramIndex}`;
            params.push(`%${searchValue}%`);
          } else {
            // Default ILIKE search for other fields
            query += ` AND ${dbField} ILIKE $${paramIndex}`;
            params.push(`%${searchValue}%`);
          }
          paramIndex++;
        } else {
          // If key is not recognized, fall back to general search
          query += ` AND (last_name ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex})`;
          params.push(`%${searchTerm}%`);
          paramIndex++;
        }
      } else {
        // General search across name fields
        query += ` AND (last_name ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex})`;
        params.push(`%${searchTerm}%`);
        paramIndex++;
      }
    }

    if (filters.sex) {
      query += ` AND sex = $${paramIndex}`;
      params.push(filters.sex);
      paramIndex++;
    }

    if (filters.educational_attainment) {
      query += ` AND educational_attainment = $${paramIndex}`;
      params.push(filters.educational_attainment);
      paramIndex++;
    }

    if (filters.with_taiwan_work_experience !== undefined) {
      query += ` AND with_taiwan_work_experience = $${paramIndex}`;
      params.push(filters.with_taiwan_work_experience);
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

  static async updateGovToGovApplication(id: string, appData: Partial<Omit<GovToGovApplication, 'id' | 'created_at' | 'updated_at'>>): Promise<GovToGovApplication | null> {
    // Update a fixed set of known columns; values may be null-safe where allowed by schema
    const columns = [
      'last_name','first_name','middle_name','sex','date_of_birth','age','height','weight',
      'educational_attainment','present_address','email_address','contact_number',
      'passport_number','passport_validity','id_presented','id_number',
      'with_taiwan_work_experience','with_job_experience',
      'taiwan_company','taiwan_year_started','taiwan_year_ended',
      'other_company','other_year_started','other_year_ended',
      'date_received_by_region','date_card_released','remarks'
    ] as const
    const sets: string[] = []
    const params: any[] = []
    let idx = 1
    for (const col of columns) {
      if (col in appData) {
        sets.push(`${col} = $${idx++}`)
        // @ts-expect-error index
        params.push((appData as any)[col])
      }
    }
    if (sets.length === 0) return await (async () => {
      const { rows } = await db.query('SELECT * FROM gov_to_gov_applications WHERE id = $1', [id])
      return rows[0] || null
    })()
    params.push(id)
    const { rows } = await db.query(
      `UPDATE gov_to_gov_applications SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      params
    )
    return rows[0] || null
  }

  static async deleteGovToGovApplication(id: string): Promise<boolean> {
    const res = await db.query('DELETE FROM gov_to_gov_applications WHERE id = $1', [id])
    return (res.rowCount || 0) > 0
  }

  static async softDeleteGovToGovApplication(id: string): Promise<GovToGovApplication | null> {
    const { rows } = await db.query(
      'UPDATE gov_to_gov_applications SET deleted_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return rows[0] || null;
  }

  static async restoreGovToGovApplication(id: string): Promise<GovToGovApplication | null> {
    const { rows } = await db.query(
      'UPDATE gov_to_gov_applications SET deleted_at = NULL WHERE id = $1 RETURNING *',
      [id]
    );
    return rows[0] || null;
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

    // Soft-delete visibility handling
    const includeDeleted = (filters as any).include_deleted === true;
    const includeActive = (filters as any).include_active !== false; // default true
    // Cases:
    // 1) include_deleted && include_active => show all (no filter)
    // 2) include_deleted && !include_active => only deleted
    // 3) !include_deleted && include_active => only active
    // 4) !include_deleted && !include_active => only active (sane default)
    if (includeDeleted && !includeActive) {
      query += ' AND deleted_at IS NOT NULL';
    } else if (!includeDeleted) {
      query += ' AND deleted_at IS NULL';
    }

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

    if ((filters as any).sex) {
      query += ` AND gender = $${paramIndex}`;
      params.push((filters as any).sex);
      paramIndex++;
    }

    if ((filters as any).jobsite) {
      query += ` AND jobsite ILIKE $${paramIndex}`;
      params.push(`%${(filters as any).jobsite}%`);
      paramIndex++;
    }

    if ((filters as any).requested_record) {
      query += ` AND requested_record = $${paramIndex}`;
      params.push((filters as any).requested_record);
      paramIndex++;
    }

    if ((filters as any).date_from) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push((filters as any).date_from);
      paramIndex++;
    }

    if ((filters as any).date_to) {
      query += ` AND created_at <= ($${paramIndex}::date + INTERVAL '1 day' - INTERVAL '1 millisecond')`;
      params.push((filters as any).date_to);
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

  static async softDeleteInformationSheetRecord(id: string): Promise<InformationSheetRecord | null> {
    const { rows } = await db.query(
      'UPDATE information_sheet_records SET deleted_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return rows[0] || null;
  }

  static async restoreInformationSheetRecord(id: string): Promise<InformationSheetRecord | null> {
    const { rows } = await db.query(
      'UPDATE information_sheet_records SET deleted_at = NULL WHERE id = $1 RETURNING *',
      [id]
    );
    return rows[0] || null;
  }

  static async getInformationSheetRecordById(id: string): Promise<InformationSheetRecord | null> {
    const { rows } = await db.query('SELECT * FROM information_sheet_records WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async updateInformationSheetRecord(
    id: string,
    updates: Partial<Omit<InformationSheetRecord, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<InformationSheetRecord | null> {
    const keys = Object.keys(updates);
    if (!keys.length) return await this.getInformationSheetRecordById(id);
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = keys.map(k => (updates as any)[k]);
    const { rows } = await db.query(
      `UPDATE information_sheet_records SET ${setClauses}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    return rows[0] || null;
  }

  static async deleteInformationSheetRecord(id: string): Promise<InformationSheetRecord | null> {
    const { rows } = await db.query('DELETE FROM information_sheet_records WHERE id = $1 RETURNING *', [id]);
    return rows[0] || null;
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

  static async restoreJobFair(id: string): Promise<boolean> {
    const { rowCount } = await db.query('UPDATE job_fairs SET deleted_at = NULL WHERE id = $1', [id]);
    return (rowCount || 0) > 0;
  }

  static async getPastJobFairs(pagination: PaginationOptions & { search?: string } = { page: 1, limit: 50 }): Promise<PaginatedResponse<JobFair>> {
    let query = 'SELECT * FROM job_fairs';
    let countQuery = 'SELECT COUNT(*) FROM job_fairs';
    const params: any[] = [];
    let paramIndex = 1;

    // Only get job fairs that are in the past and not deleted
    let whereConditions: string[] = ['date < CURRENT_DATE', 'deleted_at IS NULL'];

    if (pagination.search && pagination.search.trim()) {
      whereConditions.push(`(venue ILIKE $${paramIndex} OR office_head ILIKE $${paramIndex})`);
      params.push(`%${pagination.search.trim()}%`);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    query += ` ${whereClause}`;
    countQuery += ` ${whereClause}`;

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

  // PESO Contacts
  static async createPesoContact(contactData: Omit<PesoContact, 'id' | 'created_at' | 'updated_at'>): Promise<PesoContact> {
    const { rows } = await db.query(
      'INSERT INTO peso_contacts (province, peso_office, office_head, email, contact_number, emails, contacts) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [
        contactData.province, 
        contactData.peso_office, 
        contactData.office_head, 
        contactData.email, 
        contactData.contact_number,
        JSON.stringify(contactData.emails || []),
        JSON.stringify(contactData.contacts || [])
      ]
    );
    return rows[0];
  }

  static async getPesoContacts(pagination: PaginationOptions & { search?: string } = { page: 1, limit: 10 }): Promise<PaginatedResponse<PesoContact>> {
    let query = 'SELECT * FROM peso_contacts';
    let countQuery = 'SELECT COUNT(*) FROM peso_contacts';
    const params: any[] = [];
    let paramIndex = 1;

    if (pagination.search && pagination.search.trim()) {
      // Parse search for key:value filters
      const searchTokens = pagination.search.split(/[\s,]+/).filter(Boolean);
      const conditions: string[] = [];
      
      for (const token of searchTokens) {
        const match = token.match(/^([a-z_]+):(.*)$/i);
        if (match && match[2] !== '') {
          // Key:value filter
          const key = match[1].toLowerCase();
          const value = match[2].toLowerCase();
          
          switch (key) {
            case 'province':
              conditions.push(`province ILIKE $${paramIndex}`);
              params.push(`%${value}%`);
              paramIndex++;
              break;
            case 'peso_office':
              conditions.push(`peso_office ILIKE $${paramIndex}`);
              params.push(`%${value}%`);
              paramIndex++;
              break;
            case 'office_head':
              conditions.push(`office_head ILIKE $${paramIndex}`);
              params.push(`%${value}%`);
              paramIndex++;
              break;
            case 'email':
              conditions.push(`email ILIKE $${paramIndex}`);
              params.push(`%${value}%`);
              paramIndex++;
              break;
            case 'contact_number':
              conditions.push(`contact_number ILIKE $${paramIndex}`);
              params.push(`%${value}%`);
              paramIndex++;
              break;
          }
        } else {
          // Free text search across all fields
          conditions.push(`(province ILIKE $${paramIndex} OR peso_office ILIKE $${paramIndex} OR office_head ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR contact_number ILIKE $${paramIndex})`);
          params.push(`%${token.toLowerCase()}%`);
          paramIndex++;
        }
      }
      
      if (conditions.length > 0) {
        const searchCondition = `WHERE ${conditions.join(' AND ')}`;
        query += ` ${searchCondition}`;
        countQuery += ` ${searchCondition}`;
      }
    }

    query += ` ORDER BY province ASC, peso_office ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const limitParam = pagination.limit;
    const offsetParam = (pagination.page - 1) * pagination.limit;
    params.push(limitParam, offsetParam);

    const { rows } = await db.query(query, params);
    const { rows: countRows } = await db.query(countQuery, params.slice(0, paramIndex - 1));
    const total = parseInt(countRows[0].count);

    // Parse JSON fields for emails and contacts
    const parsedRows = rows.map(row => ({
      ...row,
      emails: row.emails || [],
      contacts: row.contacts || []
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

  static async getPesoContactById(id: string): Promise<PesoContact | null> {
    const { rows } = await db.query('SELECT * FROM peso_contacts WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async updatePesoContact(id: string, contactData: Partial<PesoContact>): Promise<PesoContact | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic query based on provided fields
    if (contactData.province !== undefined) { fields.push(`province = $${paramCount++}`); values.push(contactData.province); }
    if (contactData.peso_office !== undefined) { fields.push(`peso_office = $${paramCount++}`); values.push(contactData.peso_office); }
    if (contactData.office_head !== undefined) { fields.push(`office_head = $${paramCount++}`); values.push(contactData.office_head); }
    if (contactData.email !== undefined) { fields.push(`email = $${paramCount++}`); values.push(contactData.email); }
    if (contactData.contact_number !== undefined) { fields.push(`contact_number = $${paramCount++}`); values.push(contactData.contact_number); }
    if (contactData.emails !== undefined) { fields.push(`emails = $${paramCount++}`); values.push(JSON.stringify(contactData.emails)); }
    if (contactData.contacts !== undefined) { fields.push(`contacts = $${paramCount++}`); values.push(JSON.stringify(contactData.contacts)); }

    if (fields.length === 0) { return null; }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE peso_contacts 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const { rows } = await db.query(query, values);
    return rows[0] || null;
  }

  static async deletePesoContact(id: string): Promise<boolean> {
    const { rowCount } = await db.query('DELETE FROM peso_contacts WHERE id = $1', [id]);
    return (rowCount || 0) > 0;
  }

  // PRA Contacts
  static async createPraContact(contactData: Omit<PraContact, 'id' | 'created_at' | 'updated_at'>): Promise<PraContact> {
    const { rows } = await db.query(
      'INSERT INTO pra_contacts (name_of_pras, pra_contact_person, office_head, email, contact_number, emails, contacts) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [
        contactData.name_of_pras, 
        contactData.pra_contact_person, 
        contactData.office_head, 
        contactData.email, 
        contactData.contact_number,
        JSON.stringify(contactData.emails || []),
        JSON.stringify(contactData.contacts || [])
      ]
    );
    return rows[0];
  }

  static async getPraContacts(pagination: PaginationOptions & { search?: string; showDeletedOnly?: boolean } = { page: 1, limit: 10 }): Promise<PaginatedResponse<PraContact>> {
    let query = 'SELECT * FROM pra_contacts';
    let countQuery = 'SELECT COUNT(*) FROM pra_contacts';
    const params: any[] = [];
    let paramIndex = 1;

    // Handle soft delete filtering
    if (pagination.showDeletedOnly) {
      query += ` WHERE deleted_at IS NOT NULL`;
      countQuery += ` WHERE deleted_at IS NOT NULL`;
    } else {
      query += ` WHERE deleted_at IS NULL`;
      countQuery += ` WHERE deleted_at IS NULL`;
    }

    if (pagination.search && pagination.search.trim()) {
      const searchCondition = `AND (name_of_pras ILIKE $${paramIndex} OR pra_contact_person ILIKE $${paramIndex} OR office_head ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      query += ` ${searchCondition}`;
      countQuery += ` ${searchCondition}`;
      params.push(`%${pagination.search.trim()}%`);
      paramIndex++;
    }

    query += ` ORDER BY name_of_pras ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pagination.limit, (pagination.page - 1) * pagination.limit);

    const { rows } = await db.query(query, params);
    const { rows: countRows } = await db.query(countQuery, params.slice(0, paramIndex - 1));
    const total = parseInt(countRows[0].count);

    // Parse JSON fields for emails and contacts
    const parsedRows = rows.map(row => ({
      ...row,
      emails: row.emails || [],
      contacts: row.contacts || []
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

  static async updatePraContact(id: string, contactData: Omit<PraContact, 'id' | 'created_at' | 'updated_at'>): Promise<PraContact | null> {
    const { rows } = await db.query(
      'UPDATE pra_contacts SET name_of_pras = $1, pra_contact_person = $2, office_head = $3, email = $4, contact_number = $5, emails = $6, contacts = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
      [
        contactData.name_of_pras, 
        contactData.pra_contact_person, 
        contactData.office_head, 
        contactData.email, 
        contactData.contact_number,
        JSON.stringify(contactData.emails || []),
        JSON.stringify(contactData.contacts || []),
        id
      ]
    );
    return rows[0] || null;
  }

  static async deletePraContact(id: string): Promise<PraContact | null> {
    const { rows } = await db.query('UPDATE pra_contacts SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *', [id]);
    return rows[0] || null;
  }

  static async restorePraContact(id: string): Promise<boolean> {
    const { rowCount } = await db.query('UPDATE pra_contacts SET deleted_at = NULL WHERE id = $1', [id]);
    return (rowCount || 0) > 0;
  }

  // Job Fair Monitoring
  static async createJobFairMonitoring(monitoringData: Omit<JobFairMonitoring, 'id' | 'created_at' | 'updated_at'>): Promise<JobFairMonitoring> {
    const { rows } = await db.query(
      'INSERT INTO job_fair_monitoring (date_of_job_fair, venue, no_of_invited_agencies, no_of_agencies_with_jfa, male_applicants, female_applicants, total_applicants, dmw_staff_assigned) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [monitoringData.date_of_job_fair, monitoringData.venue, monitoringData.no_of_invited_agencies, monitoringData.no_of_agencies_with_jfa, monitoringData.male_applicants, monitoringData.female_applicants, monitoringData.total_applicants, monitoringData.dmw_staff_assigned]
    );
    return rows[0];
  }

  static async getJobFairMonitoring(pagination: PaginationOptions & { search?: string; filter?: string; showDeletedOnly?: boolean } = { page: 1, limit: 10 }): Promise<PaginatedResponse<JobFairMonitoring>> {
    let query = 'SELECT * FROM job_fair_monitoring';
    let countQuery = 'SELECT COUNT(*) FROM job_fair_monitoring';
    const params: any[] = [];
    let paramIndex = 1;
    let whereConditions: string[] = [];

    // Handle search parameter (key:value format or general search)
    if (pagination.search && pagination.search.trim()) {
      const searchTerm = pagination.search.trim();
      
      // Check if it's a key:value format
      if (searchTerm.includes(':')) {
        const [key, value] = searchTerm.split(':', 2);
        const trimmedKey = key.trim().toLowerCase();
        const trimmedValue = value.trim();
        
        switch (trimmedKey) {
          case 'venue':
            whereConditions.push(`venue ILIKE $${paramIndex}`);
            params.push(`%${trimmedValue}%`);
            paramIndex++;
            break;
          case 'male':
          case 'male_applicants':
            whereConditions.push(`male_applicants = $${paramIndex}`);
            params.push(parseInt(trimmedValue) || 0);
            paramIndex++;
            break;
          case 'female':
          case 'female_applicants':
            whereConditions.push(`female_applicants = $${paramIndex}`);
            params.push(parseInt(trimmedValue) || 0);
            paramIndex++;
            break;
          case 'total':
          case 'total_applicants':
            whereConditions.push(`total_applicants = $${paramIndex}`);
            params.push(parseInt(trimmedValue) || 0);
            paramIndex++;
            break;
          case 'dmw_staff':
          case 'dmw_staff_assigned':
            whereConditions.push(`dmw_staff_assigned ILIKE $${paramIndex}`);
            params.push(`%${trimmedValue}%`);
            paramIndex++;
            break;
          default:
            // Fallback to general search
            whereConditions.push(`(venue ILIKE $${paramIndex} OR dmw_staff_assigned ILIKE $${paramIndex})`);
            params.push(`%${searchTerm}%`);
            paramIndex++;
        }
      } else {
        // General search
        whereConditions.push(`(venue ILIKE $${paramIndex} OR dmw_staff_assigned ILIKE $${paramIndex})`);
        params.push(`%${searchTerm}%`);
        paramIndex++;
      }
    }

    // Handle filter parameter
    if (pagination.filter && pagination.filter.trim()) {
      const filterParts = pagination.filter.trim().split(' ');
      
      for (const part of filterParts) {
        if (part.includes(':')) {
          const [key, value] = part.split(':', 2);
          const trimmedKey = key.trim().toLowerCase();
          const trimmedValue = value.trim();
          
          switch (trimmedKey) {
            case 'venue':
              whereConditions.push(`venue ILIKE $${paramIndex}`);
              params.push(`%${trimmedValue}%`);
              paramIndex++;
              break;
            case 'date':
              if (trimmedValue.includes('|')) {
                const [startDate, endDate] = trimmedValue.split('|');
                whereConditions.push(`date_of_job_fair >= $${paramIndex} AND date_of_job_fair <= $${paramIndex + 1}`);
                params.push(startDate, endDate);
                paramIndex += 2;
              }
              break;
            case 'male_applicants_min':
              whereConditions.push(`male_applicants >= $${paramIndex}`);
              params.push(parseInt(trimmedValue) || 0);
              paramIndex++;
              break;
            case 'male_applicants_max':
              whereConditions.push(`male_applicants <= $${paramIndex}`);
              params.push(parseInt(trimmedValue) || 0);
              paramIndex++;
              break;
            case 'female_applicants_min':
              whereConditions.push(`female_applicants >= $${paramIndex}`);
              params.push(parseInt(trimmedValue) || 0);
              paramIndex++;
              break;
            case 'female_applicants_max':
              whereConditions.push(`female_applicants <= $${paramIndex}`);
              params.push(parseInt(trimmedValue) || 0);
              paramIndex++;
              break;
            case 'total_applicants_min':
              whereConditions.push(`total_applicants >= $${paramIndex}`);
              params.push(parseInt(trimmedValue) || 0);
              paramIndex++;
              break;
            case 'total_applicants_max':
              whereConditions.push(`total_applicants <= $${paramIndex}`);
              params.push(parseInt(trimmedValue) || 0);
              paramIndex++;
              break;
            case 'dmw_staff':
              whereConditions.push(`dmw_staff_assigned ILIKE $${paramIndex}`);
              params.push(`%${trimmedValue}%`);
              paramIndex++;
              break;
          }
        }
      }
    }

    // Handle soft delete logic
    if (pagination.showDeletedOnly) {
      // Show only deleted records
      whereConditions.push(`deleted_at IS NOT NULL`);
    } else {
      // Show only non-deleted records (default behavior)
      whereConditions.push(`deleted_at IS NULL`);
    }

    // Add WHERE clause if there are conditions
    if (whereConditions.length > 0) {
      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
      query += ` ${whereClause}`;
      countQuery += ` ${whereClause}`;
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
      'UPDATE job_fair_monitoring SET date_of_job_fair = $1, venue = $2, no_of_invited_agencies = $3, no_of_agencies_with_jfa = $4, male_applicants = $5, female_applicants = $6, total_applicants = $7, dmw_staff_assigned = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9 RETURNING *',
      [monitoringData.date_of_job_fair, monitoringData.venue, monitoringData.no_of_invited_agencies, monitoringData.no_of_agencies_with_jfa, monitoringData.male_applicants, monitoringData.female_applicants, monitoringData.total_applicants, monitoringData.dmw_staff_assigned, id]
    );
    return rows[0] || null;
  }

  static async deleteJobFairMonitoring(id: string): Promise<JobFairMonitoring | null> {
    // Soft delete - set deleted_at timestamp
    const { rows } = await db.query('UPDATE job_fair_monitoring SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *', [id]);
    return rows[0] || null;
  }

  static async restoreJobFairMonitoring(id: string): Promise<JobFairMonitoring | null> {
    // Restore - clear deleted_at timestamp
    const { rows } = await db.query('UPDATE job_fair_monitoring SET deleted_at = NULL WHERE id = $1 RETURNING *', [id]);
    return rows[0] || null;
  }

  static async permanentDeleteJobFairMonitoring(id: string): Promise<JobFairMonitoring | null> {
    // Permanent delete - actually remove from database
    const { rows } = await db.query('DELETE FROM job_fair_monitoring WHERE id = $1 RETURNING *', [id]);
    return rows[0] || null;
  }

  // Documents
  static async createDocument(documentData: Omit<Document, 'id' | 'uploaded_at' | 'updated_at'> & { meta?: any }): Promise<Document> {
    const { rows } = await db.query(
      'INSERT INTO documents (application_id, application_type, document_type, file_name, file_path, file_size, mime_type, meta) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [documentData.application_id, documentData.application_type, documentData.document_type, documentData.file_name, documentData.file_path, documentData.file_size, documentData.mime_type, documentData.meta ?? null]
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

  static async deleteDocumentById(id: string): Promise<boolean> {
    const { rowCount } = await db.query('DELETE FROM documents WHERE id = $1', [id])
    return (rowCount || 0) > 0
  }

  static async deleteDocumentsByType(applicationId: string, applicationType: string, documentType: string): Promise<number> {
    const { rowCount } = await db.query(
      'DELETE FROM documents WHERE application_id = $1 AND application_type = $2 AND document_type = $3',
      [applicationId, applicationType, documentType]
    )
    return rowCount || 0
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
        client.query(`SELECT COUNT(*) FROM gov_to_gov_applications WHERE deleted_at IS NULL${dateFrom && dateTo ? ' AND created_at::date BETWEEN $1::date AND $2::date' : ''}`, dateFrom && dateTo ? [dateFrom, dateTo] : []),
        client.query(`SELECT COUNT(*) FROM information_sheet_records WHERE deleted_at IS NULL${dateFrom && dateTo ? ' AND created_at::date BETWEEN $1::date AND $2::date' : ''}`, dateFrom && dateTo ? [dateFrom, dateTo] : []),
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

  // Permission Management Methods
  
  /**
   * Get user permissions
   */
  static async getUserPermissions(userId: string): Promise<UserPermission[]> {
    try {
      const result = await db.query(
        'SELECT * FROM user_permissions WHERE user_id = $1 ORDER BY permission_key',
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      throw error;
    }
  }

  /**
   * Update user permissions
   */
  static async updateUserPermissions(
    userId: string, 
    permissions: { permission_key: string; granted: boolean }[],
    grantedBy: string
  ): Promise<void> {
    try {
      await db.query('BEGIN');
      
      for (const permission of permissions) {
        await db.query(
          `INSERT INTO user_permissions (user_id, permission_key, granted, granted_by)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, permission_key)
           DO UPDATE SET 
             granted = EXCLUDED.granted,
             granted_by = EXCLUDED.granted_by,
             granted_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP`,
          [userId, permission.permission_key, permission.granted, grantedBy]
        );
      }
      
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('Error updating user permissions:', error);
      throw error;
    }
  }

  /**
   * Check if user has specific permission
   */
  static async hasPermission(userId: string, permissionKey: string): Promise<boolean> {
    try {
      const result = await db.query(
        'SELECT granted FROM user_permissions WHERE user_id = $1 AND permission_key = $2',
        [userId, permissionKey]
      );
      
      if (result.rows.length === 0) {
        // If no permission record exists, check user role
        const userResult = await db.query(
          'SELECT role FROM users WHERE id = $1',
          [userId]
        );
        
        if (userResult.rows.length === 0) return false;
        
        const role = userResult.rows[0].role;
        // Superadmin and admin have all permissions by default
        return role === 'superadmin' || role === 'admin';
      }
      
      return result.rows[0].granted;
    } catch (error) {
      console.error('Error checking user permission:', error);
      return false;
    }
  }

  /**
   * Get users with their permissions
   */
  static async getUsersWithPermissions(): Promise<User[]> {
    try {
      const result = await db.query(`
        SELECT 
          u.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', up.id,
                'permission_key', up.permission_key,
                'granted', up.granted,
                'granted_by', up.granted_by,
                'granted_at', up.granted_at,
                'created_at', up.created_at,
                'updated_at', up.updated_at
              )
            ) FILTER (WHERE up.id IS NOT NULL),
            '[]'::json
          ) as permissions
        FROM users u
        LEFT JOIN user_permissions up ON u.id = up.user_id
        WHERE u.role <> 'superadmin'
        GROUP BY u.id
        ORDER BY u.full_name
      `);
      
      return result.rows.map(row => ({
        ...row,
        permissions: row.permissions || []
      }));
    } catch (error) {
      console.error('Error fetching users with permissions:', error);
      throw error;
    }
  }

  /**
   * Get all available permission keys
   */
  static getAvailablePermissions(): string[] {
    return [
      'direct_hire',
      'balik_manggagawa',
      'gov_to_gov',
      'information_sheet',
      'monitoring',
      'data_backups'
    ];
  }

  /**
   * Get processed workers count for utilization report
   * Returns monthly, quarter-to-date, and year-to-date counts
   */
  static async getProcessedWorkersCount(month: number, year: number): Promise<{
    monthly: number
    quarterToDate: number
    yearToDate: number
  }> {
    try {
      // Calculate date ranges
      // month is 1-12 (1 = January, 12 = December)
      // JavaScript Date months are 0-indexed (0 = January, 11 = December)
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)
      
      // Quarter start (first month of the quarter)
      const quarterStartMonth = Math.floor((month - 1) / 3) * 3
      const quarterStart = new Date(year, quarterStartMonth, 1)
      const quarterEnd = new Date(year, month, 0, 23, 59, 59, 999)
      
      // Year start (January 1st of the selected year, 00:00:00)
      const yearStart = new Date(year, 0, 1, 0, 0, 0, 0)
      // Year end (last day of the selected month, 23:59:59.999)
      // Using month (not month-1) because Date(2025, 1, 0) = last day of month 0 (January)
      const yearEnd = new Date(year, month, 0, 23, 59, 59, 999)

      const stats = await db.transaction(async (client) => {
        // Monthly counts
        const [
          monthlyDirectHire,
          monthlyClearance,
          monthlyGovToGov,
          monthlyInfoSheet
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
            'SELECT COUNT(*) FROM gov_to_gov_applications WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2',
            [monthStart, monthEnd]
          ),
          client.query(
            'SELECT COUNT(*) FROM information_sheet_records WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2',
            [monthStart, monthEnd]
          )
        ])

        // Quarter-to-date counts
        const [
          quarterDirectHire,
          quarterClearance,
          quarterGovToGov,
          quarterInfoSheet
        ] = await Promise.all([
          client.query(
            'SELECT COUNT(*) FROM direct_hire_applications WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2',
            [quarterStart, quarterEnd]
          ),
          client.query(
            'SELECT COUNT(*) FROM balik_manggagawa_clearance WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2',
            [quarterStart, quarterEnd]
          ),
          client.query(
            'SELECT COUNT(*) FROM gov_to_gov_applications WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2',
            [quarterStart, quarterEnd]
          ),
          client.query(
            'SELECT COUNT(*) FROM information_sheet_records WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2',
            [quarterStart, quarterEnd]
          )
        ])

        // Year-to-date counts
        const [
          yearDirectHire,
          yearClearance,
          yearGovToGov,
          yearInfoSheet
        ] = await Promise.all([
          client.query(
            'SELECT COUNT(*) FROM direct_hire_applications WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2',
            [yearStart, yearEnd]
          ),
          client.query(
            'SELECT COUNT(*) FROM balik_manggagawa_clearance WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2',
            [yearStart, yearEnd]
          ),
          client.query(
            'SELECT COUNT(*) FROM gov_to_gov_applications WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2',
            [yearStart, yearEnd]
          ),
          client.query(
            'SELECT COUNT(*) FROM information_sheet_records WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2',
            [yearStart, yearEnd]
          )
        ])

        // Calculate totals (only BM Clearance, not BM Processing)
        const monthly = 
          parseInt(monthlyDirectHire.rows[0].count) +
          parseInt(monthlyClearance.rows[0].count) +
          parseInt(monthlyGovToGov.rows[0].count) +
          parseInt(monthlyInfoSheet.rows[0].count)

        const quarterToDate = 
          parseInt(quarterDirectHire.rows[0].count) +
          parseInt(quarterClearance.rows[0].count) +
          parseInt(quarterGovToGov.rows[0].count) +
          parseInt(quarterInfoSheet.rows[0].count)

        const yearToDate = 
          parseInt(yearDirectHire.rows[0].count) +
          parseInt(yearClearance.rows[0].count) +
          parseInt(yearGovToGov.rows[0].count) +
          parseInt(yearInfoSheet.rows[0].count)

        // Debug logging to show breakdown
        console.log('[getProcessedWorkersCount] Year-to-Date Breakdown:', {
          year,
          month,
          directHire: parseInt(yearDirectHire.rows[0].count),
          clearance: parseInt(yearClearance.rows[0].count),
          govToGov: parseInt(yearGovToGov.rows[0].count),
          infoSheet: parseInt(yearInfoSheet.rows[0].count),
          total: yearToDate
        })

        return { monthly, quarterToDate, yearToDate }
      })

      return stats
    } catch (error) {
      console.error('Error getting processed workers count:', error)
      throw error
    }
  }

  /**
   * Get detailed breakdown of processed workers count by table
   * This helps debug where the counts are coming from
   */
  static async getProcessedWorkersCountBreakdown(month: number, year: number): Promise<{
    monthly: {
      directHire: number
      clearance: number
      govToGov: number
      infoSheet: number
      total: number
    }
    quarterToDate: {
      directHire: number
      clearance: number
      govToGov: number
      infoSheet: number
      total: number
    }
    yearToDate: {
      directHire: number
      clearance: number
      govToGov: number
      infoSheet: number
      total: number
    }
  }> {
    try {
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)
      const yearStart = new Date(year, 0, 1, 0, 0, 0, 0)
      const yearEnd = new Date(year, month, 0, 23, 59, 59, 999)
      const quarterStartMonth = Math.floor((month - 1) / 3) * 3
      const quarterStart = new Date(year, quarterStartMonth, 1)
      const quarterEnd = new Date(year, month, 0, 23, 59, 59, 999)

      const breakdown = await db.transaction(async (client) => {
        // Monthly counts
        const [
          monthlyDirectHire,
          monthlyClearance,
          monthlyGovToGov,
          monthlyInfoSheet
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
            'SELECT COUNT(*) FROM gov_to_gov_applications WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2',
            [monthStart, monthEnd]
          ),
          client.query(
            'SELECT COUNT(*) FROM information_sheet_records WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2',
            [monthStart, monthEnd]
          )
        ])

        // Quarter-to-date counts
        const [
          qDirectHire,
          qClearance,
          qGovToGov,
          qInfoSheet
        ] = await Promise.all([
          client.query(
            'SELECT COUNT(*) FROM direct_hire_applications WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2',
            [quarterStart, quarterEnd]
          ),
          client.query(
            'SELECT COUNT(*) FROM balik_manggagawa_clearance WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2',
            [quarterStart, quarterEnd]
          ),
          client.query(
            'SELECT COUNT(*) FROM gov_to_gov_applications WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2',
            [quarterStart, quarterEnd]
          ),
          client.query(
            'SELECT COUNT(*) FROM information_sheet_records WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2',
            [quarterStart, quarterEnd]
          )
        ])

        // Year-to-date counts
        const [
          yearDirectHire,
          yearClearance,
          yearGovToGov,
          yearInfoSheet
        ] = await Promise.all([
          client.query(
            'SELECT COUNT(*) FROM direct_hire_applications WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2',
            [yearStart, yearEnd]
          ),
          client.query(
            'SELECT COUNT(*) FROM balik_manggagawa_clearance WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2',
            [yearStart, yearEnd]
          ),
          client.query(
            'SELECT COUNT(*) FROM gov_to_gov_applications WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2',
            [yearStart, yearEnd]
          ),
          client.query(
            'SELECT COUNT(*) FROM information_sheet_records WHERE deleted_at IS NULL AND created_at >= $1 AND created_at <= $2',
            [yearStart, yearEnd]
          )
        ])

        const monthly = {
          directHire: parseInt(monthlyDirectHire.rows[0].count),
          clearance: parseInt(monthlyClearance.rows[0].count),
          govToGov: parseInt(monthlyGovToGov.rows[0].count),
          infoSheet: parseInt(monthlyInfoSheet.rows[0].count),
          total: parseInt(monthlyDirectHire.rows[0].count) +
                 parseInt(monthlyClearance.rows[0].count) +
                 parseInt(monthlyGovToGov.rows[0].count) +
                 parseInt(monthlyInfoSheet.rows[0].count)
        }

        const quarterToDate = {
          directHire: parseInt(qDirectHire.rows[0].count),
          clearance: parseInt(qClearance.rows[0].count),
          govToGov: parseInt(qGovToGov.rows[0].count),
          infoSheet: parseInt(qInfoSheet.rows[0].count),
          total: parseInt(qDirectHire.rows[0].count) +
                 parseInt(qClearance.rows[0].count) +
                 parseInt(qGovToGov.rows[0].count) +
                 parseInt(qInfoSheet.rows[0].count)
        }

        const yearToDate = {
          directHire: parseInt(yearDirectHire.rows[0].count),
          clearance: parseInt(yearClearance.rows[0].count),
          govToGov: parseInt(yearGovToGov.rows[0].count),
          infoSheet: parseInt(yearInfoSheet.rows[0].count),
          total: parseInt(yearDirectHire.rows[0].count) +
                 parseInt(yearClearance.rows[0].count) +
                 parseInt(yearGovToGov.rows[0].count) +
                 parseInt(yearInfoSheet.rows[0].count)
        }

        return { monthly, quarterToDate, yearToDate }
      })

      return breakdown
    } catch (error) {
      console.error('Error getting processed workers count breakdown:', error)
      throw error
    }
  }

  /**
   * Create a system report certificate record
   */
  static async createSystemReportCertificate(data: {
    month: number
    year: number
    file_name: string
    file_path: string
    file_size: number
    mime_type: string
    created_by: string | null
  }): Promise<any> {
    try {
      const { rows } = await db.query(
        `INSERT INTO system_reports_certificates 
         (month, year, file_name, file_path, file_size, mime_type, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [data.month, data.year, data.file_name, data.file_path, data.file_size, data.mime_type, data.created_by]
      )
      return rows[0]
    } catch (error) {
      console.error('Error creating system report certificate:', error)
      throw error
    }
  }

  /**
   * Get system report certificate by month/year
   */
  static async getSystemReportCertificateByMonthYear(month: number, year: number): Promise<any | null> {
    try {
      const { rows } = await db.query(
        `SELECT * FROM system_reports_certificates WHERE month = $1 AND year = $2 LIMIT 1`,
        [month, year]
      )
      return rows[0] || null
    } catch (error) {
      console.error('Error getting system report certificate by month/year:', error)
      throw error
    }
  }

  /**
   * Get all system report certificates
   */
  static async getSystemReportCertificates(pagination: PaginationOptions = { page: 1, limit: 10 }): Promise<PaginatedResponse<any>> {
    try {
      const offset = (pagination.page - 1) * pagination.limit
      
      const [result, countResult] = await Promise.all([
        db.query(
          `SELECT c.*, u.full_name as created_by_name
           FROM system_reports_certificates c
           LEFT JOIN users u ON c.created_by = u.id
           ORDER BY c.created_at DESC
           LIMIT $1 OFFSET $2`,
          [pagination.limit, offset]
        ),
        db.query('SELECT COUNT(*) FROM system_reports_certificates')
      ])

      const total = parseInt(countResult.rows[0].count)
      
      return {
        data: result.rows,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit)
        }
      }
    } catch (error) {
      console.error('Error getting system report certificates:', error)
      throw error
    }
  }

  /**
   * Get system report certificate by ID
   */
  static async getSystemReportCertificateById(id: string): Promise<any | null> {
    try {
      const { rows } = await db.query(
        `SELECT c.*, u.full_name as created_by_name
         FROM system_reports_certificates c
         LEFT JOIN users u ON c.created_by = u.id
         WHERE c.id = $1`,
        [id]
      )
      return rows[0] || null
    } catch (error) {
      console.error('Error getting system report certificate:', error)
      throw error
    }
  }

  /**
   * Delete system report certificate
   */
  static async deleteSystemReportCertificate(id: string): Promise<boolean> {
    try {
      const { rowCount } = await db.query(
        'DELETE FROM system_reports_certificates WHERE id = $1',
        [id]
      )
      return (rowCount || 0) > 0
    } catch (error) {
      console.error('Error deleting system report certificate:', error)
      throw error
    }
  }
}
