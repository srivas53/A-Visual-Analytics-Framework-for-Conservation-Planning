const express = require('express');
const router = express.Router();
const fs = require('fs');
var finalInfo;
//../app'
/* GET users listing. */

//Read the .txt file written by the optimization.js code
reader=fs.createReadStream('optimizationInput.txt');  //optimizationInput, inputJSONforParsedInfo

reader.on('data', function (chunk) {
    //console.log(JSON.parse(chunk));
    finalInfo=JSON.parse(chunk);

});


router.get('/', function(req, res, next) {
    //console.log(finalInfo, 'I wanna send this please'); 
    res.status(200).json({
        optimizationParameters: finalInfo
    });
});



module.exports = router;

//If server does not restart on webpage refresh, the updated txt file cannot be fetched by the /parsedInfo GET API call (as of this moment)