# -*- coding: utf-8 -*-
"""
Created on Sun Feb 27 17:58:53 2022

@author: vsriva11
"""


from flask import Flask, request
import json 

app = Flask(__name__) 
  
# Setup url route which will calculate
# total sum of array.

@app.route('/optimalSolution', methods = ['POST']) 
def sum_of_array(): 
    data = request.get_json() 
    print(data)
  
    # Data variable contains the 
    # data from the node server
    ls = data['objective'] 

    # Return data in json format 
    return json.dumps({"result":data})
   
if __name__ == "__main__": 
    app.run(port=5000)