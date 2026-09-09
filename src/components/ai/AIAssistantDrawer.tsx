import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import { BottomSheet } from '../common/BottomSheet';
import { Send, Map, Utensils, Car, Wallet, Sparkles, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { wsClient } from '../../services/wsClient';

interface SwapRecommendation {
  id: string;
  name: string;
  description: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  locationName: string;
  latitude: number;
  longitude: number;
  estimatedCost: number;
  reason: string;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  actionType?: 'food' | 'cab' | 'map' | 'expense' | 'hotel';
  actionPayload?: string;
  recommendations?: SwapRecommendation[];
  refinementActions?: any[];
  currentActivityName?: string;
  activityId?: string;
  tripId?: string;
  dayId?: string;
  itineraryId?: string;
}

const suggestions = [
  { label: 'Find food near me', icon: Utensils, query: 'Recommend restaurants near my active destination' },
  { label: 'Book cab for transfer', icon: Car, query: 'Book a cab ride for my next activity' },
  { label: 'How much spent today?', icon: Wallet, query: 'How much have I spent today on my trip?' },
  { label: "What's nearby on map?", icon: Map, query: "Show me interesting places nearby on the map" },
];

export const AIAssistantSheet: React.FC = () => {
  const {
    isAiOpen, setIsAiOpen, aiPromptQuery, setAiPromptQuery,
    openCabModal, setIsFoodSheetOpen, swapContext, setSwapContext
  } = useApp();
  const { swapActivity, currentTrip, currentItinerary, executeRefinement } = useTrip();

  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applyingRefinement, setApplyingRefinement] = useState(false);

  // Swap Confirmation Modal state
  const [pendingSwap, setPendingSwap] = useState<{
    recommendation: SwapRecommendation;
    messageContext: Message;
  } | null>(null);
  const [swapSuccessMessage, setSwapSuccessMessage] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAiOpen && aiPromptQuery) {
      handleSend(aiPromptQuery);
      setAiPromptQuery('');
    }
  }, [isAiOpen]);

  const handleApplyRefinement = async (targetTripId: string, actions: any[]) => {
    if (!targetTripId || !actions || actions.length === 0) return;
    setApplyingRefinement(true);
    try {
      await executeRefinement(targetTripId, actions);
      setSwapSuccessMessage(`Successfully applied ${actions.length} itinerary refinement(s) to PostgreSQL database!`);
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: `✅ Applied changes to your trip itinerary! Your trip updated successfully in PostgreSQL.`
      }]);
    } catch (err: any) {
      alert(err.message || 'Failed to apply itinerary refinements.');
    } finally {
      setApplyingRefinement(false);
    }
  };

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSubmitting(true);

    try {
      const lowerMsg = msg.toLowerCase();
      const isRefinementRequest = currentTrip?.id && (
        lowerMsg.includes('replace') || lowerMsg.includes('remove') || lowerMsg.includes('make') || lowerMsg.includes('change') || lowerMsg.includes('move') || lowerMsg.includes('relax') || lowerMsg.includes('cheaper')
      );

      const payload = {
        message: msg,
        intent: swapContext ? 'SWAP_ACTIVITY' : (isRefinementRequest ? 'REFINE_ITINERARY' : 'CHAT'),
        tripId: swapContext?.tripId || currentTrip?.id,
        itineraryId: swapContext?.itineraryId || currentItinerary?.id,
        dayId: swapContext?.dayId,
        activityId: swapContext?.activityId,
        messages: messages.slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text }))
      };

      const data = await wsClient.sendRequest('ai:concierge', payload);

      if (data) {
        if (data.type === 'activity_swap_recommendations') {
          const aiMsg: Message = {
            id: `ai-${Date.now()}`,
            role: 'ai',
            text: `Here are tailored alternatives for **${data.currentActivity?.title || swapContext?.activityName}**:`,
            recommendations: data.recommendations,
            currentActivityName: data.currentActivity?.title || swapContext?.activityName,
            activityId: data.activityId,
            tripId: data.tripId,
            dayId: data.dayId,
            itineraryId: data.itineraryId
          };
          setMessages(prev => [...prev, aiMsg]);
        } else if (data.type === 'refinement_actions') {
          const actions = data.actions || [];
          const aiMsg: Message = {
            id: `ai-${Date.now()}`,
            role: 'ai',
            text: `I've prepared ${actions.length} optimization action(s) for your trip **${currentTrip?.title || 'Itinerary'}**:\n\n` +
              actions.map((a: any, i: number) => `${i + 1}. **${a.action || a.type}**: ${a.reason || a.replacement?.name || 'Adjust activity timing and cost'}`).join('\n'),
            refinementActions: actions,
            tripId: currentTrip?.id
          };
          setMessages(prev => [...prev, aiMsg]);
        } else {
          const replyText = typeof data.reply === 'object'
            ? (data.reply?.reply || data.reply?.text || JSON.stringify(data.reply))
            : String(data.reply || "I am your VoyageAI Assistant. How can I help with your journey?");
          const actionType = typeof data.reply === 'object' ? data.reply?.actionType : data.actionType;
          const actionPayload = typeof data.reply === 'object' ? data.reply?.actionPayload : data.actionPayload;

          const aiMsg: Message = {
            id: `ai-${Date.now()}`,
            role: 'ai',
            text: replyText,
            actionType,
            actionPayload
          };
          setMessages(prev => [...prev, aiMsg]);
        }
      } else {
        setMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: 'ai',
          text: "I'm having trouble connecting to AI services right now. Please try again in a moment."
        }]);
      }
    } catch (err) {
      console.error("AI Concierge request error:", err);
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: "Sorry, I encountered an error communicating with Gemini AI. Please ensure backend services are active."
      }]);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
    }
  };

  const handleConfirmSwap = async () => {
    if (!pendingSwap) return;
    const { recommendation, messageContext } = pendingSwap;
    const tripId = messageContext.tripId || swapContext?.tripId || currentTrip?.id;
    const activityId = messageContext.activityId || swapContext?.activityId;

    if (!tripId || !activityId) {
      alert('Missing trip or activity ID for swap.');
      setPendingSwap(null);
      return;
    }

    try {
      setIsSubmitting(true);
      await swapActivity(tripId, activityId, {
        itineraryId: messageContext.itineraryId || swapContext?.itineraryId,
        dayId: messageContext.dayId || swapContext?.dayId,
        replacement: {
          name: recommendation.name,
          description: recommendation.description,
          timeSlot: recommendation.startTime,
          locationName: recommendation.locationName,
          latitude: recommendation.latitude,
          longitude: recommendation.longitude,
          estimatedCost: recommendation.estimatedCost
        }
      });

      setSwapSuccessMessage(`✓ Activity successfully replaced with ${recommendation.name}`);
      setPendingSwap(null);
      setSwapContext(null);

      // Append success message in chat
      setMessages(prev => [
        ...prev,
        {
          id: `ai-swap-${Date.now()}`,
          role: 'ai',
          text: `✓ **Activity Swapped!** Updated your itinerary to **${recommendation.name}** at ${recommendation.startTime} (₹${recommendation.estimatedCost}). Budget and schedule updated.`
        }
      ]);

      setTimeout(() => setSwapSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to complete activity swap');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteAction = (actionType?: string, payload?: string) => {
    setIsAiOpen(false);
    if (actionType === 'food') setIsFoodSheetOpen(true);
    if (actionType === 'cab') openCabModal(payload || 'Destination');
    if (actionType === 'map') navigate('/trip/map');
    if (actionType === 'expense') navigate('/trip/expenses');
  };

  return (
    <>
      <BottomSheet
        isOpen={isAiOpen}
        onClose={() => {
          setIsAiOpen(false);
          setSwapContext(null);
        }}
        height={messages.length > 0 ? 'expanded' : 'half'}
        title={swapContext ? `Swap Activity: ${swapContext.activityName}` : "VoyageAI Concierge"}
      >
        <div className="flex flex-col h-full">
          
          {/* Success Banner */}
          {swapSuccessMessage && (
            <div className="mx-4 mt-2 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{swapSuccessMessage}</span>
            </div>
          )}

          {/* Messages Body */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-300 font-medium">How can I assist your trip right now?</p>
                <div className="space-y-2">
                  {suggestions.map(s => (
                    <button
                      key={s.label}
                      onClick={() => handleSend(s.query)}
                      className="w-full press-scale flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-colors"
                    >
                      <s.icon className="w-4 h-4 text-teal-400 shrink-0" />
                      <span className="text-xs font-semibold text-slate-200">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[92%] p-3.5 rounded-2xl text-xs leading-relaxed space-y-2.5 ${
                    msg.role === 'user'
                      ? 'bg-teal-500 text-slate-950 font-semibold rounded-br-none'
                      : 'bg-slate-900 border border-white/10 text-slate-200 rounded-bl-none'
                  }`}>
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* Structured Activity Swap Recommendation Cards */}
                    {msg.role === 'ai' && msg.recommendations && msg.recommendations.length > 0 && (
                      <div className="space-y-2.5 pt-1">
                        {msg.recommendations.map(rec => (
                          <div
                            key={rec.id}
                            className="p-3.5 rounded-2xl bg-[#080B11] border border-teal-500/30 space-y-2 text-slate-200"
                          >
                            <div className="flex items-center justify-between">
                              <h5 className="font-extrabold text-sm text-white">{rec.name}</h5>
                              <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 text-[10px] font-bold border border-teal-500/30">
                                {rec.reason}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-400">{rec.description}</p>

                            <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 border-t border-slate-800">
                              <span className="font-mono text-teal-400 font-bold">
                                {rec.startTime} • {rec.durationMinutes} mins
                              </span>
                              <span className="font-extrabold text-white">
                                {rec.estimatedCost ? `₹${rec.estimatedCost}` : 'Free'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setPendingSwap({ recommendation: rec, messageContext: msg })}
                              className="w-full py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 mt-1"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Select Recommendation</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Refinement Actions Preview & Confirmation Button */}
                    {msg.role === 'ai' && msg.refinementActions && msg.refinementActions.length > 0 && (
                      <div className="pt-2">
                        <button
                          type="button"
                          disabled={applyingRefinement}
                          onClick={() => handleApplyRefinement(msg.tripId || currentTrip?.id || '', msg.refinementActions || [])}
                          className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>{applyingRefinement ? 'Applying Refinements...' : 'Apply Refinements to Itinerary'}</span>
                        </button>
                      </div>
                    )}

                    {/* Interactive Action Button embedded in standard AI Response */}
                    {msg.role === 'ai' && msg.actionType && (
                      <button
                        onClick={() => handleExecuteAction(msg.actionType, msg.actionPayload)}
                        className="cta-primary text-xs py-2 px-3 mt-1.5 w-full flex items-center justify-center gap-1.5"
                      >
                        {msg.actionType === 'food' && <Utensils className="w-3.5 h-3.5" />}
                        {msg.actionType === 'cab' && <Car className="w-3.5 h-3.5" />}
                        {msg.actionType === 'map' && <Map className="w-3.5 h-3.5" />}
                        {msg.actionType === 'expense' && <Wallet className="w-3.5 h-3.5" />}
                        <span>Execute Action</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="px-4 py-3 border-t border-white/10 shrink-0 bg-[#0D1117]"
            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={swapContext ? `Refine options (e.g. 'something cheaper')...` : "Ask Copilot anything..."}
                className="input-field py-2.5 text-xs flex-1"
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={!input.trim() || isSubmitting}
                className="touch-target press-scale p-3 rounded-xl bg-teal-500 text-slate-950 disabled:opacity-30 flex items-center justify-center"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </BottomSheet>

      {/* Confirmation Dialog Modal for Activity Swap */}
      {pendingSwap && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-teal-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-scaleIn">
            <div className="flex items-center gap-2 text-teal-400 font-extrabold text-sm uppercase tracking-wider">
              <AlertCircle className="w-4 h-4 text-teal-400" />
              <span>Replace Activity?</span>
            </div>

            <div className="space-y-3 py-2 border-y border-slate-800">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs">
                <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Replacing Current Activity</span>
                <h5 className="font-bold text-white text-sm mt-0.5">{pendingSwap.messageContext.currentActivityName || 'Current Activity'}</h5>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="w-5 h-5 text-teal-400 rotate-90" />
              </div>

              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">With Selected Alternative</span>
                <h5 className="font-bold text-white text-sm mt-0.5">{pendingSwap.recommendation.name}</h5>
                <p className="text-slate-400 mt-1">{pendingSwap.recommendation.startTime} • {pendingSwap.recommendation.estimatedCost ? `₹${pendingSwap.recommendation.estimatedCost}` : 'Free'}</p>
                <p className="text-slate-400 text-[11px]">{pendingSwap.recommendation.locationName}</p>
              </div>
            </div>

            <p className="text-xs text-slate-400">This will update your persisted PostgreSQL itinerary, schedule timing, and remaining trip budget.</p>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPendingSwap(null)}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmSwap}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-teal-500/20"
              >
                {isSubmitting ? 'Updating...' : 'Confirm Swap'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const AIAssistantDrawer = AIAssistantSheet;
