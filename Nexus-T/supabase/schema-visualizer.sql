-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.group_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL,
  student_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  is_group_leader boolean NOT NULL DEFAULT false,
  CONSTRAINT group_members_pkey PRIMARY KEY (id),
  CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT group_members_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);
CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  grade text NOT NULL,
  specialty text NOT NULL,
  nomenclature text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  section text,
  shift text,
  CONSTRAINT groups_pkey PRIMARY KEY (id)
);
CREATE TABLE public.incident_observations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  incident_id uuid NOT NULL,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT incident_observations_pkey PRIMARY KEY (id),
  CONSTRAINT incident_observations_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id),
  CONSTRAINT incident_observations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.incident_types (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  category text,
  CONSTRAINT incident_types_pkey PRIMARY KEY (id)
);
CREATE TABLE public.incidents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  incident_type_id uuid NOT NULL,
  student_id uuid NOT NULL,
  teacher_subject_id uuid NOT NULL,
  situation text,
  action text,
  follow_up text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT incidents_pkey PRIMARY KEY (id),
  CONSTRAINT incidents_incident_type_id_fkey FOREIGN KEY (incident_type_id) REFERENCES public.incident_types(id),
  CONSTRAINT incidents_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.justifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL,
  teacher_subject_id uuid NOT NULL,
  group_id uuid NOT NULL,
  reason text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT justifications_pkey PRIMARY KEY (id),
  CONSTRAINT justifications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.user_profiles(id),
  CONSTRAINT justifications_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  control_number character varying NOT NULL UNIQUE,
  first_name character varying NOT NULL,
  paternal_last_name character varying NOT NULL,
  maternal_last_name character varying,
  email character varying,
  phone character varying,
  contact_name character varying,
  contact_phone character varying,
  contact_type character varying,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT students_pkey PRIMARY KEY (id)
);
CREATE TABLE public.subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subject_name character varying NOT NULL,
  category_type character varying,
  category_name character varying,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT subjects_pkey PRIMARY KEY (id)
);
CREATE TABLE public.teacher_group_subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  group_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  shift text NOT NULL CHECK (shift = ANY (ARRAY['M'::text, 'V'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT teacher_group_subjects_pkey PRIMARY KEY (id),
  CONSTRAINT teacher_group_subjects_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES auth.users(id),
  CONSTRAINT teacher_group_subjects_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT teacher_group_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id)
);
CREATE TABLE public.teacher_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  group_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  is_tutor boolean NOT NULL DEFAULT false,
  CONSTRAINT teacher_groups_pkey PRIMARY KEY (id),
  CONSTRAINT teacher_groups_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES auth.users(id),
  CONSTRAINT teacher_groups_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.user_profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  first_name text,
  last_name text,
  email text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id)
);