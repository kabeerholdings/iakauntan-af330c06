ALTER TABLE public.custom_fields
ADD COLUMN position_reference TEXT DEFAULT NULL,
ADD COLUMN position_placement TEXT DEFAULT 'after';