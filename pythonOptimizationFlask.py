# -*- coding: utf-8 -*-
"""
Created on Fri Jan 21 12:23:06 2022

@author: vsriva11
"""

import pulp
from pulp import LpMaximize, LpProblem, LpStatus, lpSum, LpVariable, LpMinimize
import json
import requests
import re
import numpy as np
from flask import Flask, request

app = Flask(__name__) 


@app.route('/optimalSolution', methods = ['POST']) 
def sum_of_array(): 
    optimizationParameters = request.get_json() 
    print(optimizationParameters)
    optimizationObjective=optimizationParameters['objective']
    objFunctionString=optimizationParameters['objFun']
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
    
    #Get weights for our constraint
    constraintString=optimizationParameters['constraintSecond']
    constraintWeights = re.findall(r"\d+[.,]*\d*[.,]*\d*",constraintString)
    
    #Remove the last element, as that is the constraint limit value, and save it as an integer
    constraintLimit=int(constraintWeights[-1])
    constraintWeights=constraintWeights[:-1]
    constraintWeightsFinal=np.array(onlyEvenIndex(constraintWeights)).astype(int)
    
    #Initiate model object
    
    if optimizationObjective=='Maximize':
        optimizationModel = LpProblem(name="optimizationModel", sense=LpMaximize) #sense=0 is maximization
    else:
        optimizationModel = LpProblem(name="optimizationModel", sense=LpMinimize)
        
    
    #Define model variables
    x = {i: LpVariable(name=f"x{i}", cat='Binary') for i in range(len(listOfVariables))}    
    
    constraintDefinition=''
    
    for i in range(len(x)):
        constraintDefinition += (x[i] * constraintWeightsFinal[i])
        
    #Add model constraint to the optimizationModel
    
    optimizationModel+=(constraintDefinition<=constraintLimit , "Constraint_1")
    
    #Define the objective function
    objectiveFunctionDefinition=''
    
    for i in range(len(x)):
        objectiveFunctionDefinition += (x[i] * objectiveFunctionWeightsFinal[i])    
        
    optimizationModel+=objectiveFunctionDefinition
    
    solver = pulp.GUROBI();
    status = optimizationModel.solve()        
        
    for var in optimizationModel.variables():
        print(f"{var.name}: {var.value()}")
        #patchesToBuy[f"{var.name}"]=f"{var.value()}"
        #Extract indexes of the variables that have 1 as a result, and then, send it as a list to NOde
    
    
    
    for name, constraint in optimizationModel.constraints.items():
        print(f"{name}: {constraint.value()}")
        
    print(f"objective: {optimizationModel.objective.value()}")
    finalObjectiveValue = optimizationModel.objective.value()
         
# Return data in json format 
    return json.dumps({"result":finalObjectiveValue})
   
if __name__ == "__main__": 
    app.run(port=5000)
    
#9774939.689401    

#optimizationParameters=fetchResponse.json()

##Desired Structure:
#User selects all the requred parameters
#User clicks on optimize button
#optimization.js executes, exports the .txt file containing the the optimization paramenters
#optimizationParameters.js code runs, exporting the required information to /optimizationParameters API endpoint
#Python gets the required info using GET , and exports the output
#form4opti.js gets the requred output from the API endpoint /optimizationParameters API endpoint

##Doubt: Ask where the optimization output is being directed to. As per my knowledge, it is under line 93 of form$opti.js (Tho, not being able to get anything logged on the console)

############################################################
#Get required information from the parsed JSON body
#optimizationObjective=optimizationParameters['optimizationParameters']['objective']

#Get a list of all variables in the given problem
#objFunctionString=optimizationParameters['optimizationParameters']['objFun']

# listOfVariables=[]


# def extractVariables(x):
#     #Extract variables
#     for i in range(len(x)):
#         try:
#             if x[i].find('x')!=-1:
#                 listOfVariables.append(x[i]+x[i+1]+x[i+2])
#         except IndexError:
#             break

# extractVariables(objFunctionString) 
      
# listOfVariables = [s.strip() for s in listOfVariables]
# #Extract objective function weights
# objectiveFunctionWeights = re.findall(r"\d+[.,]*\d*[.,]*\d*",objFunctionString)

# #Get only positive indexes (Eg: To avoid getting 0 from x0 )
# def onlyEvenIndex(x):
#    return x[::2]

# objectiveFunctionWeightsFinal=np.array(onlyEvenIndex(objectiveFunctionWeights)).astype(float)

# #Get weights for out constraint
# constraintString=optimizationParameters['optimizationParameters']['constraintSecond']
# constraintWeights = re.findall(r"\d+[.,]*\d*[.,]*\d*",constraintString)

# #Remove the last element, as that is the constraint limit value, and save it as an integer
# constraintLimit=int(constraintWeights[-1])
# constraintWeights=constraintWeights[:-1]
# constraintWeightsFinal=np.array(onlyEvenIndex(constraintWeights)).astype(int)

#Initiate model object

# if optimizationObjective=='Maximize':
#     optimizationModel = LpProblem(name="optimizationModel", sense=LpMaximize) #sense=0 is maximization
# else:
#     optimizationModel = LpProblem(name="optimizationModel", sense=LpMinimize)
    

# #Define model variables
# x = {i: LpVariable(name=f"x{i}", cat='Binary') for i in range(len(listOfVariables))}

#optimizationModel+=(x[0] * constraintWeightsFinal[0]<=0, "Constraint1")    
#Define the model constraint

# constraintDefinition=''

# for i in range(len(x)):
#     constraintDefinition += (x[i] * constraintWeightsFinal[i])
    
# #Add model constraint to the optimizationModel

# optimizationModel+=(constraintDefinition<=constraintLimit , "Constraint_1")

# #Define the objective function
# objectiveFunctionDefinition=''

# for i in range(len(x)):
#     objectiveFunctionDefinition += (x[i] * objectiveFunctionWeightsFinal[i])

#Add objective function to the optimizationModel

# optimizationModel+=objectiveFunctionDefinition

# solver = pulp.GUROBI();
# status = optimizationModel.solve()
#Covers slighlty more area than the current model (8888409.97011 m2 in this vs 8726640.7 m2 in current)
#The final cost is slightly higher than the current (66104 dollars vs 64226 in the current)
#Ask Prof Sefair if this is okay or not, also, based on rp, there could be more constraints defined, where is that being handeled?
#In current code, there are some variables taking value of a fraction, that is not ideal




#patchesToBuy={}

# for var in optimizationModel.variables():
#     print(f"{var.name}: {var.value()}")
#     #patchesToBuy[f"{var.name}"]=f"{var.value()}"



# for name, constraint in optimizationModel.constraints.items():
#     print(f"{name}: {constraint.value()}")
    
# print(f"objective: {optimizationModel.objective.value()}")    
    #Spawn:
    #1. spawn chunk is written in index.js file
#20290393.216861002

#Send list of patch numbers that have been marked as 1
#This list to be fetched in the optimization.js code, and thenn response has to be sent

