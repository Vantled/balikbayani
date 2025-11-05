// app/api/backups/auto/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import fs from 'fs'
import path from 'path'

const BACKUP_DIR = path.join(process.cwd(), 'uploads', 'backups')

async function ensureDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

export async function POST(request: NextRequest) {
  // Simple webhook-like endpoint; requires header X-Cron-Secret matching env CRON_SECRET
  const secret = process.env.CRON_SECRET || ''
  const incoming = request.headers.get('x-cron-secret') || ''
  if (!secret || secret !== incoming) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }
  try {
    await ensureDir()
    const now = new Date()
    const systemRaw = (process.env.SYSTEM_NAME || 'balikbayani').toLowerCase()
    const system = systemRaw.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const pad = (n: number) => String(n).padStart(2, '0')
    const yyyy = now.getFullYear()
    const mm = pad(now.getMonth() + 1)
    const dd = pad(now.getDate())
    const hours24 = now.getHours()
    const hours12 = ((hours24 + 11) % 12) + 1
    const ampm = hours24 >= 12 ? 'PM' : 'AM'
    const hh = pad(hours12)
    const mi = pad(now.getMinutes())
    const id = `${system}-auto-${yyyy}${mm}${dd}-${hh}${mi}${ampm}`
    const file = path.join(BACKUP_DIR, `${id}.sql`)
    // Simple logical backup: export all tables with data using INSERT statements
    // Get all tables in public schema
    const tablesResult = await db.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `)
    
    let backupContent = `-- BalikBayani logical backup (auto)\n-- Created at: ${now.toISOString()}\n-- Includes all tables from public schema\n\n`
    
    // Export each table with its data
    for (const row of tablesResult.rows) {
      const tableName = row.tablename
      
      // Get table structure
      const structureResult = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName])
      
      // Get row count
      const countResult = await db.query(`SELECT COUNT(*) as count FROM ${tableName}`)
      const rowCount = parseInt(countResult.rows[0].count)
      
      backupContent += `\n-- Table: ${tableName} (${rowCount} rows)\n`
      
      if (rowCount > 0) {
        // Export data using INSERT statements
        const dataResult = await db.query(`SELECT * FROM ${tableName} ORDER BY (SELECT NULL)`)
        
        if (dataResult.rows.length > 0) {
          // Build INSERT statements
          const columns = structureResult.rows.map(col => col.column_name)
          const columnList = columns.map(col => `"${col}"`).join(', ')
          
          backupContent += `\n-- Data for ${tableName}\n`
          
          // Insert in batches to avoid huge statements
          const batchSize = 100
          for (let i = 0; i < dataResult.rows.length; i += batchSize) {
            const batch = dataResult.rows.slice(i, i + batchSize)
            const values = batch.map(row => {
              const vals = columns.map(col => {
                const val = row[col]
                if (val === null) return 'NULL'
                if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
                if (val instanceof Date) return `'${val.toISOString()}'`
                if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`
                return String(val)
              })
              return `(${vals.join(', ')})`
            })
            backupContent += `INSERT INTO "${tableName}" (${columnList}) VALUES\n${values.join(',\n')};\n\n`
          }
        }
      } else {
        backupContent += `-- No data in ${tableName}\n`
      }
    }
    
    fs.writeFileSync(file, backupContent, 'utf8')
    console.log(`[BACKUPS] Auto backup created: ${id}.zip`)
    return NextResponse.json({ success: true, id })
  } catch (e) {
    console.error('Auto backup failed', e)
    return NextResponse.json({ success: false, error: 'Auto backup failed' }, { status: 500 })
  }
}


