-- Add clearance tracking fields to balik_manggagawa_processing table
ALTER TABLE balik_manggagawa_processing 
ADD COLUMN IF NOT EXISTS clearance_type VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS clearance_id UUID NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bm_processing_clearance_type ON balik_manggagawa_processing (clearance_type);
CREATE INDEX IF NOT EXISTS idx_bm_processing_clearance_id ON balik_manggagawa_processing (clearance_id);

-- Add foreign key constraint to link to clearance table (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_bm_processing_clearance_id'
    ) THEN
        ALTER TABLE balik_manggagawa_processing 
        ADD CONSTRAINT fk_bm_processing_clearance_id 
        FOREIGN KEY (clearance_id) REFERENCES balik_manggagawa_clearance(id) ON DELETE SET NULL;
    END IF;
END $$;
