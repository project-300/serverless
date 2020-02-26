import { VehicleMake, VehicleModel } from '@project-300/common-types';
import { get } from 'request-promise';

interface VehicleMakesApiResponse {
	Count: number;
	Message: string;
	SearchCriteria: any;
	Results: VehicleMake[];
}

interface VehicleModelsApiResponse {
	Count: number;
	Message: string;
	SearchCriteria: any;
	Results: VehicleModel[];
}

export class VehicleAPI {
	public static getAllMakes = async (): Promise<VehicleMake[]> => {
		const result: string = await get('https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json') as string;
		const response: VehicleMakesApiResponse = JSON.parse(result) as VehicleMakesApiResponse;
		return response.Results;
	}

	public static getModelsForMakeAndYear = async (makeId: string, year: string): Promise<VehicleModel[]> => {
		const result: string = await get(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/${makeId}/modelyear/${year}?format=json`) as string;
		const response: VehicleModelsApiResponse = JSON.parse(result) as VehicleModelsApiResponse;
		return response.Results;
	}
}
