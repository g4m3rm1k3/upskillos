import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, X, Sun, Moon, Layers, Check, Sparkles, Type, AlignLeft, AlignCenter, AlignRight, AlignJustify, Maximize2, Minimize2, Monitor, Smartphone, Text } from 'lucide-react';
import { useGlobalTheme, FONT_OPTIONS } from '../../context/ThemeContext.jsx';
import { STUDIO_THEMES } from '../../utils/studioThemes.js';

// ── Theme catalogue ───────────────────────────────────────────────────────────
const THEME_META = {
  light:              { desc: 'Clean white UI, perfect for bright environments.',       type: 'light',   group: 'System',    emoji: '☀️' },
  default:            { desc: 'Crisp dark blue slate — the UpSkillOS default.',         type: 'dynamic', group: 'System',    emoji: '🌑' },
  github:             { desc: 'Faithful recreation of GitHub\'s iconic light/dark UI.', type: 'dynamic', group: 'Developer', emoji: '🐙' },
  dracula:            { desc: 'The beloved vampire dark theme — purple & pink neons.',   type: 'dark',    group: 'Developer', emoji: '🧛' },
  nord:               { desc: 'Arctic-inspired cool blues, soft whites, and greys.',    type: 'dark',    group: 'Developer', emoji: '🏔️' },
  monokai:            { desc: 'The iconic Sublime Text dark theme, timeless.',          type: 'dark',    group: 'Developer', emoji: '🎨' },
  tokyo_night:        { desc: 'Neon-lit Tokyo skyline in deep midnight navy.',          type: 'dark',    group: 'Developer', emoji: '🌃' },
  one_dark:           { desc: 'Atom\'s beloved One Dark, ported faithfully.',           type: 'dark',    group: 'Developer', emoji: '⚛️' },
  catppuccin:         { desc: 'Soothing pastel dark — Macchiato variant.',              type: 'dark',    group: 'Pastel',    emoji: '🌸' },
  'catppuccin-latte': { desc: 'Catppuccin\'s creamy warm light mode — Latte.',          type: 'light',   group: 'Pastel',    emoji: '☕' },
  'vue-dark':         { desc: 'Deep forest green, inspired by Vue.js.',                 type: 'dark',    group: 'Framework', emoji: '💚' },
  'vue-light':        { desc: 'Minty light green, crisp and refreshing.',               type: 'light',   group: 'Framework', emoji: '🌿' },
  synthwave:          { desc: 'Neon 80s synthwave aesthetic — pink, cyan & purple.',    type: 'dark',    group: 'Colorful',  emoji: '🕹️' },
  cyberFuchsia:       { desc: 'Electric fuchsia and deep purple cyber aesthetic.',      type: 'dynamic', group: 'Colorful',  emoji: '💜' },
  electricBlue:       { desc: 'Bold electric blue — stunning in both light and dark.',  type: 'dynamic', group: 'Colorful',  emoji: '⚡' },
  cyberCyan:          { desc: 'Deep sea cyan — crisp and futuristic.',                  type: 'dynamic', group: 'Colorful',  emoji: '🌊' },
  paperTextbook:      { desc: 'Off-white paper with inky text — distraction-free.',    type: 'light',   group: 'Focus',     emoji: '📄' },
  sepiaTextbook:      { desc: 'Warm amber-sepia dark for late-night reading sessions.', type: 'dark',    group: 'Focus',     emoji: '📚' },
  'gray-light':       { desc: 'Clean, neutral gray light theme with high contrast.',    type: 'light',   group: 'System',    emoji: '⚪' },
  'gray-dark':        { desc: 'Deep, neutral gray dark theme with high contrast.',      type: 'dark',    group: 'System',    emoji: '⚫' },
};

const TYPE_BADGE = {
  light:   { label: 'Light',    icon: Sun,     cls: 'bg-amber-100/80 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50' },
  dark:    { label: 'Dark',     icon: Moon,    cls: 'bg-slate-100/80 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700' },
  dynamic: { label: 'Adaptive', icon: Layers,  cls: 'bg-indigo-100/80 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700/50' },
};

const GROUP_ORDER = ['System', 'Developer', 'Pastel', 'Framework', 'Colorful', 'Focus'];
const GROUP_ICONS = { System: '🖥️', Developer: '⌨️', Pastel: '🍬', Framework: '🔧', Colorful: '🎆', Focus: '📖' };

function buildThemeList() {
  const extractHex = (cls = '') => cls.match(/#[0-9a-fA-F]{3,8}/)?.[0] || null;

  const studioEntries = Object.entries(STUDIO_THEMES).map(([id, t]) => {
    const ui = t.uiDark || {};
    const md = t.mdDark || {};
    return {
      id,
      name: t.name,
      accentHex: t.accentHex || '#0ea5e9',
      bg0: extractHex(ui.bg0) || '#0b1322',
      bg1: extractHex(ui.bg1) || '#07111e',
      bg2: extractHex(ui.bg2) || '#0f172a',
      text: extractHex(ui.txt1) || '#f1f5f9',
      text2: extractHex(ui.txt2) || '#94a3b8',
      h2: md.h2 || t.accentHex || '#0ea5e9',
      h3: md.h3 || t.accentHex || '#0ea5e9',
    };
  });

  return [
    { id: 'light', name: 'Light', accentHex: '#f59e0b', bg0: '#ffffff', bg1: '#f8fafc', bg2: '#f1f5f9', text: '#0f172a', text2: '#64748b', h2: '#2563eb', h3: '#059669' },
    ...studioEntries,
  ];
}

const ALL_THEMES = buildThemeList();

function groupThemes(themes) {
  const groups = {};
  for (const theme of themes) {
    const meta = THEME_META[theme.id] || { group: 'Other', type: 'dark', desc: '' };
    const g = meta.group;
    if (!groups[g]) groups[g] = [];
    groups[g].push({ ...theme, meta });
  }
  return GROUP_ORDER.filter(g => groups[g]).map(g => ({ name: g, themes: groups[g] }));
}

const GROUPS = groupThemes(ALL_THEMES);

// ── Rich preview card ─────────────────────────────────────────────────────────
function ThemeCard({ theme, isActive, onClick }) {
  const meta = theme.meta || {};
  const badge = TYPE_BADGE[meta.type] || TYPE_BADGE.dark;
  const BadgeIcon = badge.icon;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`relative w-full text-left rounded-2xl overflow-hidden border-2 transition-all duration-200 focus:outline-none group ${
        isActive
          ? 'border-transparent' // Border color handled by style tag below
          : 'border-slate-200/60 dark:border-slate-700/60 hover:border-slate-400/50 dark:hover:border-slate-500/50 shadow-md hover:shadow-xl'
      }`}
      style={isActive ? {
        borderColor: theme.accentHex,
        boxShadow: `0 0 0 2px ${theme.accentHex}20, 0 8px 24px ${theme.accentHex}40`
      } : {}}
    >
      {/* ── Colour preview window ── */}
      <div className="relative h-32 overflow-hidden" style={{ background: theme.bg0 }}>
        {/* Sidebar strip */}
        <div className="absolute left-0 top-0 bottom-0 w-9 flex flex-col gap-1.5 items-center pt-2.5" style={{ background: theme.bg1 }}>
          {[theme.accentHex, theme.h2, theme.h3].map((c, i) => (
            <div key={i} className="w-4 h-4 rounded-md opacity-80" style={{ background: c }} />
          ))}
          <div className="w-4 h-1 rounded-full mt-1 opacity-40" style={{ background: theme.text }} />
          <div className="w-4 h-1 rounded-full opacity-25" style={{ background: theme.text }} />
        </div>

        {/* Main content area */}
        <div className="absolute left-11 right-3 top-3 bottom-3 flex flex-col gap-1.5">
          {/* "Tab bar" */}
          <div className="flex gap-1.5 mb-0.5">
            <div className="h-4 rounded px-2 flex items-center gap-1" style={{ background: theme.bg2 }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: theme.accentHex }} />
              <div className="w-6 h-1 rounded-full opacity-50" style={{ background: theme.text }} />
            </div>
            <div className="h-4 w-8 rounded opacity-40" style={{ background: theme.bg2 }} />
          </div>

          {/* "Heading" line */}
          <div className="h-2 w-24 rounded-full" style={{ background: theme.h2, opacity: 0.85 }} />

          {/* "Body text" lines */}
          <div className="h-1.5 w-full rounded-full opacity-35" style={{ background: theme.text }} />
          <div className="h-1.5 w-4/5 rounded-full opacity-25" style={{ background: theme.text }} />

          {/* "Code block" */}
          <div className="mt-1 rounded-lg p-1.5 flex flex-col gap-1" style={{ background: theme.bg2 }}>
            <div className="flex gap-1.5 items-center">
              <div className="h-1 w-6 rounded-full" style={{ background: theme.accentHex, opacity: 0.8 }} />
              <div className="h-1 w-10 rounded-full opacity-30" style={{ background: theme.text }} />
            </div>
            <div className="flex gap-1.5 items-center">
              <div className="h-1 w-3 rounded-full opacity-30" style={{ background: theme.text }} />
              <div className="h-1 w-8 rounded-full" style={{ background: theme.h3, opacity: 0.7 }} />
            </div>
          </div>

          {/* "Button" */}
          <div className="mt-auto self-start h-4 rounded-lg px-2 flex items-center" style={{ background: theme.accentHex, opacity: 0.85 }}>
            <div className="w-8 h-1 rounded-full bg-white opacity-80" />
          </div>
        </div>

        {/* Active checkmark overlay */}
        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: `${theme.accentHex}1a` }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-9 h-9 rounded-full flex items-center justify-center shadow-xl"
              style={{ background: theme.accentHex, boxShadow: `0 10px 25px -5px ${theme.accentHex}60` }}
            >
              <Check className="w-5 h-5 text-white" strokeWidth={3} />
            </motion.div>
          </div>
        )}

        {/* Hover shimmer */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/0 group-hover:from-white/5 group-hover:to-transparent transition-all duration-300 pointer-events-none" />
      </div>

      {/* ── Info row ── */}
      <div className="px-3.5 py-3 bg-white dark:bg-slate-800/90 border-t border-black/5 dark:border-white/5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight truncate flex items-center gap-1.5">
            <span>{meta.emoji}</span>
            {theme.name}
          </span>
          <span className={`shrink-0 flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${badge.cls}`}>
            <BadgeIcon className="w-2.5 h-2.5" />
            {badge.label}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
          {meta.desc}
        </p>
      </div>
    </motion.button>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function ThemeModal({ onClose }) {
  const { studioTheme, setStudioTheme, typography, setTypography, taskbarStyle, setTaskbarStyle, macAnimation, setMacAnimation, laserEnabled, setLaserEnabled, laserColor, setLaserColor, pageEffect, setPageEffect } = useGlobalTheme();
  const [activeTab, setActiveTab] = useState('themes'); // 'themes' | 'typography' | 'interface'
  const [activeGroup, setActiveGroup] = useState(() => {
    for (const g of GROUPS) {
      if (g.themes.some(t => t.id === studioTheme)) return g.name;
    }
    return GROUPS[0]?.name;
  });

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const currentGroup = GROUPS.find(g => g.name === activeGroup) || GROUPS[0];
  const currentTheme = ALL_THEMES.find(t => t.id === studioTheme);

  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" />

      {/* Modal panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-6xl flex flex-col rounded-3xl overflow-hidden border border-white/10 dark:border-slate-700/50 transition-shadow duration-500"
        style={{ 
          maxHeight: '90vh',
          boxShadow: currentTheme 
            ? `0 48px 100px -24px rgba(0,0,0,0.7), 0 0 80px -20px ${currentTheme.accentHex}40`
            : '0 48px 100px -24px rgba(0,0,0,0.7)'
        }}
      >
        {/* ── Gradient header ── */}
        <div 
          className="relative shrink-0 px-8 pt-7 pb-6 overflow-hidden transition-all duration-700"
          style={{
            background: currentTheme 
              ? `linear-gradient(135deg, ${currentTheme.h3}, ${currentTheme.accentHex}, ${currentTheme.h2})` 
              : 'linear-gradient(135deg, #4f46e5, #9333ea, #db2777)'
          }}
        >
          {/* Subtle overlay to ensure white text always has enough contrast, even on light theme gradients */}
          <div className="absolute inset-0 bg-black/15 pointer-events-none" />
          {/* Decorative orbs */}
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5 blur-xl pointer-events-none" />

          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">Appearance</h2>
              </div>
              <p className="text-sm text-white/70 font-medium">
                Customize your reading experience
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all mt-0.5"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Active theme pill */}
          {currentTheme && (
            <div className="relative mt-4 inline-flex items-center gap-2.5 bg-black/25 backdrop-blur-md rounded-xl px-4 py-2.5 border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/50 shadow-inner" style={{ background: currentTheme.accentHex }} />
              <span className="text-sm font-semibold text-white/90">
                {currentTheme.name}
              </span>
              <Check className="w-3.5 h-3.5 text-white/60" strokeWidth={2.5} />
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-900">
          
          {/* Top Tabs */}
          <div className="shrink-0 flex items-center gap-6 px-8 pt-4 border-b border-slate-200/80 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('themes')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'themes' 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              Themes
            </button>
            <button
              onClick={() => setActiveTab('typography')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'typography' 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              Typography
            </button>
            <button
              onClick={() => setActiveTab('interface')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'interface' 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              Interface
            </button>
          </div>

          {activeTab === 'themes' && (
            <>
              {/* Group tabs */}
          <div className="shrink-0 flex items-center gap-2 px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 overflow-x-auto">
            {GROUPS.map(g => {
              const hasActive = g.themes.some(t => t.id === studioTheme);
              const isSelected = activeGroup === g.name;
              return (
                <motion.button
                  key={g.name}
                  onClick={() => setActiveGroup(g.name)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`relative shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    isSelected
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md border border-slate-200/80 dark:border-slate-700'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`}
                  style={isSelected && hasActive ? {
                    borderColor: currentTheme?.accentHex,
                    boxShadow: `0 0 0 1px ${currentTheme?.accentHex}, 0 4px 12px ${currentTheme?.accentHex}30`
                  } : {}}
                >
                  <span className="text-base leading-none">{GROUP_ICONS[g.name] || '📁'}</span>
                  {g.name}
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                    {g.themes.length}
                  </span>
                  {hasActive && !isSelected && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: currentTheme?.accentHex || '#6366f1' }} />
                  )}
                </motion.button>
              );
            })}

            {/* Legend — pushed to right */}
            <div className="ml-auto flex items-center gap-2 shrink-0 pl-2 border-l border-slate-200 dark:border-slate-700">
              {Object.entries(TYPE_BADGE).map(([type, info]) => {
                const Icon = info.icon;
                const isCurrentType = THEME_META[studioTheme]?.type === type;
                return (
                  <span 
                    key={type} 
                    className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border transition-all duration-300 ${info.cls}`}
                    style={isCurrentType ? {
                      borderColor: currentTheme?.accentHex,
                      boxShadow: `0 0 12px ${currentTheme?.accentHex}60`
                    } : {}}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    {info.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Theme grid */}
          <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeGroup}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              >
                {currentGroup?.themes.map((theme, i) => (
                  <motion.div
                    key={theme.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                  >
                    <ThemeCard
                      theme={theme}
                      isActive={studioTheme === theme.id}
                      onClick={() => setStudioTheme(theme.id)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
          </>
          )}

          {activeTab === 'typography' && (
            <div className="flex-1 overflow-y-auto px-8 py-6 min-h-0 text-slate-800 dark:text-slate-200 space-y-8">
              
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <Type className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-base font-bold">Font Family</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {FONT_OPTIONS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setTypography({ font: f.id })}
                      className={`px-4 py-3 rounded-xl border text-sm text-left transition-all ${
                        typography.font === f.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <Monitor className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-base font-bold">Markdown Look & Feel</h3>
                </div>
                <button
                  onClick={() => setTypography({ basicWebpage: !typography.basicWebpage })}
                  className={`w-full px-5 py-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                    typography.basicWebpage
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="font-bold mb-1">Basic Webpage Style</div>
                    <div className={`text-sm ${typography.basicWebpage ? 'text-indigo-600/80 dark:text-indigo-300/80' : 'text-slate-500 dark:text-slate-400'}`}>
                      Disable fancy styles, custom Markdown components, and code editor embeds. Renders docs as a standard webpage.
                    </div>
                  </div>
                  <div className={`w-12 h-6 rounded-full p-1 transition-colors ${typography.basicWebpage ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${typography.basicWebpage ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </button>
              </div>

              <div className="max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Text className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-base font-bold">Font Size</h3>
                  </div>
                  <div className="flex bg-slate-200/50 dark:bg-slate-800 rounded-xl p-1">
                    {['sm', 'base', 'lg', 'xl'].map(size => (
                      <button
                        key={size}
                        onClick={() => setTypography({ fontSize: size })}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                          typography.fontSize === size
                            ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-300'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {size === 'sm' ? 'Small' : size === 'base' ? 'Normal' : size === 'lg' ? 'Large' : 'Huge'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <AlignLeft className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-base font-bold">Line Height</h3>
                  </div>
                  <div className="flex bg-slate-200/50 dark:bg-slate-800 rounded-xl p-1">
                    {['tight', 'normal', 'relaxed', 'loose'].map(lh => (
                      <button
                        key={lh}
                        onClick={() => setTypography({ lineHeight: lh })}
                        className={`flex-1 flex justify-center py-2 text-sm font-medium rounded-lg transition-all ${
                          typography.lineHeight === lh
                            ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-300'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                        title={lh}
                      >
                        {lh === 'tight' ? <AlignJustify className="w-4 h-4 scale-y-75" /> 
                         : lh === 'normal' ? <AlignJustify className="w-4 h-4" /> 
                         : lh === 'relaxed' ? <AlignJustify className="w-4 h-4 scale-y-125" /> 
                         : <AlignJustify className="w-4 h-4 scale-y-150" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Monitor className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-base font-bold">Reading Width</h3>
                  </div>
                  <div className="flex bg-slate-200/50 dark:bg-slate-800 rounded-xl p-1">
                    {['narrow', 'normal', 'wide'].map(w => (
                      <button
                        key={w}
                        onClick={() => setTypography({ width: w })}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                          typography.width === w
                            ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-300'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {w === 'narrow' ? 'Narrow' : w === 'normal' ? 'Normal' : 'Full'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 px-1">Note: Width applies to full-page tutorials.</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <AlignLeft className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-base font-bold">Text Align</h3>
                  </div>
                  <div className="flex bg-slate-200/50 dark:bg-slate-800 rounded-xl p-1">
                    {['left', 'center', 'right', 'justify'].map(align => (
                      <button
                        key={align}
                        onClick={() => setTypography({ textAlign: align })}
                        className={`flex-1 flex justify-center py-2 text-sm font-medium rounded-lg transition-all ${
                          typography.textAlign === align
                            ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-300'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                        title={align}
                      >
                        {align === 'left' ? <AlignLeft className="w-4 h-4" /> 
                         : align === 'center' ? <AlignCenter className="w-4 h-4" /> 
                         : align === 'right' ? <AlignRight className="w-4 h-4" /> 
                         : <AlignJustify className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'interface' && (
            <div className="flex-1 overflow-y-auto px-8 py-6 min-h-0 text-slate-800 dark:text-slate-200 space-y-8">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-6">
                  <Monitor className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-xl font-bold">Taskbar Layout</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { id: 'win10', name: 'Classic (Windows 10)', desc: 'Left-aligned Start button and icons.', icon: '🖥️' },
                    { id: 'win11', name: 'Modern (Windows 11)', desc: 'Centered Start button and icons.', icon: '🪟' },
                    { id: 'mac', name: 'Dock (macOS)', desc: 'Centered 3D icons that expand on hover.', icon: '🍏' },
                  ].map(style => {
                    const isActive = taskbarStyle === style.id;
                    return (
                      <button
                        key={style.id}
                        onClick={() => setTaskbarStyle(style.id)}
                        className={`relative flex flex-col text-left p-6 rounded-2xl border-2 transition-all group focus:outline-none ${
                          isActive
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-md'
                            : 'border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg bg-white dark:bg-slate-800/50'
                        }`}
                      >
                        <div className="text-3xl mb-4 group-hover:scale-110 transition-transform origin-bottom-left">{style.icon}</div>
                        <div className={`font-bold mb-2 ${isActive ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-900 dark:text-slate-100'}`}>
                          {style.name}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                          {style.desc}
                        </div>
                        
                        {isActive && (
                          <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center shadow-md">
                            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                
                {taskbarStyle === 'mac' && (
                  <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-indigo-500" />
                      <h3 className="text-base font-bold">Mac Dock Animation</h3>
                    </div>
                    <div className="flex bg-slate-200/50 dark:bg-slate-800 rounded-xl p-1 max-w-md">
                      <button
                        onClick={() => setMacAnimation('flat')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                          macAnimation === 'flat'
                            ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-300'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        2D Cards
                      </button>
                      <button
                        onClick={() => setMacAnimation('spin')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                          macAnimation === 'spin'
                            ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-300'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        3D Spin
                      </button>
                      <button
                        onClick={() => setMacAnimation('dice')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                          macAnimation === 'dice'
                            ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-300'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        3D Dice
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3 max-w-md">
                      Choose '2D Cards' for flat scaling, '3D Spin' for a gentle 3D cube spin, or '3D Dice' for a full tumbling cube.
                    </p>
                  </div>
                )}

                {/* Laser Cursor */}
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-500">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Laser Pointer</h3>
                      <p className="text-xs text-slate-500">Display a trailing laser beam behind the mouse</p>
                    </div>
                    <button
                      onClick={() => setLaserEnabled(!laserEnabled)}
                      className={`w-12 h-6 rounded-full p-1 transition-colors ${laserEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${laserEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {laserEnabled && (
                    <div className="ml-11">
                      <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Laser Color</h4>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { hex: '#ef4444', name: 'Red' },
                          { hex: '#f97316', name: 'Orange' },
                          { hex: '#f59e0b', name: 'Yellow' },
                          { hex: '#10b981', name: 'Green' },
                          { hex: '#06b6d4', name: 'Cyan' },
                          { hex: '#3b82f6', name: 'Blue' },
                          { hex: '#8b5cf6', name: 'Purple' },
                          { hex: '#d946ef', name: 'Magenta' }
                        ].map((color) => (
                          <button
                            key={color.hex}
                            onClick={() => setLaserColor(color.hex)}
                            className={`w-8 h-8 rounded-full shadow-sm ring-2 ring-offset-2 dark:ring-offset-slate-900 transition-all ${
                              laserColor === color.hex ? 'ring-indigo-500 scale-110' : 'ring-transparent hover:scale-105'
                            }`}
                            style={{ backgroundColor: color.hex }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-6 mt-12">
                  <Monitor className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-xl font-bold">Page Close Effect</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { id: 'none', name: 'None', desc: 'Standard instant close.', icon: '⚡' },
                    { id: 'fire', name: 'Burn (Compiz)', desc: 'Windows burn up like fire on close.', icon: '🔥' },
                  ].map(style => {
                    const isActive = pageEffect === style.id;
                    return (
                      <button
                        key={style.id}
                        onClick={() => setPageEffect(style.id)}
                        className={`relative flex flex-col text-left p-6 rounded-2xl border-2 transition-all group focus:outline-none ${
                          isActive
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-md'
                            : 'border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg bg-white dark:bg-slate-800/50'
                        }`}
                      >
                        <div className="text-3xl mb-4 group-hover:scale-110 transition-transform origin-bottom-left">{style.icon}</div>
                        <div className={`font-bold mb-2 ${isActive ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-900 dark:text-slate-100'}`}>
                          {style.name}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                          {style.desc}
                        </div>
                        {isActive && (
                          <div className="absolute top-4 right-4 text-indigo-500">
                            <Check className="w-5 h-5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}

// ── Trigger button ────────────────────────────────────────────────────────────
export default function ThemePicker() {
  const [isOpen, setIsOpen] = useState(false);
  const { studioTheme } = useGlobalTheme();
  const currentTheme = ALL_THEMES.find(t => t.id === studioTheme);
  const meta = THEME_META[studioTheme];
  const isDark = meta?.type !== 'light';
  const Icon = isDark ? Moon : Sun;

  return (
    <>
      <button
        onClick={() => setIsOpen(o => !o)}
        className={`relative flex items-center justify-center nav-tool-btn transition-colors ${
          isOpen
            ? 'text-indigo-500 dark:text-indigo-400'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
        title="Appearance & Themes"
      >
        {/* Live accent dot (absolute overlay) */}
        <span
          className="absolute top-1 right-1 w-2 h-2 rounded-full border border-white dark:border-slate-800 shadow-sm transition-colors duration-300"
          style={{ background: currentTheme?.accentHex || '#0ea5e9' }}
        />
        <Icon className="w-[18px] h-[18px]" />
      </button>

      <AnimatePresence>
        {isOpen && <ThemeModal onClose={() => setIsOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
