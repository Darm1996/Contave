import { createClient } from "@supabase/supabase-js";

// La anon key es pública por diseño (Supabase la protege con RLS, no
// con secreto) — se usa un valor por defecto para no depender de
// configurar variables de entorno en la plataforma de despliegue.
const URL_POR_DEFECTO = "https://gzwnpqxllkxdrnprcytz.supabase.co";
const ANON_KEY_POR_DEFECTO =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6d25wcXhsbGt4ZHJucHJjeXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MzIwNTEsImV4cCI6MjA5OTIwODA1MX0.zIUpes4lzh0uD1gRMyxseMFBkDGSqlLa8h_7NWqU504";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? URL_POR_DEFECTO;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ANON_KEY_POR_DEFECTO;

export const supabase = createClient(url, anonKey);
