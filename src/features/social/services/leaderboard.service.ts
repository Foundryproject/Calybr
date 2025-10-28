import { supabase } from '../../../lib/supabase';

/**
 * Leaderboard Service
 * Handles all leaderboard-related database operations
 */

export interface LeaderboardUser {
  userId: string;
  name: string;
  score: number;
  city?: string;
  country?: string;
  carMake: string;
  carModel: string;
  carYear: number;
  drivingStreak: number;
  totalTrips: number;
  memberSince: string;
  rank: number;
  level: number;
  achievements: string[];
}

export type TimeFilter = 'week' | 'month' | 'all';

/**
 * Get city leaderboard
 */
export async function getCityLeaderboard(
  city?: string,
  _timeFilter: TimeFilter = 'all', // TODO: Implement time filtering
  limit: number = 100
): Promise<{ data: LeaderboardUser[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // If no city specified, get the current user's city
    let targetCity = city;
    if (!targetCity && user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('city')
        .eq('id', user.id)
        .single();
      
      targetCity = profile?.city || 'San Francisco';
    }

    let query = supabase
      .from('leaderboard_city')
      .select('*')
      .eq('city', targetCity || 'San Francisco')
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching city leaderboard:', error);
      return { data: null, error };
    }

    // Transform to app format
    const leaderboard: LeaderboardUser[] = (data || []).map((entry: any) => ({
      userId: entry.user_id,
      name: entry.name,
      score: entry.overall_score,
      city: entry.city,
      carMake: entry.car_make || 'Unknown',
      carModel: entry.car_model || 'Car',
      carYear: entry.car_year || 2020,
      drivingStreak: entry.driving_streak,
      totalTrips: entry.total_trips,
      memberSince: entry.member_since,
      rank: entry.rank,
      level: calculateLevel(entry.overall_score, entry.total_trips),
      achievements: generateAchievements(entry),
    }));

    return { data: leaderboard, error: null };
  } catch (error) {
    console.error('Error in getCityLeaderboard:', error);
    return { data: null, error };
  }
}

/**
 * Get country leaderboard
 */
export async function getCountryLeaderboard(
  country?: string,
  _timeFilter: TimeFilter = 'all', // TODO: Implement time filtering
  limit: number = 100
): Promise<{ data: LeaderboardUser[] | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // If no country specified, get the current user's country
    let targetCountry = country;
    if (!targetCountry && user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('country')
        .eq('id', user.id)
        .single();
      
      targetCountry = profile?.country || 'USA';
    }

    let query = supabase
      .from('leaderboard_country')
      .select('*')
      .eq('country', targetCountry || 'USA')
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching country leaderboard:', error);
      return { data: null, error };
    }

    // Transform to app format
    const leaderboard: LeaderboardUser[] = (data || []).map((entry: any) => ({
      userId: entry.user_id,
      name: entry.name,
      score: entry.overall_score,
      country: entry.country,
      carMake: entry.car_make || 'Unknown',
      carModel: entry.car_model || 'Car',
      carYear: entry.car_year || 2020,
      drivingStreak: entry.driving_streak,
      totalTrips: entry.total_trips,
      memberSince: entry.member_since,
      rank: entry.rank,
      level: calculateLevel(entry.overall_score, entry.total_trips),
      achievements: generateAchievements(entry),
    }));

    return { data: leaderboard, error: null };
  } catch (error) {
    console.error('Error in getCountryLeaderboard:', error);
    return { data: null, error };
  }
}

/**
 * Get user's rank in city leaderboard
 */
export async function getUserCityRank(): Promise<{ data: number | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('city')
      .eq('id', user.id)
      .single();

    if (!profile?.city) {
      return { data: null, error: { message: 'User city not set' } };
    }

    const { data, error } = await supabase
      .from('leaderboard_city')
      .select('rank')
      .eq('user_id', user.id)
      .eq('city', profile.city)
      .single();

    if (error) {
      console.error('Error fetching user city rank:', error);
      return { data: null, error };
    }

    return { data: data?.rank || null, error: null };
  } catch (error) {
    console.error('Error in getUserCityRank:', error);
    return { data: null, error };
  }
}

/**
 * Get user's rank in country leaderboard
 */
export async function getUserCountryRank(): Promise<{ data: number | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('country')
      .eq('id', user.id)
      .single();

    if (!profile?.country) {
      return { data: null, error: { message: 'User country not set' } };
    }

    const { data, error } = await supabase
      .from('leaderboard_country')
      .select('rank')
      .eq('user_id', user.id)
      .eq('country', profile.country)
      .single();

    if (error) {
      console.error('Error fetching user country rank:', error);
      return { data: null, error };
    }

    return { data: data?.rank || null, error: null };
  } catch (error) {
    console.error('Error in getUserCountryRank:', error);
    return { data: null, error };
  }
}

// Helper functions

function calculateLevel(score: number, totalTrips: number): number {
  if (score >= 950 && totalTrips >= 100) return 5; // Master
  if (score >= 900 && totalTrips >= 50) return 4;  // Expert
  if (score >= 850 && totalTrips >= 20) return 3;  // Advanced
  if (score >= 800 && totalTrips >= 5) return 2;   // Intermediate
  return 1; // Rookie
}

function generateAchievements(entry: any): string[] {
  const achievements: string[] = [];

  if (entry.driving_streak >= 30) {
    achievements.push('30-Day Streak');
  } else if (entry.driving_streak >= 7) {
    achievements.push('7-Day Streak');
  }

  if (entry.overall_score >= 950) {
    achievements.push('Perfect Driver');
  } else if (entry.overall_score >= 900) {
    achievements.push('Safe Driver');
  }

  if (entry.total_trips >= 100) {
    achievements.push('Century Club');
  } else if (entry.total_trips >= 50) {
    achievements.push('Frequent Driver');
  }

  // Calculate days since member
  const memberSince = new Date(entry.member_since);
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - memberSince.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSince >= 365) {
    achievements.push('1 Year Member');
  } else if (daysSince >= 180) {
    achievements.push('6 Month Member');
  }

  return achievements.slice(0, 3); // Max 3 achievements
}
