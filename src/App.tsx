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
import { PromptInputBox } from "@/src/components/PromptInputBox";
import { Button } from "@/src/components/ui/button";
import { LiquidButton } from "@/src/components/ui/LiquidButton";
import { Shield, Code, Zap, ExternalLink, Copy, Check, Terminal, BrainCircuit, Sparkles, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { Plan } from "@/src/components/Plan";

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
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  }
  throw new Error(JSON.stringify(errInfo));
}

const getDeviceId = () => {
  let id = localStorage.getItem("penx_device_id");
  if (!id) {
    id = "dev_" + Math.random().toString(36).substring(2, 12);
    localStorage.setItem("penx_device_id", id);
  }
  return id;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewScript, setViewScript] = useState<string | null>(null);
  const [createdLinks, setCreatedLinks] = useState<any[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [mode, setMode] = useState<"obfuscate" | "generate">("obfuscate");

  useEffect(() => {
    let unsubscribeScripts: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const path = "scripts";
        const q = query(collection(db, path), where("creatorId", "==", u.uid));
        unsubscribeScripts = onSnapshot(q, (snapshot) => {
          const links = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setCreatedLinks(links);
        }, (error) => {
          console.error("Scripts snapshot error:", error);
        });
      } else {
        setCreatedLinks([]);
        if (unsubscribeScripts) {
          unsubscribeScripts();
          unsubscribeScripts = null;
        }
      }
      setLoading(false);
    });

    const params = new URLSearchParams(window.location.search);
    const scriptId = params.get("script");
    if (scriptId) setViewScript(scriptId);

    return () => {
      unsubscribeAuth();
      if (unsubscribeScripts) unsubscribeScripts();
    };
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code === "auth/unauthorized-domain") {
        alert("Authorized Domain Needed!\n\nPlease add 'www.penx.fun' to Authorized Domains in Firebase Console > Authentication > Settings.");
      } else {
        alert("Login failed: " + err.message);
      }
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
        const genRes = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: input })
        });
        const genData = await genRes.json();
        if (genData.error) throw new Error(genData.error);
        
        const obRes = await fetch("/api/obfuscate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: genData.code })
        });
        const obData = await obRes.json();
        finalCode = obData.obfuscated;
        title = input.slice(0, 30) + "... (AI)";
      } else {
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

  if (loading) return (
     <div className="min-h-screen flex items-center justify-center">
        <Shield className="w-12 h-12 text-blue-600 animate-pulse" />
     </div>
  );

  if (viewScript) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <Shield className="w-16 h-16 text-blue-500 mb-6 animate-pulse" />
        <h1 className="text-4xl font-bold mb-4 font-mono tracking-tighter uppercase">PenX Security</h1>
        <div className="bg-neutral-900/50 border border-neutral-800 p-8 rounded-2xl max-w-lg backdrop-blur-xl">
          <p className="text-neutral-400 mb-8 leading-relaxed">
            This code is protected by PenX protocols. Restricted access environment.
          </p>
          <div className="flex flex-col gap-4">
            <LiquidButton onClick={() => window.location.href = "/"}>
               Return to Dashboard
            </LiquidButton>
            <p className="text-[10px] text-neutral-600 font-mono italic">ID: {viewScript}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50">
      {!user ? (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <Shield className="w-20 h-20 text-blue-600 mb-8" />
          <h1 className="text-4xl font-bold mb-4 font-mono tracking-tighter uppercase italic">PenX Protocol</h1>
          <p className="text-neutral-500 max-w-sm mb-10 leading-relaxed">
            Ultimate script delivery and creation platform. Secure, fast, and AI-powered.
          </p>
          <LiquidButton onClick={login}>
            Authenticate with Google
          </LiquidButton>
          <p className="mt-8 text-[10px] text-neutral-400 font-mono italic opacity-50">
            SECURE ACCESS REQUIRED • BYPASS ATTEMPT DETECTED
          </p>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-6 py-12">
          <header className="flex justify-between items-center mb-16">
            <div className="flex items-center gap-3">
               <div className="bg-blue-600 p-2 rounded-lg text-white font-black italic">
                  PX
               </div>
               <h1 className="text-2xl font-black tracking-tighter italic uppercase">PenX</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-[10px] font-mono text-neutral-400 opacity-50 uppercase tracking-widest hidden sm:block">
                {user.email}
              </div>
              <Button variant="ghost" size="icon" onClick={() => signOut(auth)}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            <section className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 p-8 rounded-3xl shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-2">
                  {mode === "obfuscate" ? <Code className="w-5 h-5 text-blue-500" /> : <Sparkles className="w-5 h-5 text-purple-500" />}
                  <h2 className="text-xl font-semibold capitalize font-mono">{mode} Protocol</h2>
                </div>
                <div className="flex bg-neutral-200 dark:bg-neutral-800 p-1 rounded-xl">
                  {["obfuscate", "generate"].map((m) => (
                    <button 
                      key={m}
                      onClick={() => setMode(m as any)}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
                        mode === m ? "bg-white dark:bg-neutral-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                      )}
                    >
                      {m === "obfuscate" ? "Cleaner" : "AI Maker"}
                    </button>
                  ))}
                </div>
              </div>

              <PromptInputBox 
                onSend={handleAction} 
                isLoading={isProcessing} 
                placeholder={mode === "obfuscate" ? "Paste raw script here..." : "Describe script logic (e.g. 'local speed fly')..."}
              />
            </section>

            <section>
              <div className="flex items-center gap-2 mb-6">
                <Shield className="w-5 h-5 text-green-500" />
                <h2 className="text-xl font-semibold font-mono tracking-tighter uppercase">Security Standards</h2>
              </div>
              <Plan />
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                 <Zap className="w-5 h-5 text-amber-500" />
                 <h2 className="text-xl font-semibold">Saved Scripts</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatePresence>
                  {createdLinks.map((link) => (
                    <motion.div 
                      key={link.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-5 rounded-2xl hover:border-blue-500/30 transition-all shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-mono text-[10px] text-neutral-400">ID: {link.codeId.substring(0, 8)}...</div>
                        {link.title.includes("(AI)") && <Sparkles className="w-3 h-3 text-purple-500" />}
                      </div>
                      <h3 className="font-semibold mb-4 text-neutral-800 dark:text-neutral-200 line-clamp-1">{link.title}</h3>
                      <div className="grid grid-cols-2 gap-2 mt-auto">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-[10px]"
                          onClick={() => copyToClipboard(window.location.origin + "/s/" + link.codeId)}
                        >
                          {copied === (window.location.origin + "/s/" + link.codeId) ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                          URL
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-[10px]"
                          onClick={() => copyToClipboard(`loadstring(game:HttpGet("${window.location.origin}/s/${link.codeId}"))()`)}
                        >
                          {copied === (`loadstring(game:HttpGet("${window.location.origin}/s/${link.codeId}"))()`) ? <Check className="w-3 h-3 mr-1" /> : <Terminal className="w-3 h-3 mr-1" />}
                          LOAD
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {createdLinks.length === 0 && !isProcessing && (
                  <div className="col-span-full py-12 text-center border-2 border-dashed border-neutral-100 dark:border-neutral-900 rounded-3xl text-neutral-400 text-sm italic">
                    No scripts saved yet. Use the tool above to start.
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-8">
             <div className="bg-neutral-900 dark:bg-zinc-900 p-8 rounded-3xl text-white border border-white/5">
                <h3 className="text-lg font-bold mb-2">Session Stats</h3>
                <p className="text-neutral-400 mb-6 text-sm">Tracking local activity.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <div className="text-2xl font-bold">{createdLinks.length}</div>
                    <div className="text-[10px] uppercase opacity-50 tracking-tighter">Scripts</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <div className="text-2xl font-bold">{createdLinks.reduce((acc, l) => acc + (l.views || 0), 0)}</div>
                    <div className="text-[10px] uppercase opacity-50 tracking-tighter">Fetches</div>
                  </div>
                </div>
             </div>

             <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                <h4 className="font-bold mb-4 flex items-center gap-2 text-blue-900 dark:text-blue-400">
                  <BrainCircuit className="w-4 h-4" />
                  AI Maker Protocol
                </h4>
                <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-3 opacity-80">
                  <li className="flex items-start gap-2">
                    <div className="bg-blue-400 w-1 h-1 rounded-full mt-1.5" />
                    Advanced Lua via Gemini 3 AI.
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-blue-400 w-1 h-1 rounded-full mt-1.5" />
                    Instant safe obfuscation layer.
                  </li>
                </ul>
             </div>

             <div className="p-6 bg-neutral-50 dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800">
                <h4 className="font-bold mb-4 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-blue-500" />
                  Distribution Node
                </h4>
                <div className="space-y-4">
                  <div className="bg-white dark:bg-neutral-800 p-3 rounded-xl font-mono text-[9px] space-y-2 border border-neutral-100 dark:border-neutral-700 shadow-sm">
                     <div className="flex justify-between">
                        <span className="text-neutral-400 italic">Host:</span>
                        <span className="font-bold">lunar.dns-parking.com</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-neutral-400 italic">Target:</span>
                        <span className="font-bold text-blue-600">penx.runner.dev</span>
                     </div>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-tight">
                    Localized hosting for ultra-fast script delivery within Roblox.
                  </p>
                </div>
             </div>
          </aside>
        </main>
      </div>
    )}
  </div>
);
}
