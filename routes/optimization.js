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

//MIP optimization using GLPK
module.exports = function (appRoot) {
    /* GET map data. */
    router.get('/', function (req, res, next) {
        //Fetch the required input data for optimization, and write it in a .txt file, and fetch the same via /parsedInfo.js, which then sends it to enable cross platform GET request (Via Python)
        //However, the server has to be restared to ge the updated optimization input, has to probably do with the fact that this code does not run till the point the user clicks on Optimize button
        //Therefore, the process of writing into JSON should happen sometime before optimization.js is being executed (QUESTION FOR RUI)
        let request = req._parsedUrl.query;
        let parsedInfo = JSON.parse(request.replace(/%22/g, '"')); 
        let userDefinedGridInfo = parsedInfo.userDefinedGridInfo;
        let filterInfo = parsedInfo.filterInfo;
        let ranking2filter = parsedInfo.ranking2filter;
        let constraints = parsedInfo.constraints;
        let objFun = parsedInfo.objFun;
        let paType = parsedInfo.paType;
        //console.log(userDefinedGridInfo, filterInfo, ranking2filter, constraints, objFun);
        //console.log("constraints ", constraints);
        //console.log("objFun ", objFun);

        co(function* () {
            function generateGLPK(preprocessedData, constraints, objFun) {
                ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                let writeStream = fs.createWriteStream('optimizationInput.txt');
                //generate objective function
                let minormax4objfun = objFun.goalDirection;
                let goal = objFun.goal;
                let objectiveFunction='';
                preprocessedData.forEach((p, i) => {
                    let weight = p.properties[goal];
                    if (i != preprocessedData.length - 1) {
                        objectiveFunction=objectiveFunction+ weight + ' x' + i + ' + ';
                    } else {
                        objectiveFunction=objectiveFunction+ weight + ' x' + i;
                    }
                });
                //console.log(objectiveFunction);
                /////generate constraints

                let constraintId = constraints.id;
                let constraintRange = constraints.range;
                let constraint1='';
                let constraint2='';
                //Constraint 1
                preprocessedData.forEach((p, i) => {
                    let weight4constraint = p.properties[constraintId];
                    if (i != preprocessedData.length - 1) {
                        constraint1 = constraint1 + weight4constraint + ' x' + i + ' + ';
                    } else {
                        constraint1 = constraint1 + weight4constraint + ' x' + i + ' >= ' + constraintRange[0];
                    }
                });
                //Constraint 2
                preprocessedData.forEach((p, i) => {
                    let weight4constraint = p.properties[constraintId];
                    if (i != preprocessedData.length - 1) {
                        constraint2 = constraint2 + weight4constraint + ' x' + i + ' + ';
                    } else {
                        constraint2 = constraint2 + weight4constraint + ' x' + i + ' <= ' + constraintRange[1];
                    }
                }); 
                
                //Write the objective function and constraints in a JSON object

                let optInput = {
                    objective: minormax4objfun,
                    objFun: objectiveFunction,
                    constraintFirst: constraint1,
                    constraintSecond: constraint2

                };
                
                writeStream.write(JSON.stringify(optInput));
                writeStream.on('finish', function () {
                    console.log('optimizationInput file has been written');
                });

                ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                // // objective function
                // let writeStream = fs.createWriteStream('optimizationInput.txt');
                // let minormax4objfun = objFun.goalDirection;
                // let goal = objFun.goal;
                // writeStream.write(minormax4objfun + '\n obj:');
                // preprocessedData.forEach((p, i) => {
                //     let weight = p.properties[goal];
                //     if (i != preprocessedData.length - 1) {
                //         writeStream.write(weight + ' x' + i + ' + ');
                //     } else {
                //         writeStream.write(weight + ' x' + i + '\nSubject To' + '\n c1:');
                //     }
                // })
                // /////constraints
                // let constraintId = constraints.id;
                // let constraintRange = constraints.range;
                // preprocessedData.forEach((p, i) => {
                //     let weight4constraint = p.properties[constraintId];
                //     if (i != preprocessedData.length - 1) {
                //         writeStream.write(weight4constraint + ' x' + i + ' + ');
                //     } else {
                //         writeStream.write(weight4constraint + ' x' + i + ' >= ' + constraintRange[0] + '\n c2:');
                //     }
                // })
                // preprocessedData.forEach((p, i) => {
                //     let weight4constraint = p.properties[constraintId];
                //     if (i != preprocessedData.length - 1) {
                //         writeStream.write(weight4constraint + ' x' + i + ' + ');
                //     } else {
                //         writeStream.write(weight4constraint + ' x' + i + ' <= ' + constraintRange[1] + '\nBounds\n');
                //     }
                // })
                // // //////bounds
                // preprocessedData.forEach((p, i) => {
                //     if (i != preprocessedData.length - 1) {
                //         writeStream.write('0 <= x' + i + ' <= 1\n');
                //     } else {
                //         writeStream.write('0 <= x' + i + ' <= 1\nBinaries \n');
                //     }
                // })
                // ///////binaries
                // preprocessedData.forEach((p, i) => {
                //     if (i != preprocessedData.length - 1) {
                //         writeStream.write('x' + i + ' ');
                //     } else {
                //         writeStream.write('x' + i + ' \nEnd');
                //     }
                // })
                
                // writeStream.on('finish', function () {
                //     console.log('optimizationInput file has been written');
                //     let prob = new glp.Problem();
                //     prob.readLpSync("optimizationInput.txt");
                //     prob.scaleSync(glp.SF_AUTO);
                //     prob.simplexSync({ presolve: glp.ON });
                //     let variablesNum = prob.getNumInt();
                //     // console.log("variablesNum ", variablesNum);
                //     if (prob.getNumInt() > 0) {
                //         function callback(tree) {
                //             if (tree.reason() == glp.IBINGO) {
                //                 // ...
                //             }
                //         }
                //         prob.intoptSync({ cbFunc: callback });
                //     }
                //     // console.log("objective: " + prob.mipObjVal());
                //     let patch2buy = [];
                //     //console.log("Sample iteration" +  prob.getObjVal()); //Just getting an idea about the response structure
                //     for (let i = 1; i < variablesNum + 1; i++) {
                //         console.log("varibles" + (i - 1) + ": " + prob.getColPrim(i)); //These are the indication of which patches to buy
                //         if (prob.getColPrim(i) == 1) {
                //             patch2buy.push(preprocessedData[i - 1])
                //         }
                //     }
                //     prob.delete();
                //     //console.log(patch2buy, "PATCH TO BUY");  (THIS HAS ALL THE RELEVANT FEATURE DATA FOR EACH PATCH)
                //     res.send(patch2buy);
                // });
                    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                
                writeStream.end();
            }
            let db = yield MongoClient.connect(url);
            let userGridsCol = db.collection('userGrids');
            let originalDataArr = yield userGridsCol.find({ "properties.userDefinedGridInfo": userDefinedGridInfo }).toArray();
            if (paType == "totalPA") {
                originalDataArr = originalDataArr.filter(obj => obj.properties.paAver != -2); //this line is given to keep consistent with the frontend. Filter the parcel inside the protected area. 
            }
            // console.log("originalDataArr, ", originalDataArr.length);
            let filteredDatabyAttr = filterData(originalDataArr, filterInfo);
            let flag4MedianRanking = getMedianRank(filteredDatabyAttr, filterInfo).flag;
            if (flag4MedianRanking == 1) {
                preprocessedData = filterDatabyRanking(filteredDatabyAttr, ranking2filter);
            } else {
                preprocessedData = filteredDatabyAttr;
            }
            // console.log("preprocessedData ",preprocessedData.length);
            db.close();
            generateGLPK(preprocessedData, constraints, objFun);
        });


    });
    return router;
};

