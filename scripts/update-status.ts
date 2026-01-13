
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface EventRow {
  id: number;
  event_title: string;
  period: string;
  status: string;
}

// Utility to parse dates
function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const parts = dateStr.trim().split('.');
    if (parts.length === 3) {
        return new Date(
            parseInt(parts[0]),
            parseInt(parts[1]) - 1,
            parseInt(parts[2])
        );
    }
    return null;
}

async function updateEventStatuses() {
  console.log('Starting daily status update...');

  // Fetch all events that are NOT '종료' (Completed)
  const { data: events, error } = await supabase
    .from('events')
    .select('id, event_title, period, status')
    .neq('status', '종료');

  if (error) {
    console.error('Error fetching events:', error);
    return;
  }

  // Use KST (UTC+9) for date calculations
  const now = new Date();
  const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const today = new Date(kstNow);
  today.setUTCHours(0, 0, 0, 0); // Normalize to start of day in KST

  console.log('Time check (KST):', kstNow.toISOString());

  let updatedCount = 0;

  for (const event of events as EventRow[]) {
    if (!event.period) continue;
    
    // Check format: "Start ~ End"
    const periodParts = event.period.split('~');
    if (periodParts.length < 1) continue;

    const startDate = parseDate(periodParts[0]);
    let endDate: Date | null = null;
    
    if (periodParts.length > 1) {
        // Handle "소진 시" (Until sold out)
        if (!periodParts[1].includes('소진')) {
            endDate = parseDate(periodParts[1]);
            if (endDate) {
                // Set end date to end of that day (23:59:59) in KST
                endDate.setHours(23, 59, 59, 999);
            }
        }
    }

    let newStatus = event.status;

    // Logic 1: '예정' -> '진행중'
    if (event.status === '예정' && startDate) {
        if (kstNow >= startDate) {
            newStatus = '진행중';
        }
    }

    // Logic 2: '진행중' -> '종료'
    if (event.status === '진행중' && endDate) {
        if (kstNow > endDate) {
            newStatus = '종료';
        }
    }

    // Update if changed
    if (newStatus !== event.status) {
        console.log(`Updating "${event.event_title}": ${event.status} -> ${newStatus}`);
        const { error: updateError } = await supabase
            .from('events')
            .update({ status: newStatus })
            .eq('id', event.id);
        
        if (updateError) {
            console.error(`Failed to update event ${event.id}:`, updateError);
        } else {
            updatedCount++;
        }
    }
  }

  console.log(`Status update complete. Updated ${updatedCount} events.`);
}

updateEventStatuses()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
