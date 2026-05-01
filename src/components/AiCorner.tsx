import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Download, 
  Upload, 
  RefreshCw, 
  Loader2, 
  FileText, 
  Image as ImageIcon,
  MessageSquare,
  Send,
  Zap,
  ArrowRight,
  Target,
  Rocket,
  Plus,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { formatCurrency, cn } from '../lib/utils';
import { Language } from '../types';
import { translations } from '../translations';
import jsPDF from 'jspdf';
import { trackFeatureUsage } from '../lib/analytics';

import { useSettings } from '../context/SettingsContext';

const AiCorner = ({ redEyeActive }: { redEyeActive?: boolean }) => {
  const { language, currency } = useSettings();
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'analysis' | 'poster'>('analysis');
  
  // Analysis States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analysisMonth, setAnalysisMonth] = useState(new Date().getMonth());
  const [analysisYear, setAnalysisYear] = useState(new Date().getFullYear());

  // Poster States
  const [posterMode, setPosterMode] = useState<'single' | 'bulk'>('single');
  const [posterText, setPosterText] = useState('');
  const [bulkTexts, setBulkTexts] = useState<string[]>(['', '', '', '', '']);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedPoster, setGeneratedPoster] = useState<string | null>(null);
  const [bulkPosters, setBulkPosters] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [bulkProgress, setBulkProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allSales = useLiveQuery(() => db.sales.toArray());
  const customers = useLiveQuery(() => db.customers.toArray());

  const addBulkField = () => {
    setBulkTexts([...bulkTexts, '']);
  };

  const updateBulkText = (index: number, value: string) => {
    const newTexts = [...bulkTexts];
    newTexts[index] = value;
    setBulkTexts(newTexts);
  };

  const removeBulkField = (index: number) => {
    if (bulkTexts.length > 5) {
      setBulkTexts(bulkTexts.filter((_, i) => i !== index));
    }
  };

  const generateBulkPosters = async () => {
    const validTexts = bulkTexts.filter(t => t.trim().length > 0);
    if (validTexts.length < 5) {
      alert(t.min5Designs);
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      alert("AI API Key is missing. Please set it in Settings/Environment.");
      setIsGenerating(false);
      return;
    }
    
    const ai = new GoogleGenAI({ apiKey });
    const results: string[] = [];

    // We want 10 outputs. If we have 5 inputs, we generate 2 variations for each.
    // To be efficient and stay within limits, we'll process them in small batches or sequence.
    
    const tasks: {text: string, variation: number}[] = [];
    validTexts.forEach(t => {
      tasks.push({ text: t, variation: 1 });
      tasks.push({ text: t, variation: 2 });
    });

    // Limit to 10 if more than 5 inputs
    const finalTasks = tasks.slice(0, 10);

    for (let i = 0; i < finalTasks.length; i++) {
      try {
        const { text, variation } = finalTasks[i];
        const parts: any[] = [{ text: `Create a professional promotional poster for a business. 
        Variation ${variation} for content: "${text}". 
        Style: Modern, premium, and clean. 
        ${variation === 1 ? 'Focus on bold typography.' : 'Focus on elegant imagery and spacing.'}
        If a reference image is provided, incorporate its color scheme.` }];
        
        if (uploadedImage) {
          const base64Data = uploadedImage.split(',')[1];
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: "image/png"
            }
          });
        }

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image', 
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio: "3:4"
            }
          }
        });

        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            results.push(`data:image/png;base64,${part.inlineData.data}`);
            break;
          }
        }
      } catch (err) {
        console.error("Error in bulk generation for index", i, err);
      }
      setBulkProgress(Math.round(((i + 1) / finalTasks.length) * 100));
    }

    setBulkPosters(results);
    setIsGenerating(false);
    trackFeatureUsage('ai_bulk_poster_generated', { count: results.length });
    // Keep in bulk mode to show the gallery
  };

  const monthlyReportData = React.useMemo(() => {
    if (!allSales || !customers) return null;

    const filtered = allSales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === analysisMonth && d.getFullYear() === analysisYear;
    });

    const totalSales = filtered.reduce((acc, s) => acc + (s.totalAmount || (s.cashSale + s.chequeSale + s.creditSale)), 0);
    const totalCash = filtered.reduce((acc, s) => acc + (s.cashSale || 0), 0);
    const totalCredit = filtered.reduce((acc, s) => acc + (s.creditSale || 0), 0);
    const totalCheque = filtered.reduce((acc, s) => acc + (s.chequeSale || 0), 0);
    
    return { totalSales, totalCash, totalCredit, totalCheque, count: filtered.length };
  }, [allSales, customers, analysisMonth, analysisYear]);

  const generateMeetingAnalysis = async () => {
    if (!monthlyReportData) return;
    setIsAnalyzing(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setAiAnalysis("AI API Key is missing. Please check your configuration.");
        setIsAnalyzing(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      const monthName = new Date(analysisYear, analysisMonth).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'long' });
      
      const statsSummary = `
        Business Stats for ${monthName} ${analysisYear}:
        - Total Sales: ${monthlyReportData.totalSales}
        - Cash Collections: ${monthlyReportData.totalCash}
        - Credit Issued: ${monthlyReportData.totalCredit}
        - Cheque Sales: ${monthlyReportData.totalCheque}
      `;

      const prompt = `Analyze these business stats and provide a professional meeting script & strategic advice in ${language === 'en' ? 'English' : 'Bengali'}. Use Markdown formatting: ${statsSummary}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      setAiAnalysis(response.text || "Analysis failed.");
      trackFeatureUsage('ai_strategic_report_generated');
    } catch (error) {
      setAiAnalysis("Error generating analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateSinglePoster = async () => {
    if (!posterText) return;
    setIsGenerating(true);
    setGenerationStep(1);
    
    const steps = [
      "Analyzing your brand style...",
      "Designing layout composition...",
      "Applying AI color theory...",
      "Generating high-resolution poster..."
    ];

    const stepInterval = setInterval(() => {
      setGenerationStep(prev => (prev < steps.length ? prev + 1 : prev));
    }, 2000);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        alert("AI API Key is missing.");
        setIsGenerating(false);
        setGenerationStep(0);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      
      const parts: any[] = [{ text: `Create a professional promotional poster for a business. 
      The poster should include this text: "${posterText}". 
      Style: Modern, premium, and clean. 
      If a reference image is provided, incorporate its color scheme and vibe.` }];
      
      if (uploadedImage) {
        const base64Data = uploadedImage.split(',')[1];
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: "image/png"
          }
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: "3:4"
          }
        }
      });

      let foundImage = false;
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setGeneratedPoster(`data:image/png;base64,${part.inlineData.data}`);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        alert("Failed to generate image. The model returned text instead: " + response.text);
      } else {
        trackFeatureUsage('ai_single_poster_generated');
      }
    } catch (error) {
      console.error("Poster generation error:", error);
      alert("Error generating poster. Please check your API key or connection.");
    } finally {
      clearInterval(stepInterval);
      setIsGenerating(false);
      setGenerationStep(0);
    }
  };

  const downloadPoster = () => {
    if (!generatedPoster) return;
    const link = document.createElement('a');
    link.href = generatedPoster;
    link.download = `Business_Poster_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-4xl font-display font-black tracking-tight">AI <span className="text-indigo-600">Corner</span></h2>
          </motion.div>
          <p className="text-slate-400 font-medium pl-14">Intelligent business tools & marketing automation</p>
        </div>

        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveTab('analysis')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'analysis' ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-400"
            )}
          >
            <FileText className="w-4 h-4" />
            {t.aiReport}
          </button>
          <button 
            onClick={() => setActiveTab('poster')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === 'poster' ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-400"
            )}
          >
            <ImageIcon className="w-4 h-4" />
            {t.posterGenerator}
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'analysis' ? (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-soft">
                <h3 className="font-black text-lg mb-6 flex items-center gap-2">
                  <Target className="text-indigo-600 w-5 h-5" />
                  {t.selectTimePeriod}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Month</label>
                    <select 
                      value={analysisMonth}
                      onChange={(e) => setAnalysisMonth(parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl font-bold"
                    >
                      {Array.from({ length: 12 }).map((_, i) => (
                        <option key={i} value={i}>
                          {new Date(0, i).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Year</label>
                    <select 
                      value={analysisYear}
                      onChange={(e) => setAnalysisYear(parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl font-bold"
                    >
                      {[2024, 2025, 2026].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  
                    <button 
                    onClick={generateMeetingAnalysis}
                    disabled={isAnalyzing}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all mt-4"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    {isAnalyzing ? t.analyzingData : t.generateStrategicAdvice}
                  </button>
                </div>
              </div>

              {monthlyReportData && (
                <div className="bg-indigo-900 p-8 rounded-[2.5rem] text-white relative overflow-hidden shadow-xl">
                  <div className="relative z-10 space-y-4">
                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Data Summary</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase">Total Sales</p>
                        <p className="text-xl font-black">{formatCurrency(monthlyReportData.totalSales, currency)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase">Cash Coll.</p>
                        <p className="text-xl font-black">{formatCurrency(monthlyReportData.totalCash, currency)}</p>
                      </div>
                    </div>
                  </div>
                  <FileText className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 rotate-12" />
                </div>
              )}
            </div>

            <div className="lg:col-span-8">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-soft min-h-[500px]">
                {aiAnalysis ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b pb-6 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <Sparkles className="text-indigo-600 w-6 h-6" />
                        <h3 className="text-xl font-black">{t.aiStrategicReport}</h3>
                      </div>
                      <button 
                         onClick={() => {
                            const doc = new jsPDF() as any;
                            const pageWidth = doc.internal.pageSize.width;
                            doc.setFillColor(15, 23, 42);
                            doc.rect(0, 0, pageWidth, 50, 'F');
                            doc.setTextColor(255, 255, 255);
                            doc.setFontSize(22);
                            doc.setFont("helvetica", "bold");
                            doc.text('AI BUSINESS STRATEGY', pageWidth / 2, 25, { align: 'center' });
                            doc.setTextColor(30, 41, 59);
                            doc.setFontSize(11);
                            const splitText = doc.splitTextToSize(aiAnalysis!, 180);
                            doc.text(splitText, 15, 65);
                            doc.save('AI_Business_Strategy.pdf');
                         }}
                         className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="prose dark:prose-invert prose-slate max-w-none">
                      <Markdown>{aiAnalysis}</Markdown>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-20">
                    <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6">
                      <Sparkles className="w-10 h-10 text-indigo-600" />
                    </div>
                    <h4 className="text-xl font-black mb-2">{t.readyToGrow}</h4>
                    <p className="text-slate-400 max-w-md mx-auto">{t.getInsights}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="poster"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            <div className="lg:col-span-12">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-xl flex items-center gap-2">
                  <Rocket className="text-indigo-600 w-6 h-6" />
                  {t.aiPosterDesigner}
                </h3>
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button 
                    onClick={() => setPosterMode('single')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                      posterMode === 'single' ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-400"
                    )}
                  >
                    {t.singlePoster}
                  </button>
                  <button 
                    onClick={() => setPosterMode('bulk')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                      posterMode === 'bulk' ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-400"
                    )}
                  >
                    {t.bulkGenerate}
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-soft">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{t.uploadBrandStyle}</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "w-full h-32 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all gap-2 overflow-hidden relative group",
                        uploadedImage ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      {uploadedImage ? (
                        <>
                          <img src={uploadedImage} alt="Reference" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="text-white text-xs font-bold px-4 py-2 bg-white/20 backdrop-blur-md rounded-xl">{t.changeImage}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                            <Upload className="w-5 h-5" />
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t.optionalReference}</p>
                        </>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </div>

                  {posterMode === 'single' ? (
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{t.promotionalText}</label>
                      <textarea 
                        value={posterText}
                        onChange={(e) => setPosterText(e.target.value)}
                        placeholder="E.g., Grand Opening! 20% Discount on all credit registrations. Call 0123456789."
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold min-h-[120px] focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{t.designPrompts}</label>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">{bulkTexts.length} Fields</span>
                      </div>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {bulkTexts.map((text, index) => (
                          <div key={index} className="flex gap-2 group">
                            <div className="flex-1 relative">
                              <span className="absolute left-3 top-3 text-[8px] font-black text-slate-400">{index + 1}</span>
                              <textarea 
                                value={text}
                                onChange={(e) => updateBulkText(index, e.target.value)}
                                placeholder={`Promo idea ${index + 1}...`}
                                className="w-full pl-7 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl font-bold text-xs min-h-[60px] focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                              />
                            </div>
                            {bulkTexts.length > 5 && (
                              <button 
                                onClick={() => removeBulkField(index)}
                                className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button 
                        onClick={addBulkField}
                        className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-400 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase"
                      >
                        <Plus className="w-3 h-3" /> {t.addMoreField}
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={posterMode === 'single' ? generateSinglePoster : generateBulkPosters}
                    disabled={isGenerating || (posterMode === 'single' ? !posterText : bulkTexts.filter(t => t.trim()).length < 5)}
                    className={cn(
                      "w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all",
                      (isGenerating) && "opacity-50 grayscale cursor-not-allowed"
                    )}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MagicIcon className="w-4 h-4" />
                    )}
                    {isGenerating ? t.processing + ` (${bulkProgress}%)` : (posterMode === 'bulk' ? t.generateBulkPosters : t.generateAiPoster)}
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-6 border border-slate-200 dark:border-slate-800 shadow-soft h-[700px] relative overflow-hidden">
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm z-50"
                    >
                      <div className="relative">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                          className="w-32 h-32 border-4 border-indigo-600/10 border-t-indigo-600 rounded-full"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
                        </div>
                        {posterMode === 'bulk' && (
                          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-48 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-indigo-600"
                              initial={{ width: 0 }}
                              animate={{ width: `${bulkProgress}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="text-center mt-4">
                        <h4 className="text-xl font-black mb-1">{t.creatingMagic}</h4>
                        <p className="text-sm text-slate-400 font-bold italic animate-pulse">
                          {posterMode === 'bulk' ? `Generating design ${Math.floor(bulkProgress / 10) + 1} of 10...` : (
                            <>
                              {generationStep === 1 && "Analyzing brand assets..."}
                              {generationStep === 2 && "Building layout..."}
                              {generationStep === 3 && "Enhancing details..."}
                              {generationStep === 4 && "Finalizing export..."}
                            </>
                          )}
                        </p>
                      </div>
                    </motion.div>
                  ) : null}

                  {posterMode === 'bulk' && bulkPosters.length > 0 ? (
                    <motion.div 
                      key="bulk-results"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="grid grid-cols-2 gap-4 h-full overflow-y-auto pr-2 custom-scrollbar p-2"
                    >
                      {bulkPosters.map((url, idx) => (
                        <div key={idx} className="relative group rounded-3xl overflow-hidden shadow-lg aspect-[3/4] bg-slate-50 dark:bg-slate-800">
                          <img src={url} alt={`Bulk Poster ${idx+1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                            <CheckCircle2 className="text-emerald-400 w-10 h-10" />
                            <button 
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `Bulk_Design_${idx+1}.png`;
                                link.click();
                              }}
                              className="px-4 py-2 bg-white text-slate-900 font-black rounded-xl text-xs hover:scale-105 transition-transform flex items-center gap-2"
                            >
                              <Download className="w-3 h-3" /> Download
                            </button>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  ) : generatedPoster ? (
                    <motion.div 
                      key="result"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full h-full relative group"
                    >
                      <img src={generatedPoster} alt="AI Poster" className="w-full h-full object-contain rounded-[2.5rem]" />
                      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                        <button 
                          onClick={downloadPoster}
                          className="px-8 py-4 bg-white text-slate-900 font-black rounded-2xl shadow-2xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-transform"
                        >
                          <Download className="w-5 h-5" /> Download
                        </button>
                        <button 
                          onClick={generateSinglePoster}
                          className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-2xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-transform"
                        >
                          <RefreshCw className="w-5 h-5" /> Re-generate
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <ImageIcon className="w-10 h-10 text-slate-300" />
                      </div>
                      <div className="max-w-xs">
                        <h4 className="text-xl font-black mb-2">{t.masterpieceAwaits}</h4>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider leading-relaxed">{t.chooseBulkOrSingle}</p>
                      </div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MagicIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
  </svg>
);

export default AiCorner;
