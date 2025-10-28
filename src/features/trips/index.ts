/**
 * Trips Feature
 * 
 * Handles trip management, history, details, and summaries.
 */

// Screens
export { default as TripsScreen } from './screens/TripsScreen';
export { default as TripDetailScreen } from './screens/TripDetailScreen';
export { default as TripSummaryScreen } from './screens/TripSummaryScreen';
export { default as ActiveTripScreen } from './screens/ActiveTripScreen';

// Services
export * from './services/trips.service';
export * from './services/trip-tracker';
export * from './services/trip-database.service';

