(function(){

    let config = require("./config");
    let express = require("express");
    let bodyParser = require("body-parser");
    let path = require("path");
    let assert = require("assert");
    let mongoClient = require("mongodb").MongoClient;
    let app = express();
    let dbHostUrl = "mongodb://" + config.server + ":" + config.db_port + "/";
    let mongodb;

    app.use(
        bodyParser.urlencoded({
            extended: true,
        })
    );
    app.use(bodyParser.json());
    
    mongoClient.connect(
        dbHostUrl + config.db_name,
        { useUnifiedTopology: true },
        runMongo
    );

    server = app.listen(config.port);
    console.log("Server starting at http://localhost:" + config.port);

    function runMongo(err, client) {
        assert.equal(null, err, "[failed] establishing connection to mongodb");
        console.log("MongoDB Connected");
        db = client.db(config.db_name);
    
        let keyApi = require("./routes/keys.js")(app, express, db);
        app.use("/", keyApi);
    }

})();