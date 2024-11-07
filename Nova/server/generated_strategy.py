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
        self.rsi = bt.indicators.RSI_SMA(self.data.close, period=self.params.period)
        self.order = None

    def next(self):
        if self.order:
            return

        if not self.position:
            if self.rsi < 30:
                amount_to_invest = (self.params.risk_pct * self.broker.get_cash())
                self.size = amount_to_invest / self.data.close[0]
                self.order = self.buy(size=self.size)
        else:
            if self.rsi > 70:
                self.order = self.close()
            elif self.data.close[0] < (1 - self.params.stop_loss) * self.order.executed.price:
                self.order = self.close()

    def notify_order(self, order):
        if order.status in [order.Submitted, order.Accepted]:
            return

        if order.status in [order.Completed]:
            if order.isbuy():
                self.log('Buy executed at %.2f' % order.executed.price)
            elif order.issell():
                self.log('Sell executed at %.2f' % order.executed.price)

        elif order.status in [order.Canceled, order.Margin, order.Rejected]:
            self.log('Order Canceled/Margin/Rejected')

        self.order = None