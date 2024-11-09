import backtrader as bt
from datetime import datetime
import pandas as pd

class TradingStrategy(bt.Strategy):
    params = (
        ('ma_period', 20),
        ('risk_pct', 0.02),
        ('stop_loss', 0.02),
    )

    def __init__(self):
        self.ma = bt.indicators.SimpleMovingAverage(self.data.close, period=self.params.ma_period)
        self.order = None
        self.price = None

    def log(self, txt, dt=None):
        dt = dt or self.datas[0].datetime.date(0)
        print(f'{dt.isoformat()}, {txt}')

    def notify_order(self, order):
        if order.status in [order.Submitted, order.Accepted]:
            return
        if order.status in [order.Completed]:
            if order.isbuy():
                self.log(f'BUY EXECUTED, {order.executed.price:.2f}')
                self.price = order.executed.price
            elif order.issell():
                self.log(f'SELL EXECUTED, {order.executed.price:.2f}')
                self.price = None
        elif order.status in [order.Canceled, order.Margin, order.Rejected]:
            self.log('Order Canceled/Margin/Rejected')
        self.order = None

    def next(self):
        if self.order:
            return

        if not self.position:
            if self.data.close[0] < self.ma[0]:
                size = self.broker.getcash() * self.params.risk_pct
                size /= self.data.close[0]
                self.order = self.buy(size=size)
        else:
            if self.data.close[0] > self.ma[0]:
                self.order = self.sell(size=self.position.size)

            if self.data.close[0] < self.price * (1 - self.params.stop_loss):
                self.order = self.sell(size=self.position.size)