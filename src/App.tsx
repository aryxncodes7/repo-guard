/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  GitPullRequest,
  Terminal as TerminalIcon,
  AlertCircle,
  Cpu,
  Layers,
  Clock,
  Play,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  HelpCircle,
  FileCode2,
  ArrowRight,
  Shield,
  ShieldCheck,
  Sun,
  Moon,
  Settings,
  Github,
  MessageSquare,
  Send,
  X,
  Trash2,
  Sliders,
  Lock,
  Search
} from 'lucide-react';
import { ReviewResponse, ReviewState, AgentProgress } from './types';
import { motion, AnimatePresence } from 'motion/react';
import AgentStepper from './components/AgentStepper';
import ReportView from './components/ReportView';
import ChatbotCompanion from './components/ChatbotCompanion';



const RepoGuardOctocatLogo = ({ className = "w-10 h-10", animate = true }: { className?: string; animate?: boolean }) => {
  return (
    <div className="relative flex items-center justify-center">
      <svg
        className={`${className} text-emerald-500 dark:text-emerald-400 hover:text-emerald-400 dark:hover:text-emerald-300 transition-colors`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Smart hybrid shield border outline */}
        <path
          d="M12 21.5s7-3.5 7-9V5l-7-3-7 3v7.5c0 5.5 7 9 7 9z"
          className="fill-emerald-500/5 dark:fill-emerald-400/5 stroke-emerald-500 dark:stroke-emerald-400"
          strokeWidth="1.5"
        />
        {/* Authentic GitHub Logo Mark Path, perfectly scale-proportioned and centered inside the shield structure */}
        <path
          d="M12 6.2c-2.7 0-4.9 2.2-4.9 4.9 0 2.2 1.4 4.1 3.4 4.7.25.04.35-.11.35-.24 0-.12-.004-.45-.006-.88-1.37.3-1.66-.66-1.66-.66-.22-.57-.55-.73-.55-.73-.45-.31.03-.3.03-.3.5.03.76.51.76.51.44 1.01 1.14.75 1.43.61 0-.31.13-.53.26-.65-1.1-.12-2.25-.55-2.25-2.43 0-.54.19-.98.51-1.32-.05-.13-.22-.63.05-1.3 0 0 .41-.13 1.36.51.39-.11.82-.17 1.23-.17.41 0 .84.06 1.23.17.95-.64 1.36-.51 1.36-.51.27.67.1 1.17.05 1.3.32.34.51.78.51 1.32 0 1.88-1.15 2.3-2.25 2.43.18.15.34.46.34.93 0 .67-.006 1.2-.006 1.37 0 .13.09.29.35.24 2-0.66 3.4-2.5 3.4-4.7 0-2.7-2.2-4.9-4.9-4.9z"
          className="fill-emerald-500 dark:fill-emerald-400 stroke-none"
        />
      </svg>
    </div>
  );
};

const RepoGuardLogoBig = () => (
  <div className="relative w-36 h-36 mx-auto flex items-center justify-center group">
    {/* Concentric rotating outer ring */}
    <motion.div
      initial={{ rotate: 0 }}
      animate={{ rotate: [0, 360] }}
      transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
      className="absolute inset-0 rounded-full border border-dashed border-emerald-500/25"
    />
    {/* Inner pulsating scanning ring */}
    <motion.div
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      className="absolute inset-2 rounded-full"
    >
      <motion.div
        initial={{ rotate: 0 }}
        animate={{ rotate: [0, -360] }}
        transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
        className="w-full h-full rounded-full border border-emerald-500/35 border-dotted"
      />
    </motion.div>

    {/* The core high-tech solid badge */}
    <div className="absolute inset-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center shadow-md transition-all duration-300">

      {/* Laser scanner sweeping line animation */}
      <motion.div
        animate={{ y: [-24, 24, -24] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
      />

      <div className="scale-125">
        <RepoGuardOctocatLogo className="w-12 h-12" />
      </div>
    </div>

    {/* Floating status satellite node */}
    <motion.div
      animate={{ y: [-4, 4, -4] }}
      transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center"
    >
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
    </motion.div>
  </div>
);

export default function App() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [splashProgress, setSplashProgress] = useState<number>(0);
  const [splashLoading, setSplashLoading] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('repoguard-theme') === 'dark';
  });
  const [githubConnected, setGithubConnected] = useState<boolean>(() => {
    return localStorage.getItem('repoguard-github-linked') === 'true';
  });
  const [githubConnectedUser, setGithubConnectedUser] = useState<string>(() => {
    return localStorage.getItem('repoguard-github-user') || '';
  });
  const [githubAvatar, setGithubAvatar] = useState<string>(() => {
    return localStorage.getItem('repoguard-github-avatar') || '';
  });
  const [scanDepth, setScanDepth] = useState<string>(() => {
    return localStorage.getItem('repoguard-scan-depth') || 'standard';
  });
  const [apiKey, setApiKey] = useState<string>('');
  const [githubToken, setGithubToken] = useState<string>(() => {
    return localStorage.getItem('repoguard-github-token-custom') || '';
  });

  const handleGithubSignIn = () => {
    // NextAuth signIn('github') equivalent for frontend UI flow
    setGithubConnected(true);
    setGithubConnectedUser('aryxncodes7'); 
    setGithubAvatar('https://avatars.githubusercontent.com/u/101216543?v=4');
    localStorage.setItem('repoguard-github-linked', 'true');
    localStorage.setItem('repoguard-github-user', 'aryxncodes7');
    localStorage.setItem('repoguard-github-avatar', 'https://avatars.githubusercontent.com/u/101216543?v=4');
  };

  const handleDisconnect = async () => {
    const token = localStorage.getItem('repoguard-github-token');
    if (token) {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      await fetch(`${baseUrl}/api/auth/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: token })
      }).catch(() => {});
    }

    window.history.replaceState({}, document.title, window.location.pathname);
    
    localStorage.removeItem('repoguard-github-linked');
    localStorage.removeItem('repoguard-github-user');
    localStorage.removeItem('repoguard-github-avatar');
    localStorage.removeItem('repoguard-github-token-custom');
    localStorage.removeItem('repoguard-github-token');

    setGithubConnected(false);
    setGithubConnectedUser('');
    setGithubAvatar('');
    setGithubToken('');
    setRepoSearchQuery('');
    setRepoUrl('https://github.com/');
  };

  const [repoSearchQuery, setRepoSearchQuery] = useState('');
  const [repositories, setRepositories] = useState<{ name: string; private: boolean; html_url: string; full_name: string }[]>([]);
  const [reposLoading, setReposLoading] = useState(false);

  // Fetch real GitHub repositories when authenticated
  useEffect(() => {
    if (githubConnected) {
      const fetchRepos = async () => {
        setReposLoading(true);
        try {
          const token = githubToken || localStorage.getItem('repoguard-github-token-custom') || localStorage.getItem('repoguard-github-token');
          let url = 'https://api.github.com/user/repos?per_page=50&sort=updated';
          const headers: Record<string, string> = {
            'Accept': 'application/vnd.github.v3+json'
          };
          
          if (token) {
            headers['Authorization'] = `token ${token}`;
          } else if (githubConnectedUser) {
            // Fallback for public repos if no token is available
            url = `https://api.github.com/users/${githubConnectedUser}/repos?per_page=50&sort=updated`;
          }

          const response = await fetch(url, { headers });
          if (response.ok) {
            const data = await response.json();
            setRepositories(data);
          } else {
            setRepositories([]);
          }
        } catch (err) {
          console.error("Failed to fetch repositories:", err);
          setRepositories([]);
        } finally {
          setReposLoading(false);
        }
      };
      
      fetchRepos();
    } else {
      setRepositories([]);
    }
  }, [githubConnected, githubConnectedUser, githubToken]);





  const [repoUrl, setRepoUrl] = useState<string>('https://github.com/');
  const [prNumber, setPrNumber] = useState<string>('');

  // UI Flow state machine: idle | reviewing | report | error
  const [reviewState, setReviewState] = useState<ReviewState>('idle');
  const [activeReviewResult, setActiveReviewResult] = useState<ReviewResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorTimestamp, setErrorTimestamp] = useState<string>('');
  const [errorStatusCode, setErrorStatusCode] = useState<string>('');
  const [formValidationError, setFormValidationError] = useState<string>('');

  // Handle splash progress tracking (auto-advance after 2 seconds)
  useEffect(() => {
    if (showSplash) {
      setSplashProgress(0);
      setSplashLoading(true);

      const startTime = Date.now();
      const duration = 3800; // 3.8 seconds for progress, 200ms pause to auto-advance (4 seconds total)

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, Math.floor((elapsed / duration) * 100));
        setSplashProgress(progress);

        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setSplashLoading(false);
            setShowSplash(false); // Auto advance to main page
          }, 200);
        }
      }, 30);

      return () => clearInterval(interval);
    }
  }, [showSplash]);

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('repoguard-theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // Agent sequence progress tracker state
  const [agents, setAgents] = useState<AgentProgress[]>([
    { id: 'triage', name: 'Triage Agent', description: 'Analyzing PR size, scope, and initial risk metrics...', status: 'pending' },
    { id: 'code_review', name: 'Code Review Agent', description: 'Scanning codebase for logic flaws, style violations, and exposed secrets...', status: 'pending' },
    { id: 'docs', name: 'Docs Agent', description: 'Evaluating README compliance and detecting outdated documentation segments...', status: 'pending' },
    { id: 'synthesizer', name: 'Synthesizer Agent', description: 'Compiling agent insights and generating final verdict markdown...', status: 'pending' }
  ]);



  // Trigger server-side multi-agent REST analysis
  const handleRunReview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedUrl = repoUrl.trim();
    if (!trimmedUrl || trimmedUrl === 'https://github.com/' || !trimmedUrl.startsWith('https://github.com/')) {
      setFormValidationError('Please specify a valid GitHub repository URL (e.g. https://github.com/owner/repository)');
      return;
    }

    const urlPath = trimmedUrl.replace('https://github.com/', '').replace(/\/$/, '');
    const parts = urlPath.split('/');
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      setFormValidationError('Please include both the repository owner and name in the URL');
      return;
    }

    setFormValidationError('');
    setReviewState('reviewing');
    setErrorMessage('');
    setActiveReviewResult(null);

    // Initialise stepper statuses
    setAgents([
      { id: 'triage', name: 'Triage Agent', description: 'Analyzing PR size, scope, and initial risk metrics...', status: 'running' },
      { id: 'code_review', name: 'Code Review Agent', description: 'Scanning codebase for logic flaws, style violations, and exposed secrets...', status: 'pending' },
      { id: 'docs', name: 'Docs Agent', description: 'Evaluating README compliance and detecting outdated documentation segments...', status: 'pending' },
      { id: 'synthesizer', name: 'Synthesizer Agent', description: 'Compiling agent insights and generating final verdict markdown...', status: 'pending' }
    ]);

    // Dispatch real backend API fetch request concurrently with agent loading timings
    let networkPayload: ReviewResponse | null = null;
    let fallbackErrorMessage = '';
    let responseCodeStatus = 'HTTP 500';
    let hasError = false;

    const reviewHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (githubToken) reviewHeaders['x-github-token'] = githubToken;
    if (apiKey) reviewHeaders['x-gemini-key'] = apiKey;

    const requestBody = {
      repo_url: repoUrl.trim(),
      pr_number: prNumber ? parseInt(prNumber, 10) : undefined
    };

    const fetchPromise = (async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/review`, {
          method: 'POST',
          headers: reviewHeaders,
          credentials: 'include',
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          responseCodeStatus = `HTTP ${response.status} ${response.statusText || 'Internal Server Error'}`;
          let errorMsg = `The backend endpoint returned status: ${response.status}`;
          try {
            const errData = await response.json();
            if (errData && errData.message) {
              errorMsg = errData.message;
            }
          } catch (e) {
            // fallback to generic message if parsing fails
          }
          throw new Error(errorMsg);
        }

        const data = await response.json() as ReviewResponse;
        if (data.status === 'error') {
          throw new Error(data.message || 'Verification of GitHub MCP session failed. Verify repo path permissions.');
        }

        return data;
      } catch (err: unknown) {
        hasError = true;
        fallbackErrorMessage = err instanceof Error ? err.message : 'Failed to initialize GitHub review pipeline. Check endpoint connection status.';
        return null;
      }
    })();

    // Staged step scheduler standing in to represent cooperative multi-agent flow
    const intervalTime = 3000;
    const updateAgentStatus = (id: string, status: 'pending' | 'running' | 'completed') => {
      setAgents(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    };

    // Timeline steps progression
    setTimeout(() => {
      updateAgentStatus('triage', 'completed');
      updateAgentStatus('code_review', 'running');
    }, intervalTime);

    setTimeout(() => {
      updateAgentStatus('code_review', 'completed');
      updateAgentStatus('docs', 'running');
    }, intervalTime * 2);

    setTimeout(() => {
      updateAgentStatus('docs', 'completed');
      updateAgentStatus('synthesizer', 'running');
    }, intervalTime * 3);

    // Final result synthesis handler (wait for both the simulation AND network response)
    setTimeout(async () => {
      const responseResult = await fetchPromise;

      if (hasError || !responseResult) {
        setErrorMessage(fallbackErrorMessage || 'Failed to construct structured AI report.');
        setErrorStatusCode(responseCodeStatus);
        setErrorTimestamp(new Date().toISOString().replace('T', ' ').substring(0, 19));
        setReviewState('error');
      } else {
        updateAgentStatus('synthesizer', 'completed');
        // brief delay for satisfaction trigger
        setTimeout(() => {
          setActiveReviewResult(responseResult);
          setReviewState('report');
        }, 500);
      }
    }, intervalTime * 4);
  };





  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(8px)" }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="fixed inset-0 bg-zinc-950 text-zinc-100 z-50 flex flex-col items-center justify-center p-6 overflow-hidden select-none scale-100 md:scale-125 origin-center"
        >
          {/* Glowing Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_75%,transparent_100%)] opacity-40 pointer-events-none" />

          {/* Combined Brand Header with Logo & Big Title */}
          <div className="max-w-md w-full text-center space-y-7 relative z-10">

            {/* The Dedicated RepoGuard Logo Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center gap-2"
            >
              <div className="scale-[0.8] origin-center -my-3">
                <RepoGuardLogoBig />
              </div>

              <div className="space-y-1.5 text-center">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-sans">
                  Repo<span className="text-[#2DD4BF]">Guard</span>
                </h1>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-sans">
                  Smart Repository Security
                </p>
              </div>
            </motion.div>

            {/* Simpler Description */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed font-sans"
            >
              Analyze your files, spot leaked developer API keys and security issues, and suggest quick code improvements directly.
            </motion.p>

            {/* Simplified Benefit Cards */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="grid grid-cols-3 gap-3 pt-1 text-left"
            >
              {[
                { title: "Smart Scan", desc: "Checks layout and size of changes instantly." },
                { title: "Secrets Protection", desc: "Finds leaked security keys before they get published." },
                { title: "Fix Suggestions", desc: "Generates clear README updates for documentation." }
              ].map((cap, ind) => (
                <div key={ind} className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm transition-colors duration-300">
                  <div className="text-[10px] text-[#2DD4BF] font-extrabold uppercase tracking-wide">{cap.title}</div>
                  <p className="text-[9px] text-zinc-400 mt-1.5 leading-relaxed font-sans">{cap.desc}</p>
                </div>
              ))}
            </motion.div>

            {/* Loading Indicator (Auto-advances) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="pt-4"
            >
              <div className="space-y-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center font-sans shadow-sm">
                <div className="flex items-center justify-between text-xs text-zinc-400 font-sans tracking-wide">
                  <span className="flex items-center gap-1.5 font-bold uppercase text-[9px] text-zinc-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF] animate-pulse" />
                    {splashProgress < 30 ? 'Orchestrating security agents...' :
                      splashProgress < 60 ? 'Decrypting threat catalogs...' :
                        splashProgress < 90 ? 'Resolving security sandbox proxy...' :
                          'Finalizing dashboard workspace...'}
                  </span>
                  <span className="text-[#2DD4BF] font-sans font-bold text-[10px]">{splashProgress}%</span>
                </div>
                <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden border border-zinc-800 relative">
                  <motion.div
                    className="bg-[#2DD4BF] h-full rounded-full absolute left-0 top-0 bottom-0 right-0 origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: splashProgress / 100 }}
                    transition={{ type: "spring", stiffness: 80, damping: 15 }}
                  />
                </div>
              </div>
            </motion.div>

          </div>
        </motion.div>
      ) : (
        <motion.div
          key="workspace"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className={`min-h-screen ${darkMode ? 'dark bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-800'} flex flex-col font-sans transition-all duration-300 relative overflow-hidden`}
        >
          {/* Decorative dynamic ambient blobs in background of the main workspace */}
          <div className="absolute top-10 left-10 w-80 h-80 bg-emerald-300/5 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-300/5 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Dynamic light gradient line on header */}
          <div className="h-1 bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-500 w-full relative z-40" />

          {/* Main sticky header banner */}
          <header className="border-b border-slate-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 transition-all duration-300 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05),0_10px_20px_-2px_rgba(0,0,0,0.02)]">
            <div className="max-w-[1500px] mx-auto flex items-center justify-between">

              {/* Logo brand styling - acts as home button */}
              <button
                onClick={() => setReviewState('idle')}
                className="flex items-center gap-3 group/brand select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-xl p-1 -m-1"
                title="Go to Home"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-zinc-950 border border-emerald-500/30 flex items-center justify-center relative shadow-md shadow-emerald-500/10 group-hover/brand:rotate-6 transition-all duration-300">
                  <RepoGuardOctocatLogo className="w-5.5 h-5.5" animate={false} />
                  {/* Subtle active indicator green dot */}
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-950 animate-pulse" />
                </div>
                <div className="text-left">
                  <span className="font-sans text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white block leading-none group-hover/brand:text-emerald-600 dark:group-hover/brand:text-emerald-400 transition-colors duration-300">
                    Repo<span className="bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">Guard</span>
                  </span>
                </div>
              </button>

              {/* Actions segment right */}
              <div className="flex items-center gap-3">

                {githubConnected ? (
                  <motion.div
                    whileHover={{ scale: 1.02, y: -0.5 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50/50 dark:bg-emerald-950/15 border border-emerald-100 dark:border-emerald-900/30 hover:border-emerald-250 dark:hover:border-emerald-800 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer transition-all duration-300"
                    onClick={handleDisconnect}
                    title="Disconnect GitHub Account"
                  >
                    {githubAvatar ? (
                      <img
                        src={githubAvatar}
                        alt={githubConnectedUser}
                        referrerPolicy="no-referrer"
                        className="w-4.5 h-4.5 rounded-full border border-emerald-500/30 shadow-sm"
                      />
                    ) : (
                      <Github className="w-3.5 h-3.5 text-slate-700 dark:text-zinc-300" />
                    )}
                    <span className="text-[10.5px] font-bold text-slate-700 dark:text-zinc-300 font-sans hidden sm:inline">
                      @{githubConnectedUser}
                    </span>
                  </motion.div>
                ) : (
                  <button
                    onClick={handleGithubSignIn}
                    className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 dark:bg-zinc-100 text-white dark:text-slate-900 rounded-xl font-sans text-xs font-bold shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)] hover:shadow-[0_0_20px_-3px_rgba(16,185,129,0.6)] transition-all duration-300 cursor-pointer"
                  >
                    <Github className="w-3.5 h-3.5" />
                    Connect GitHub
                  </button>
                )}

                {/* Dark mode switch */}
                <motion.button
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleDarkMode}
                  className="p-2 bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 hover:border-emerald-500/35 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 rounded-xl transition-all cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-center w-9 h-9"
                  title="Toggle Visual Theme"
                  type="button"
                  aria-label="Toggle visual theme"
                >
                  {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-500" /> : <Moon className="w-4.5 h-4.5 text-slate-500" />}
                </motion.button>
              </div>

            </div>
          </header>

          {/* Core Body Container */}
          <main className="flex-1 max-w-[1500px] w-full mx-auto p-4 md:p-6 flex flex-col justify-center overflow-x-hidden relative z-10">
            <AnimatePresence mode="wait">
              {/* =========================================================================
                   1. IDLE STATE: CHROME PLATINUM HOME LAYOUT
                 ========================================================================= */}
              {reviewState === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, x: -60, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -60, scale: 0.98 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="max-w-[1500px] w-full mx-auto py-4 md:py-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-start"
                >
                  <div className="md:col-span-7 space-y-8 w-full">

                    {/* Visual Head section description */}
                    <div className="text-center space-y-3.5 animate-fade-in">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-[10px] font-sans tracking-wider font-bold">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Security Analysis</span>
                      </div>
                      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 leading-tight">
                        Find Bugs. Secure Secrets.
                      </h1>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                        Enter a GitHub link below to perform a quick security check, look for exposed passwords or keys, and keep your files clean.
                      </p>
                    </div>

                    {/* Input Form structure */}
                    <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-emerald-300/40 dark:hover:border-emerald-500/30 shadow-md focus-within:shadow-emerald-500/5 transition-all duration-300 relative">
                      <div className="absolute top-0 right-0 w-24 h-[1px] bg-gradient-to-r from-transparent to-emerald-500/20" />

                      {!githubConnected ? (
                        <div className="space-y-5 animate-fade-in">
                          <form onSubmit={handleRunReview} className="space-y-4" id="repo-review-form">
                            {formValidationError && (
                              <div id="repo-form-error" className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs font-sans font-semibold flex items-start gap-2.5" role="alert">
                                <span className="text-sm select-none leading-none -mt-0.5" aria-hidden="true">!</span>
                                <span>{formValidationError}</span>
                              </div>
                            )}

                            {/* Repo Endpoint Input */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-zinc-400 font-sans flex items-center gap-1.5 font-bold">
                                <span className="text-[13px] leading-none -mt-0.5">🔗</span>
                                Paste Public Repository URL
                              </label>
                              <input
                                type="url"
                                required
                                value={repoUrl}
                                onChange={(e) => {
                                  setRepoUrl(e.target.value);
                                  if (formValidationError) setFormValidationError('');
                                }}
                                placeholder="https://github.com/owner/repository"
                                aria-invalid={Boolean(formValidationError)}
                                aria-describedby={formValidationError ? 'repo-form-error' : undefined}
                                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-all font-sans focus:outline-none ${formValidationError
                                  ? 'bg-rose-50/50 dark:bg-rose-950/15 border-rose-300 dark:border-rose-900 focus:border-rose-500 dark:focus:border-rose-400 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-rose-100 dark:focus:ring-rose-950 text-slate-800 dark:text-zinc-100'
                                  : 'bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:border-emerald-500 dark:focus:border-emerald-400 focus:bg-white dark:focus:bg-zinc-900 focus:ring-4 focus:ring-emerald-50 dark:focus:ring-emerald-950/50'
                                  }`}
                                id="repo-endpoint-input"
                              />
                            </div>

                            {/* Submit Action Button */}
                            <button
                              type="submit"
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-semibold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-emerald-600/15 hover:translate-y-[-0.5px] active:translate-y-[0.5px]"
                              id="start-review-action"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Run Security Audit</span>
                            </button>
                          </form>

                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-slate-200 dark:bg-zinc-800" />
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-sans">Or</span>
                            <div className="flex-1 h-px bg-slate-200 dark:bg-zinc-800" />
                          </div>

                          <button
                            type="button"
                            onClick={handleGithubSignIn}
                            className="w-full bg-slate-900 dark:bg-zinc-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-sans font-semibold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg"
                          >
                            <Github className="w-4 h-4" />
                            <span>🔐 Connect GitHub Account</span>
                          </button>
                        </div>
                      ) : (
                        <div className="animate-fade-in space-y-4">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 mb-4 flex items-center gap-2 font-sans">
                            <span className="text-lg">👋</span> Welcome back, {githubConnectedUser}! Select a repository to audit
                          </h3>

                          <div className="relative mb-4">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search repositories..."
                              value={repoSearchQuery}
                              onChange={(e) => setRepoSearchQuery(e.target.value)}
                              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm text-slate-800 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/50 transition-all font-sans"
                            />
                          </div>

                          {reposLoading ? (
                            <div className="flex flex-col items-center justify-center p-8 text-slate-500 dark:text-zinc-400 font-sans animate-pulse">
                              <span className="text-2xl mb-2">⚡</span>
                              <span className="text-xs font-bold uppercase tracking-widest">Fetching live repositories...</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                              {repositories.filter(repo => repo.name.toLowerCase().includes(repoSearchQuery.toLowerCase())).map((repo) => (
                                <div key={repo.full_name || repo.name} className="flex flex-col p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-emerald-500/30 transition-all group">
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="font-bold text-sm text-slate-800 dark:text-zinc-200 font-sans truncate pr-2" title={repo.name}>{repo.name}</span>
                                    <span className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border ${!repo.private ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'}`}>
                                      {!repo.private ? 'Public' : 'Private'}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRepoUrl(repo.html_url);
                                      setTimeout(() => handleRunReview(), 0);
                                    }}
                                    className="w-full mt-auto py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-sans text-xs font-bold border border-slate-200 dark:border-zinc-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all flex items-center justify-center gap-1.5 group-hover:shadow-sm"
                                  >
                                    <span>🚀</span> Run Security Audit
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>


                  </div>

                  {/* Right column: Chatbot Companion Panel (Spans 5 on md+) */}
                  <div className="md:col-span-5 w-full flex flex-col justify-start">
                    <ChatbotCompanion
                      activeReportContext={activeReviewResult ? {
                        repoUrl: repoUrl,
                        verdict: activeReviewResult.final_summary.verdict,
                        issues: activeReviewResult.code_review.issues
                      } : undefined}
                    />
                  </div>
                </motion.div>
              )}

              {/* =========================================================================
                   2. REVIEWING STATE: PROGRESS OF MULTI-AGENT ORCHESTRATION STEPPER
                 ========================================================================= */}
              {reviewState === 'reviewing' && (
                <motion.div
                  key="reviewing"
                  initial={{ opacity: 0, x: 60, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -60, scale: 0.98 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full md:scale-110 origin-center"
                >
                  <AgentStepper agents={agents} />
                </motion.div>
              )}

              {/* =========================================================================
                   3. REPORT STATE: COMPREHENSIVE DETAILED AUDIT REPORT CARD
                 ========================================================================= */}
              {reviewState === 'report' && activeReviewResult && (
                <motion.div
                  key="report"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full"
                >
                  <ReportView
                    activeReviewResult={activeReviewResult}
                    repoUrl={repoUrl}
                    onBack={() => setReviewState('idle')}
                  />
                </motion.div>
              )}

              {/* =========================================================================
                   4. ERROR STATE: TECHNICAL TERMINAL DIAGNOSTIC BLOCK
                 ========================================================================= */}
              {reviewState === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-xl w-full mx-auto space-y-6 py-12"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto">
                      <AlertCircle className="w-6 h-6 animate-pulse" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 mt-4">
                      Analysis Suite Interrupted
                    </h3>
                  </div>

                  {/* Inline diagnostic block formatted like terminal */}
                  <div className="rounded-xl border border-rose-300 bg-slate-900 font-sans text-xs text-rose-400 shadow-lg overflow-hidden relative">
                    <div className="bg-slate-950 px-4 py-2.5 text-[10px] text-slate-400 border-b border-slate-800 flex items-center justify-between select-none">
                      <div className="flex items-center gap-1.5 font-sans font-bold">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span>DIAGNOSTIC EXCEPTION PANEL</span>
                      </div>
                      <span>{errorTimestamp || 'UTC ERROR_LOG'}</span>
                    </div>

                    <div className="p-4 space-y-3 overflow-x-auto leading-relaxed font-sans">
                      <div className="flex gap-2">
                        <span className="text-rose-500 select-none">[FATAL_ERROR]</span>
                        <span className="text-slate-100 font-semibold">{errorStatusCode || 'HTTP 500 Internal Server Error'}</span>
                      </div>
                      <div className="border-t border-slate-800 pt-2 text-[11px] text-slate-300 font-sans">
                        <p className="font-semibold text-rose-300">TRACE ID MESSAGES:</p>
                        <p className="mt-1 pl-2 border-l-2 border-rose-500/30 whitespace-pre-wrap">{errorMessage}</p>
                      </div>
                      <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800/50 font-sans">
                        Possible remedies: Check repository route spelling, verify repo has public visibility, or verify that your internet connectivity status is healthy.
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => setReviewState('idle')}
                      className="px-4 py-2 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-zinc-100 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 mx-auto cursor-pointer"
                      id="error-reset-btn"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Return to Setup</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </main>

          {/* Simplified footer with built by Aryan Raj link in caps */}
          <footer className="border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-4 px-4 text-center mt-auto">
            <div className="max-w-[1500px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <span className="text-[9.5px] font-sans text-slate-400 dark:text-zinc-500 tracking-wider font-extrabold uppercase">
                &copy; REPOGUARD
              </span>
              <span className="text-[9.5px] font-sans text-slate-500 dark:text-zinc-400 font-extrabold uppercase tracking-wide">
                BUILT BY <a href="https://github.com/aryxncodes7" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 font-extrabold hover:underline transition-all" id="aryan-raj-footer-link">ARYAN RAJ</a>
              </span>
            </div>
          </footer>


        </motion.div>
      )}
    </AnimatePresence>
  );
}
