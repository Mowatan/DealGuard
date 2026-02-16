-- Make Contract.title nullable (if it exists) or drop it
-- The schema doesn't include a title field for Contract

-- Option 1: Make it nullable (safer - preserves data if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Contract' AND column_name = 'title'
  ) THEN
    ALTER TABLE "Contract" ALTER COLUMN "title" DROP NOT NULL;
  END IF;
END $$;

-- Option 2: Or drop the column entirely (uncomment if you prefer this)
-- DO $$
-- BEGIN
--   IF EXISTS (
--     SELECT 1 FROM information_schema.columns
--     WHERE table_name = 'Contract' AND column_name = 'title'
--   ) THEN
--     ALTER TABLE "Contract" DROP COLUMN "title";
--   END IF;
-- END $$;
