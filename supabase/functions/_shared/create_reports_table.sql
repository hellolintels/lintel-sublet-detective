
-- This SQL will be used by our Edge Function to create the reports table if it doesn't exist
CREATE OR REPLACE FUNCTION create_reports_table_if_not_exists()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'reports'
  ) THEN
    -- Create the reports table
    CREATE TABLE public.reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      contact_id UUID REFERENCES public.contacts(id) NOT NULL,
      html_content TEXT NOT NULL,
      properties_count INTEGER NOT NULL DEFAULT 0,
      matches_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
    );

    -- Add a comment to the table
    COMMENT ON TABLE public.reports IS 'Stores property match reports generated for contacts';
  END IF;
END;
$$;
