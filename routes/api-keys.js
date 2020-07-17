const { get } = require("http");
const e = require("express");

(function (){

    let assert = require("assert");
    let crypto = require("crypto");

    module.exports = keysApi;

    function keysApi(app, express, map, block, alive, available, totalNumber){

        var apiRouter = express.Router();
        var date = new Date();

        apiRouter.post("/create-key", createKey);
        apiRouter.put("/unblock/:id", unBlockKey);
        apiRouter.get("/get-key", getKey);
        apiRouter.get("/alive/:id", keepAlive);
        apiRouter.get("/all-keys", getAllKeys);
        apiRouter.get("/get-key/:id", getClientKey);
        apiRouter.get("/get-available", getAllAvailableKeys);
        apiRouter.delete("/delete/:id", deleteKey);

        function timelyUnblock(){
            let dt = Date.now();
            block.forEach( (value, key) => {

                let tempKey = parseInt(key);
                let time = Math.floor((dt - value.blockedAt)/1000);
                if(time >= 30){
                    block.delete(tempKey);
                    let getObj = map.get(tempKey);
                    let tempApiKey = getObj.apiKey;
                    let tempCreatedAt = getObj.createdAt;
                    let tempLastAlive = getObj.lastAlive;
                    let obj = {};
                    obj = {
                        apiKey : tempApiKey,
                        createdAt : tempCreatedAt,
                        updatedAt : Date.now(),
                        isBlocked : 0,
                        lastAlive : tempLastAlive
                    }
                    map.set(tempKey, obj);
                    available.set(tempKey, obj);
                    console.log(map.get(tempKey));
                    console.log("Key released after 60 seconds");
                }
            });
        }
        setInterval(timelyUnblock, 1000)

        function aliveDelete(){
            let dt1 = Date.now();
            alive.forEach( (value, key) => {
                
                let tempKey = parseInt(key);
                let time = Math.floor((dt1 - value.lastAlive)/1000);
                
                if(time >= 60 && map.get(tempKey).isBlocked){
                    alive.delete(tempKey);
                    map.delete(tempKey);
                    if(available.has(tempKey)){
                        available.delete(tempKey);
                    }               
                    console.log("Key : " + tempKey + " deleted as it was not called alive from last 5 min.");
                }
            })
        }
        setInterval(aliveDelete, 1000);

        return apiRouter;

        function getAllKeys(req, res){
            
            console.log(map);
            res.status(200).json({status : true, message: "Data printed on console"});
            return;
        }


        function getAllAvailableKeys(req, res){

            if(available){
                console.log(available);
                res.status(200).json({status: true, message : "Data prined on console"});
                return;
            }
            else{
                console.log("No keys available. Please generate new keys");
                res.status(404).json({status: false, message: "No keys available"});
                return;
            }
        }

        function createKey(req, res){
            console.log("In create key api");

            let apikey = crypto.randomBytes(5).toString('hex');
            let apiKeyObject = {
                apiKey : apikey,
                createdAt : Date.now(),
                updatedAt : Date.now(),
                isBlocked : 0,
                lastAlive : Date.now()
            }

            totalNumber = totalNumber + 1;
            console.log("Key number generated : " + totalNumber);
            map.set(totalNumber, apiKeyObject);
            available.set(totalNumber, apiKeyObject);
            console.log("Key generated : " + map.get(totalNumber).apiKey);
            res.status(200).json({
                status: true,
                message : "key created"
            });
            return;
        }

        function unBlockKey(req, res){
            console.log("In unblock key api");

            keyToUpdate = parseInt(req.params.id);

            let obj = map.get(keyToUpdate);
            let tempKey = obj.apiKey;
            let tempCreatedAt = obj.createdAt;
            let tempLastAlive = obj.lastAlive;
            if(obj.isBlocked == 1){
                obj = {
                    apiKey : tempKey,
                    createdAt : tempCreatedAt,
                    updatedAt : Date.now(),
                    isBlocked : 0,
                    lastAlive : tempLastAlive
                }
                map.set(keyToUpdate, obj);
                available.set(keyToUpdate, obj);
                block.delete(keyToUpdate);
                console.log("Key unblocked");
            }
            else{
                console.log("Key is already in unblock stage");
                res.status(404).json({status: false, message: "Key is already in unblock stage"});
                return;
            }

            console.log("Updated");
            console.log(map.get(keyToUpdate));
            res.status(200).json({
                status: true,
                message : "Operation completed"
            });
            return;
        }

        function getKey(req, res){
            console.log("In get key");

            let k1 = [...map.keys()];
            let k2 = [...block.keys()];

            let k3 = k1.filter(e => !k2.includes(e));

            if(k3.length == 0){
                console.log("No key available");
                res.status(404).json({status: false, message: "No key available"});
                return;
            }
            else{
                let randomNumber = k3[0];
                let rn = parseInt(randomNumber);
                let getObj = map.get(rn);

                let tempKey = getObj.apiKey;
                let tempCreatedAt = getObj.createdAt;
                let newUpdatedAt = Date.now();
                let tempObj = {};
                let blockedObj = {};
                tempObj = {
                    apiKey : tempKey,
                    createdAt : tempCreatedAt,
                    updatedAt : newUpdatedAt,
                    isBlocked : 1,
                    lastAlive : Date.now()
                }
                blockedObj = {
                    apiKey : tempKey,
                    blockedAt : Date.now()
                }
                let aliveObj = {};
                aliveObj = {
                    apiKey : tempKey,
                    lastAlive : Date.now()
                }
                map.set(rn, tempObj);
                block.set(rn, blockedObj);
                alive.set(rn, aliveObj);
                console.log(alive);
                available.delete(rn);

                res.status(200).json({
                    status: true,
                    apiKey : tempKey
                });
                return;
            }
        }

        function getClientKey(req, res){
            let getClientKeyId = parseInt(req.params.id);

            let obj = map.get(getClientKeyId);
            if(obj){
                if(obj.isBlocked){
                    let tempKey = obj.apiKey;
                    let newBlockedObj = {}
                    newBlockedObj = {
                        apiKey : tempKey,
                        blockedAt : Date.now()
                    }
                    block.set(getClientKeyId, newBlockedObj);
                    console.log("Key further blocked");
                    res.status(200).json({status: true, message: "Key further blocked"});
                    return;
                }
                else{
                    console.log("Key is not in blocked state");
                    res.status(404).json({status: false, message: "Key is not in blocked state"});
                    return;
                }
            }
            else{
                console.log("Key : " + tempKey + " not available to further block. It has been deleted");
                res.status(401).json({status : false, message: "Key not available to further block"});
                return;
            }
        }

        function keepAlive(req, res){
            let keyToAlive = parseInt(req.params.id);

            let obj = map.get(keyToAlive);
            if(obj){
                if(obj.isBlocked){
                    let tempKey = obj.apiKey;
                    let tempCreatedAt = obj.createdAt;
                    let tempUpdatedAt = obj.updatedAt;
                    let newObj = {};
                    newObj = {
                        apiKey : tempKey,
                        createdAt : tempCreatedAt,
                        updatedAt : tempUpdatedAt,
                        isBlocked : 1,
                        lastAlive : Date.now()
                    }
                    let aliveObj = {};
                    aliveObj = {
                        apiKey : tempKey,
                        lastAlive : Date.now()
                    }
                    map.set(keyToAlive, newObj);
                    alive.set(keyToAlive, aliveObj);
                    console.log("Key called for alive" + tempKey);
                    res.status(200).json({status: true, message: "Key called for alive"});
                    return;
                }
                else{
                    console.log("Key is not in blocked state");
                    res.status(400).json({status: false, message: "Key is in blocked state"});
                    return;
                }
            }
            else{
                console.log("Key you are trying to keep alive has been deleted!!");
                res.status(404).json({status : false, message: "Key has been deleted"});
                return;
            }            
        }

        function deleteKey(req, res){
            let keyToDelete = parseInt(req.params.id);

            let obj = map.get(keyToDelete)
            if(obj){
                map.delete(keyToDelete, obj);
                if(available.get(keyToDelete)){
                    available.delete(keyToDelete);
                }
                if(block.get(keyToDelete)){
                    block.delete(keyToDelete);
                }
                if(alive.get(keyToDelete)){
                    alive.delete(keyToDelete)
                }
                console.log("Key deleted from everywhere!");
                res.status(400).json({status: true, message: "Key deleted"});
                return;
            }
            else{
                console.log("Key does not exists");
                res.status(400).json({status: false, message: "Key does not exists"});
                return;
            }
        }
    }
})();