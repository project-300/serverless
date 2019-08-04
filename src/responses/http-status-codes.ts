type HttpStatusCodeTypes = {
	BadRequest: number;
	ConfigurationError: number;
	Forbidden: number;
	InternalServerError: number;
	NotFound: number;
	Ok: number;
};

export const HttpStatusCode: HttpStatusCodeTypes = {
	BadRequest: 400,
	ConfigurationError: 500.19,
	Forbidden: 403,
	InternalServerError: 500,
	NotFound: 404,
	Ok: 200
};
