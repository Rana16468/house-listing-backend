### docker build command 
 
1. docker-compose down
2. docker-compose up --build -d
3. docker-compose logs -f backend


 ### radis 

1. doker start ts_express_redis 
2. docker stop ts_express_redis

### Signup IP address

New accounts store the request IP address provided by Express, and the IP is
included in the authenticated profile response. A server cannot determine a
visitor's city, country, or coordinates from an IP address using only Node.js or
standard networking APIs; that requires a local geolocation database or an
external lookup service. This project only records the IP address and performs
no geolocation lookup.
