import { DayStatistics, UserStatistics, PassengerBrief } from '@project-300/common-types';

// total miles driven / miles per gallon = total fuel usage.
// Use the equation total fuel used X 22 = CO2 emission.
// The average fuel economy for new 2017 model year cars, light trucks and SUVs in the United States was 24.9 mpgUS (9.4 L/100 km)
// To turn miles into kilometres we divide by 5 and multiply by 8.
export class Statistics {
	public static calcStatistics = (milesTravelled: number, driverId: string, passengers: PassengerBrief[]): Partial<DayStatistics> => {
		const kmTravelled: number = (milesTravelled / 5) * 8;
		const totalFuelUsage: number = kmTravelled / 9.4;
		const co2Emissions: number = totalFuelUsage * 22;

		const passengerCount: number = passengers.length;

		const passengerStats: UserStatistics[] = passengers.map((p): UserStatistics =>
			({
				userId: p.userId,
				emissions: co2Emissions,
				distance: kmTravelled,
				fuel: totalFuelUsage
			}));

		const driverStats: UserStatistics = {
			userId: driverId,
			emissions: co2Emissions * passengerCount,
			distance: kmTravelled * passengerCount,
			fuel: totalFuelUsage * passengerCount
		};

		const stats: Partial<DayStatistics> = {
			emissions: co2Emissions,
			distance: kmTravelled,
			fuel: totalFuelUsage,
			passengers: passengerStats,
			drivers: [
				driverStats
			]
		};

		return stats;
	}
}
