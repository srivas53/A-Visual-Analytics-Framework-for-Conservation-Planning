# -*- coding: utf-8 -*-
"""
Created on Wed Jan 19 12:55:31 2022

@author: vsriva11
"""

import requests
import json

##Step 1: Make sure that the math is matching
##Step 2: Let the optimization.js code export the current .txt file (Can remove the part of setting Bounds and area below it)
##Step 3: Fetch first 5 lines of the current .txt file in parsedInfo.js, and send it in the GET framework
##Step 4: Python code, get relevant ino
#Fetch Sample JSON data from a sample API endpoint /optimization/parsedInfo

sampleRequest=requests.get('http://localhost:13000/parsedInfo')
sampleJSON=sampleRequest.json()

def optimizationRoutine():
    userDefinedGridInfo=sampleJSON['message']['userDefinedGridInfo'] #Get information about the bounding box drawn by the user
    filterInfo=sampleJSON['message']['filterInfo'] #Get information on the attribute filters being applied by the user, as well as the sorting direction that they want
    ranking2filter=sampleJSON['message']['ranking2filter'] #Get information about the median ranking filter (Set by the user via the slider on the top right)
    constraints=sampleJSON['message']['constraints'] #Get information about the constraint (Cost or area)
    objFun=sampleJSON['message']['objFun'] #Get information about the objective function, that could be either max. area, or min. cost
    paType=sampleJSON['message']['paType'] #gives information about the protected area layer (1, 2, or total)
    
    #Defining a function that generates a .txt file, comatible with glpk
    def createInputFile():
        minormax4objfun=objFun['goalDirection']
        goal= objFun['goal']
        
        
        
        
    
    
    
    

