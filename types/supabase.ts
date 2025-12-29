export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'owner' | 'teacher' | 'parent'
export type AttendanceStatus = 'checked_in' | 'checked_out' | 'absent'
export type ActivityType = 'photo' | 'video' | 'nap' | 'meal' | 'potty' | 'meds' | 'incident' | 'mood'
export type MoodType = 'happy' | 'sad' | 'tired' | 'energetic' | 'cranky'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: UserRole
          phone_number: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: UserRole
          phone_number?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: UserRole
          phone_number?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      classrooms: {
        Row: {
          id: string
          name: string
          capacity: number
          age_group: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          capacity?: number
          age_group?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          capacity?: number
          age_group?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      teacher_assignments: {
        Row: {
          id: string
          teacher_id: string
          classroom_id: string
          is_primary: boolean
          assigned_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          classroom_id: string
          is_primary?: boolean
          assigned_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          classroom_id?: string
          is_primary?: boolean
          assigned_at?: string
        }
      }
      children: {
        Row: {
          id: string
          first_name: string
          last_name: string
          date_of_birth: string
          classroom_id: string | null
          parent_id: string | null
          allergies: Json
          medical_notes: string | null
          profile_photo_url: string | null
          embedding: number[] | null
          current_status: AttendanceStatus
          checked_in_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          date_of_birth: string
          classroom_id?: string | null
          parent_id?: string | null
          allergies?: Json
          medical_notes?: string | null
          profile_photo_url?: string | null
          embedding?: number[] | null
          current_status?: AttendanceStatus
          checked_in_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          date_of_birth?: string
          classroom_id?: string | null
          parent_id?: string | null
          allergies?: Json
          medical_notes?: string | null
          profile_photo_url?: string | null
          embedding?: number[] | null
          current_status?: AttendanceStatus
          checked_in_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          child_id: string
          author_id: string
          type: ActivityType
          description: string | null
          media_url: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          child_id: string
          author_id: string
          type: ActivityType
          description?: string | null
          media_url?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          author_id?: string
          type?: ActivityType
          description?: string | null
          media_url?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          child_context_id: string | null
          content: string
          is_read: boolean
          is_queued: boolean
          deliver_at: string
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id: string
          child_context_id?: string | null
          content: string
          is_read?: boolean
          is_queued?: boolean
          deliver_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          child_context_id?: string | null
          content?: string
          is_read?: boolean
          is_queued?: boolean
          deliver_at?: string
          created_at?: string
        }
      }
      org_settings: {
        Row: {
          key: string
          value: string
          description: string | null
        }
        Insert: {
          key: string
          value: string
          description?: string | null
        }
        Update: {
          key?: string
          value?: string
          description?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_quiet_hours: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      user_role: UserRole
      attendance_status: AttendanceStatus
      activity_type: ActivityType
      mood_type: MoodType
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Classroom = Database['public']['Tables']['classrooms']['Row']
export type Child = Database['public']['Tables']['children']['Row']
export type ActivityLog = Database['public']['Tables']['activity_logs']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type OrgSetting = Database['public']['Tables']['org_settings']['Row']
export type TeacherAssignment = Database['public']['Tables']['teacher_assignments']['Row']

// Extended types with relations
export type ChildWithClassroom = Child & {
  classroom: Classroom | null
}

export type ActivityLogWithAuthor = ActivityLog & {
  author: Profile
  child: Child
}

export type MessageWithProfiles = Message & {
  sender: Profile
  recipient: Profile
  child_context: Child | null
}
