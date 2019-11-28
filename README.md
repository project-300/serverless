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

```
{
    journeyId: 'journey123',
    driver: {
        userId: 'user212',
        username: 'james',
        firstName: 'James',
        lastName: 'test',
        userType: 'Driver'
    },
    passengers: [],
    times: {
        createdAt: '2019-11-18T00:36:31.155Z',
        leavingAt: '2019-12-25T18:00:00.000Z',
        estimatedArrival: '2019-12-25T20:00:00.000Z'
    },
    destination: {
        lat: '54.269077',
        long: '-8.475793',
        name: 'Sligo',
    },
    origin: {
        lat: '53.282509',
        long: '-9.043263',
        name: 'Galway'
    },
    totalNoOfSeats: 3,
    seatsLeft: 3,
    pricePerSeat: 21
}

{
        journeyId: 'journey155',
        driver: {
            userId: 'user212',
            username: 'james',
            firstName: 'James',
            lastName: 'test',
            userType: 'Driver'
        },
        passengers: [],
        times: {
            createdAt: '2019-11-18T00:51:31.155Z',
            leavingAt: '2019-12-31T12:00:00.000Z',
            estimatedArrival: '2019-12-31T14:15:00.000Z'
        },
        origin: {
            lat: '54.269077',
            long: '-8.475793',
            name: 'Sligo',
        },
        destination: {
            lat: '53.282509',
            long: '-9.043263',
            name: 'Galway'
        },
        totalNoOfSeats: 2,
        seatsLeft: 2,
        pricePerSeat: 17
    }
```
