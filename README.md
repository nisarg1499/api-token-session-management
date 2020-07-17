# api-token-session-management

Run `npm run dev` command to start the server. This server contains the approach of solution using Map data structure which is written in api-server.js and ./routes.api-keys.js file. 

I have also implementd some API's using database by writing mongo queries which is in server.js and ./routes/keys.js file.


### Approach
Map data structure is used and total 4 maps are created for the complete taks. 
- map : Stores generated keys (every detail)
- block : Stores blocked keys (only key and updated blocked time)
- alive : Stores alive keys (only key and updated alive time)
- available : Stores avaialble keys


### API
1. Create key
Endpoint: /create-key
Method : POST
This api creates api keys whose and store it in map as well as available.
API Object : {
    apiKey : Key
    createdAt : timestamp,
    updatedAt : timestamp,
    isBlocked : 0,
    lastAlive : timestamp
}

2. Get a key
Endpoint : /get-key
Method : GET
This API returns an api key which is unblocked and availble. When the key is returned to client, at that time the key get's allived and will remain alive for only 5 minutes if an alive call is not made explicitly.

3. Keep key alive
Endpoint : /alive/:id
Method : GET
This API will make the api key alive. But note that the keys which are blocked by the client are only elgibile for this call. Here {id} is the `key` value which needs to be passed. For example : 1,2,3,...no. of keys generated 

4. Unblock key
Endpoint : /unblock/:id
Method : PUT
This API will unblock the api key. Here {id} is the `key` value which needs to be passed. For example : 1,2,3,...no. of keys generated 

5. Get client key
Endpoint : /get-key/:id
Method : GET
This API will make the state of key in further blocked state. Which means if a client has they key, and wants to block the key further then this call should be made. The purpose of this endpoint is to make the key in further blocked state as after 60 seconds all blocked keys will be unblocked and if this happens then that key won't be able to get deleted if no alive call is made in 5 minutes. Here {id} is the `key` value which needs to be passed. For example : 1,2,3,...no. of keys generated 

6. Get all available keys
Endpoint : /get-available
Method : GET
This API will return all available keys, that means which are not blocked.

7. Get all Keys
Endpoint : /all-keys
Method : GET
This API will return all keys(blocked + unblocked).

8. Delete key
Endpoint : /delete/:id
This API will delete a key. Here {id} is the `key` value which needs to be passed. For example : 1,2,3,...no. of keys generated


Along with this, all keys will be unblocked in 60 seconds if they are not further blocked. And these keys will be available for serving. Also if any blocked key has not recieved and alive call in 5 minutes, then that key will be deleted. 
Functions are made in `api-keys.js` file : timelyUnblock which unblocks the key and aliveDelete which will delete an active key if no active call was made.


### Scenario to check

First generate few keys using API1, and you will get the generated key's number ad api key on the console. Remember for any operations key number is only used. 
For example generated keys are : {
    1 : {
        key : abc,
        createdAt : timestamp,
        updatedAt : timestamp,
        isBlocked : 0,
        lastActive : timestamp
    },
    2 : {
        key : x45,
        createdAt : timestamp,
        updatedAt : timestamp,
        isBlocked : 0,
        lastActive : timestamp
    },
    3 : {
        key : 7ed,
        createdAt : timestamp,
        updatedAt : timestamp,
        isBlocked : 0,
        lastActive : timestamp
    }
}

Now this key is served to a client using API2. Let's say Key number 1 was assigned. So now Key 1 will be in blocked state. 
{
    1 : {
        key : abc,
        createdAt : timestamp,
        updatedAt : timestamp,
        isBlocked : 1,
        lastActive : timestamp
    },
}
This key would be also added in block and alive data structures. 

Now there are 3 cases : 
(i) : No API is called and so this blocked key will get unblocked after 60 seconds. Now this key would be available for any other client.
(ii) : The API is continously called by client using API5 and so that state will remain blocked, but API3 is not called so this key will be deleted after 5 minutes.
(iii) : API5 and API3 both are called and so it remains alive as well as blocked and that particular client will be able to access that key.



### Test Cases
1. Generate 5 api keys. Get one api key so it will be blocked. And now don't call any api. The blocked API will be unblocked.

2. Generate 5 api keys. Get two api key by API2(both will be blocked). Call API5 for one key before 60 seconds (repeat this after 50-55 seconds) and don't call any api for second key. After 5 minutes the second key would be deleted. 

3. Generate 5 api keys. Get two api key by API2(both will be blocked). Call API5 for both keys before 60 seconds. Repeat call API5 step after every 50-55 seconds. These both key will be remained blocked. And if API3 is also called for both in every 4.5-4.7 minutes then these keys will be remained active or else they will be deleted.

4. Generate 5 api keys. Get two api keys by API2(both will be  blocked). Don't call any api. Both keys will be unblocked after 60 seconds. Now again call again API 2 and one api key will be blocked. Now call API4 and result will be that blocked key will become unblocked.

These are some crucial test cases. I have also test other APIs such as delete, get all, etc.



