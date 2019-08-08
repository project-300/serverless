type ErrorCodeTypes = {
	GeneralError: string;
	InvalidId: string;
	InvalidName: string;
	MissingEnv: string;
	MissingId: string;
	MissingPermission: string;
};

export const ErrorCode: ErrorCodeTypes = {
	GeneralError: 'GENERAL_ERROR',
	InvalidId: 'INVALID_ID',
	InvalidName: 'INVALID_NAME',
	MissingEnv: 'MISSING_ENV',
	MissingId: 'MISSING_ID',
	MissingPermission: 'MISSING_PERMISSION'
};
