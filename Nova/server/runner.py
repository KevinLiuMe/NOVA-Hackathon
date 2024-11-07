# runner.py
import json
import sys
import traceback
import backtrader as bt
import yfinance as yf
import math
from datetime import datetime, timedelta
import pandas as pd
import pytz

def get_value_or_default(d, *keys, default=0):
    """Safely get nested dictionary values"""
    try:
        result = d
        for key in keys:
            result = result.get(key, default)
        return float(result) if isinstance(result, (int, float)) else default
    except (AttributeError, TypeError):
        return default

def format_number(value):
    """Format numbers to handle infinity and NaN"""
    if isinstance(value, (int, float)):
        if math.isinf(value):
            return -99999 if value < 0 else 99999
        if math.isnan(value):
            return 0
        return value
    return value

def download_data(symbol, start_date, end_date, interval='5m'):
    """Download and prepare data with error handling and retries"""
    try:
        # Create ticker object
        ticker = yf.Ticker(symbol)
        
        # Download data in chunks if needed
        data = pd.DataFrame()
        chunk_size = timedelta(days=7)  # Download in 7-day chunks
        current_start = start_date
        
        while current_start < end_date:
            current_end = min(current_start + chunk_size, end_date)
            print(f"Downloading chunk from {current_start.date()} to {current_end.date()}...", file=sys.stderr)
            
            chunk = ticker.history(
                start=current_start.strftime('%Y-%m-%d'),
                end=current_end.strftime('%Y-%m-%d'),
                interval=interval,
                prepost=False,  # Only regular market hours
                actions=False
            )
            
            if not chunk.empty:
                data = pd.concat([data, chunk])
            
            current_start = current_end
        
        if data.empty:
            raise ValueError("No data downloaded")
        
        # Remove any duplicate indices
        data = data[~data.index.duplicated(keep='first')]
        
        # Sort by index
        data.sort_index(inplace=True)
        
        return data
        
    except Exception as e:
        print(f"Error downloading data: {str(e)}", file=sys.stderr)
        raise

if __name__ == '__main__':
    try:
        # Get command line arguments
        symbol = sys.argv[1] if len(sys.argv) > 1 else 'AAPL'
        timeframe = '5m'  # Fixed to 5-minute intervals
        initial_cash = float(sys.argv[3]) if len(sys.argv) > 3 else 100000.0
        commission = float(sys.argv[4]) if len(sys.argv) > 4 else 0.001

        # Create Cerebro
        cerebro = bt.Cerebro()

        # Set up date range for data download
        end_date = datetime.now(pytz.timezone('US/Eastern'))
        start_date = end_date - timedelta(days=60)  # Last 60 days for intraday data
        
        print(f"Downloading {timeframe} data for {symbol} from {start_date.date()} to {end_date.date()}...", file=sys.stderr)
        
        # Download data with retry mechanism
        data = download_data(symbol, start_date, end_date, interval=timeframe)
        
        if data.empty:
            raise ValueError(f"No data downloaded for symbol {symbol}")

        print(f"Downloaded {len(data)} bars of data", file=sys.stderr)
        
        # Add data feed
        data_feed = bt.feeds.PandasData(
            dataname=data,
            timeframe=bt.TimeFrame.Minutes,
            compression=5,
            tz=pytz.timezone('US/Eastern')
        )
        
        cerebro.adddata(data_feed)
        
        # Execute the strategy file content
        with open('generated_strategy.py', 'r') as file:
            exec(file.read(), globals())
        
        # Add the strategy
        cerebro.addstrategy(TradingStrategy)

        # Set up the broker
        cerebro.broker.setcash(initial_cash)
        cerebro.broker.setcommission(commission=commission)

        # Add analyzers
        cerebro.addanalyzer(bt.analyzers.TradeAnalyzer, _name='trades')
        cerebro.addanalyzer(bt.analyzers.DrawDown, _name='drawdown')
        cerebro.addanalyzer(bt.analyzers.SharpeRatio, 
                          _name='sharpe',
                          timeframe=bt.TimeFrame.Minutes,
                          compression=5,
                          riskfreerate=0.01)
        cerebro.addanalyzer(bt.analyzers.Returns, _name='returns')

        # Run the strategy
        print("Running strategy...", file=sys.stderr)
        initial_value = cerebro.broker.getvalue()
        results = cerebro.run()
        final_value = cerebro.broker.getvalue()
        
        strat = results[0]

        # Get the analyzers
        trade_analysis = strat.analyzers.trades.get_analysis()
        drawdown = strat.analyzers.drawdown.get_analysis()
        returns = strat.analyzers.returns.get_analysis()
        sharpe = strat.analyzers.sharpe.get_analysis()

        # Calculate total return manually if needed
        if math.isinf(get_value_or_default(returns, 'rtot')):
            total_return = ((final_value - initial_value) / initial_value) * 100
        else:
            total_return = get_value_or_default(returns, 'rtot') * 100

        # Format the results using safe getters
        total_trades = get_value_or_default(trade_analysis, 'total', 'total')
        won_trades = get_value_or_default(trade_analysis, 'won', 'total')
        lost_trades = get_value_or_default(trade_analysis, 'lost', 'total')
        
        # Calculate win rate safely
        win_rate = (won_trades / total_trades * 100) if total_trades > 0 else 0

        # Get profit/loss values safely
        won_pnl = get_value_or_default(trade_analysis, 'won', 'pnl', 'total')
        lost_pnl = get_value_or_default(trade_analysis, 'lost', 'pnl', 'total')
        max_profit = get_value_or_default(trade_analysis, 'won', 'pnl', 'max')
        max_loss = get_value_or_default(trade_analysis, 'lost', 'pnl', 'max')

        analysis = {
            'totalReturn': format_number(total_return),
            'sharpeRatio': format_number(get_value_or_default(sharpe, 'sharperatio')),
            'maxDrawdown': format_number(get_value_or_default(drawdown, 'max', 'drawdown') * 100),
            'maxDrawdownMoney': format_number(get_value_or_default(drawdown, 'max', 'moneydown')),
            'maxDrawdownLength': int(get_value_or_default(drawdown, 'max', 'len')),
            'totalTrades': int(total_trades),
            'winningTrades': int(won_trades),
            'losingTrades': int(lost_trades),
            'winRate': round(win_rate, 2),
            'averageTradeLength': round(get_value_or_default(trade_analysis, 'len', 'average'), 1),
            'grossProfit': round(float(won_pnl), 2) if won_pnl else 0.0,
            'grossLoss': round(float(abs(lost_pnl)), 2) if lost_pnl else 0.0,
            'maxProfit': round(float(max_profit), 2) if max_profit else 0.0,
            'maxLoss': round(float(abs(max_loss)), 2) if max_loss else 0.0
        }

        print(json.dumps(analysis))

    except Exception as e:
        error_result = {
            'error': str(e),
            'status': 'error',
            'traceback': traceback.format_exc()
        }
        print(json.dumps(error_result))