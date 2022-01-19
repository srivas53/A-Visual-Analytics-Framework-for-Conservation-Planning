# -*- coding: utf-8 -*-
"""
Created on Sun Jan 16 13:39:39 2022

@author: vsriva11
"""


from flask import Flask
#import json
from flask import request 
   
# Setup flask server
app = Flask(__name__) 
  
# Setup url route which will calculate
# total sum of array.
@app.route('/', methods = ['POST']) 
def sum_of_array(): 
    data = request.get_json() 
    print(data)
    print('sakaal')
  
    # # Data variable contains the 
    # # data from the node server
    # ls = data['array'] 
    # result = sum(ls) # calculate the sum
  
    # Return data in json format 
    # return json.dumps({"result":result})
   
if __name__ == "__main__": 
    app.run(port=3000)