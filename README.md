Setup Instructions:

cd into root file **Nova**, then run `npm install` to get node_modules folder 

cd into **server**, then run `node index.js`

If any modules are missing, run `npm install {module}` where the module is the missing module.  
If the terminal throws an error about API key missing after running `node index.js`, we will fix that in the next step.  
If the terminal asks you to pip install, follow the terminal and run the command provided (e.g. `pip install backtrader yfinance pandas`)

Inside the **server** folder, create a **.env** file  
In your new .env file, make sure to fill in the following information:  
\\  
ALPHA_VANTAGE_API_KEY={ key }  
OPENAI_API_KEY={ key }  
\\  
The keys should be free to get.  
Get the Alpha Vantage key from here: https://www.alphavantage.co/support/#api-key  
Get the OpenAI key from here: https://platform.openai.com/api-keys  
These keys will allow you to interact with the LLM.

After adding the keys, open a new terminal, cd into root file **Nova**, then run `npm start` concurrently with `node index.js`.  
Running this command will open a tab in your browser that shows the LLM interface.

Now you can interact with it :)

make sure port 5001 is not hosting anything. If it is running something else, look up how to kill that process.

import json import sys import traceback import backtrader as bt import yfinance as yf import math from datetime import datetime, timedelta import pandas as pd import pytz import React from 'react'; import ReactDOM from 'react-dom/client'; import './index.css'; import App from './App'; import reportWebVitals from './reportWebVitals'; import React, { useEffect, useRef } from 'react'; import * as monaco from 'monaco-editor';
