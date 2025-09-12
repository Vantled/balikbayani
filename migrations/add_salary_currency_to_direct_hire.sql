-- Add salary_currency field to direct_hire_applications table
ALTER TABLE direct_hire_applications 
ADD COLUMN salary_currency VARCHAR(3) DEFAULT 'USD';

-- Add raw_salary field to store the original salary before conversion
ALTER TABLE direct_hire_applications 
ADD COLUMN raw_salary DECIMAL(12,2);

-- Update existing records to have USD as default currency
UPDATE direct_hire_applications 
SET salary_currency = 'USD' 
WHERE salary_currency IS NULL;

-- Set raw_salary to current salary for existing records
UPDATE direct_hire_applications 
SET raw_salary = salary 
WHERE raw_salary IS NULL;

-- Add contact fields (idempotent additions)
ALTER TABLE direct_hire_applications 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

ALTER TABLE direct_hire_applications 
ADD COLUMN IF NOT EXISTS cellphone VARCHAR(20);