import React, { useState, useEffect } from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User 
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  increment,
  onSnapshot
} from "firebase/firestore";
import { auth, db } from "@/src/lib/firebase";
import { BackgroundPaths } from "@/src/components/BackgroundPaths";
import { PromptInputBox } from "@/src/components/PromptInputBox";
import { Button } from "@/src/components/ui/button";
import { MetalButton } from "@/src/components/ui/MetalButton";
import { LiquidButton } from "@/src/components/ui/LiquidButton";
import VaporizeTextCycle from "@/src/components/VaporizeTextCycle";
import { Shield, Code, Zap, LogOut, ExternalLink, Copy, Check, Terminal, BrainCircuit, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewScript, setViewScript] = useState<string | null>(null);
  const [createdLinks, setCreatedLinks] = useState<any[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [mode, setMode] = useState<"obfuscate" | "generate">("obfuscate");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) fetchUserLinks(u.uid);
    });

    const params = new URLSearchParams(window.location.search);
    const scriptId = params.get("script");
    if (scriptId) setViewScript(scriptId);

    return () => unsubscribe();
  }, []);

  const fetchUserLinks = async (uid: string) => {
    const path = "scripts";
    try {
      const q = query(collection(db, path), where("creatorId", "==", uid));
      const querySnapshot = await getDocs(q);
      const links = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCreatedLinks(links);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  };

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  const handleAction = async (input: string) => {
    if (!user) return login();
    setIsProcessing(true);
    const path = "scripts";
    try {
      let finalCode = "";
      let title = "Untitled Script";

      if (mode === "generate") {
        // AI Generation
        const genRes = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: input })
        });
        const genData = await genRes.json();
        if (genData.error) throw new Error(genData.error);
        
        // Then Obfuscate the generated code
        const obRes = await fetch("/api/obfuscate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: genData.code })
        });
        const obData = await obRes.json();
        finalCode = obData.obfuscated;
        title = input.slice(0, 30) + "... (AI)";
      } else {
        // Direct Obfuscation
        const res = await fetch("/api/obfuscate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: input })
        });
        const data = await res.json();
        finalCode = data.obfuscated;
        title = "Obfuscated Script";
      }
      
      const codeId = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      
      await addDoc(collection(db, path), {
        creatorId: user.uid,
        title: title,
        luaCode: finalCode,
        codeId: codeId,
        createdAt: serverTimestamp(),
        views: 0
      });

      fetchUserLinks(user.uid);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return null;

  // Viewer Mode
  if (viewScript) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <Shield className="w-16 h-16 text-blue-500 mb-6 animate-pulse" />
        <h1 className="text-4xl font-bold mb-4 font-mono tracking-tighter">PENX SECURITY</h1>
        <div className="bg-neutral-900/50 border border-neutral-800 p-8 rounded-2xl max-w-lg backdrop-blur-xl">
          <p className="text-neutral-400 mb-8 leading-relaxed">
            This code is highly obfuscated and protected by PenX protocols. Access is restricted to authorized environments only.
          </p>
          <div className="flex flex-col gap-4">
            <LiquidButton onClick={() => window.location.href = "/"}>
               Return to Dashboard
            </LiquidButton>
            <p className="text-xs text-neutral-600">ID: {viewScript}</p>
          </div>
        </div>
      </div>
    );
  }

  // Marketing / Dashboard
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 overflow-x-hidden">
      {!user ? (
        <BackgroundPaths title="PenX Obfuscator">
          <div className="mt-8 flex flex-col items-center">
             <VaporizeTextCycle texts={["Secure", "Invisible", "Robust", "Roblox", "AI-Powered"]} />
             <p className="text-neutral-500 max-w-md mx-auto mb-10 mt-4 leading-relaxed">
               The ultimate script delivery platform for Roblox developers. 
               Now with AI script generation and robust obfuscation.
             </p>
             <MetalButton variant="primary" onClick={login}>
                Get Started with Google
             </MetalButton>
          </div>
        </BackgroundPaths>
      ) : (
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Shield className="text-white w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">PenX Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
               <span className="text-sm text-neutral-500 hidden sm:inline">{user.email}</span>
               <Button variant="ghost" size="icon" onClick={() => signOut(auth)}>
                 <LogOut className="w-5 h-5" />
               </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Creator Column */}
            <div className="lg:col-span-2 space-y-8">
              <section className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 p-8 rounded-3xl shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                  <div className="flex items-center gap-2">
                    {mode === "obfuscate" ? <Code className="w-5 h-5 text-blue-500" /> : <Sparkles className="w-5 h-5 text-purple-500" />}
                    <h2 className="text-xl font-semibold capitalize">{mode} Script</h2>
                  </div>
                  <div className="flex bg-neutral-200 dark:bg-neutral-800 p-1 rounded-xl">
                    <button 
                      onClick={() => setMode("obfuscate")}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                        mode === "obfuscate" ? "bg-white dark:bg-neutral-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                      )}
                    >
                      Obfuscator
                    </button>
                    <button 
                      onClick={() => setMode("generate")}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                        mode === "generate" ? "bg-white dark:bg-neutral-700 shadow-sm text-purple-600 dark:text-purple-400" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                      )}
                    >
                      AI Maker
                    </button>
                  </div>
                </div>

                <PromptInputBox 
                  onSend={handleAction} 
                  isLoading={isProcessing} 
                  placeholder={mode === "obfuscate" ? "Paste your raw Lua code here..." : "Describe the script you want to build (e.g., 'A simple fly script for local players')..."}
                />
                
                <p className="text-xs text-neutral-500 mt-4 italic">
                  {mode === "obfuscate" 
                    ? "Scripts are automatically obfuscated and wrapped for Roblox loadstring usage."
                    : "Gemini will generate the script, then PenX will obfuscate it for secure delivery."}
                </p>
              </section>

              {/* History */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                   <Zap className="w-5 h-5 text-amber-500" />
                   <h2 className="text-xl font-semibold">Recent Scripts</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AnimatePresence>
                    {createdLinks.map((link) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={link.id}
                        className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-5 rounded-2xl hover:border-blue-500/30 transition-all shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-mono text-[10px] text-neutral-400">ID: {link.codeId.substring(0, 8)}...</div>
                          {link.title.includes("(AI)") && <Sparkles className="w-3 h-3 text-purple-500" />}
                        </div>
                        <h3 className="font-semibold mb-4 text-neutral-800 dark:text-neutral-200 line-clamp-1">{link.title}</h3>
                        <div className="flex items-center gap-2 mt-auto">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => copyToClipboard(window.location.origin + "/s/" + link.codeId)}
                          >
                            {copied === (window.location.origin + "/s/" + link.codeId) ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            <span className="ml-2">Link</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => copyToClipboard(`loadstring(game:HttpGet("${window.location.origin}/s/${link.codeId}"))()`)}
                          >
                            {copied === (`loadstring(game:HttpGet("${window.location.origin}/s/${link.codeId}"))()`) ? <Check className="w-4 h-4" /> : <Terminal className="w-4 h-4" />}
                            <span className="ml-2">Code</span>
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            </div>

            {/* Sidebar / Stats */}
            <div className="space-y-8">
               <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-white">
                  <h3 className="text-lg font-bold mb-2">Pro Stats</h3>
                  <p className="text-blue-100 mb-6 text-sm">Real-time usage tracking for all your script distributions.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                      <div className="text-2xl font-bold">{createdLinks.length}</div>
                      <div className="text-[10px] uppercase opacity-70">Scripts</div>
                    </div>
                    <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                      <div className="text-2xl font-bold">{createdLinks.reduce((acc, l) => acc + (l.views || 0), 0)}</div>
                      <div className="text-[10px] uppercase opacity-70">Fetches</div>
                    </div>
                  </div>
               </div>

               <div className="p-6 bg-neutral-100 dark:bg-neutral-900 rounded-3xl">
                  <h4 className="font-bold mb-4 flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-purple-500" />
                    AI Maker Active
                  </h4>
                  <ul className="text-xs text-neutral-500 space-y-3">
                    <li className="flex items-start gap-2">
                      <div className="bg-purple-500 w-1 h-1 rounded-full mt-1.5" />
                      Gemini 3.1 Pro engine for advanced Lua logic generation.
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="bg-purple-500 w-1 h-1 rounded-full mt-1.5" />
                      Automatic obfuscation layer applied after each generation.
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="bg-purple-500 w-1 h-1 rounded-full mt-1.5" />
                      Optimized for Roblox game engine environments.
                    </li>
                  </ul>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
