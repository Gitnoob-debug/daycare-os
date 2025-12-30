import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// SECURITY: This endpoint should only be used in development
// In production, this should be disabled or protected

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
  // Check for a secret key to prevent accidental seeding
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== 'seed-daycare-demo') {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    // 1. Create the classroom
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .insert({
        name: 'Sunshine Room',
        capacity: 12,
        age_group: 'Toddlers (1-2)',
        is_active: true
      })
      .select()
      .single()

    if (classroomError) throw classroomError

    // 2. Create teacher account
    const { data: teacherAuth, error: teacherAuthError } = await supabase.auth.admin.createUser({
      email: 'teacher@mommyandme.demo',
      password: 'demo1234',
      email_confirm: true,
      user_metadata: { full_name: 'Ms. Sarah Johnson', role: 'teacher' }
    })

    if (teacherAuthError) throw teacherAuthError

    // Create teacher profile
    await supabase.from('profiles').insert({
      id: teacherAuth.user.id,
      email: 'teacher@mommyandme.demo',
      full_name: 'Ms. Sarah Johnson',
      role: 'teacher'
    })

    // Assign teacher to classroom
    await supabase.from('teacher_assignments').insert({
      teacher_id: teacherAuth.user.id,
      classroom_id: classroom.id,
      is_primary: true
    })

    // 3. Create children and parents
    const childrenData = [
      { first: 'Emma', last: 'Wilson', dob: '2023-03-15', allergies: ['peanuts'], parentName: 'Jessica Wilson', parentEmail: 'jessica@demo.com' },
      { first: 'Liam', last: 'Garcia', dob: '2023-05-22', allergies: [], parentName: 'Maria Garcia', parentEmail: 'maria@demo.com' },
      { first: 'Olivia', last: 'Chen', dob: '2023-01-10', allergies: ['dairy'], parentName: 'David Chen', parentEmail: 'david@demo.com' },
      { first: 'Noah', last: 'Patel', dob: '2023-07-08', allergies: [], parentName: 'Priya Patel', parentEmail: 'priya@demo.com' },
      { first: 'Ava', last: 'Thompson', dob: '2023-02-28', allergies: [], parentName: 'Michael Thompson', parentEmail: 'michael@demo.com' },
      { first: 'Ethan', last: 'Brown', dob: '2023-04-12', allergies: ['eggs'], parentName: 'Sarah Brown', parentEmail: 'sarahb@demo.com' },
      { first: 'Sophia', last: 'Martinez', dob: '2023-06-30', allergies: [], parentName: 'Carlos Martinez', parentEmail: 'carlos@demo.com' },
      { first: 'Lucas', last: 'Anderson', dob: '2023-08-18', allergies: [], parentName: 'Emily Anderson', parentEmail: 'emily@demo.com' },
    ]

    const children: { id: string; first_name: string; parentId: string }[] = []

    for (const child of childrenData) {
      // Create parent auth user
      const { data: parentAuth, error: parentAuthError } = await supabase.auth.admin.createUser({
        email: child.parentEmail,
        password: 'demo1234',
        email_confirm: true,
        user_metadata: { full_name: child.parentName, role: 'parent' }
      })

      if (parentAuthError) {
        console.error('Parent auth error:', parentAuthError)
        continue
      }

      // Create parent profile
      await supabase.from('profiles').insert({
        id: parentAuth.user.id,
        email: child.parentEmail,
        full_name: child.parentName,
        role: 'parent'
      })

      // Create child
      const { data: childRecord, error: childError } = await supabase
        .from('children')
        .insert({
          first_name: child.first,
          last_name: child.last,
          date_of_birth: child.dob,
          classroom_id: classroom.id,
          parent_id: parentAuth.user.id,
          allergies: child.allergies,
          current_status: 'checked_in',
          checked_in_at: new Date().toISOString()
        })
        .select()
        .single()

      if (childError) {
        console.error('Child error:', childError)
        continue
      }

      children.push({
        id: childRecord.id,
        first_name: child.first,
        parentId: parentAuth.user.id
      })
    }

    // 4. Create realistic activity logs for today
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const activities: {
      child_id: string
      author_id: string
      type: string
      description: string
      metadata: Record<string, unknown>
      created_at: string
    }[] = []

    for (const child of children) {
      // Breakfast (8:30 AM)
      const breakfastTime = new Date(today)
      breakfastTime.setHours(8, 30, 0)
      activities.push({
        child_id: child.id,
        author_id: teacherAuth.user.id,
        type: 'meal',
        description: 'Breakfast - scrambled eggs, toast, and fruit',
        metadata: { meal_type: 'breakfast', meal_percentage: [75, 100, 50, 100][Math.floor(Math.random() * 4)] },
        created_at: breakfastTime.toISOString()
      })

      // Mid-morning potty (10:00 AM)
      const pottyTime1 = new Date(today)
      pottyTime1.setHours(10, 0, 0)
      activities.push({
        child_id: child.id,
        author_id: teacherAuth.user.id,
        type: 'potty',
        description: 'Diaper change',
        metadata: { potty_type: ['wet', 'bm', 'both'][Math.floor(Math.random() * 3)] },
        created_at: pottyTime1.toISOString()
      })

      // Lunch (11:30 AM)
      const lunchTime = new Date(today)
      lunchTime.setHours(11, 30, 0)
      activities.push({
        child_id: child.id,
        author_id: teacherAuth.user.id,
        type: 'meal',
        description: 'Lunch - chicken nuggets, peas, and applesauce',
        metadata: { meal_type: 'lunch', meal_percentage: [50, 75, 100, 75][Math.floor(Math.random() * 4)] },
        created_at: lunchTime.toISOString()
      })

      // Nap time (12:30-2:30 PM)
      const napStartTime = new Date(today)
      napStartTime.setHours(12, 30, 0)
      activities.push({
        child_id: child.id,
        author_id: teacherAuth.user.id,
        type: 'nap',
        description: 'Nap time started',
        metadata: { status: 'started' },
        created_at: napStartTime.toISOString()
      })

      const napEndTime = new Date(today)
      const napDuration = 60 + Math.floor(Math.random() * 60) // 60-120 minutes
      napEndTime.setHours(12, 30 + napDuration, 0)
      activities.push({
        child_id: child.id,
        author_id: teacherAuth.user.id,
        type: 'nap',
        description: `Woke up after ${napDuration} minutes`,
        metadata: { status: 'ended', nap_duration: napDuration },
        created_at: napEndTime.toISOString()
      })

      // Afternoon snack (3:00 PM)
      const snackTime = new Date(today)
      snackTime.setHours(15, 0, 0)
      activities.push({
        child_id: child.id,
        author_id: teacherAuth.user.id,
        type: 'meal',
        description: 'Afternoon snack - crackers and cheese',
        metadata: { meal_type: 'snack', meal_percentage: [75, 100][Math.floor(Math.random() * 2)] },
        created_at: snackTime.toISOString()
      })

      // Afternoon potty (3:30 PM)
      const pottyTime2 = new Date(today)
      pottyTime2.setHours(15, 30, 0)
      activities.push({
        child_id: child.id,
        author_id: teacherAuth.user.id,
        type: 'potty',
        description: 'Diaper change',
        metadata: { potty_type: ['wet', 'wet', 'bm'][Math.floor(Math.random() * 3)] },
        created_at: pottyTime2.toISOString()
      })

      // Mood check (random time)
      const moodTime = new Date(today)
      moodTime.setHours(14, Math.floor(Math.random() * 60), 0)
      const moods = ['happy', 'energetic', 'happy', 'tired']
      activities.push({
        child_id: child.id,
        author_id: teacherAuth.user.id,
        type: 'mood',
        description: `${child.first_name} is having a great day!`,
        metadata: { mood: moods[Math.floor(Math.random() * moods.length)] },
        created_at: moodTime.toISOString()
      })
    }

    // Add some group photos
    const photoTime1 = new Date(today)
    photoTime1.setHours(9, 30, 0)

    const photoTime2 = new Date(today)
    photoTime2.setHours(14, 0, 0)

    // Circle time photo for first 4 kids
    for (let i = 0; i < 4 && i < children.length; i++) {
      activities.push({
        child_id: children[i].id,
        author_id: teacherAuth.user.id,
        type: 'photo',
        description: 'Circle time fun! Learning our ABCs together.',
        metadata: { group_activity: 'circle_time' },
        created_at: photoTime1.toISOString()
      })
    }

    // Art project photo for last 4 kids
    for (let i = 4; i < children.length; i++) {
      activities.push({
        child_id: children[i].id,
        author_id: teacherAuth.user.id,
        type: 'photo',
        description: 'Art time! We painted beautiful pictures today.',
        metadata: { group_activity: 'art' },
        created_at: photoTime2.toISOString()
      })
    }

    // Insert all activities
    const { error: activitiesError } = await supabase
      .from('activity_logs')
      .insert(activities as never)

    if (activitiesError) throw activitiesError

    // 5. Create some messages between the first parent and teacher
    if (children.length > 0) {
      const firstChild = children[0]
      const messages = [
        {
          sender_id: firstChild.parentId,
          recipient_id: teacherAuth.user.id,
          child_context_id: firstChild.id,
          content: "Hi Ms. Sarah! Just wanted to let you know Emma had a bit of a rough night, so she might be a little tired today.",
          is_read: true,
          is_queued: false,
          deliver_at: new Date(today.getTime() + 7 * 60 * 60 * 1000).toISOString(), // 7 AM
          created_at: new Date(today.getTime() + 7 * 60 * 60 * 1000).toISOString()
        },
        {
          sender_id: teacherAuth.user.id,
          recipient_id: firstChild.parentId,
          child_context_id: firstChild.id,
          content: "Thanks for letting me know, Jessica! I'll keep an eye on her and make sure she gets some extra rest during nap time if she needs it. 💕",
          is_read: true,
          is_queued: false,
          deliver_at: new Date(today.getTime() + 8 * 60 * 60 * 1000).toISOString(), // 8 AM
          created_at: new Date(today.getTime() + 8 * 60 * 60 * 1000).toISOString()
        },
        {
          sender_id: teacherAuth.user.id,
          recipient_id: firstChild.parentId,
          child_context_id: firstChild.id,
          content: "Quick update - Emma is doing great! She ate all her breakfast and is playing happily with Olivia.",
          is_read: true,
          is_queued: false,
          deliver_at: new Date(today.getTime() + 9.5 * 60 * 60 * 1000).toISOString(), // 9:30 AM
          created_at: new Date(today.getTime() + 9.5 * 60 * 60 * 1000).toISOString()
        },
        {
          sender_id: firstChild.parentId,
          recipient_id: teacherAuth.user.id,
          child_context_id: firstChild.id,
          content: "That's so wonderful to hear! Thank you for the update. Can't wait to see her later!",
          is_read: false,
          is_queued: false,
          deliver_at: new Date(today.getTime() + 10 * 60 * 60 * 1000).toISOString(), // 10 AM
          created_at: new Date(today.getTime() + 10 * 60 * 60 * 1000).toISOString()
        }
      ]

      await supabase.from('messages').insert(messages as never)
    }

    return NextResponse.json({
      success: true,
      data: {
        classroom: classroom,
        teacherEmail: 'teacher@mommyandme.demo',
        teacherPassword: 'demo1234',
        children: children.length,
        activities: activities.length,
        parentAccounts: childrenData.map(c => ({
          email: c.parentEmail,
          password: 'demo1234',
          childName: `${c.first} ${c.last}`
        }))
      }
    })

  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
