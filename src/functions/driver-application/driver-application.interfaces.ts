export interface DriverApplicationResult {
	success: boolean;
	newApplication?: object;
}

export interface DriverApplicationCheckResult {
	success: boolean;
	alreadyApplied: boolean;
}
