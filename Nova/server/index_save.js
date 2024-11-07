const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const fs = require('fs');
const { exec } = require('child_process');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const strategyPrompt = `You are a Python trading strategy developer. Create a complete Backtrader strategy class that implements the following requirements:

REQUIRED STRUCTURE:
1. Use these exact imports:
   import backtrader as bt
   from datetime import datetime
   import pandas as pd

2. Create a class named 'TradingStrategy' that inherits from bt.Strategy:
   class TradingStrategy(bt.Strategy):

3. Include these essential methods:
   - __init__ for setup
   - next for trading logic

4. Add basic risk management:
   - Position sizing
   - Stop losses
   - Maximum position checks

Here is the strategy to implement:

IMPORTANT: Only return the strategy class implementation. Do not include any Cerebro setup or data loading code.`;

const fixPrompt = `You are a Python trading strategy debugging expert. Fix the following Backtrader strategy that produced an error.

ERROR MESSAGE:
{errorMessage}

CURRENT CODE:
{code}

REQUIREMENTS:
1. Fix the specific error while maintaining the strategy's logic
2. Ensure the code follows this exact structure:
   import backtrader as bt
   from datetime import datetime
   import pandas as pd

   class TradingStrategy(bt.Strategy):
       # ... implementation ...

3. Common fixes to check:
   - String literals and formatting
   - Proper line endings
   - Correct indicator initialization
   - Valid data access methods
   - Proper order management
   - Position size calculations
   - Risk management implementation

4. Verify:
   - All required imports are present
   - Class structure is maintained
   - Trading logic remains intact
   - Risk management is properly implemented

IMPORTANT:
- Only return the complete fixed code
- Do not include any explanations or comments
- Maintain the exact class structure
- Keep all existing functionality while fixing the error`;

const validateStrategyCode = (code) => {
  const requiredElements = [
    'import backtrader as bt',
    'from datetime import datetime',
    'import pandas as pd',
    'class TradingStrategy(bt.Strategy)',
    'def __init__',
    'def next'
  ];

  const prohibitedElements = [
    'cerebro = bt.Cerebro()',
    'cerebro.addstrategy',
    'cerebro.run()',
    'cerebro.adddata',
    'cerebro.broker',
    'bt.feeds.PandasData'
  ];

  const hasAllRequired = requiredElements.every(element => code.includes(element));
  const hasProhibited = prohibitedElements.some(element => code.includes(element));
  
  return hasAllRequired && !hasProhibited;
};

const cleanPythonCode = (code) => {
  let cleaned = code.replace(/```python\n?/g, '')
                   .replace(/```\n?/g, '')
                   .trim();
  
  cleaned = cleaned.replace(/def \*\*init\*\*/g, 'def __init__')
                  .replace(/def init/g, 'def __init__');
  
  // Ensure proper line endings
  cleaned = cleaned.replace(/\r\n/g, '\n');
  
  // Fix common string formatting issues
  cleaned = cleaned.replace(/["']([^"']*?)["']/g, (match, p1) => {
    // If it contains quotes, use the opposite type
    if (p1.includes('"')) return `'${p1}'`;
    if (p1.includes("'")) return `"${p1}"`;
    return match;
  });
  
  return cleaned;
};


app.post('/generate-code', async (req, res) => {
    try {
      console.log("Received code generation request");
      const { prompt, isFixing = false, currentCode = '' } = req.body;
      let isStrategy = false;
      
      // If this is a fix request, use different logic
      if (isFixing) {
        console.log("Attempting to fix code...");
        const errorMessage = prompt.split('\n\nCode:')[0].replace('Error:', '').trim();
        const codeToFix = currentCode || prompt.split('\n\nCode:')[1].trim();
        
        const fixCompletion = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { 
              role: 'system', 
              content: fixPrompt
                .replace('{errorMessage}', errorMessage)
                .replace('{code}', codeToFix)
            },
            { 
              role: 'user', 
              content: 'Fix this code following the guidelines above and return only the fixed code.' 
            }
          ],
          max_tokens: 1500,
          temperature: 0.7
        });
  
        const fixedCode = cleanPythonCode(fixCompletion.choices[0].message.content);
        
        if (!validateStrategyCode(fixedCode)) {
          throw new Error('Fixed code does not meet required strategy structure');
        }
  
        // Save the fixed code
        fs.writeFileSync('generated_strategy.py', fixedCode, 'utf8');
  
        return res.json({
          response: fixedCode,
          isStrategy: true
        });
      }
  
      // Regular strategy generation logic
      const autoKeywords = ["strategy", "trading", "backtest"];
      const intentKeywords = ["trade", "buy", "sell", "volume", "stock", "signal", "price", "indicator"];
  
      if (autoKeywords.some(keyword => prompt.toLowerCase().includes(keyword))) {
        isStrategy = true;
      } else if (intentKeywords.some(keyword => prompt.toLowerCase().includes(keyword))) {
        const intentCheck = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { 
              role: 'system', 
              content: 'You are a trading strategy expert. Determine if the input is requesting a trading strategy implementation.' 
            },
            { 
              role: 'user', 
              content: `Is this input requesting a trading strategy or related trading code? Answer only 'yes' or 'no': "${prompt}"` 
            }
          ],
          max_tokens: 10,
          temperature: 0.1
        });
        isStrategy = intentCheck.choices[0].message.content.trim().toLowerCase() === 'yes';
      }
  
      if (isStrategy) {
        console.log("Generating strategy code...");
        
        const clarificationCompletion = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { 
              role: 'system', 
              content: 'You are a trading strategy expert. Extract and clarify trading strategy requirements.' 
            },
            { 
              role: 'user', 
              content: `Extract and clarify the trading strategy requirements from this prompt. Focus on entry/exit rules, indicators, parameters, and risk management: "${prompt}"` 
            }
          ],
          max_tokens: 300,
          temperature: 0.3
        });
        
        const strategyDescription = clarificationCompletion.choices[0].message.content;
        
        const strategyCompletion = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { 
              role: 'system', 
              content: 'You are a Python trading strategy expert. Generate complete, working Backtrader strategy code.' 
            },
            { 
              role: 'user', 
              content: strategyPrompt + '\n\n' + strategyDescription
            }
          ],
          max_tokens: 1500,
          temperature: 0.7
        });
        
        let strategyCode = cleanPythonCode(strategyCompletion.choices[0].message.content);
        
        if (!validateStrategyCode(strategyCode)) {
          throw new Error('Generated code does not meet required strategy structure');
        }
        
        console.log("Generated strategy code:", strategyCode);
        
        fs.writeFileSync('generated_strategy.py', strategyCode);
        console.log("Strategy code saved to file");
        
        res.json({
          response: strategyCode,
          isStrategy: true,
          description: strategyDescription
        });
      } else {
        console.log("Generating non-strategy response...");
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { 
              role: 'system', 
              content: 'You are a helpful trading assistant.' 
            },
            { 
              role: 'user', 
              content: prompt 
            }
          ],
          max_tokens: 400
        });
        
        res.json({
          response: completion.choices[0].message.content,
          isStrategy: false
        });
      }
    } catch (error) {
      console.error('Error generating code:', error);
      res.status(500).json({ error: error.message });
    }
  });

app.post('/run-strategy', async (req, res) => {
  try {
    console.log("Starting strategy execution...");
    
    if (!fs.existsSync('generated_strategy.py')) {
      return res.status(400).json({ error: 'Strategy file not found' });
    }

    const { symbol = 'AAPL', timeframe = '1d', initialCash = 100000, commission = 0.001 } = req.body;

    // Clear Python's __pycache__ directory if it exists
    const pycacheDir = '__pycache__';
    if (fs.existsSync(pycacheDir)) {
      fs.rmSync(pycacheDir, { recursive: true, force: true });
      console.log("Cleared Python cache directory");
    }

    exec(`python3 -B runner.py "${symbol}" "${timeframe}" ${initialCash} ${commission}`, {
      timeout: 60000
    }, (error, stdout, stderr) => {
      if (error) {
        console.error("Error executing strategy:", error);
        return res.status(500).json({ error: stderr });
      }

      try {
        const outputLines = stdout.trim().split('\n');
        const lastLine = outputLines[outputLines.length - 1];
        const analysisResults = JSON.parse(lastLine);
        
        if (analysisResults.error) {
          return res.status(500).json({ error: analysisResults.error });
        }

        res.json({
          analysis: analysisResults,
          status: 'success'
        });
      } catch (parseError) {
        console.error("Error parsing results:", parseError);
        res.status(500).json({ error: 'Error parsing analysis results' });
      }
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/update-code', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Missing code' });
    }

    if (!validateStrategyCode(code)) {
      return res.status(400).json({ error: 'Invalid strategy code' });
    }

    fs.writeFileSync('generated_strategy.py', code, {
      encoding: 'utf8',
      flag: 'w'
    });

    console.log("Strategy code updated");
    res.json({ status: 'success' });

  } catch (error) {
    console.error('Error updating code:', error);
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  
  exec('python3 -c "import backtrader, yfinance, pandas"', (error) => {
    if (error) {
      console.error("Warning: Required Python packages may not be installed.");
      console.log("Please run: pip install backtrader yfinance pandas");
    } else {
      console.log("Required Python packages are installed");
    }
  });
});
