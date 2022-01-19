const express = require('express');
const router = express.Router();
const co = require('co');
const fs = require('fs');
const _ = require('underscore');
const path = require('path');
const turf = require('@turf/turf');
const glp = require("glpk");
const fetch = require('node-fetch');


const MongoClient = require('mongodb').MongoClient,
    assert = require('assert');

// Connection URL
const url = 'mongodb://localhost:27017/eco_region'; //Connection to mongoDb server
let mongoDB = false;

//Defining color schema
let color72reverse = [ 
    "#edf8e9",
    "#c7e9c0",
    "#a1d99b",
    "#74c476",
    "#41ab5d",
    "#238b45",
    "#005a32"
];
let color7 = color72reverse.reverse();
let preprocessedData; 
//Step 1: Data Filtering
function filterData(originalDataArr, filterInfo) { //Get original data attributes, and filtered information as set by the user. see where these two are being fetched from
    let filteredData = originalDataArr.filter((obj) => { 
        let condition = true;
        let filters = Object.keys(filterInfo);
        filters.forEach(key => {
            let filterrange = filterInfo[key].filterRange.range; //get the range set by the user using the brush
            let filtermaxvalue = filterInfo[key].filterRange.maxValue; //get max value of the filter range
            if (filterrange != null) { //if filter is being applied by the user using the brush
                if (filterrange.length > 1) { //checks length of the filter range
                    if (Math.max(...filterrange) != filtermaxvalue) {  //If range is not equal to the filter max value
                        condition = ((obj.properties[key] >= Math.min(...filterrange)) && (obj.properties[key] <= Math.max(...filterrange))) && condition; //Application of actual filtering based on max and min value of the filter range
                    } else {
                        condition = (obj.properties[key] >= Math.min(...filterrange)) && condition; //Else, no need to specify the max value in the filtering range
                    }
                } else {
                    if (Math.min(...filterrange) != filtermaxvalue) {
                        condition = (obj.properties[key] == Math.min(...filterrange)) && condition;
                    } else {
                        condition = (obj.properties[key] >= Math.min(...filterrange)) && condition;
                    }
                }
            }

        });
        return condition;
    });
    return filteredData;
}
//Step 2: Find median rank
function getMedianRank(filteredDatabyAttr, filterInfo) {
    let flag4mr = 0; //Flagging for median rank (could be a placeholder)
    let filteredAttrs = Object.keys(filterInfo);
    if (filteredAttrs.length != 0) {
        flag4mr = 1;
        filteredAttrs.forEach(attribute => {
            let operator = filterInfo[attribute].sortDirection;
            //Based on triangle orientation (non-descending vs descending priority)
            if (operator == "desc") {
                filteredDatabyAttr.sort(function (a, b) { return b.properties[attribute] - a.properties[attribute] }); //descending order for pa
            } else if (operator == "asce") {
                filteredDatabyAttr.sort(function (a, b) { return a.properties[attribute] - b.properties[attribute] }); //ascending order for pa
            }
            let indexName = attribute + "Index";
            let count4medianRanking = 0;
            let previousOne = null;
            filteredDatabyAttr.map((a, i) => { //Assignment of median rank to the patches
                if (a.properties[attribute] != previousOne) count4medianRanking++;
                previousOne = a.properties[attribute];

                if (a.properties.rankingsets) {
                    a.properties.rankingsets[indexName] = count4medianRanking;
                } else {
                    a.properties.rankingsets = {};
                    a.properties.rankingsets[indexName] = count4medianRanking;
                }

            })
        })
        filteredDatabyAttr.map(d => {
            let rankingsets = d.properties.rankingsets;
            let allrankings = Object.keys(rankingsets).map((k) => rankingsets[k]);
            let sortedRankings = (allrankings.sort(function (a, b) { return a - b })); // ascending for median ranking
            let length = sortedRankings.length;
            if (length != 1) {
                let fomerMedian = sortedRankings[Math.ceil(length / 2) - 1];
                let laterMedian = sortedRankings[Math.ceil(length / 2 + 0.5) - 1];
                d.properties["medianRanking"] = (fomerMedian + laterMedian) / 2;
            } else {
                d.properties["medianRanking"] = sortedRankings[0];
            }
            delete d.properties.rankingsets;
            return d;
        })
    }
    return { "data": filteredDatabyAttr, "flag": flag4mr };
}

function filterDatabyRanking(filteredDatabyAttr, ranking2filter) {
    let selectedData = filteredDatabyAttr.filter((obj) => {
        let ranking = obj.properties.medianRanking;
        // console.log("condition ", ((ranking < ranking2filter[1]) || (ranking == ranking2filter[1])) && ((ranking > ranking2filter[0]) || (ranking == ranking2filter[0])));
        return ((ranking < ranking2filter[1]) || (ranking == ranking2filter[1])) && ((ranking > ranking2filter[0]) || (ranking == ranking2filter[0]));
    })
    return selectedData;
}

///////////////////////////////////////////////
 

//For development,  just manually copy a sample json response, and access it via Python using GET method
router.get('/parsedInfo',(req,res,next) =>{
    const parsedInfo={
        originalData: {
          PA: [ 726.1503372836057, 14086.408703917143 ],
          MA: [ 21000, 21000 ],
          HII: [ 8, 12 ],
          HW: [ 1089.5797792576188, 21000 ],
          HY: [ 6585.908545440518, 18686.13492865602 ],
          Tree: [ 7, 8 ],
          Bird: [ 157, 160 ],
          MM: [ 48, 50 ],
          Fish: [ 34, 40 ],
          RP: [ 11, 12 ],
          AM: [ 6, 6 ],
          Cost: [ 0.0058395202899662576, 0.08299264525623651 ]
        },
        boxplotInfo: {
          PA: {
            min: 726.1503372836057,
            max: 14086.408703917143,
            median: 8268.593695984357,
            quarter: 6036.136741037557,
            threeQuarters: 10989.008136409113,
            average: 8462.812989190521
          },
          MA: {
            min: 21000,
            max: 21000,
            median: 21000,
            quarter: 21000,
            threeQuarters: 21000,
            average: 21000
          },
          HII: {
            min: 8,
            max: 12,
            median: 8,
            quarter: 8,
            threeQuarters: 10,
            average: 9.16
          },
          HW: {
            min: 1089.5797792576188,
            max: 21000,
            median: 14070.113926339101,
            quarter: 9355.707449004089,
            threeQuarters: 17834.47026165931,
            average: 13694.865402712423
          },
          HY: {
            min: 6585.908545440518,
            max: 18686.13492865602,
            median: 13160.572519169453,
            quarter: 10641.713350717831,
            threeQuarters: 15560.140839145804,
            average: 13079.917225896519
          },
          Tree: {
            min: 7,
            max: 8,
            median: 8,
            quarter: 7,
            threeQuarters: 8,
            average: 7.645
          },
          Bird: {
            min: 157,
            max: 160,
            median: 158.5,
            quarter: 158,
            threeQuarters: 160,
            average: 158.69625
          },
          MM: {
            min: 48,
            max: 50,
            median: 49,
            quarter: 48,
            threeQuarters: 49,
            average: 48.7225
          },
          Fish: {
            min: 34,
            max: 40,
            median: 34,
            quarter: 34,
            threeQuarters: 34,
            average: 34.75
          },
          RP: {
            min: 11,
            max: 12,
            median: 11,
            quarter: 11,
            threeQuarters: 11,
            average: 11.105
          },
          AM: {
            min: 6,
            max: 6,
            median: 6,
            quarter: 6,
            threeQuarters: 6,
            average: 6
          },
          Cost: {
            min: 0.0058395202899662576,
            max: 0.08299264525623651,
            median: 0.008062740499997821,
            quarter: 0.007575434987354412,
            threeQuarters: 0.008387863441510594,
            average: 0.00868378266323114
          }
        },
        userDefinedGridInfo: {
          bbox: [
            -108.4364661992091,
            47.53111102290634,
            -108.69325359440927,
            47.45130843796394
          ],
          cellside: null,
          searchArea: 197940914.02697188
        },
        filterInfo: {
          averageHII: { filterRange: [Object], sortDirection: 'asce' },
          averagetree: { filterRange: [Object], sortDirection: 'desc' },
          averagemammal: { filterRange: [Object], sortDirection: 'desc' }
        },
        ranking2filter: [ 1, 3 ],
        constraints: { id: 'cost', range: [ 0, 908617 ] },
        objFun: { goal: 'area', goalDirection: 'Maximize' },
        costArea: { totalCost: 1707737, totalArea: 197940914.02697188 },
        paType: 'paLayer2'
      };
    res.status(200).json({
        message: parsedInfo
    });
});

module.exports=router;



//Checking the url structure of the API call on optimization
module.exports = function (appRoot) {
    router.get('/', function (req, res, next) {
        let request = req._parsedUrl.query;
        let parsedInfo = JSON.parse(request.replace(/%22/g, '"'));  //In api request entire URL is being passed, and here, the url is being fetched, and then parsed as a json
        //console.log(parsedInfo);
        res.status(200).json({
            query: request,
            message: parsedInfo
            });
           
    });
    

    return router;
};

//Qusetions for RUI:
//1. Show the situation above, and ask how can I send the parsedInfo as a JSON to a new endpoint? Do I have tp create a npw file in the routes folder? What dies return router do? Why module.export(appRoot), and why are we not using module.exports=router instead?
//2. How is the result from optimization function used next? This is critical to structure the system when I want to send data back from Python
//3. What is the GLPK routine running on rankPatches.js code?




//try defining router.post to /parsedInfo, and add fetch method in the function below??


/////////////////////////////////////////////////////////////////////////
//MIP optimization using GLPK
// module.exports = function (appRoot) {
//     /* GET map data. */
//     router.get('/', function (req, res, next) {
//         //console.log(req,'THIS IS THE RELATIVE REQUEST');
//         let request = req._parsedUrl.query;
//         let parsedInfo = JSON.parse(request.replace(/%22/g, '"')); //HOW TO transfer this via POST, to an endpoint like /optimization/parsedInfo
//         res.status(200).json({
//             message: request
//         });
//         //console.log(parsedInfo,'PYTHON INPUT');
//         let userDefinedGridInfo = parsedInfo.userDefinedGridInfo;
//         let filterInfo = parsedInfo.filterInfo;
//         let ranking2filter = parsedInfo.ranking2filter;
//         let constraints = parsedInfo.constraints;
//         let objFun = parsedInfo.objFun;
//         let paType = parsedInfo.paType;
//         //console.log(userDefinedGridInfo, filterInfo, ranking2filter, constraints, objFun);
//         //console.log("constraints ", constraints);
//         //console.log("objFun ", objFun);

//         co(function* () {
//             //////////////get the input txt for glpk
//             function generateGLPK(preprocessedData, constraints, objFun) {
//                 let writeStream = fs.createWriteStream('optimizationInput.txt');
//                 let minormax4objfun = objFun.goalDirection;
//                 let goal = objFun.goal;
//                 /////objective function
//                 writeStream.write(minormax4objfun + '\n obj:');
//                 preprocessedData.forEach((p, i) => {
//                     let weight = p.properties[goal];
//                     if (i != preprocessedData.length - 1) {
//                         writeStream.write(weight + ' x' + i + ' + ');
//                     } else {
//                         writeStream.write(weight + ' x' + i + '\nSubject To' + '\n c1:');
//                     }
//                 })
//                 /////constraints
//                 let constraintId = constraints.id;
//                 let constraintRange = constraints.range;
//                 preprocessedData.forEach((p, i) => {
//                     let weight4constraint = p.properties[constraintId];
//                     if (i != preprocessedData.length - 1) {
//                         writeStream.write(weight4constraint + ' x' + i + ' + ');
//                     } else {
//                         writeStream.write(weight4constraint + ' x' + i + ' >= ' + constraintRange[0] + '\n c2:');
//                     }
//                 })
//                 preprocessedData.forEach((p, i) => {
//                     let weight4constraint = p.properties[constraintId];
//                     if (i != preprocessedData.length - 1) {
//                         writeStream.write(weight4constraint + ' x' + i + ' + ');
//                     } else {
//                         writeStream.write(weight4constraint + ' x' + i + ' <= ' + constraintRange[1] + '\nBounds\n');
//                     }
//                 })
//                 //////bounds
//                 preprocessedData.forEach((p, i) => {
//                     if (i != preprocessedData.length - 1) {
//                         writeStream.write('0 <= x' + i + ' <= 1\n');
//                     } else {
//                         writeStream.write('0 <= x' + i + ' <= 1\nBinaries \n');
//                     }
//                 })
//                 ///////binaries
//                 preprocessedData.forEach((p, i) => {
//                     if (i != preprocessedData.length - 1) {
//                         writeStream.write('x' + i + ' ');
//                     } else {
//                         writeStream.write('x' + i + ' \nEnd');
//                     }
//                 })

//                 writeStream.on('finish', function () {
//                     console.log('file has been written');
//                     let prob = new glp.Problem();
//                     prob.readLpSync("optimizationInput.txt");
//                     prob.scaleSync(glp.SF_AUTO);
//                     prob.simplexSync({ presolve: glp.ON });
//                     let variablesNum = prob.getNumInt();
//                     // console.log("variablesNum ", variablesNum);
//                     if (prob.getNumInt() > 0) {
//                         function callback(tree) {
//                             if (tree.reason() == glp.IBINGO) {
//                                 // ...
//                             }
//                         }
//                         prob.intoptSync({ cbFunc: callback });
//                     }
//                     // console.log("objective: " + prob.mipObjVal());
//                     let patch2buy = [];
//                     for (let i = 1; i < variablesNum + 1; i++) {
//                         // console.log("varibles" + (i - 1) + ": " + prob.getColPrim(i));
//                         if (prob.getColPrim(i) == 1) {
//                             patch2buy.push(preprocessedData[i - 1])
//                         }
//                     }
//                     prob.delete();
//                     //console.log("patch2buy ", patch2buy.length);
//                     res.send(patch2buy);
//                 });
//                 writeStream.end();
//             }
//             let db = yield MongoClient.connect(url);
//             let userGridsCol = db.collection('userGrids');
//             let originalDataArr = yield userGridsCol.find({ "properties.userDefinedGridInfo": userDefinedGridInfo }).toArray();
//             if (paType == "totalPA") {
//                 originalDataArr = originalDataArr.filter(obj => obj.properties.paAver != -2); //this line is given to keep consistent with the frontend. Filter the parcel inside the protected area. 
//             }
//             // console.log("originalDataArr, ", originalDataArr.length);
//             let filteredDatabyAttr = filterData(originalDataArr, filterInfo);
//             let flag4MedianRanking = getMedianRank(filteredDatabyAttr, filterInfo).flag;
//             if (flag4MedianRanking == 1) {
//                 preprocessedData = filterDatabyRanking(filteredDatabyAttr, ranking2filter);
//             } else {
//                 preprocessedData = filteredDatabyAttr;
//             }
//             // console.log("preprocessedData ",preprocessedData.length);
//             db.close();
//             generateGLPK(preprocessedData, constraints, objFun);
//         });


//     });
//     return router;
// };

