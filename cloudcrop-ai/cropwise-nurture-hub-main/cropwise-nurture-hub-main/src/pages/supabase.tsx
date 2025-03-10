import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://lwdwmhzfznuyrpmabudj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3ZHdtaHpmem51eXJwbWFidWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2NjQ3MDksImV4cCI6MjA1NjI0MDcwOX0.4wtTHFD4W4D_Pw9z2HpyS8qTlz6uNIMBmRf0HteiPZ4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
