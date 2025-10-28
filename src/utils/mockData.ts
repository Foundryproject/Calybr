import { Trip, DriverScore, DriveEvent, WeeklySummary } from "../types/drive";

// Helper function to generate realistic route points between two locations
// This creates a path that looks like it follows roads
const generateRealisticRoute = (
  start: { lat: number; lon: number },
  end: { lat: number; lon: number },
  numPoints: number = 15
): Array<{ latitude: number; longitude: number }> => {
  const points = [];
  
  // Add start point
  points.push({ latitude: start.lat, longitude: start.lon });
  
  // Generate intermediate points with some variation to simulate road curves
  for (let i = 1; i < numPoints - 1; i++) {
    const progress = i / (numPoints - 1);
    
    // Linear interpolation
    const lat = start.lat + (end.lat - start.lat) * progress;
    const lon = start.lon + (end.lon - start.lon) * progress;
    
    // Add some random variation to simulate road curves (but keep it realistic)
    const latVariation = (Math.random() - 0.5) * 0.002; // ~220m max variation
    const lonVariation = (Math.random() - 0.5) * 0.002;
    
    // Add sinusoidal curves to simulate road bends
    const curveOffset = Math.sin(progress * Math.PI * 3) * 0.0015;
    
    points.push({
      latitude: lat + latVariation + curveOffset,
      longitude: lon + lonVariation,
    });
  }
  
  // Add end point
  points.push({ latitude: end.lat, longitude: end.lon });
  
  return points;
};

// San Francisco area coordinates
const HOME = { lat: 37.7749, lon: -122.4194 }; // SF Downtown
const OFFICE = { lat: 37.7899, lon: -122.4364 }; // Marina District
const GYM = { lat: 37.7694, lon: -122.4862 }; // Golden Gate Park area
const GROCERY = { lat: 37.7833, lon: -122.4167 }; // Nob Hill

// Generate mock events
const mockEvents: DriveEvent[] = [
  {
    id: "e1",
    type: "hard_brake",
    timestamp: 120,
    severity: "medium",
    location: { latitude: 37.7799, longitude: -122.4264 },
    description: "Hard brake detected",
    tip: "Try to anticipate stops earlier and brake more gradually",
    gForce: 0.8,
  },
  {
    id: "e2",
    type: "speeding",
    timestamp: 480,
    severity: "high",
    location: { latitude: 37.7849, longitude: -122.4304 },
    description: "Speed exceeded limit by 12 mph",
    tip: "Keep an eye on speed limit signs, especially in residential areas",
    speed: 52,
  },
  {
    id: "e3",
    type: "phone_distraction",
    timestamp: 720,
    severity: "high",
    location: { latitude: 37.7870, longitude: -122.4334 },
    description: "Phone was unlocked while moving",
    tip: "Enable Do Not Disturb while driving or use voice commands",
  },
  {
    id: "e4",
    type: "aggressive_corner",
    timestamp: 360,
    severity: "medium",
    location: { latitude: 37.7820, longitude: -122.4400 },
    description: "Sharp turn detected",
    tip: "Slow down before turns for smoother, safer cornering",
    gForce: 0.6,
  },
];

// Generate mock trips with realistic routes
export const mockTrips: Trip[] = [
  {
    id: "trip1",
    date: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    startTime: "8:32 AM",
    endTime: "8:56 AM",
    duration: 24,
    distance: 12.4,
    score: 78,
    estimatedCost: 4.13,
    startAddress: "Home",
    endAddress: "Downtown Office",
    events: [mockEvents[0], mockEvents[1]],
    route: generateRealisticRoute(HOME, OFFICE, 20),
  },
  {
    id: "trip2",
    date: new Date(Date.now() - 24 * 60 * 60 * 1000),
    startTime: "6:12 PM",
    endTime: "6:38 PM",
    duration: 26,
    distance: 13.1,
    score: 92,
    estimatedCost: 4.37,
    startAddress: "Downtown Office",
    endAddress: "Home",
    events: [],
    route: generateRealisticRoute(OFFICE, HOME, 18),
  },
  {
    id: "trip3",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    startTime: "8:45 AM",
    endTime: "9:12 AM",
    duration: 27,
    distance: 11.8,
    score: 65,
    estimatedCost: 3.93,
    startAddress: "Home",
    endAddress: "Gym",
    events: [mockEvents[0], mockEvents[2], mockEvents[3]],
    route: generateRealisticRoute(HOME, GYM, 22),
  },
  {
    id: "trip4",
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    startTime: "7:52 AM",
    endTime: "8:18 AM",
    duration: 26,
    distance: 12.9,
    score: 88,
    estimatedCost: 4.30,
    startAddress: "Home",
    endAddress: "Grocery Store",
    events: [mockEvents[0]],
    route: generateRealisticRoute(HOME, GROCERY, 16),
  },
  {
    id: "trip5",
    date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    startTime: "8:15 AM",
    endTime: "8:42 AM",
    duration: 27,
    distance: 13.5,
    score: 95,
    estimatedCost: 4.50,
    startAddress: "Home",
    endAddress: "Downtown Office",
    events: [],
    route: generateRealisticRoute(HOME, OFFICE, 25),
  },
  {
    id: "trip6",
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    startTime: "3:20 PM",
    endTime: "3:48 PM",
    duration: 28,
    distance: 14.2,
    score: 82,
    estimatedCost: 4.73,
    startAddress: "Office",
    endAddress: "Gym",
    events: [mockEvents[1]],
    route: generateRealisticRoute(OFFICE, GYM, 19),
  },
];

// Mock driver score
export const mockDriverScore: DriverScore = {
  overall: 882,
  delta: 50, // +50 vs last week
  metrics: {
    speeding: {
      name: "Speeding",
      score: 780,
      trend: "up",
      percentile: 72,
      advice: "You are speeding less than last week. Keep maintaining safe speeds.",
      icon: "speedometer-outline",
    },
    hardBrakes: {
      name: "Hard Brakes",
      score: 850,
      trend: "stable",
      percentile: 80,
      advice: "Your braking is smooth. Try to anticipate stops even earlier.",
      icon: "car-brake-alert",
    },
    phoneDistraction: {
      name: "Phone Use",
      score: 700,
      trend: "down",
      percentile: 65,
      advice: "Phone use while driving is up. Enable Do Not Disturb mode.",
      icon: "phone-off-outline",
    },
    cornering: {
      name: "Cornering",
      score: 900,
      trend: "up",
      percentile: 88,
      advice: "Excellent cornering! You are taking turns smoothly and safely.",
      icon: "turn-slight-right",
    },
    nightDriving: {
      name: "Night Driving",
      score: 820,
      trend: "stable",
      percentile: 75,
      advice: "Night driving is good. Stay extra alert during low visibility.",
      icon: "weather-night",
    },
    highway: {
      name: "Highway Driving",
      score: 880,
      trend: "up",
      percentile: 85,
      advice: "Great highway performance. Keep maintaining safe distances.",
      icon: "highway",
    },
  },
  strengths: ["Smooth cornering", "Excellent highway driving"],
  improvements: ["Reduce phone usage", "Watch speed in zones"],
  quickTip: "Try smoother braking this week by looking further ahead",
};

// Mock weekly summary
export const mockWeeklySummary: WeeklySummary = {
  week: "Oct 1 - Oct 7",
  reviewMoments: [
    {
      tripId: "trip1",
      thumbnail: "https://via.placeholder.com/100",
      timestamp: 120,
      eventType: "hard_brake",
    },
    {
      tripId: "trip3",
      thumbnail: "https://via.placeholder.com/100",
      timestamp: 480,
      eventType: "speeding",
    },
    {
      tripId: "trip3",
      thumbnail: "https://via.placeholder.com/100",
      timestamp: 720,
      eventType: "phone_distraction",
    },
  ],
  topImprovement: "Reduce phone use while driving",
  streaks: [
    {
      name: "No phone unlocks while moving",
      count: 3,
      active: false,
    },
    {
      name: "All trips above 80 score",
      count: 5,
      active: true,
    },
  ],
};

// Initialize mock data in store
export const initializeMockData = (setDriverScore: any, addTrip: any, setWeeklySummary: any) => {
  setDriverScore(mockDriverScore);
  mockTrips.forEach(trip => addTrip(trip));
  setWeeklySummary(mockWeeklySummary);
};
