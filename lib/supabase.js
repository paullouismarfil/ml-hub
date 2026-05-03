import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jpnvrqxrclocumcbkain.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwbnZycXhyY2xvY3VtY2JrYWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMjQxODcsImV4cCI6MjA5MDYwMDE4N30.LTdlTFSQK8C9dvHmmkqjNqcMexc4coAbxuuVbM30O2o'

export const supabase = createClient(supabaseUrl, supabaseKey)