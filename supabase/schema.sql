-- ==========================================
-- SKEMA DATABASE: WEB KEAMANAN SISTEM INFORMASI
-- Platform: Supabase (PostgreSQL)
-- ==========================================

-- 1. TABEL METADATA BERKAS
CREATE TABLE public.file_metadata (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  access_token text NOT NULL UNIQUE,
  uploaded_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  username text,
  CONSTRAINT file_metadata_pkey PRIMARY KEY (id)
);

-- 2. TABEL KEAMANAN INFORMASI
CREATE TABLE public.keamanan_informasi (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nama_pengguna character varying NOT NULL,
  nama_berkas character varying NOT NULL,
  kategori_data character varying,
  status_enkripsi character varying,
  level_akses character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT keamanan_informasi_pkey PRIMARY KEY (id)
);

-- 3. MENGAKTIFKAN ROW LEVEL SECURITY (RLS)
ALTER TABLE public.file_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keamanan_informasi ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. KONFIGURASI SUPABASE STORAGE BUCKET
-- ==========================================

-- Membuat Storage Bucket khusus untuk menyimpan berkas terenkripsi/keamanan
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cyber-files', 'cyber-files', true)
ON CONFLICT (id) DO NOTHING;

-- Kebijakan Akses (Storage Policy) - Izinkan Upload & Download
CREATE POLICY "Public Storage Access" 
ON storage.objects FOR ALL 
USING (bucket_id = 'cyber-files');
