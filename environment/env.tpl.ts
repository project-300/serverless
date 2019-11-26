export const WEBSOCKET_ENDPOINT: string = process.env.IS_OFFLINE ?
	'{{ OFFLINE_WEBSOCKET_ENDPOINT }}' :
	'{{ LIVE_WEBSOCKET_ENDPOINT }}';

export const AWS_S3_SECRET_KEY: string = '{{ AWS_S3_SECRET_KEY }}';
