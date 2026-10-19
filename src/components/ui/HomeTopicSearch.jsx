import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

const ALL_TOPICS = [
  "learn HTML", "master CSS", "learn JavaScript", "master React", "build with Node.js",
  "learn TypeScript", "build with Vue", "web development", "frontend dev", "backend APIs",
  "REST APIs", "design databases", "learn algorithms", "data structures", "linked lists",
  "binary trees", "sorting algorithms", "design patterns", "functional programming",
  "simulate physics", "orbital mechanics", "gravity simulation", "kinematics", "explore chemistry",
  "stoichiometry", "molecular structure", "learn calculus", "linear algebra", "geometry",
  "probability", "statistics", "combinatorics", "group theory", "discrete math", "robotics",
  "PID control", "CNC & G-Code", "industrial automation", "PLC programming", "digital logic",
  "circuit design", "CPU architecture", "3D modeling", "CAD design", "parametric design",
  "data science", "machine learning", "python programming", "MATLAB", "Three.js", "WebGL graphics",
  "game development", "audio DSP", "music production", "vector graphics", "SVG design",
  "I want to build a robot", "show me how to make games", "I need to learn math",
  "help me understand physics", "how do APIs work?", "simulate a coordinate measuring machine",
  "I want to learn 3D modeling", "teach me data science", "how does a CPU work?",
  "I want to build a website", "show me machine learning", "learn to calculate probabilities",
  "simulate celestial mechanics", "build a physics engine from scratch", "learn to code in Python",
  "master frontend web development", "build a backend server", "design digital logic circuits",
  "explore molecular chemistry", "learn advanced calculus", "master linear transformations"
];

export default function HomeTopicSearch({ onSearch }) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const [topicIndex, setTopicIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentTopic = ALL_TOPICS[topicIndex];

  useEffect(() => {
    if (isFocused || query.length > 0) return;

    let timeoutId;
    
    // We handle state updates inside the timeout so the re-render doesn't cancel the pause
    if (!isDeleting && charIndex === currentTopic.length) {
      timeoutId = setTimeout(() => setIsDeleting(true), 1500); // Wait 1.5s at end of word
    } else if (isDeleting && charIndex === 0) {
      timeoutId = setTimeout(() => {
        setIsDeleting(false);
        setTopicIndex((prev) => (prev + 1) % ALL_TOPICS.length);
      }, 500); // Wait 0.5s before next word
    } else {
      const speed = isDeleting ? 30 : 80;
      timeoutId = setTimeout(() => {
        setCharIndex((prev) => prev + (isDeleting ? -1 : 1));
      }, speed);
    }

    return () => clearTimeout(timeoutId);
  }, [charIndex, isDeleting, isFocused, query, topicIndex, currentTopic.length]);

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    onSearch(e.target.value);
  };

  return (
    <div data-tour="home-search" className="w-full max-w-3xl flex flex-col items-start my-6">
      <form onSubmit={(e) => e.preventDefault()} className="relative w-full group">
        <div className="relative p-[3px] rounded-[2rem] bg-gradient-to-r from-indigo-500/30 via-fuchsia-500/30 to-cyan-500/30 hover:from-indigo-500/50 hover:via-fuchsia-500/50 hover:to-cyan-500/50 transition-all duration-500 shadow-lg hover:shadow-[0_0_40px_rgba(139,92,246,0.3)]">
          <div className="relative w-full bg-white/90 dark:bg-slate-900/90 rounded-[29px] backdrop-blur-xl">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none z-10">
              <Search className="h-6 w-6 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            
            {!query && !isFocused && (
              <div className="absolute inset-y-0 left-14 flex items-center pointer-events-none z-10">
                <span className="text-slate-500 dark:text-slate-400 text-xl font-medium">{currentTopic.substring(0, charIndex)}</span>
                <span className="text-indigo-500 dark:text-indigo-400 text-xl font-medium animate-[pulse_0.8s_ease-in-out_infinite] ml-0.5">|</span>
              </div>
            )}

            <input
              type="text"
              aria-label="Search courses, labs and games"
              value={query}
              onChange={handleInputChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={isFocused ? "Search the universe..." : ""}
              className="relative w-full pl-14 pr-14 py-5 text-xl font-medium bg-transparent rounded-[29px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  onSearch('');
                }}
                aria-label="Clear search"
                className="absolute inset-y-0 right-5 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors z-10"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
