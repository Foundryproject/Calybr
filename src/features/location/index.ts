/**
 * Location Feature
 * 
 * Handles GPS tracking, automatic trip detection, and location permissions.
 */

// Screens
export { default as DriveScreen } from './screens/DriveScreen';
export { default as BackgroundLocationTestScreen } from './screens/BackgroundLocationTestScreen';

// Components
export { default as LocationPermissionModal } from './components/LocationPermissionModal';

// Services
export * from './services/auto-trip-detection.service';
export * from './services/auto-trip-manager';
export * from './services/background-location.service';
export * from './services/drive-tracking.service';

