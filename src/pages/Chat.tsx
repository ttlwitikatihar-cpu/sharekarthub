import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, MessageCircle, Search, ImagePlus, Check, CheckCheck, IndianRupee, Handshake, ExternalLink, Loader2, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  read_at: string | null;
  image_url: string | null;
  message_type: string;
  created_at: string;
}

interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
  listing?: { id: string; title: string; images: string[] | null; price: number | null; category: string } | null;
  other_name?: string;
  other_avatar?: string | null;
  last_message?: Message | null;
  unread_count?: number;
}

const initials = (name?: string) =>
  (name || "?")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const formatTimestamp = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "d MMM");
};

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, d MMM yyyy");
};

const Chat = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<number | null>(null);
  const typingChannelRef = useRef<any>(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async (): Promise<Conversation[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;

      return await Promise.all(
        (data || []).map(async (c: any) => {
          const { data: listing } = await supabase
            .from("listings")
            .select("id, title, images, price, category")
            .eq("id", c.listing_id)
            .maybeSingle();
          const otherId = c.buyer_id === user.id ? c.seller_id : c.buyer_id;
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", otherId)
            .maybeSingle();
          const { data: last } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", c.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const { count: unread } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", c.id)
            .eq("read", false)
            .neq("sender_id", user.id);
          return {
            ...c,
            listing,
            other_name: profile?.full_name || "User",
            other_avatar: profile?.avatar_url,
            last_message: last as Message | null,
            unread_count: unread ?? 0,
          };
        })
      );
    },
    enabled: !!user,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", selectedConvo],
    queryFn: async () => {
      if (!selectedConvo) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConvo)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedConvo,
  });

  const activeConvo = conversations.find((c) => c.id === selectedConvo);

  // Filter conversations by search
  const filteredConvos = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        c.other_name?.toLowerCase().includes(q) ||
        c.listing?.title?.toLowerCase().includes(q) ||
        c.last_message?.content?.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

  // Mark messages as read + realtime + typing channel
  useEffect(() => {
    if (!selectedConvo || !user) return;

    // Mark unread messages from other party as read
    supabase
      .from("messages")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("conversation_id", selectedConvo)
      .neq("sender_id", user.id)
      .eq("read", false)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
      });

    const msgChannel = supabase
      .channel(`messages-${selectedConvo}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConvo}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", selectedConvo] });
          queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConvo}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", selectedConvo] });
        }
      )
      .subscribe();

    const typingChannel = supabase.channel(`typing-${selectedConvo}`, {
      config: { broadcast: { self: false } },
    });
    typingChannel
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.userId && payload.payload.userId !== user.id) {
          setOtherTyping(true);
          window.clearTimeout((typingChannel as any)._t);
          (typingChannel as any)._t = window.setTimeout(() => setOtherTyping(false), 2500);
        }
      })
      .subscribe();
    typingChannelRef.current = typingChannel;

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(typingChannel);
      setOtherTyping(false);
    };
  }, [selectedConvo, queryClient, user]);

  // Global inbox realtime (updates convo list when messages arrive in any thread)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`inbox-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherTyping]);

  // Auto-select first conversation
  useEffect(() => {
    if (!selectedConvo && conversations.length && window.innerWidth >= 768) {
      setSelectedConvo(conversations[0].id);
    }
  }, [conversations, selectedConvo]);

  const broadcastTyping = useCallback(() => {
    if (!typingChannelRef.current || !user) return;
    typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id },
    });
  }, [user]);

  const handleTyping = (v: string) => {
    setMessage(v);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    broadcastTyping();
    typingTimer.current = window.setTimeout(() => {}, 500);
  };

  const sendMessage = async (opts?: { content?: string; imageUrl?: string; type?: string }) => {
    const content = (opts?.content ?? message).trim();
    if ((!content && !opts?.imageUrl) || !selectedConvo || !user) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedConvo,
      sender_id: user.id,
      content: content || (opts?.imageUrl ? "📷 Photo" : ""),
      image_url: opts?.imageUrl ?? null,
      message_type: opts?.type ?? (opts?.imageUrl ? "image" : "text"),
    } as any);
    setSending(false);
    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
      return;
    }
    if (!opts?.content && !opts?.imageUrl) setMessage("");
    queryClient.invalidateQueries({ queryKey: ["messages", selectedConvo] });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user || !selectedConvo) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 5 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `chat/${selectedConvo}/${user.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("listing-images").upload(path, file, { contentType: file.type });
    if (upErr) {
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
    setUploading(false);
    await sendMessage({ imageUrl: data.publicUrl, type: "image" });
  };

  const shareListingInChat = () => {
    if (!activeConvo?.listing) return;
    const url = `${window.location.origin}/item/${activeConvo.listing.id}`;
    sendMessage({
      content: `🔗 ${activeConvo.listing.title} — ${url}`,
      type: "listing",
    });
  };

  const proposePrice = () => {
    const raw = window.prompt("Propose a price (₹):");
    if (!raw) return;
    const n = Number(raw.replace(/[^\d.]/g, ""));
    if (!n || n <= 0) return;
    sendMessage({
      content: `💬 I'd like to propose ₹${n.toLocaleString()} for this${activeConvo?.listing ? ` — ${activeConvo.listing.title}` : ""}. Let me know!`,
      type: "offer",
    });
  };

  const markDeal = () => {
    sendMessage({
      content: `🤝 Deal! Let's proceed with the order and OTP handover.`,
      type: "deal",
    });
  };

  // Group messages by day + collapse consecutive same-sender bubbles
  const groupedMessages = useMemo(() => {
    const groups: Array<{ day: string; items: Message[] }> = [];
    let currentDay = "";
    for (const m of messages) {
      const d = new Date(m.created_at).toDateString();
      if (d !== currentDay) {
        groups.push({ day: m.created_at, items: [] });
        currentDay = d;
      }
      groups[groups.length - 1].items.push(m);
    }
    return groups;
  }, [messages]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">Sign in to view your messages.</p>
            <Link to="/auth"><Button>Sign In</Button></Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <SEO title="Messages — ShareKart Chat" description="Coordinate with buyers and sellers in real time about your ShareKart listings, rentals, and donations." path="/chat" noindex />
      <Navbar />
      <main className="container flex-1 py-4 md:py-6">
        <div className="flex items-center justify-between mb-3">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          {totalUnread > 0 && (
            <Badge variant="default" className="rounded-full">
              {totalUnread} unread
            </Badge>
          )}
        </div>

        <div className="grid md:grid-cols-[320px_1fr] gap-3 md:gap-4 h-[calc(100vh-10rem)] rounded-2xl overflow-hidden border border-border bg-background shadow-sm">
          {/* Sidebar */}
          <aside className={`flex flex-col border-r border-border bg-card ${selectedConvo ? "hidden md:flex" : "flex"}`}>
            <div className="p-3 border-b border-border space-y-2">
              <h1 className="font-bold text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Messages
              </h1>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search chats..."
                  className="pl-8 h-9"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredConvos.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  {search ? "No matches" : "No conversations yet"}
                </div>
              ) : (
                filteredConvos.map((c) => {
                  const active = selectedConvo === c.id;
                  const isMine = c.last_message?.sender_id === user.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedConvo(c.id)}
                      className={`w-full text-left px-3 py-3 border-b border-border transition-colors flex items-start gap-3 ${
                        active ? "bg-primary/10" : "hover:bg-muted/50"
                      }`}
                    >
                      <Avatar className="h-11 w-11 shrink-0">
                        <AvatarImage src={c.other_avatar || undefined} />
                        <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
                          {initials(c.other_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm truncate ${(c.unread_count ?? 0) > 0 ? "font-bold" : "font-semibold"}`}>
                            {c.other_name}
                          </p>
                          {c.last_message && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatTimestamp(c.last_message.created_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{c.listing?.title || "Listing"}</p>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className={`text-xs truncate ${(c.unread_count ?? 0) > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                            {isMine && "You: "}
                            {c.last_message?.content || "Say hi 👋"}
                          </p>
                          {(c.unread_count ?? 0) > 0 && (
                            <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                              {c.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Chat pane */}
          <section className={`flex flex-col bg-background ${!selectedConvo ? "hidden md:flex" : "flex"}`}>
            {!selectedConvo || !activeConvo ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                <div className="text-center">
                  <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  Select a conversation
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <header className="px-4 py-3 border-b border-border flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-8 w-8"
                    onClick={() => setSelectedConvo(null)}
                    aria-label="Back to inbox"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={activeConvo.other_avatar || undefined} />
                    <AvatarFallback className="bg-primary/15 text-primary font-semibold">
                      {initials(activeConvo.other_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{activeConvo.other_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {otherTyping ? (
                        <span className="text-primary">typing…</span>
                      ) : (
                        activeConvo.listing?.title || "Listing"
                      )}
                    </p>
                  </div>
                  {activeConvo.listing && (
                    <Link
                      to={`/item/${activeConvo.listing.id}`}
                      className="hidden sm:flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 hover:bg-muted transition-colors"
                    >
                      <div className="h-8 w-8 rounded bg-muted overflow-hidden shrink-0">
                        {activeConvo.listing.images?.[0] && (
                          <img src={activeConvo.listing.images[0]} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="text-xs">
                        <p className="font-medium line-clamp-1 max-w-[140px]">{activeConvo.listing.title}</p>
                        <p className="text-muted-foreground">
                          {activeConvo.listing.category === "donate"
                            ? "Free"
                            : `₹${(activeConvo.listing.price ?? 0).toLocaleString()}`}
                        </p>
                      </div>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </Link>
                  )}
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 space-y-4 bg-[radial-gradient(hsl(var(--muted))_1px,transparent_1px)] [background-size:16px_16px]">
                  {groupedMessages.map((group, gi) => (
                    <div key={gi} className="space-y-2">
                      <div className="flex justify-center">
                        <span className="text-[10px] uppercase tracking-wider bg-muted/80 text-muted-foreground px-2 py-1 rounded-full">
                          {dayLabel(group.day)}
                        </span>
                      </div>
                      {group.items.map((m, i) => {
                        const mine = m.sender_id === user.id;
                        const prev = group.items[i - 1];
                        const sameSender = prev && prev.sender_id === m.sender_id;
                        return (
                          <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${mine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[75%] md:max-w-[60%] flex flex-col ${mine ? "items-end" : "items-start"} ${
                                sameSender ? "mt-0.5" : "mt-1"
                              }`}
                            >
                              {m.image_url && (
                                <a href={m.image_url} target="_blank" rel="noreferrer" className="mb-1">
                                  <img
                                    src={m.image_url}
                                    alt="Attachment"
                                    className="rounded-xl max-h-64 object-cover border border-border shadow-sm"
                                  />
                                </a>
                              )}
                              {m.content && (
                                <div
                                  className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                                    mine
                                      ? "bg-primary text-primary-foreground rounded-br-md"
                                      : "bg-card border border-border text-foreground rounded-bl-md"
                                  } ${
                                    m.message_type === "deal"
                                      ? mine
                                        ? "!bg-accent !text-accent-foreground"
                                        : "!bg-accent/20 !border-accent"
                                      : ""
                                  }`}
                                >
                                  {m.content}
                                </div>
                              )}
                              <div className={`flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground ${mine ? "flex-row-reverse" : ""}`}>
                                <span>{format(new Date(m.created_at), "HH:mm")}</span>
                                {mine &&
                                  (m.read ? (
                                    <CheckCheck className="h-3 w-3 text-primary" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  ))}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ))}

                  <AnimatePresence>
                    {otherTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex justify-start"
                      >
                        <div className="bg-card border border-border rounded-2xl rounded-bl-md px-3 py-2 shadow-sm">
                          <div className="flex gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick actions */}
                <div className="px-3 pt-2 flex gap-1.5 flex-wrap border-t border-border">
                  <Button size="sm" variant="outline" className="h-7 rounded-full text-xs gap-1" onClick={shareListingInChat}>
                    <ExternalLink className="h-3 w-3" /> Share listing
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 rounded-full text-xs gap-1" onClick={proposePrice}>
                    <IndianRupee className="h-3 w-3" /> Propose price
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 rounded-full text-xs gap-1" onClick={markDeal}>
                    <Handshake className="h-3 w-3" /> Mark deal
                  </Button>
                </div>

                {/* Composer */}
                <div className="p-3 flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    aria-label="Attach image"
                    className="shrink-0"
                  >
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                  </Button>
                  <Input
                    value={message}
                    onChange={(e) => handleTyping(e.target.value)}
                    placeholder="Type a message..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    aria-label="Message input"
                    className="rounded-full"
                  />
                  <Button
                    size="icon"
                    onClick={() => sendMessage()}
                    disabled={sending || (!message.trim())}
                    aria-label="Send message"
                    className="rounded-full shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Chat;
