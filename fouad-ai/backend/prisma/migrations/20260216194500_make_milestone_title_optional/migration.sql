-- Make Milestone.title nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Milestone' AND column_name = 'title'
  ) THEN
    ALTER TABLE "Milestone" ALTER COLUMN "title" DROP NOT NULL;
  END IF;
END $$;
