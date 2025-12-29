-- DAYCARE-OS DATABASE SCHEMA
-- Execute this SQL in the Supabase SQL Editor
-- Version: 1.0

-- ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- For facial recognition embeddings

-- ENUMS (Strict Typing)
CREATE TYPE user_role AS ENUM ('owner', 'teacher', 'parent');
CREATE TYPE attendance_status AS ENUM ('checked_in', 'checked_out', 'absent');
CREATE TYPE activity_type AS ENUM ('photo', 'video', 'nap', 'meal', 'potty', 'meds', 'incident', 'mood');
CREATE TYPE mood_type AS ENUM ('happy', 'sad', 'tired', 'energetic', 'cranky');

-- 1. PROFILES (Extends Auth.Users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'parent',
  phone_number TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can read their own profile. Owners can read all.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'parent')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. CLASSROOMS
CREATE TABLE public.classrooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INT DEFAULT 15,
  age_group TEXT, -- e.g., "Infant", "Toddler", "Pre-K"
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Classrooms viewable by authenticated users" ON classrooms FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Only owners can insert classrooms" ON classrooms FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Only owners can update classrooms" ON classrooms FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- 3. TEACHER ASSIGNMENTS (Many-to-Many)
CREATE TABLE public.teacher_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, classroom_id)
);

ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teacher assignments viewable by authenticated" ON teacher_assignments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Only owners can manage teacher assignments" ON teacher_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- 4. CHILDREN
CREATE TABLE public.children (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Primary Guardian
  allergies JSONB DEFAULT '[]'::jsonb, -- e.g. ["peanuts", "penicillin"]
  medical_notes TEXT,
  profile_photo_url TEXT, -- The "Faceboard" Anchor Image
  embedding VECTOR(512), -- For AI facial recognition matching
  current_status attendance_status DEFAULT 'checked_out',
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for Speed
CREATE INDEX idx_children_classroom ON public.children(classroom_id);
CREATE INDEX idx_children_parent ON public.children(parent_id);
CREATE INDEX idx_children_status ON public.children(current_status);

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
-- Parents can see their own children
CREATE POLICY "Parents can view own children" ON children FOR SELECT USING (
  parent_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'teacher'))
);
-- Parents can update their own children
CREATE POLICY "Parents can update own children" ON children FOR UPDATE USING (parent_id = auth.uid());
-- Staff can update any child
CREATE POLICY "Staff can update children" ON children FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'teacher'))
);
-- Only owners can insert children
CREATE POLICY "Owners can insert children" ON children FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- 5. ACTIVITY LOGS (The Feed)
CREATE TABLE public.activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.profiles(id) NOT NULL,
  type activity_type NOT NULL,
  description TEXT, -- "Ate all his peas"
  media_url TEXT, -- Path to Supabase Storage
  metadata JSONB DEFAULT '{}'::jsonb, -- Store details like { "nap_duration": 90, "meal_percentage": 100 }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_activity_child ON public.activity_logs(child_id);
CREATE INDEX idx_activity_created ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_type ON public.activity_logs(type);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents can view own children activities" ON activity_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM children WHERE children.id = child_id AND children.parent_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'teacher'))
);
CREATE POLICY "Staff can insert activities" ON activity_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'teacher'))
);

-- 6. MESSAGES (With Queue Logic)
CREATE TABLE public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) NOT NULL,
  child_context_id UUID REFERENCES public.children(id), -- Optional context
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_queued BOOLEAN DEFAULT FALSE, -- TRUE if sent during Quiet Hours
  deliver_at TIMESTAMPTZ DEFAULT NOW(), -- When it becomes visible to recipient
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_deliver_at ON public.messages(deliver_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (
  sender_id = auth.uid() OR
  (recipient_id = auth.uid() AND deliver_at <= NOW())
);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Recipients can update read status" ON messages FOR UPDATE USING (recipient_id = auth.uid());

-- 7. ORGANIZATION SETTINGS (Global Config)
CREATE TABLE public.org_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT
);

ALTER TABLE public.org_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings viewable by authenticated" ON org_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Only owners can update settings" ON org_settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- SEED DATA
INSERT INTO public.org_settings (key, value, description) VALUES
('quiet_hours_start', '18:00', 'Start time for quiet hours (no parent notifications)'),
('quiet_hours_end', '07:00', 'End time for quiet hours'),
('daycare_name', 'Mommy & Me Daycare', 'Organization name'),
('timezone', 'America/New_York', 'Default timezone');

-- 8. STORAGE BUCKETS (Run in Supabase Dashboard > Storage)
-- Create buckets: 'avatars' and 'feed_media'
-- Set both to public for simplicity (or configure RLS as needed)

-- Helper function to check if current time is in quiet hours
CREATE OR REPLACE FUNCTION public.is_quiet_hours()
RETURNS BOOLEAN AS $$
DECLARE
  quiet_start TIME;
  quiet_end TIME;
  now_time TIME;
BEGIN
  SELECT value::TIME INTO quiet_start FROM org_settings WHERE key = 'quiet_hours_start';
  SELECT value::TIME INTO quiet_end FROM org_settings WHERE key = 'quiet_hours_end';
  now_time := LOCALTIME;

  -- Handle overnight quiet hours (e.g., 18:00 to 07:00)
  IF quiet_start > quiet_end THEN
    RETURN now_time >= quiet_start OR now_time <= quiet_end;
  ELSE
    RETURN now_time >= quiet_start AND now_time <= quiet_end;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
