(function() {

    let express = require("express");
    let bodyParser = require("body-parser");
    let path = require("path");
    let assert = require("assert");

    let app = express();

    app.use(bodyParser.json());
    
    server = app.listen(5000);
    console.log("Server starting at localhost:5000");

    var map = new Map();
    var block = new Map();
    var alive = new Map();
    var available = new Map();
    var totalNumber = 0;

    let createKey = require("./routes/api-keys.js")(app, express, map, block, alive, available, totalNumber);
    app.use("/", createKey);

})();