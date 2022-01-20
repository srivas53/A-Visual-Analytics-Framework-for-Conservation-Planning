const express = require('express');
const router = express.Router();
const fs = require('fs');
var finalInfo;
//../app'
/* GET users listing. */


reader=fs.createReadStream('inputJSONforParsedInfo.txt');

reader.on('data', function (chunk) {
    //console.log(JSON.parse(chunk));
    finalInfo=JSON.parse(chunk);

});


router.get('/', function(req, res, next) {
    //console.log(finalInfo, 'I wanna send this please'); 
    res.status(200).json({
        message: finalInfo
    });
});

module.exports = router;

//If server does not restart on webpage refresh, the updated txt file cannot be fetched (as of this moment)