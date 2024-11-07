test.py


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

  // Check for all required elements
  const hasAllRequired = requiredElements.every(element => code.includes(element));
  
  // Check for prohibited elements
  const hasProhibited = prohibitedElements.some(element => code.includes(element));
  
  return hasAllRequired && !hasProhibited;
};


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
${strategyDescription}

IMPORTANT: Only return the strategy class implementation. Do not include any Cerebro setup or data loading code. Use this exact structure:

import backtrader as bt
from datetime import datetime
import pandas as pd

class TradingStrategy(bt.Strategy):
    params = (
        ('period', 20),
        ('risk_pct', 0.02),
        ('stop_loss', 0.02),
    )

    def __init__(self):
        # Initialize indicators here
        pass

    def next(self):
        # Implement trading logic here
        pass

Return only the complete strategy code following this structure exactly.`;

// Simplified code cleaning function
const cleanPythonCode = (code) => {
  // Remove markdown blocks if present
  code = code.replace(/```python\n?/g, '')
           .replace(/```\n?/g, '')
           .trim();
  
  // Fix any mangled init methods
  code = code.replace(/def \*\*init\*\*/g, 'def __init__')
           .replace(/def init/g, 'def __init__');
  
  return code;
};

// Update the generate-code endpoint
app.post('/generate-code', async (req, res) => {
  try {
    console.log("Received code generation request");
    const { prompt, symbol = 'AAPL', timeframe = '5m' } = req.body;
    
    console.log("Generating strategy code...");
    
    const clarificationCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a trading strategy expert. Extract and clarify trading strategy requirements.'
        },
        {
          role: 'user',
          content: `Extract and clarify the trading strategy requirements from this prompt, focusing on entry/exit rules, indicators, and risk management: "${prompt}"`
        }
      ],
      max_tokens: 300,
      temperature: 0.3
    });
    
    const strategyDescription = clarificationCompletion.choices[0].message.content;
    
    const strategyCompletion = await openai.chat.completions.create({
      model: 'gpt-4',  // Using GPT-4 for better code generation
      messages: [
        {
          role: 'system',
          content: 'You are a Python trading strategy expert. Generate complete, working Backtrader strategy code.'
        },
        {
          role: 'user',
          content: strategyPrompt.replace('${strategyDescription}', strategyDescription)
        }
      ],
      max_tokens: 1500,
      temperature: 0.2  // Lower temperature for more consistent output
    });
    
    let strategyCode = cleanPythonCode(strategyCompletion.choices[0].message.content);
    
    if (!validateStrategyCode(strategyCode)) {
      // If validation fails, try one more time with a more explicit prompt
      const retryCompletion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a Python trading strategy expert. Generate complete, working Backtrader strategy code.'
          },
          {
            role: 'user',
            content: `The previous code did not meet requirements. Please generate a valid Backtrader strategy using EXACTLY this structure:

import backtrader as bt
from datetime import datetime
import pandas as pd

class TradingStrategy(bt.Strategy):
    params = (
        ('period', 20),
        ('risk_pct', 0.02),
        ('stop_loss', 0.02),
    )

    def __init__(self):
        # Add indicators here
        pass

    def next(self):
        # Add trading logic here
        pass

Strategy requirements: ${strategyDescription}`
          }
        ],
        max_tokens: 1500,
        temperature: 0.1
      });
      
      strategyCode = cleanPythonCode(retryCompletion.choices[0].message.content);
      
      if (!validateStrategyCode(strategyCode)) {
        throw new Error('Generated code does not meet required strategy structure');
      }
    }
    
    console.log("Generated strategy code:", strategyCode);
    
    fs.writeFileSync('generated_strategy.py', strategyCode);
    console.log("Strategy code saved to file");
    
    res.json({
      response: strategyCode,
      isStrategy: true,
      description: strategyDescription,
      symbol,
      timeframe
    });
    
  } catch (error) {
    console.error('Error generating code:', error);
    res.status(500).json({ error: error.message });
  }
});