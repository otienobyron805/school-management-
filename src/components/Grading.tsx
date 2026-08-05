import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Calculator, Award, HelpCircle, Save, Check, RefreshCw, AlertCircle
} from 'lucide-react';
import { getGradingRules, saveGradingRules, GradingRule, secureRemove } from '../utils/db';
import { confirmAction } from './ConfirmDialog';

export default function Grading() {
  const [rules, setRules] = useState<GradingRule[]>(() => getGradingRules());
  const [testScore, setTestScore] = useState<string>('');
  const [calculatorResult, setCalculatorResult] = useState<{
    score: number;
    code: string;
    points: number;
    category: string;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Keep in sync if rules are loaded on component mount
    setRules(getGradingRules());
  }, []);



  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleSaveAll = () => {
    // Validate rules ranges
    for (const rule of rules) {
      if (!rule.code.trim()) {
        alert('⚠️ Please fill in all Grade Codes.');
        return;
      }
      if (isNaN(rule.min) || isNaN(rule.max) || rule.min < 0 || rule.max > 100 || rule.min > rule.max) {
        alert(`⚠️ Rule ${rule.code} has an invalid score range (${rule.min}% - ${rule.max}%). Min must be <= Max and between 0-100.`);
        return;
      }
    }

    saveGradingRules(rules);
    triggerToast('Grading Scheme saved successfully!');
    
    // Recalculate current calculator if present
    if (testScore !== '') {
      performCalculation(parseFloat(testScore));
    }
  };

  const handleResetToDefault = () => {
    if (confirm('⏳ Are you sure you want to reset the grading scheme to the default CBC system levels (EE1, EE2, ME1, ME2, etc.)? Any custom modifications will be lost.')) {
      secureRemove('school_grading_rules');
      const defaults = getGradingRules();
      setRules(defaults);
      triggerToast('Reset to CBC default levels!');
      setCalculatorResult(null);
    }
  };

  const handleExportCSV = () => {
    let csv = 'Grade Code,Min Score,Max Score,Points,Category\n';
    rules.forEach(r => csv += `${r.code},${r.min},${r.max},${r.points},${r.category}\n`);
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'grading_rules.csv'; a.click();
    URL.revokeObjectURL(url);
    triggerToast('Rules exported successfully!');
  };

  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.csv';
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = evt => {
        const text = evt.target?.result as string;
        // Basic parser
        const lines = text.split('\n').slice(1);
        const newRules: GradingRule[] = lines.filter(l => l.trim()).map(l => {
          const [code, min, max, points, category] = l.split(',');
          return {
            id: 'rule_' + Date.now() + Math.random(),
            code: code.trim(),
            min: Number(min),
            max: Number(max),
            points: Number(points),
            category: category.trim() as any
          };
        });
        if (newRules.length > 0) {
          setRules(newRules);
          saveGradingRules(newRules);
          triggerToast('Rules imported successfully!');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleAddRule = () => {
    const newRule: GradingRule = {
      id: 'rule_' + Date.now() + Math.floor(Math.random() * 100),
      code: 'NEW',
      min: 0,
      max: 40,
      points: 1,
      category: 'custom'
    };
    const nextRules = [...rules, newRule];
    setRules(nextRules);
    saveGradingRules(nextRules);
    triggerToast('Added new rule entry');
  };

  const handleRemoveRule = (id: string, code: string) => {
    if (rules.length <= 1) {
      confirmAction({
        title: 'Rule Required',
        message: 'You must keep at least one grading rule in the system.',
        confirmText: 'OK',
        variant: 'warning',
        onConfirm: () => {}
      });
      return;
    }
    confirmAction({
      title: 'Delete Grading Rule',
      message: `Are you sure you want to delete grading rule "${code}"?`,
      confirmText: 'Delete Rule',
      variant: 'danger',
      onConfirm: () => {
        const nextRules = rules.filter(r => r.id !== id);
        setRules(nextRules);
        saveGradingRules(nextRules);
        triggerToast(`Removed rule ${code}`);
        setCalculatorResult(null);
      }
    });
  };

  const updateRuleField = (id: string, field: keyof GradingRule, value: any) => {
    const nextRules = rules.map(rule => {
      if (rule.id === id) {
        return { ...rule, [field]: value };
      }
      return rule;
    });
    setRules(nextRules);
    saveGradingRules(nextRules);
  };

  const performCalculation = (score: number) => {
    if (isNaN(score) || score < 0 || score > 100) {
      alert('⚠️ Enter a valid score between 0 and 100');
      setCalculatorResult(null);
      return;
    }

    const match = rules.find(r => score >= r.min && score <= r.max);
    if (match) {
      setCalculatorResult({
        score,
        code: match.code,
        points: match.points,
        category: match.category
      });
    } else {
      setCalculatorResult({
        score,
        code: 'No Grade Match',
        points: 0,
        category: 'custom'
      });
    }
  };

  const handleCalculate = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    const scoreVal = parseFloat(testScore);
    performCalculation(scoreVal);
  };

  // Helper styles based on category
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'ee':
        return {
          wrapper: 'bg-emerald-50/70 border-emerald-300 text-emerald-900',
          badge: 'bg-emerald-600 text-white',
          accent: 'emerald'
        };
      case 'me':
        return {
          wrapper: 'bg-blue-50/70 border-blue-300 text-blue-900',
          badge: 'bg-blue-600 text-white',
          accent: 'blue'
        };
      case 'ae':
        return {
          wrapper: 'bg-amber-50/70 border-amber-300 text-amber-900',
          badge: 'bg-amber-600 text-white',
          accent: 'amber'
        };
      case 'be':
        return {
          wrapper: 'bg-rose-50/70 border-rose-300 text-rose-900',
          badge: 'bg-rose-600 text-white',
          accent: 'rose'
        };
      default:
        return {
          wrapper: 'bg-slate-50/80 border-slate-300 text-slate-800',
          badge: 'bg-slate-600 text-white',
          accent: 'slate'
        };
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded-2xl shadow-xl z-50 text-sm font-semibold flex items-center gap-2 animate-bounce">
          ✨ {toastMessage}
        </div>
      )}

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              ⚖️ Grading Criteria Scheme
            </h2>
            <p className="text-sm text-slate-400">
              📌 Map assessment scores to grade codes, achievement levels, and credit points.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button 
              onClick={handleExportCSV}
              className="bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer min-h-[44px]"
            >
              📤 Export CSV
            </button>
            <button 
              onClick={handleImportCSV}
              className="bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer min-h-[44px]"
            >
              📥 Import CSV
            </button>
            <button 
              onClick={handleResetToDefault}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer min-h-[44px]"
              title="Reset rules to default levels"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Defaults
            </button>
            <button 
              onClick={handleAddRule}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer min-h-[44px]"
            >
              <Plus className="w-4 h-4" /> Add New Rule
            </button>
          </div>
        </div>

        {/* Informative banner */}
        <div className="bg-slate-50/70 border border-slate-200/60 p-4 rounded-xl text-xs text-slate-500 leading-relaxed flex gap-2.5">
          <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-700">How Grading Schemes Work:</span> Scores are mapped sequentially based on lower (Min) and upper (Max) inclusive bounds. Ensure your rules cover all possible ranges (from 0% to 100%) to avoid unmatched scores. Grade levels are color-coded: <strong className="text-emerald-700">EE</strong> (Exceeds Expectation), <strong className="text-blue-700">ME</strong> (Meets Expectation), <strong className="text-amber-700">AE</strong> (Approaching Expectation), and <strong className="text-rose-700">BE</strong> (Below Expectation).
          </div>
        </div>

        {/* Rules interactive inputs table */}
        <div className="space-y-3">
          <div className="hidden sm:grid grid-cols-12 gap-3 px-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
            <div className="col-span-3">Grade Code</div>
            <div className="col-span-4 text-center">Score Range (%)</div>
            <div className="col-span-2 text-center">Credit Points</div>
            <div className="col-span-2 text-center">Group Level</div>
            <div className="col-span-1 text-right">Delete</div>
          </div>

          <div className="space-y-2.5">
            {rules.map((rule) => {
              const styles = getCategoryStyles(rule.category);
              return (
                <div 
                  key={rule.id}
                  className={`grid grid-cols-1 sm:grid-cols-12 gap-3 items-center p-3 sm:p-2 rounded-2xl border-2 transition ${styles.wrapper}`}
                >
                  {/* Grade Code */}
                  <div className="col-span-1 sm:col-span-3 flex items-center gap-2">
                    <span className="sm:hidden text-xs font-bold text-slate-400 w-20">Code:</span>
                    <input 
                      type="text" 
                      value={rule.code}
                      onChange={(e) => updateRuleField(rule.id, 'code', e.target.value.toUpperCase())}
                      placeholder="e.g. EE1"
                      className={`w-full max-w-[120px] sm:max-w-none px-3 py-2.5 rounded-xl font-extrabold text-sm text-center outline-none border border-transparent focus:border-slate-400 transition font-mono ${styles.badge}`}
                    />
                  </div>

                  {/* Score Range min to max */}
                  <div className="col-span-1 sm:col-span-4 flex items-center justify-center gap-1.5">
                    <span className="sm:hidden text-xs font-bold text-slate-400 w-20">Range %:</span>
                    <div className="flex items-center gap-1.5 flex-1 max-w-[240px] sm:max-w-none">
                      <input 
                        type="number" 
                        min="0"
                        max="100"
                        value={rule.min}
                        onChange={(e) => updateRuleField(rule.id, 'min', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-2.5 rounded-xl bg-white text-slate-800 font-extrabold text-sm text-center border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Min"
                      />
                      <span className="font-semibold text-slate-400 text-xs">—</span>
                      <input 
                        type="number" 
                        min="0"
                        max="100"
                        value={rule.max}
                        onChange={(e) => updateRuleField(rule.id, 'max', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-2.5 rounded-xl bg-white text-slate-800 font-extrabold text-sm text-center border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Max"
                      />
                    </div>
                  </div>

                  {/* Points */}
                  <div className="col-span-1 sm:col-span-2 flex items-center justify-center gap-2">
                    <span className="sm:hidden text-xs font-bold text-slate-400 w-20">Points:</span>
                    <input 
                      type="number" 
                      min="1"
                      max="12"
                      value={rule.points}
                      onChange={(e) => updateRuleField(rule.id, 'points', parseInt(e.target.value) || 1)}
                      className={`w-20 sm:w-full px-2 py-2.5 rounded-xl font-extrabold text-sm text-center outline-none border border-transparent focus:border-slate-400 transition font-mono ${styles.badge}`}
                      placeholder="Pts"
                    />
                  </div>

                  {/* Color Level Categorization dropdown */}
                  <div className="col-span-1 sm:col-span-2 flex items-center justify-center gap-2">
                    <span className="sm:hidden text-xs font-bold text-slate-400 w-20">Group:</span>
                    <select
                      value={rule.category}
                      onChange={(e) => updateRuleField(rule.id, 'category', e.target.value)}
                      className="w-full max-w-[140px] sm:max-w-none px-2 py-2.5 rounded-xl bg-white text-slate-700 text-xs font-bold border border-slate-200 outline-none cursor-pointer"
                    >
                      <option value="ee">🟢 EE (Exceeds)</option>
                      <option value="me">🔵 ME (Meets)</option>
                      <option value="ae">🟡 AE (Approaching)</option>
                      <option value="be">🔴 BE (Below)</option>
                      <option value="custom">⚪ Custom</option>
                    </select>
                  </div>

                  {/* Actions (Delete button) */}
                  <div className="col-span-1 sm:col-span-1 flex items-center justify-end w-full sm:w-auto">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveRule(rule.id, rule.code);
                      }}
                      className="w-full sm:w-12 h-12 rounded-xl bg-rose-100 text-rose-600 hover:bg-rose-200 hover:text-rose-700 font-bold transition flex items-center justify-center gap-2 cursor-pointer border border-rose-200/50 active:scale-95"
                      title={`Remove grade rule ${rule.code}`}
                    >
                      <Trash2 className="w-5 h-5 flex-shrink-0 pointer-events-none" />
                      <span className="sm:hidden text-sm font-extrabold pointer-events-none">Delete Rule</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Save button footer bar */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
          <div className="text-xs text-slate-400 font-medium">
            💡 Make sure rule boundaries do not overlap!
          </div>
          <button
            onClick={handleSaveAll}
            className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-extrabold text-sm inline-flex items-center gap-2 transition shadow-md cursor-pointer min-h-[44px]"
          >
            <Save className="w-4 h-4" /> Save Criteria Scheme
          </button>
        </div>
      </div>

      {/* Calculator Section card */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/50">
          <Calculator className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">🧪 Interactive Test Score Calculator</h3>
        </div>
        <p className="text-xs text-slate-400">
          Input a score percentage below to test the active grading criteria mappings immediately.
        </p>

        <form onSubmit={handleCalculate} className="flex flex-col sm:flex-row gap-3.5 items-stretch sm:items-end">
          <div className="space-y-1.5 flex-1">
            <label className="text-xs font-bold text-slate-500 uppercase block">📝 Enter Score (%)</label>
            <input 
              type="number"
              min="0"
              max="100"
              required
              placeholder="e.g. 78"
              value={testScore}
              onChange={(e) => {
                const val = e.target.value;
                setTestScore(val);
                
                // Live computation
                const scoreVal = parseFloat(val);
                if (!isNaN(scoreVal) && scoreVal >= 0 && scoreVal <= 100) {
                  const match = rules.find(r => scoreVal >= r.min && scoreVal <= r.max);
                  if (match) {
                    setCalculatorResult({
                      score: scoreVal,
                      code: match.code,
                      points: match.points,
                      category: match.category
                    });
                  } else {
                    setCalculatorResult({
                      score: scoreVal,
                      code: 'No Grade Match',
                      points: 0,
                      category: 'custom'
                    });
                  }
                } else {
                  setCalculatorResult(null);
                }
              }}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
            />
          </div>
          <button 
            type="submit"
            onClick={handleCalculate}
            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 transition cursor-pointer min-h-[48px]"
          >
            🔍 Get Grade Code
          </button>
        </form>

        {/* Result display */}
        {calculatorResult && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3.5 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Evaluation Result</span>
              <span className={`text-[10px] uppercase font-extrabold px-3 py-1 rounded-full ${
                calculatorResult.category === 'ee' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                calculatorResult.category === 'me' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                calculatorResult.category === 'ae' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                calculatorResult.category === 'be' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                'bg-slate-100 text-slate-800 border border-slate-200'
              }`}>
                {calculatorResult.category.toUpperCase()} GROUP
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center divide-x divide-slate-100">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">📊 Given Score</span>
                <span className="text-xl font-extrabold text-slate-800">{calculatorResult.score}%</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">🏷️ Grade Code</span>
                <span className="text-xl font-extrabold text-blue-600 font-mono">{calculatorResult.code}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">⭐ Pts Obtained</span>
                <span className="text-xl font-extrabold text-emerald-600">{calculatorResult.points} points</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
