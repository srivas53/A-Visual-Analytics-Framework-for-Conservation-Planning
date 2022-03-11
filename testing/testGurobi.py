# -*- coding: utf-8 -*-
"""
Created on Fri Feb 11 12:54:06 2022

@author: vsriva11
"""

import gurobipy as gp
from gurobipy import GRB
import json
import requests
#fetchResponse=requests.get('http://localhost:13000/optimizationParameters')#'http://localhost:13000/optimizationParameters'
#optimizationParameters=fetchResponse.json()




#Obj fun: 2598933.64325 x0 + 2593716.33095 x1 + 2374076.5373 x2 + 2378120.21565 x3 + 
#2598050.50955 x4 + 2593973.42625 x5 + 1294543.6141 x6 + 1071611.63385 x7 + 2610458.37785 x8 + 2172262.0595 x9

#Constraint
#19340 x0 + 19605 x1 + 15915 x2 + 17189 x3 + 16601 x4 + 20742 x5 
#+ 9890 x6 + 8005 x7 + 19329 x8 + 13826 x9 <= 115149

m = gp.Model("mip1")

#Define Variables

x0 = m.addVar(vtype=GRB.BINARY, name="x0")
x1 = m.addVar(vtype=GRB.BINARY, name="x1")
x2 = m.addVar(vtype=GRB.BINARY, name="x2")
x3 = m.addVar(vtype=GRB.BINARY, name="x3")
x4 = m.addVar(vtype=GRB.BINARY, name="x4")
x5 = m.addVar(vtype=GRB.BINARY, name="x5")
x6 = m.addVar(vtype=GRB.BINARY, name="x6")
x7 = m.addVar(vtype=GRB.BINARY, name="x7")
x8 = m.addVar(vtype=GRB.BINARY, name="x8")
x9 = m.addVar(vtype=GRB.BINARY, name="x9")
x10 = m.addVar(vtype=GRB.BINARY, name="x10")
x11 = m.addVar(vtype=GRB.BINARY, name="x11")
x12 = m.addVar(vtype=GRB.BINARY, name="x12")
x13 = m.addVar(vtype=GRB.BINARY, name="x13")
x14 = m.addVar(vtype=GRB.BINARY, name="x14")
x15 = m.addVar(vtype=GRB.BINARY, name="x15")
x16 = m.addVar(vtype=GRB.BINARY, name="x16")
x17 = m.addVar(vtype=GRB.BINARY, name="x17")
x18 = m.addVar(vtype=GRB.BINARY, name="x18")
x19 = m.addVar(vtype=GRB.BINARY, name="x19")
x20 = m.addVar(vtype=GRB.BINARY, name="x20")
x21 = m.addVar(vtype=GRB.BINARY, name="x21")
x22 = m.addVar(vtype=GRB.BINARY, name="x22")
x23 = m.addVar(vtype=GRB.BINARY, name="x23")
x24 = m.addVar(vtype=GRB.BINARY, name="x24")
x25 = m.addVar(vtype=GRB.BINARY, name="x25")
x26 = m.addVar(vtype=GRB.BINARY, name="x26")
x27 = m.addVar(vtype=GRB.BINARY, name="x27")
x28 = m.addVar(vtype=GRB.BINARY, name="x28")


#Define Objective function


m.setObjective(970045.377302 *x0 + 1294542.23495 *x1 + 1292650.9166 *x2 + 647283.358152 *x3 + 161490.697299 *x4 + 1212047.86565 *x5 + 161560.776002 *x6 + 323725.98415 *x7 + 323706.7988 *x8 + 647385.377299 *x9 + 484958.6355 *x10 + 1777293.29725 *x11 + 323452.51945 *x12 + 1292313.02695 *x13 + 323639.948448 *x14 + 1292568.9874 *x15 + 647194.111999 *x16 + 323587.739451 *x17 + 2587368.38615 *x18 + 1293347.2591 *x19 + 323627.859501 *x20 + 647227.877854 *x21 + 323677.63695 *x22 + 1292725.42645 *x23 + 161658.55865 *x24 + 1292773.53485 *x25 + 2263281.06565 *x26 + 323088.475448 *x27 + 2261922.02631 *x28, GRB.MAXIMIZE)

#Add cost constraint

m.addConstr(7844 *x0 + 9601 *x1 + 10204 *x2 + 4999 *x3 + 1269 *x4 + 9250 *x5 + 1213 *x6 + 2761 *x7 + 2719 *x8 + 5426 *x9 + 40248 *x10 + 12976 *x11 + 2475 *x12 + 13004 *x13 + 2621 *x14 + 10184 *x15 + 5344 *x16 + 3850 *x17 + 19271 *x18 + 9610 *x19 + 3850 *x20 + 5004 *x21 + 2538 *x22 + 9566 *x23 + 1193 *x24 + 9786 *x25 + 16095 *x26 + 2488 *x27 + 17125 *x28 <= 153418, "c1")
#m.addConstr(19340 * x0 + 19605 * x1 + 15915 * x2 + 17189 * x3 + 16601 * x4 + 20742 * x5 + 9890 * x6 + 8005 * x7 + 19329 * x8 + 13826 * x9 <= 115149, "c2")

#Write the file in WD in .lp format

m.write('GurobiLpModel.lp')
m.write('GurobiMPSModel.mps')

modelFinal= gp.read("GurobiLpModel.lp")



modelFinal.optimize()


for v in modelFinal.getVars():
    print('%s %g' % (v.VarName, v.X))

objt = modelFinal.getObjective()
print(objt.getValue())

#16242000>> Area suggested

# x0 1
# x1 1
# x2 1
# x3 0
# x4 1
# x5 0
# x6 1
# x7 0
# x8 1
# x9 1

#final cost:
    



















