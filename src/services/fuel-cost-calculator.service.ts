/**
 * Fuel Cost Calculator Service
 *
 * Calculates trip costs based on:
 * - Distance traveled
 * - Vehicle fuel type
 * - Current fuel prices (national averages)
 * - Estimated MPG based on vehicle type
 */

export type FuelType = "Gasoline" | "Diesel" | "Electric" | "Hybrid";

// National average fuel prices (USD) - Updated regularly
export const FUEL_PRICES: Record<FuelType, number> = {
  Gasoline: 3.5, // per gallon
  Diesel: 4.0, // per gallon
  Electric: 0.15, // per kWh
  Hybrid: 3.5, // per gallon (gasoline equivalent)
};

// Average MPG/MPGe by vehicle type and fuel type
export const MPG_ESTIMATES: Record<string, Record<FuelType, number>> = {
  Sedan: {
    Gasoline: 30,
    Diesel: 35,
    Electric: 100, // MPGe
    Hybrid: 50,
  },
  SUV: {
    Gasoline: 22,
    Diesel: 28,
    Electric: 85, // MPGe
    Hybrid: 35,
  },
  Pickup: {
    Gasoline: 18,
    Diesel: 22,
    Electric: 70, // MPGe
    Hybrid: 28,
  },
  Coupe: {
    Gasoline: 28,
    Diesel: 33,
    Electric: 95, // MPGe
    Hybrid: 45,
  },
  Convertible: {
    Gasoline: 26,
    Diesel: 31,
    Electric: 90, // MPGe
    Hybrid: 42,
  },
  Hatchback: {
    Gasoline: 32,
    Diesel: 38,
    Electric: 110, // MPGe
    Hybrid: 55,
  },
  Wagon: {
    Gasoline: 27,
    Diesel: 32,
    Electric: 95, // MPGe
    Hybrid: 45,
  },
  Minivan: {
    Gasoline: 22,
    Diesel: 26,
    Electric: 80, // MPGe
    Hybrid: 35,
  },
};

export interface TripCostBreakdown {
  totalCost: number;
  fuelUsed: number; // Gallons or kWh
  fuelPrice: number; // Price per unit
  mpg: number; // Miles per gallon/kWh
  distance: number; // Miles
  fuelType: FuelType;
  vehicleType: string;
}

/**
 * Calculate trip cost based on vehicle specs and distance
 */
export function calculateTripCost(distanceMiles: number, vehicleType: string, fuelType: FuelType): TripCostBreakdown {
  // Get MPG estimate for this vehicle type and fuel type
  const mpgForType = MPG_ESTIMATES[vehicleType];
  const mpg = mpgForType ? mpgForType[fuelType] : MPG_ESTIMATES.Sedan[fuelType];

  // Calculate fuel used
  const fuelUsed = distanceMiles / mpg;

  // Get fuel price
  const fuelPrice = FUEL_PRICES[fuelType];

  // Calculate total cost
  const totalCost = fuelUsed * fuelPrice;

  return {
    totalCost: Math.round(totalCost * 100) / 100, // Round to 2 decimals
    fuelUsed: Math.round(fuelUsed * 100) / 100,
    fuelPrice,
    mpg,
    distance: distanceMiles,
    fuelType,
    vehicleType,
  };
}

/**
 * Calculate monthly cost based on average weekly trips
 */
export function calculateMonthlyCost(avgWeeklyDistance: number, vehicleType: string, fuelType: FuelType): number {
  const weeklyCost = calculateTripCost(avgWeeklyDistance, vehicleType, fuelType).totalCost;
  return Math.round(weeklyCost * 4.33 * 100) / 100; // 4.33 weeks per month
}

/**
 * Calculate yearly cost based on average weekly trips
 */
export function calculateYearlyCost(avgWeeklyDistance: number, vehicleType: string, fuelType: FuelType): number {
  const weeklyCost = calculateTripCost(avgWeeklyDistance, vehicleType, fuelType).totalCost;
  return Math.round(weeklyCost * 52 * 100) / 100; // 52 weeks per year
}

/**
 * Compare costs between different fuel types (for educational purposes)
 */
export function compareFuelCosts(distanceMiles: number, vehicleType: string): Record<FuelType, TripCostBreakdown> {
  const fuelTypes: FuelType[] = ["Gasoline", "Diesel", "Electric", "Hybrid"];
  const comparison: Record<string, TripCostBreakdown> = {};

  fuelTypes.forEach((fuelType) => {
    comparison[fuelType] = calculateTripCost(distanceMiles, vehicleType, fuelType);
  });

  return comparison as Record<FuelType, TripCostBreakdown>;
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

/**
 * Get fuel efficiency rating (A+ to F)
 */
export function getFuelEfficiencyRating(mpg: number, fuelType: FuelType): string {
  if (fuelType === "Electric") {
    // MPGe ratings
    if (mpg >= 100) return "A+";
    if (mpg >= 85) return "A";
    if (mpg >= 70) return "B";
    if (mpg >= 60) return "C";
    if (mpg >= 50) return "D";
    return "F";
  } else {
    // Regular MPG ratings
    if (mpg >= 45) return "A+";
    if (mpg >= 35) return "A";
    if (mpg >= 28) return "B";
    if (mpg >= 22) return "C";
    if (mpg >= 18) return "D";
    return "F";
  }
}
