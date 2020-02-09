export const WEBSOCKET_ENDPOINT: string = process.env.IS_OFFLINE ?
	'http://localhost:3001' :
	'{{ LIVE_WEBSOCKET_ENDPOINT }}';

export const AWS_S3_SECRET_KEY: string = '{{ AWS_S3_SECRET_KEY }}';

export const USERID_FOR_TESTING: string = '{{ USERID_FOR_TESTING }}';
