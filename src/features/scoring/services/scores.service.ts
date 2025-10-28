import { supabase } from '../../../lib/supabase';
import type { DriverScore, ScoreMetric } from '../../../types/drive';

/**
 * Scores Service
 * Handles all driver score-related database operations
 */

export interface DriverScoreData {
  overall_score: number;
  week_delta: number;
  speeding_score: number;
  hard_brakes_score: number;
  phone_distraction_score: number;
  cornering_score: number;
  night_driving_score: number;
  highway_score: number;
  total_trips: number;
  driving_streak: number;
  level: number;
}

const createMetric = (name: string, score: number, icon: string, advice: string): ScoreMetric => ({
  name,
  score,
  trend: 'stable' as const,
  percentile: Math.round((score / 1000) * 100),
  advice,
  icon,
});

/**
 * Get the current user's driver score
 */
export async function getUserScore(): Promise<{ data: DriverScore | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated' } };

    const { data, error } = await supabase
      .from('driver_scores')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) return { data: null, error };
    if (!data) return { data: null, error: { message: 'Score not found' } };

    return {
      data: {
        overall: data.overall_score,
        delta: data.week_delta,
        metrics: {
          speeding: createMetric('Speeding', data.speeding_score, 'car', "Maintain speed limits"),
          hardBrakes: createMetric('Hard Brakes', data.hard_brakes_score, 'alert-circle', "Anticipate stops"),
          phoneDistraction: createMetric('Phone Use', data.phone_distraction_score, 'phone-portrait', "Hands-free only"),
          cornering: createMetric('Cornering', data.cornering_score, 'git-branch', "Smooth turns"),
          nightDriving: createMetric('Night Driving', data.night_driving_score, 'moon', "Extra caution"),
          highway: createMetric('Highway', data.highway_score, 'speedometer', "Maintain safe distance"),
        },
        strengths: getStrengths(data),
        improvements: getImprovements(data),
        quickTip: getQuickTip(data),
      },
      error: null
    };
  } catch (error) {
    console.error('Error in getUserScore:', error);
    return { data: null, error };
  }
}

/**
 * Update or create user's driver score
 */
export async function updateUserScore(scoreData: Partial<DriverScoreData>): Promise<{ error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: 'User not authenticated' } };

    const { error } = await supabase
      .from('driver_scores')
      .upsert({
        user_id: user.id,
        ...scoreData,
        updated_at: new Date().toISOString(),
      });

    return { error };
  } catch (error) {
    console.error('Error in updateUserScore:', error);
    return { error };
  }
}

/**
 * Initialize a new driver score for a user
 */
export async function initializeUserScore(): Promise<{ error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: 'User not authenticated' } };

    const { error } = await supabase.from('driver_scores').insert({
      user_id: user.id,
      overall_score: 850,
      week_delta: 0,
      speeding_score: 850,
      hard_brakes_score: 850,
      phone_distraction_score: 850,
      cornering_score: 850,
      night_driving_score: 850,
      highway_score: 850,
      total_trips: 0,
      driving_streak: 0,
      level: 1,
    });

    return { error };
  } catch (error) {
    console.error('Error in initializeUserScore:', error);
    return { error };
  }
}

// Helper functions

const getStrengths = (data: DriverScoreData): string[] => 
  [
    { name: 'maintaining safe speeds', value: data.speeding_score },
    { name: 'smooth braking', value: data.hard_brakes_score },
    { name: 'avoiding phone use', value: data.phone_distraction_score },
    { name: 'controlled cornering', value: data.cornering_score },
    { name: 'night driving', value: data.night_driving_score },
    { name: 'highway driving', value: data.highway_score },
  ].sort((a, b) => b.value - a.value).slice(0, 3).map((s) => s.name);

const getImprovements = (data: DriverScoreData): string[] => 
  [
    { name: 'reducing speeding incidents', value: data.speeding_score },
    { name: 'gentler braking', value: data.hard_brakes_score },
    { name: 'avoiding phone distractions', value: data.phone_distraction_score },
    { name: 'smoother cornering', value: data.cornering_score },
    { name: 'night driving awareness', value: data.night_driving_score },
    { name: 'highway following distance', value: data.highway_score },
  ].sort((a, b) => a.value - b.value).slice(0, 2).map((s) => s.name);

const getQuickTip = (data: DriverScoreData): string => {
  const lowestScore = Math.min(
    data.speeding_score,
    data.hard_brakes_score,
    data.phone_distraction_score,
    data.cornering_score,
    data.night_driving_score,
    data.highway_score
  );

  if (lowestScore === data.speeding_score) {
    return "Watch your speed! Staying within limits improves safety and your score.";
  } else if (lowestScore === data.hard_brakes_score) {
    return "Anticipate stops early to avoid hard braking and improve comfort.";
  } else if (lowestScore === data.phone_distraction_score) {
    return "Put your phone away while driving. Use hands-free if needed.";
  } else if (lowestScore === data.cornering_score) {
    return "Take turns smoothly by reducing speed before the corner.";
  } else if (lowestScore === data.night_driving_score) {
    return "Drive slower at night and use high beams when appropriate.";
  } else if (lowestScore === data.highway_score) {
    return "Maintain a 3-second following distance on highways.";
  }

  return "Great driving! Keep up the consistent safe habits.";
};
