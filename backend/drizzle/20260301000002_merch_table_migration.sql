-- Create new merch table
CREATE TABLE IF NOT EXISTS merch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  image_url TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  stripe_url TEXT,
  uploaded_by TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_merch_created_at ON merch(created_at DESC);
CREATE INDEX idx_merch_is_published ON merch(is_published);
CREATE INDEX idx_merch_is_active ON merch(is_active);
CREATE INDEX idx_merch_sort_order ON merch(sort_order);
