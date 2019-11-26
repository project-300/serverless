# serverless

### Creating A New Endpoint

- Add a new directory to `/src/functions`
- Create a TS file with the same name as the directory (main file)
- Create a .controller file
- If needed, create an .interfaces file
- Create an exported class within your controller file
- Create a public function within the class
- Create the private functions if needed
- Declare an instance of your class in your main file (Not the controller or interfaces file)
- Export a handler that refers to the public function within your class. This will be your endpoint handler (entry point)
- Add your endpoint to the `serverles.yml` file (Websocket or HTTP)

## Serverless Offline

If you are running the API offline, to allow websockets to work, you need to have
`https://localhost:3001` as the offline URL in the .env file.

```
    sls offline start
```
