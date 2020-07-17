(function (){

    const config = require("../config.js");
    const assert = require("assert");
    const crypto = require("crypto");
    var objectId = require("mongodb").ObjectID;

    module.exports = keysApi;

    function keysApi(app, express, db){

        var apiRouter = express.Router();
        var date = new Date();

        apiRouter.post("/create-key", createKey);
        apiRouter.put("/unblock/:id", unBlockKey);
        apiRouter.get("/get-key", getKey);
        apiRouter.delete("/delete/:id",deleteKey);


        async function timelyDelete(){
            console.log("Hi");
            let dt = Date.now();
            let temp = await db.collection("blocked").find({ blockedAt : {$lt : dt} });

            temp.each(processCursor);

            async function processCursor(err, doc){
                if(err){
                    res.status(500).json({status: false, message: err});
                    return;
                }
                console.log(Math.floor((dt - doc.blockedAt)/1000));
                if(doc != null && Math.floor((dt - doc.blockedAt)/1000) >= 40){
                    let tempApiKey = doc.apiKey;
                    await db.collection("key").deleteOne({ apiKey : tempApiKey }, async (err, result)=> {
                        if(err){
                            console.log(err);
                            return;
                        }
                        if(result){
                            await db.collection("blocked").deleteOne({ apiKey : tempApiKey }, (e, r) => {
                                console.log("Key deleted");
                                return;
                            })   
                        }
                    });
                }
                else{
                    console.log("In else");
                    return;
                }
            }
        }
        // setInterval(timelyDelete, 40000);

        

        return apiRouter;

        function createKey(req, res){
            console.log("In create key api");

            let apiKeyObject = {
                apiKey : crypto.randomBytes(5).toString('hex'),
                createdAt : Date.now(),
                calledAt : Date.now(),
                isBlocked : 0
            }
            
            db.collection("key").countDocuments({apiKey: apiKeyObject.apiKey}, (err, r) => {
                if(err){
                    console.log(err);
                    res.status(500).json({status: false, message: err})
                }
                if(r > 0){
                    res.status(409).json({message: "key already exists"});
                    return;
                }else{
                    db.collection("key").insertOne(apiKeyObject, success);
                }

                function success(err, result){
                    if(err){
                        console.log(err);
                        res.status(500).json({message: "db operation failed"});
                        return;
                    }
                    console.log("New key generated and added to db");
                    res.status(200).json({
                        message: "Key generated"
                    })
                }
            });

        }

        async function unBlockKey(req, res){
            console.log("In unblock key api");

            let keyToUpdate = req.params.id;
            if(keyToUpdate && keyToUpdate.length == 24){
                let tempId = objectId(keyToUpdate);
                let obj = {};
                await db.collection("key").findOne(
                    {
                        _id: tempId
                    }, 
                    async function success(err, doc){
                        if(err){
                            res.status(500).json({message: "db error"});
                            return;
                        }
                        else if(doc && doc.isBlocked == 1){
                            // console.log(doc);
                            let tapiKey = doc.apiKey;
                            obj = {
                                _id: doc._id,
                                apiKey: doc.apiKey,
                                createdAt: doc.createdAt,
                                updatedAt: doc.updatedAt,
                                isBlocked: 0
                            };
                            await db.collection("key").updateOne(
                                {
                                    _id: tempId
                                },
                                {
                                    $set: obj
                                },
                                async function(er, result){
                                    if(er){
                                        console.log(er);
                                        res.status(404).json({message: "failed to update"})
                                        return;
                                    }
                                    else{
                                        console.log(tapiKey);
                                        await db.collection("blocked").deleteOne({apiKey: tapiKey}, (er, result) => {
                                            console.log("Deleted from blocked collection");
                                            res.status(200).json({message: "Key unblocked"});
                                            return;
                                        });
                                    }
                                }
                            );
                        }
                        else{
                            res.status(404).json({message: "Key is already in unlocked stage or key not found"})
                        }
                    });
            }
            else{
                res.status(400).json({message: "Invalid key"})
            }
        }

        function getKey(req, res){
            console.log("In get key");

            let done = 0;
            let ans = db.collection("key").find({ isBlocked: {$lt : 1} });
            // console.log(ans);
            // let a = ans.toArray();
            // console.log(a[0]);

            ans.each(processCursor);

            function processCursor(err, doc){
                if(err){
                    res.status(500).json({status: false, message: err});
                    return;
                }
                if( doc != null && done == 0){
                    let tempKey = doc.apiKey;
                    let tempId = doc._id;
                    let newUpdatedAt = Date.now();
                    // console.log(tempKey);
                    console.log(tempId)
                    let tempObj = {};
                    tempObj = {
                        _id: doc._id,
                        apiKey: doc.apiKey,
                        createdAt: doc.createdAt,
                        updatedAt: newUpdatedAt,
                        isBlocked: 1
                    };
                    db.collection("key").updateOne(
                        {
                            _id: tempId
                        },
                        {
                            $set: tempObj
                        },
                        function(er, result){
                            if(er){
                                console.log(er);
                                res.status(404).json({message: "failed to update"})
                                return;
                            }
                            else{
                                let blockObj = {};
                                blockObj.apiKey = tempKey;
                                blockObj.blockedAt = Date.now();
                                db.collection("blocked").insertOne(blockObj, (e, r) => {
                                    if(e){
                                        console.log(er);
                                        res.status(404).json({message: "failed to insert in blocked collection"})
                                        return;
                                    }
                                    else{
                                        console.log("Added to blocked collection");
                                        res.status(200).json({message: "Key available", key: tempKey});
                                        return;
                                    }
                                });
                            }
                        }
                    );
                    done = 1;
                }
                else if(done == 1){
                    return;
                }
                else{
                    console.log("No key available");
                    res.status(404).json({message: "No eligible key available"});
                    return;
                }
            }
        }
        
        function deleteKey(req, res){

            let keyToDelete = req.params.id;
            if(keyToDelete && keyToDelete.length==24){

                let tempId = objectId(keyToDelete);

                db.collection("key").deleteOne({_id: tempId}, (err, result) => {

                    if(err){
                        console.log(err);
                        res.status(500).json({status: false, message: err});
                        return;
                    }
                    if(result){
                        console.log("Key deleted");
                        res.status(200).json({status: true, message: "Key deleted"});
                        return;
                    }
                })
            }
        }
    }


})();