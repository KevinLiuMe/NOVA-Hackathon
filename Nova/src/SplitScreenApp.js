import {
    Send,
    Copy,
    Trash2,
    TrendingUp,
    TrendingDown,
    Activity,
    DollarSign,
    BarChart2,
    Award,
    AlertTriangle,
    Wrench,
} from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import TypingIndicator from "./TypingIndicator";
import FloatingCircles from "./FloatingCircles";
import CodeEditor from "./CodeEditor";

const AutoResizeTextarea = ({ value, onChange, onKeyPress }) => {
    const textareaRef = useRef(null);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            onKeyPress={onKeyPress}
            placeholder="Send a message..."
            className="w-full bg-transparent text-[#e1e6e3] placeholder-[#8b958f] resize-none p-3 focus:outline-none"
            style={{
                minHeight: "24px",
                maxHeight: "200px",
                overflowY: value.split("\n").length > 8 ? "auto" : "hidden",
            }}
            rows="1"
        />
    );
};

const MetricCard = ({
    title,
    value,
    icon: Icon,
    trend = null,
    subtitle = null,
}) => {
    const formatValue = (value) => {
        if (typeof value === "number") {
            if (
                title.toLowerCase().includes("rate") ||
                title.toLowerCase().includes("return") ||
                title.toLowerCase().includes("drawdown")
            ) {
                return `${value.toFixed(2)}%`;
            }
            if (
                title.toLowerCase().includes("profit") ||
                title.toLowerCase().includes("loss") ||
                title.toLowerCase().includes("money")
            ) {
                return `$${Math.abs(value).toFixed(2)}`;
            }
            if (
                title.toLowerCase().includes("ratio") ||
                title.toLowerCase().includes("score")
            ) {
                return value.toFixed(2);
            }
            if (Number.isInteger(value)) {
                return value.toString();
            }
            return value.toFixed(2);
        }
        return value;
    };

    const isPositive =
        (typeof value === "number" && value > 0) || trend === "up";
    const isNegative =
        (typeof value === "number" && value < 0) || trend === "down";

    const formattedValue = formatValue(value);

    return (
        <div className="bg-[#2a3f35] rounded-lg p-4 hover:shadow-lg transition-all duration-200">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-[#8b958f]">{title}</h3>
                <Icon
                    className={`h-4 w-4 ${
                        isPositive
                            ? "text-green-500"
                            : isNegative
                            ? "text-red-500"
                            : "text-[#40675f]"
                    }`}
                />
            </div>
            <div className="text-2xl font-bold text-[#e1e6e3]">
                {formattedValue}
            </div>
            {subtitle && (
                <p className="text-xs text-[#8b958f] mt-1">{subtitle}</p>
            )}
        </div>
    );
};

const AnalysisDashboard = ({ analysis }) => {
    if (!analysis) return null;

    const metrics = [
        {
            title: "Total Return",
            value: analysis.totalReturn,
            icon: TrendingUp,
            trend: parseFloat(analysis.totalReturn) > 0 ? "up" : "down",
            subtitle: "Overall strategy performance",
        },
        {
            title: "Sharpe Ratio",
            value: analysis.sharpeRatio,
            icon: Activity,
            subtitle: "Risk-adjusted return metric",
        },
        {
            title: "Max Drawdown",
            value: analysis.maxDrawdown,
            icon: TrendingDown,
            trend: "down",
            subtitle: `${analysis.maxDrawdownLength} periods`,
        },
        {
            title: "Win Rate",
            value: analysis.winRate,
            icon: Award,
            subtitle: `${analysis.winningTrades} wins, ${analysis.losingTrades} losses`,
        },
        {
            title: "Total Trades",
            value: analysis.totalTrades,
            icon: Activity,
            subtitle: `Avg length: ${analysis.averageTradeLength}`,
        },
        {
            title: "Gross Profit",
            value: analysis.grossProfit,
            icon: DollarSign,
            trend: "up",
            subtitle: `Max profit: $${analysis.maxProfit}`,
        },
        {
            title: "Gross Loss",
            value: analysis.grossLoss,
            icon: AlertTriangle,
            trend: "down",
            subtitle: `Max loss: $${analysis.maxLoss}`,
        },
        {
            title: "Max Drawdown $",
            value: analysis.maxDrawdownMoney,
            icon: BarChart2,
            trend: "down",
            subtitle: "Maximum drawdown in dollars",
        },
    ];

    return (
        <div className="p-1 bg-[#1a2b22] rounded-lg animate-fadeIn">
            {/* <h2 className="text-xl font-bold mb-4 text-[#e1e6e3]">
                Strategy Analysis
            </h2> */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((metric, index) => (
                    <MetricCard
                        key={index}
                        title={metric.title}
                        value={metric.value}
                        icon={metric.icon}
                        trend={metric.trend}
                        subtitle={metric.subtitle}
                    />
                ))}
            </div>
        </div>
    );
};

const SplitScreenApp = () => {
    const [messages, setMessages] = useState([
        {
            type: "ai",
            text: "Hello! I'm Nova, your AI trading assistant. How can I help you today?\nThis strategy runs on a 5 minute interval for the last 60 days.\n\nAn example prompt:\nI would like a strategy to buy in if the current price is lower than yesterday's lowest price and sell if the current price is higher than yesterday's highest price.",
        },
    ]);
    const [inputMessage, setInputMessage] = useState("");
    const [code, setCode] = useState("");
    const [language, setLanguage] = useState("python");
    const [analysisResults, setAnalysisResults] = useState(null);
    const [showCodeEditor, setShowCodeEditor] = useState(false);
    const [lastError, setLastError] = useState(null);
    const chatEndRef = useRef(null);
    const [showStrategyDashboard, setShowStrategyDashboard] = useState(false);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleFixCode = async () => {
        if (!lastError || !code) return;

        setMessages((prevMessages) => [
            ...prevMessages,
            {
                type: "ai",
                text: "Working hard on your code...",
            },
        ]);

        try {
            const response = await fetch(
                "http://localhost:5001/generate-code",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt: `Error: ${lastError}\n\nCode: ${code}`,
                        isFixing: true,
                        currentCode: code,
                    }),
                }
            );

            const data = await response.json();

            if (data.isStrategy) {
                setCode(data.response);
                setLastError(null);

                // Automatically update the code
                await handleCodeUpdate(data.response);

                setMessages((prevMessages) => [
                    ...prevMessages,
                    {
                        type: "ai",
                        text: "I've fixed the strategy code. You can review the changes in the editor and try running it again.",
                    },
                ]);
            } else {
                setMessages((prevMessages) => [
                    ...prevMessages,
                    {
                        type: "ai",
                        text: "I apologize, but I couldn't generate a fix for the code. Please check the error message and try modifying the code manually.",
                    },
                ]);
            }
        } catch (error) {
            console.error("Error fixing code:", error);
            setMessages((prevMessages) => [
                ...prevMessages,
                {
                    type: "ai",
                    text: "Sorry, I encountered an error while trying to fix the code. Please try again.",
                },
            ]);
        }
    };

    const handleSendMessage = async () => {
        if (inputMessage.trim() === "") return;

        const newMessages = [
            ...messages,
            { type: "user", text: inputMessage },
            { type: "ai", component: <TypingIndicator /> },
        ];
        setMessages(newMessages);
        setInputMessage("");
        // fetchCode(inputMessage);

        try {
            await fetchCode(inputMessage);
        } catch (error) {
            console.error("Error fetching response:", error);
            setMessages((prevMessages) => [
                ...prevMessages,
                {
                    type: "ai",
                    text: "Sorry, I encountered an error generating the code. Please try again.",
                },
            ]);
        }
    };

    const handleCodeUpdate = async (newCode) => {
        if (newCode.trim() === "") return;

        try {
            const response = await fetch("http://localhost:5001/update-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: newCode }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to update code");
            }

            setCode(newCode);
        } catch (error) {
            console.error("Error updating code:", error);
            setMessages((prevMessages) => [
                ...prevMessages,
                {
                    type: "ai",
                    text: `Error updating strategy: ${error.message}`,
                },
            ]);
        }
    };

    const clearCode = () => {
        const defaultCode = `import backtrader as bt
from datetime import datetime
import pandas as pd

class TradingStrategy(bt.Strategy):
    params = (
        # Add your parameters here
    )

    def __init__(self):
        # Initialize your indicators here
        pass

    def next(self):
        # Implement your trading logic here
        pass`;

        setCode(defaultCode);
        handleCodeUpdate(defaultCode);
        setAnalysisResults(null);
    };

    const copyCode = () => {
        navigator.clipboard.writeText(code);
        setMessages((prevMessages) => [
            ...prevMessages,
            { type: "ai", text: "Code copied to clipboard" },
        ]);
    };

    const fetchCode = async (prompt) => {
        try {
            const response = await fetch(
                "http://localhost:5001/generate-code",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt }),
                }
            );
            const data = await response.json();

            setMessages((prevMessages) => [...prevMessages.slice(0, -1)]);

            if (data.isStrategy) {
                setCode(data.response);
                setShowCodeEditor(true);
                setAnalysisResults(null);
                setMessages((prevMessages) => [
                    ...prevMessages,
                    {
                        type: "ai",
                        text: "I've generated a trading strategy based on your request. You can view and edit it in the code editor.",
                    },
                ]);
            } else {
                setMessages((prevMessages) => [
                    ...prevMessages,
                    { type: "ai", text: data.response },
                ]);
            }
        } catch (error) {
            console.error("Error fetching response:", error);
            setMessages((prevMessages) => [
                ...prevMessages,
                {
                    type: "ai",
                    text: "Sorry, I encountered an error generating the code. Please try again.",
                },
            ]);
        }
    };

    const handleConfirmCode = async () => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { type: "ai", text: "Processing your strategy..." },
        ]);

        try {
            const updateResponse = await fetch(
                "http://localhost:5001/update-code",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ code }),
                }
            );

            if (!updateResponse.ok) {
                const updateData = await updateResponse.json();
                throw new Error(updateData.error || "Failed to update code");
            }

            const strategyResponse = await fetch(
                "http://localhost:5001/run-strategy",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        code,
                        symbol: "AAPL",
                        timeframe: "1d",
                        initialCash: 100000,
                        commission: 0.001,
                    }),
                }
            );

            const result = await strategyResponse.json();

            if (result.error) {
                setLastError(result.error);
                setMessages((prevMessages) => [
                    ...prevMessages,
                    {
                        type: "ai",
                        text: `Error: ${result.error}`,
                        hasError: true,
                    },
                ]);
                return;
            }

            setAnalysisResults(result.analysis);
            setLastError(null);
            setMessages((prevMessages) => [
                ...prevMessages,
                {
                    type: "ai",
                    text: "Strategy analysis completed! Here are the results.",
                },
            ]);
        } catch (error) {
            console.error("Error running strategy:", error);
            setLastError(error.message);
            setMessages((prevMessages) => [
                ...prevMessages,
                {
                    type: "ai",
                    text: `Error processing strategy: ${error.message}`,
                    hasError: true,
                },
            ]);
        }
    };

    return (
        <div className="relative h-screen flex flex-col">
            <div className="absolute inset-0 bg-[#1a2b22] -z-10" />
            {!showCodeEditor && <FloatingCircles />}
            <div className="relative z-10 flex flex-1 overflow-y-auto">
                <div
                    className={`w-full transition-all duration-300 ease-in-out flex flex-col`}
                >
                    <div className="flex-1 flex flex-col space-y-4 p-4 overflow-y-auto">
                        <div className="flex-1 overflow-y-auto space-y-4">
                            {console.log("Message: ", messages)}
                            {messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`flex items-start ${
                                        msg.type === "user"
                                            ? "justify-end"
                                            : "justify-start"
                                    } 
                              animate-fadeIn`}
                                >
                                    {msg.type === "ai" && (
                                        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center mr-2">
                                            <img
                                                src="/avatar.png"
                                                alt="AI Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                    <div
                                        className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                                            msg.type === "user"
                                                ? "bg-[#40675f] text-[#e1e6e3]"
                                                : "bg-[#2a3f35] text-[#e1e6e3]"
                                        } shadow-md whitespace-pre-wrap break-words`}
                                    >
                                        {msg.component || msg.text}
                                        {msg.hasError && (
                                            <button
                                                onClick={handleFixCode}
                                                className="mt-2 flex items-center gap-2 px-3 py-1 bg-[#40675f] rounded-lg hover:bg-[#507d74] transition-colors duration-200"
                                            >
                                                <Wrench size={16} />
                                                <span>Fix Code</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="w-full bg-[#2a3f35] rounded-2xl shadow-lg p-2">
                            <div className="relative flex items-end">
                                <div className="flex-1">
                                    <AutoResizeTextarea
                                        value={inputMessage}
                                        onChange={(e) =>
                                            setInputMessage(e.target.value)
                                        }
                                        onKeyPress={(e) => {
                                            if (
                                                e.key === "Enter" &&
                                                !e.shiftKey
                                            ) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleSendMessage}
                                    className="p-2 rounded-xl bg-[#40675f] hover:bg-[#507d74] transition-colors duration-200 ml-2 mb-2"
                                    disabled={inputMessage.trim() === ""}
                                >
                                    <Send
                                        size={20}
                                        className={`${
                                            inputMessage.trim() === ""
                                                ? "text-[#8b958f]"
                                                : "text-[#e1e6e3]"
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {showCodeEditor && (
                    <div className="w-full flex flex-col animate-slideIn">
                        <div className="flex-1 p-4 overflow-hidden">
                            <div className="bg-[#2a3f35] rounded-2xl h-full overflow-y-auto flex flex-col">
                                {analysisResults && (
                                    <>
                                        <div className="p-4 border-b border-[#40675f] flex justify-between items-center">
                                            <span className="text-lg font-bold text-[#e1e6e3]">
                                                Strategy Dashboard
                                            </span>
                                            <button
                                                onClick={() =>
                                                    setShowStrategyDashboard(
                                                        !showStrategyDashboard
                                                    )
                                                }
                                                className="hover:bg-[#40675f] p-2 rounded text-[#e1e6e3] focus:outline-none focus:ring-2 focus:ring-[#40675f]"
                                                title={
                                                    showStrategyDashboard
                                                        ? "Minimize Dashboard"
                                                        : "Show Dashboard"
                                                }
                                            >
                                                {showStrategyDashboard ? (
                                                    <Trash2 size={20} />
                                                ) : (
                                                    <TrendingUp size={20} />
                                                )}
                                            </button>
                                        </div>
                                        <div
                                            className={`flex-1 overflow-hidden bg-[#1a2b22] p-4 ${
                                                showStrategyDashboard
                                                    ? "block"
                                                    : "hidden"
                                            }`}
                                        >
                                            <AnalysisDashboard
                                                analysis={analysisResults}
                                            />
                                        </div>
                                    </>
                                )}
                                <div className="p-4 border-b border-[#40675f] flex justify-between items-center">
                                    <select
                                        value={language}
                                        onChange={(e) =>
                                            setLanguage(e.target.value)
                                        }
                                        className="bg-[#1a2b22] text-[#e1e6e3] px-3 py-1 rounded-lg focus:outline-none"
                                    >
                                        <option value="python">Python</option>
                                        <option value="javascript">
                                            JavaScript
                                        </option>
                                    </select>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={copyCode}
                                            className="hover:bg-[#40675f] p-1 rounded text-[#e1e6e3] focus:outline-none focus:ring-2 focus:ring-[#40675f]"
                                            title="Copy code"
                                        >
                                            <Copy size={20} />
                                        </button>
                                        <button
                                            onClick={clearCode}
                                            className="hover:bg-[#40675f] p-1 rounded text-[#e1e6e3] focus:outline-none focus:ring-2 focus:ring-[#40675f]"
                                            title="Clear code"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                        <button
                                            onClick={handleConfirmCode}
                                            className="hover:bg-[#40675f] p-1 rounded text-[#e1e6e3] focus:outline-none focus:ring-2 focus:ring-[#40675f]"
                                            title="Run strategy"
                                        >
                                            <Send size={20} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto bg-[#1a2b22] p-4">
                                    <CodeEditor
                                        value={code}
                                        onChange={setCode}
                                        language={language}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SplitScreenApp;
