# -*- coding: utf-8 -*-
"""
Created on Fri Jan 21 12:23:06 2022

@author: vsriva11
"""

from pulp import LpMaximize, LpProblem, LpStatus, lpSum, LpVariable, LpMinimize
import json
import requests
import re
import numpy as np
##Step 1: Make sure that the math is matching= DONE
##Step 2: Let the optimization.js code export the current .txt file (Can remove the part of setting Bounds and area below it)= DONE
##Step 3: Fetch first 5 lines of the current optimization.txt file into the parsedInfo.js, and send it in the GET framework =DONE
##Step 4: Python code, get relevant info
#Fetch Sample JSON data from a sample API endpoint /optimizationFinal

fetchResponse=requests.get('http://localhost:13000/optimizationFinal')
optimizationParameters=fetchResponse.json()

##Desired Structure:
#User selects all the requred parameters
#User clicks on optimize button
#optimization.js executes, exports the .txt file containing the the optimization paramenters
#optimizationParameters.js code runs, exporting the required information to /optimizationFinal API endpoint
#Python gets the requored info using GET , and exports the output
#form4opti.js gets the requred output from the API endpoint /optimizationFinal API endpoint

##Doubt: Ask where the optimization output is being directed to. As per my knowledge, it is under line 93 of form$opti.js (Tho, not being able to get anything logged on the console)

############################################################
#Get required information from the parsed JSON body
optimizationObjective=optimizationParameters['optimizationParameters']['objective']

#Get a list of all variables in the given problem
objFunctionString=optimizationParameters['optimizationParameters']['objFun']

listOfVariables=[]


def extractVariables(x):
    #Extract variables
    for i in range(len(x)):
        try:
            if x[i].find('x')!=-1:
                listOfVariables.append(x[i]+x[i+1]+x[i+2])
        except IndexError:
            break

extractVariables(objFunctionString) 
      
listOfVariables = [s.strip() for s in listOfVariables]
#Extract objective function weights
objectiveFunctionWeights = re.findall(r"\d+[.,]*\d*[.,]*\d*",objFunctionString)

#Get only positive indexes (Eg: To avoid getting 0 from x0 )
def onlyEvenIndex(x):
   return x[::2]

objectiveFunctionWeightsFinal=np.array(onlyEvenIndex(objectiveFunctionWeights)).astype(float)

#Get weights for out constraint
constraintString=optimizationParameters['optimizationParameters']['constraintSecond']
constraintWeights = re.findall(r"\d+[.,]*\d*[.,]*\d*",constraintString)

#Remove the last element, as that is the constraint limit value, and save it as an integer
constraintLimit=int(constraintWeights[-1])
constraintWeights=constraintWeights[:-1]
constraintWeightsFinal=np.array(onlyEvenIndex(constraintWeights)).astype(int)

#Initiate model object

if optimizationObjective=='Maximize':
    optimizationModel = LpProblem(name="optimizationModel", sense=0) #sense=0 is maximization
else:
    optimizationModel = LpProblem(name="optimizationModel", sense=1)
    

#Define model variables
# x = {i: LpVariable(name=f"x{i}", lowBound=0) for i in range(1, 5)}

# # Add constraints
# model += (lpSum(x.values()) <= 50, "manpower")
# model += (3 * x[1] + 2 * x[2] + x[3] <= 100, "material_a")
# model += (x[2] + 2 * x[3] + 3 * x[4] <= 90, "material_b")

# Set the objective
#model += 20 * x[1] + 12 * x[2] + 40 * x[3] + 25 * x[4]
#modelVariables=LpVariable.dicts("modelVariables",listOfVariables,cat='Binary')




        
    

#Define model contraints


#Constraint 1:
#13092 x0 + 10901 x1 + 8865 x2 + 10795 x3 + 2974 x4 + 2649 x5 + 10338 x6 + 1750 x7 + 1093 x8 + 9700 x9 + 7682 x10 + 7743 x11 + 10921 x12 + 10635 x13 + 11016 x14 + 10487 x15 >= 0
#Constraint 2: 
#model += (1225 *x0 + 2488 *x1 + 17125 *x2 + 9566 *x3 + 4053 *x4 + 16095 *x5 + 18239 *x6 + 10915 *x7 + 5599 *x8 + 1213 *x9 + 2751 *x10 + 7924 *x11 + 19825 *x12 >= 0, "constraint_1")
optimizationModel += (1225 *x0 + 2488 *x1 + 17125 *x2 + 9566 *x3 + 4053 *x4 + 16095 *x5 + 18239 *x6 + 10915 *x7 + 5599 *x8 + 1213 *x9 + 2751 *x10 + 7924 *x11 + 19825 *x12 <= 66334, "constraint_2")


#Define Objective Function

#1614750.81375 x0 + 1293400.40865 x1 + 1131580.7633 x2 + 1293429.5946 x3 + 323145.524851 x4 + 323227.995448 x5 + 1297043.6144 x6 + 161625.27155 x7 + 161605.73905 x8 + 1293107.57875 x9 + 969727.603351 x10 + 1134096.50345 x11 + 1293088.20845 x12 + 1293205.8954 x13 + 1293138.80135 x14 + 1456323.7692 x15
obj_func=161675.298502*x0 + 323088.475448* x1 + 2261922.02631* x2 + 1292725.42645 *x3 + 484817.294249* x4 + 2263281.06565* x5 + 2263406.42245 *x6 + 1454420.12535 *x7 + 807909.332349 *x8 + 161618.9258 *x9 + 323334.699752 *x10 + 808269.308401 *x11 + 2424101.467 *x12
optimizationModel +=obj_func
#Can also be written using lpsum # Add the objective function to the model
#model += lpSum([x, 2 * y]) is equivalent to model += x + 2 * y


status = optimizationModel.solve()
#Covers slighlty more area than the current model (8888409.97011 m2 in this vs 8726640.7 m2 in current)
#The final cost is slightly higher than the current (66104 dollars vs 64226 in the current)
#Ask Prof Sefair if this is okay or not, also, based on rp, there could be more constraints defined, where is that being handeled?
#In current code, there are some variables taking value of a fraction, that is not ideal




#Print final o/p for which patches should be bought

for var in model.variables():
    print(f"{var.name}: {var.value()}")
    
#Print value of the final area (optimal solution value of the objective function, which is area in this case)


print(f"objective: {model.objective.value()}")







