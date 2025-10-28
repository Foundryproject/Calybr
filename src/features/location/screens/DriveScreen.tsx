import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView, ActivityIndicator, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { Colors, Typography, Spacing, BorderRadius, Shadow } from "../../../utils/theme";
import { driveTrackingService, DriveState, DrivingEvent } from "../services/drive-tracking.service";

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export default function DriveScreen() {
  const mapRef = useRef<MapView>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [driveState, setDriveState] = useState<DriveState>(driveTrackingService.getState());
  const [destinationSearch, setDestinationSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const [isLoadingPlace, setIsLoadingPlace] = useState(false);
  const [region] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    // Subscribe to drive tracking updates
    const unsubscribe = driveTrackingService.subscribe((state) => {
      setDriveState(state);
      
      // Only animate to user location if following and tracking
      if (state.isTracking && state.lastLocation && isFollowingUser && mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: state.lastLocation.coords.latitude,
          longitude: state.lastLocation.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
    });

    return () => unsubscribe();
  }, [isFollowingUser]);

  const handleStartDrive = async () => {
    const success = await driveTrackingService.startTracking(driveState.destination || undefined);
    if (!success) {
      console.error("Failed to start tracking");
    }
  };

  const handleStopDrive = async () => {
    const metrics = await driveTrackingService.stopTracking();
    console.log("Trip completed", metrics);
    // TODO: Navigate to trip summary screen
  };

  // Search for places using Google Places Autocomplete
  const searchPlaces = async (query: string) => {
    if (!query || query.length < 2) {
      setPredictions([]);
      return;
    }

    try {
      const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!GOOGLE_MAPS_API_KEY) {
        console.error("Google Maps API key not found");
        return;
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?` +
        `input=${encodeURIComponent(query)}&` +
        `key=${GOOGLE_MAPS_API_KEY}&` +
        `components=country:us` // Optional: restrict to specific country
      );

      const data = await response.json();
      
      if (data.status === "OK" && data.predictions) {
        setPredictions(data.predictions);
      } else {
        setPredictions([]);
      }
    } catch (error) {
      console.error("Failed to search places:", error);
      setPredictions([]);
    }
  };

  // Get place details and set as destination
  const selectPlace = async (placeId: string, description: string) => {
    try {
      setIsLoadingPlace(true);
      const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      if (!GOOGLE_MAPS_API_KEY) {
        console.error("Google Maps API key not found");
        return;
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?` +
        `place_id=${placeId}&` +
        `fields=geometry,formatted_address&` +
        `key=${GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();
      
      if (data.status === "OK" && data.result) {
        const { location } = data.result.geometry;
        
        // Set destination in service
        await driveTrackingService.setDestination(
          location.lat,
          location.lng,
          description
        );

        // Clear search and predictions
        setDestinationSearch("");
        setPredictions([]);
        setIsSearching(false);
        Keyboard.dismiss();

        // Animate map to destination
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: location.lat,
            longitude: location.lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }, 1000);
        }
      }
    } catch (error) {
      console.error("Failed to get place details:", error);
    } finally {
      setIsLoadingPlace(false);
    }
  };

  // Handle search input change with debounce
  const handleSearchChange = (text: string) => {
    setDestinationSearch(text);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout
    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(text);
    }, 300); // 300ms debounce
  };

  // Clear search and destination
  const clearDestination = () => {
    setDestinationSearch("");
    setPredictions([]);
    setIsSearching(false);
    driveTrackingService.setDestination(0, 0); // Clear destination
    Keyboard.dismiss();
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDistance = (meters: number): string => {
    const km = meters / 1000;
    return `${km.toFixed(1)} km`;
  };

  const getEventMarkerColor = (severity: string): string => {
    switch (severity) {
      case 'high':
        return Colors.error;
      case 'medium':
        return Colors.warning;
      default:
        return Colors.scoreGood;
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return Colors.scoreGreat;
    if (score >= 75) return Colors.scoreGood;
    if (score >= 60) return Colors.scoreNeedsFocus;
    return Colors.scorePoor;
  };

  return (
    <View style={styles.container}>
      {/* Google Maps */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass
        loadingEnabled
        onPanDrag={() => setIsFollowingUser(false)}
      >
        {/* Route Polyline */}
        {driveState.metrics.route.length > 1 && (
          <Polyline
            coordinates={driveState.metrics.route.map((point) => ({
              latitude: point.latitude,
              longitude: point.longitude,
            }))}
            strokeColor={getScoreColor(driveState.metrics.score)}
            strokeWidth={5}
          />
        )}

        {/* Event Markers */}
        {driveState.metrics.events.map((event: DrivingEvent) => (
          <Marker
            key={event.id}
            coordinate={event.location}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={[
                styles.eventMarker,
                { backgroundColor: getEventMarkerColor(event.severity) },
              ]}
            >
              <Ionicons name="warning" size={16} color="#FFFFFF" />
            </View>
          </Marker>
        ))}

        {/* Destination Marker */}
        {driveState.destination && (
          <Marker
            coordinate={{
              latitude: driveState.destination.latitude,
              longitude: driveState.destination.longitude,
            }}
            title="Destination"
            description={driveState.destination.address}
          />
        )}
      </MapView>

      {/* Search Bar at Top */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        {!driveState.isTracking ? (
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={Colors.textSecondary} style={{ marginRight: Spacing.sm }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Where to?"
                placeholderTextColor={Colors.textSecondary}
                value={destinationSearch}
                onChangeText={handleSearchChange}
                onFocus={() => setIsSearching(true)}
                returnKeyType="search"
              />
              {destinationSearch.length > 0 && (
                <Pressable onPress={clearDestination}>
                  <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.statsContainer}>
            {/* Speed */}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{driveState.metrics.currentSpeed.toFixed(0)}</Text>
              <Text style={styles.statLabel}>km/h</Text>
            </View>

            {/* Score */}
            <View style={[styles.statItem, styles.scoreItem]}>
              <View
                style={[
                  styles.scoreBadge,
                  { backgroundColor: getScoreColor(driveState.metrics.score) },
                ]}
              >
                <Text style={styles.scoreValue}>{driveState.metrics.score}</Text>
              </View>
              <Text style={styles.statLabel}>Score</Text>
            </View>

            {/* Distance */}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatDistance(driveState.metrics.distance)}</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
          </View>
        )}
      </SafeAreaView>

      {/* Search Results Overlay */}
      {isSearching && predictions.length > 0 && (
        <View style={styles.searchResultsContainer}>
          <ScrollView style={styles.searchResults} keyboardShouldPersistTaps="handled">
            {predictions.map((prediction) => (
              <Pressable
                key={prediction.place_id}
                style={styles.predictionItem}
                onPress={() => selectPlace(prediction.place_id, prediction.description)}
                disabled={isLoadingPlace}
              >
                <Ionicons name="location" size={20} color={Colors.textSecondary} />
                <View style={styles.predictionText}>
                  <Text style={styles.predictionMainText}>
                    {prediction.structured_formatting.main_text}
                  </Text>
                  <Text style={styles.predictionSecondaryText}>
                    {prediction.structured_formatting.secondary_text}
                  </Text>
                </View>
                {isLoadingPlace && <ActivityIndicator size="small" color={Colors.primary} />}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ETA Card (if destination set) */}
      {driveState.isTracking && driveState.destination && driveState.eta && (
        <View style={styles.etaCard}>
          <View style={styles.etaContent}>
            <Ionicons name="navigate" size={24} color={Colors.primary} />
            <View style={styles.etaDetails}>
              <Text style={styles.etaTime}>{formatDuration(driveState.eta.duration)}</Text>
              <Text style={styles.etaLabel}>
                {formatDistance(driveState.eta.distance)} • {driveState.destination.address || "Destination"}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Bottom Control Panel */}
      <SafeAreaView style={styles.bottomPanel} edges={['bottom']}>
        {!driveState.isTracking ? (
          <View style={styles.controlsContainer}>
            {/* Start Drive Button */}
            <Pressable 
              style={[styles.startButton, !driveState.destination && styles.startButtonDisabled]} 
              onPress={handleStartDrive}
              disabled={!driveState.destination}
            >
              <Ionicons name="play" size={28} color={Colors.textPrimary} />
              <Text style={styles.startButtonText}>
                {driveState.destination ? "Start Drive" : "Select destination to start"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.controlsContainer}>
            {/* Trip Info */}
            <View style={styles.tripInfoRow}>
              <View style={styles.tripInfoItem}>
                <Ionicons name="time-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.tripInfoText}>{formatDuration(driveState.metrics.duration)}</Text>
              </View>
              <View style={styles.tripInfoItem}>
                <Ionicons name="warning-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.tripInfoText}>{driveState.metrics.events.length} events</Text>
              </View>
            </View>

            {/* Stop Button */}
            <Pressable style={styles.stopButton} onPress={handleStopDrive}>
              <Ionicons name="stop" size={24} color="#FFFFFF" />
              <Text style={styles.stopButtonText}>End Drive</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>

      {/* Recenter Button */}
      {driveState.lastLocation && (
        <Pressable
          style={[styles.recenterButton, isFollowingUser && { backgroundColor: Colors.primary }]}
          onPress={() => {
            setIsFollowingUser(true);
            if (mapRef.current && driveState.lastLocation) {
              mapRef.current.animateToRegion({
                latitude: driveState.lastLocation.coords.latitude,
                longitude: driveState.lastLocation.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }, 500);
            }
          }}
        >
          <Ionicons name="locate" size={24} color={Colors.textPrimary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  eventMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
  },
  statsContainer: {
    backgroundColor: Colors.background,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    flexDirection: "row",
    justifyContent: "space-around",
    ...Shadow.medium,
  },
  welcomeContainer: {
    flex: 1,
    alignItems: "center",
  },
  welcomeText: {
    fontSize: Typography.h3.fontSize,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  welcomeSubtext: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  statItem: {
    alignItems: "center",
  },
  scoreItem: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: Spacing.lg,
  },
  scoreBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  etaCard: {
    position: "absolute",
    top: 140,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    ...Shadow.medium,
  },
  etaContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  etaDetails: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  etaTime: {
    fontSize: Typography.h2.fontSize,
    fontWeight: "700",
    color: Colors.primary,
  },
  etaLabel: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
  },
  controlsContainer: {
    backgroundColor: Colors.background,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.large,
    padding: Spacing.xl,
    ...Shadow.medium,
  },
  destinationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.lg,
  },
  destinationText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
    marginLeft: Spacing.md,
  },
  startButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.pill,
  },
  startButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  tripInfoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: Spacing.lg,
  },
  tripInfoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  tripInfoText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
    fontWeight: "600",
  },
  stopButton: {
    backgroundColor: Colors.error,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.pill,
  },
  stopButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: Spacing.sm,
  },
  recenterButton: {
    position: "absolute",
    right: Spacing.lg,
    bottom: 220,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    ...Shadow.medium,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    ...Shadow.medium,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.body.fontSize,
    color: Colors.textPrimary,
    padding: 0,
  },
  searchResultsContainer: {
    position: "absolute",
    top: 100,
    left: Spacing.lg,
    right: Spacing.lg,
    maxHeight: 400,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.medium,
    ...Shadow.medium,
    overflow: "hidden",
  },
  searchResults: {
    flex: 1,
  },
  predictionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  predictionText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  predictionMainText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  predictionSecondaryText: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.textSecondary,
  },
  startButtonDisabled: {
    backgroundColor: Colors.divider,
    opacity: 0.6,
  },
});
