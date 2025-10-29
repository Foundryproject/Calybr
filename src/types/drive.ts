// Calybr Types

export type EventType = 
  | "hard_brake" 
  | "speeding" 
  | "phone_distraction" 
  | "aggressive_corner"
  | "night_driving";

export interface DriveEvent {
  id: string;
  type: EventType;
  timestamp: number; // seconds from trip start
  severity: "low" | "medium" | "high";
  location: {
    latitude: number;
    longitude: number;
  };
  description: string;
  tip: string;
  speed?: number; // mph
  gForce?: number;
}

export interface Trip {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  distance: number; // miles
  score: number;
  estimatedCost: number; // dollars
  route: {
    latitude: number;
    longitude: number;
  }[];
  events: DriveEvent[];
  startAddress: string;
  endAddress: string;
  thumbnail?: string; // map thumbnail
  speedViolations?: {
    timestamp: Date;
    userSpeed: number;
    speedLimit: number;
    excessSpeed: number;
    severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  }[];
  speedStats?: {
    totalViolations: number;
    maxExcessSpeed: number;
    averageExcessSpeed: number;
  };
}

export interface ScoreMetric {
  name: string;
  score: number;
  trend: "up" | "down" | "stable";
  percentile: number; // vs similar drivers
  advice: string;
  icon: string;
}

export interface DriverScore {
  overall: number;
  delta: number; // vs last week
  metrics: {
    speeding: ScoreMetric;
    hardBrakes: ScoreMetric;
    phoneDistraction: ScoreMetric;
    cornering: ScoreMetric;
    nightDriving: ScoreMetric;
    highway: ScoreMetric;
  };
  strengths: string[]; // What you're doing well
  improvements: string[]; // What to improve
  quickTip: string;
}

export interface WeeklySummary {
  week: string;
  reviewMoments: {
    tripId: string;
    thumbnail: string;
    timestamp: number;
    eventType: EventType;
  }[];
  topImprovement: string;
  streaks: {
    name: string;
    count: number;
    active: boolean;
  }[];
}

export interface DashcamClip {
  id: string;
  tripId: string;
  eventId: string;
  startTime: number;
  endTime: number;
  videoUrl: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface UserPreferences {
  dashcamEnabled: boolean;
  blurFacesPlates: boolean;
  clipRetentionDays: 7 | 30 | 90;
  notificationsEnabled: boolean;
}
