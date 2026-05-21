import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";

interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  listing?: { title: string; images: string[] | null };
  other_name?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

const Chat = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;

      // Fetch listing titles and other user names
      const enriched = await Promise.all(
        (data || []).map(async (c: any) => {
          const { data: listing } = await supabase
            .from("listings")
            .select("title, images")
            .eq("id", c.listing_id)
            .single();
          const otherId = c.buyer_id === user?.id ? c.seller_id : c.buyer_id;
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", otherId)
            .single();
          return { ...c, listing, other_name: profile?.full_name || "User" };
        })
      );
      return enriched as Conversation[];
    },
    enabled: !!user,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", selectedConvo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConvo!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedConvo,
  });

  // Realtime subscription
  useEffect(() => {
    if (!selectedConvo) return;
    const channel = supabase
      .channel(`messages-${selectedConvo}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConvo}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["messages", selectedConvo] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConvo, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim() || !selectedConvo || !user) return;
    setSending(true);
    await supabase.from("messages").insert({
      conversation_id: selectedConvo,
      sender_id: user.id,
      content: message.trim(),
    });
    setMessage("");
    setSending(false);
    queryClient.invalidateQueries({ queryKey: ["messages", selectedConvo] });
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Sign in to view your messages.</p>
            <Link to="/auth"><Button>Sign In</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="Messages — ShareKart Chat" description="Coordinate with buyers and sellers in real time about your ShareKart listings, rentals, and donations." path="/chat" noindex />
      <Navbar />
      <main className="container flex-1 py-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold mb-4">Messages</h1>

        <div className="grid md:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-16rem)]">
          {/* Conversation list */}
          <div className="border border-border rounded-xl overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No conversations yet
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedConvo(c.id)}
                  className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 transition-colors ${selectedConvo === c.id ? "bg-muted" : ""}`}
                >
                  <p className="font-medium text-sm truncate">{c.other_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.listing?.title || "Listing"}</p>
                </button>
              ))
            )}
          </div>

          {/* Chat area */}
          <div className="border border-border rounded-xl flex flex-col">
            {!selectedConvo ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Select a conversation
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${m.sender_id === user.id ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[70%] rounded-xl px-3 py-2 text-sm ${m.sender_id === user.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                        {m.content}
                      </div>
                    </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-3 border-t border-border flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    aria-label="Message input"
                  />
                  <Button size="icon" onClick={sendMessage} disabled={sending || !message.trim()} aria-label="Send message">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Chat;
