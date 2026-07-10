import React, { useState, useEffect, useRef } from "react";
import { ChatMessage } from "../types.ts";
import { Send, Sparkles, BrainCircuit, User, Bot, Trash2, ArrowDownCircle, Image as ImageIcon, Code, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { generativeModel } from "../lib/firebase.ts";

interface DeepaAiViewProps {
  chatMessages: ChatMessage[];
  onChatMessagesChange: (messages: ChatMessage[]) => void;
}

export default function DeepaAiView({ chatMessages, onChatMessagesChange }: DeepaAiViewProps) {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userPrompt = inputText;
    setInputText("");

    // Create user message
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      text: userPrompt,
      isUser: true,
      timestamp: Date.now()
    };

    const nextMessages = [...chatMessages, userMsg];
    onChatMessagesChange(nextMessages);
    setIsLoading(true);

    const lowercasePrompt = userPrompt.toLowerCase();
    const isImageRequest = 
      lowercasePrompt.includes("generate image") || 
      lowercasePrompt.includes("draw") || 
      lowercasePrompt.includes("create image") || 
      lowercasePrompt.includes("paint") || 
      lowercasePrompt.includes("sketch") || 
      lowercasePrompt.includes("generate art") || 
      lowercasePrompt.includes("picture");

    let textOutput = "";
    let base64ImageOutput: string | null = null;
    let modelUsed = "gemini-3.5-flash (Firebase AI Logic SDK)";

    try {
      if (isImageRequest) {
        // Force server fallback for image generation, as the standard AI Logic model generates text
        throw new Error("Force server proxy fallback for Image Generation");
      }

      console.log("[Firebase AI Logic] Initiating client-side generation...");
      const result = await generativeModel.generateContent({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }]
      });

      if (result && result.response) {
        textOutput = result.response.text();
        console.log("[Firebase AI Logic] Success!");
      } else {
        throw new Error("No client response content from Firebase AI Logic.");
      }
    } catch (clientError: any) {
      console.warn("[Firebase AI Logic] Client-side execution skipped/failed. Falling back to Express proxy. Details:", clientError);
      
      try {
        // Fallback: Send prompt request to our backend express proxy
        const response = await fetch("/api/gemini/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt: userPrompt,
            systemInstruction: "You are Deepa AI, an empathetic, encouraging personal productivity and life assistant. Help the user optimize their habits, prioritize tasks, plan finances, and organize schedules. Keep responses scannable, using clean bullet points and bold headers. If the user requests an image, describe what you are generating."
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to communicate with Deepa AI");
        }

        textOutput = data.text || "I processed your request but have no textual feedback.";
        base64ImageOutput = data.base64Image || null;
        modelUsed = data.modelUsed || "gemini-3.5-flash";
      } catch (fallbackError: any) {
        throw new Error(`AI Service Unavailable. ${fallbackError.message || fallbackError}`);
      }
    }

    try {
      // Create AI message
      const aiMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        text: textOutput,
        isUser: false,
        base64Image: base64ImageOutput,
        modelUsed: modelUsed,
        timestamp: Date.now()
      };

      onChatMessagesChange([...nextMessages, aiMsg]);
    } catch (error: any) {
      console.error("Deepa AI message assignment error:", error);
      const errorMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        text: `Error: ${error.message || "Something went wrong."}`,
        isUser: false,
        timestamp: Date.now()
      };
      onChatMessagesChange([...nextMessages, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    onChatMessagesChange([]);
  };

  const samplePrompts = [
    "Outline a daily schedule for studying operating systems and coding.",
    "Draft a Keep Note with tips for mindfulness during exams.",
    "Generate image of a workspace with clean, warm, minimalist desk aesthetics.",
    "Review my habits and suggest ways to build stronger morning streaks."
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[540px]" id="deepa-ai-container">
      {/* Sidebar: Persona & Sample Prompts */}
      <div className="space-y-4 lg:col-span-1 h-full flex flex-col justify-between">
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
            <BrainCircuit className="h-4.5 w-4.5 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Deepa AI (Genkit)</h3>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-gray-300 leading-relaxed">
              "Deepa AI is your full-stack productivity supervisor powered by Firebase Genkit. It orchestrates dynamic tasks, organizes journals, drafts keep notes, and generates tailored schedules."
            </p>
          </div>
        </div>

        {/* Suggestion Prompts */}
        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4 space-y-2 flex-1 mt-4 overflow-y-auto max-h-[220px]">
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1 mb-2">Sample Prompts</h4>
          <div className="flex flex-col gap-2">
            {samplePrompts.map((promptText, idx) => (
              <button
                key={idx}
                onClick={() => setInputText(promptText)}
                className="w-full text-left p-2.5 bg-gray-950/60 hover:bg-gray-950 border border-gray-850 hover:border-gray-750 text-[10px] text-gray-400 hover:text-gray-200 rounded-lg transition-all cursor-pointer leading-relaxed"
              >
                {promptText}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleClearHistory}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-gray-900 hover:bg-red-950/15 border border-gray-800 hover:border-red-900/20 text-gray-400 hover:text-red-400 text-xs font-bold py-2 rounded-lg transition-all cursor-pointer"
        >
          <Trash2 className="h-4 w-4" /> Clear Chat History
        </button>
      </div>

      {/* Main Chat Conversation Engine (col-span-3) */}
      <div className="lg:col-span-3 bg-gray-900/30 border border-gray-800 rounded-2xl flex flex-col justify-between overflow-hidden h-full">
        {/* Chat Header */}
        <div className="px-5 py-3 border-b border-gray-800/60 bg-gray-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-400 border border-blue-500/15 flex items-center justify-center">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-100">Deepa AI Interactive Core</h4>
              <p className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">Online &bull; Powered by Firebase Genkit & Gemini</p>
            </div>
          </div>
        </div>

        {/* Conversation Box */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {chatMessages.length === 0 ? (
            <div className="text-center py-16 space-y-3 max-w-sm mx-auto">
              <MessageCircle className="h-10 w-10 text-gray-700 mx-auto" />
              <p className="text-xs text-gray-400">
                "Hello! I am Deepa AI. Ask me to outline a checklist, optimized budget, or generate custom ambient background images."
              </p>
            </div>
          ) : (
            chatMessages.map((msg) => {
              const isUser = msg.isUser;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                    isUser 
                      ? "bg-gray-850 text-gray-400 border-gray-700" 
                      : "bg-blue-600/10 text-blue-400 border-blue-500/15"
                  }`}>
                    {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>

                  <div className="space-y-1">
                    <div className={`p-3.5 rounded-2xl text-xs leading-relaxed font-normal whitespace-pre-wrap ${
                      isUser 
                        ? "bg-blue-600 text-white rounded-tr-none" 
                        : "bg-gray-950/60 text-gray-200 border border-gray-850 rounded-tl-none"
                    }`}>
                      {msg.text}

                      {/* Generated image component block */}
                      {msg.base64Image && (
                        <div className="mt-3 rounded-lg overflow-hidden border border-gray-800 max-w-xs bg-gray-900">
                          <img
                            src={msg.base64Image.startsWith("data:") ? msg.base64Image : `data:image/png;base64,${msg.base64Image}`}
                            className="w-full object-cover aspect-square"
                            alt="Chat attachment"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>
                    
                    {!isUser && msg.modelUsed && (
                      <span className="text-[8px] font-mono text-gray-500 block uppercase tracking-wider pl-1 text-right">
                        Model: {msg.modelUsed}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Loading indicator bubble */}
          {isLoading && (
            <div className="flex gap-3 mr-auto max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-400 border border-blue-500/15 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-gray-950/40 text-gray-500 border border-gray-805/40 p-3.5 rounded-2xl rounded-tl-none text-xs flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span>Deepa AI is analyzing...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Text Input Box Form */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 border-t border-gray-800/60 bg-gray-950/20 flex gap-2"
        >
          <input
            type="text"
            required
            disabled={isLoading}
            placeholder="Ask Deepa AI anything..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center justify-center h-10 w-10 shadow-lg shadow-blue-500/15"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
