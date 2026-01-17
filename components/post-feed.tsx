"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { decryptContent, deriveKeyFromPin, encryptContent } from "@/lib/crypto";
import type { Post } from "@/lib/redis";
import {
  AlignJustify,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Filter,
  Heart,
  LayoutGrid,
  List,
  Loader2,
  Lock,
  MoreHorizontal,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface DecryptedPost extends Post {
  decryptedContent?: string;
  decryptError?: boolean;
}

interface PostFeedProps {
  userId: string;
  userName: string;
  refreshTrigger: number;
}

type ViewMode = "timeline" | "compact" | "cards";
type SortOrder = "newest" | "oldest";

// Mood detection based on content keywords
const detectMood = (content: string): { mood: string; color: string; emoji: string; } => {
  const lowered = content.toLowerCase();

  if (/\b(happy|joy|excited|amazing|wonderful|love|great|awesome|fantastic)\b/.test(lowered)) {
    return { mood: "joyful", color: "from-amber-500/20 to-orange-500/10", emoji: "✨" };
  }
  if (/\b(sad|down|upset|crying|tears|miss|lonely|hurt)\b/.test(lowered)) {
    return { mood: "melancholic", color: "from-blue-500/20 to-indigo-500/10", emoji: "💧" };
  }
  if (/\b(angry|frustrated|annoyed|mad|hate|furious)\b/.test(lowered)) {
    return { mood: "intense", color: "from-red-500/20 to-rose-500/10", emoji: "🔥" };
  }
  if (/\b(calm|peaceful|relaxed|serene|grateful|thankful)\b/.test(lowered)) {
    return { mood: "peaceful", color: "from-green-500/20 to-emerald-500/10", emoji: "🌿" };
  }
  if (/\b(anxious|worried|stressed|nervous|scared|afraid)\b/.test(lowered)) {
    return { mood: "anxious", color: "from-purple-500/20 to-violet-500/10", emoji: "🌀" };
  }
  if (/\b(thinking|wondering|curious|pondering|reflecting)\b/.test(lowered)) {
    return { mood: "reflective", color: "from-cyan-500/20 to-teal-500/10", emoji: "💭" };
  }

  return { mood: "neutral", color: "from-slate-500/10 to-gray-500/5", emoji: "✎" };
};

// Word count utility
const getWordCount = (text: string): number => {
  return text.trim().split(/\s+/).filter(Boolean).length;
};

// Reading time estimate
const getReadingTime = (text: string): string => {
  const words = getWordCount(text);
  const minutes = Math.ceil(words / 200);
  return minutes < 1 ? "< 1 min" : `${minutes} min read`;
};

export function PostFeed({ userId, userName, refreshTrigger }: PostFeedProps) {
  const [posts, setPosts] = useState<DecryptedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // New UI state
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [showHeartedOnly, setShowHeartedOnly] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
  };

  const formatFullDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  // Group posts by date for timeline view
  const groupPostsByDate = useCallback((postsToGroup: DecryptedPost[]) => {
    const groups: { [key: string]: DecryptedPost[]; } = {};

    postsToGroup.forEach(post => {
      const date = new Date(post.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let key: string;
      if (date.toDateString() === today.toDateString()) {
        key = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = "Yesterday";
      } else if (date.getFullYear() === today.getFullYear()) {
        key = date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
      } else {
        key = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(post);
    });

    return groups;
  }, []);

  // Filter and sort posts
  const processedPosts = useMemo(() => {
    let result = [...posts];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(post =>
        post.decryptedContent?.toLowerCase().includes(query)
      );
    }

    // Apply hearted filter
    if (showHeartedOnly) {
      result = result.filter(post => likedPosts.has(post.id));
    }

    // Apply sort order
    result.sort((a, b) => {
      const timeA = a.createdAt;
      const timeB = b.createdAt;
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [posts, searchQuery, sortOrder, showHeartedOnly, likedPosts]);

  // Toggle like for a post
  const toggleLike = (postId: string) => {
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  // Focus search input when shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const decryptPosts = useCallback(
    async (postsToDecrypt: Post[]): Promise<DecryptedPost[]> => {
      const pinHash = sessionStorage.getItem("pinVerified");
      if (!pinHash) return postsToDecrypt.map((p) => ({ ...p, decryptError: true }));

      try {
        const key = await deriveKeyFromPin(pinHash, userId);

        return Promise.all(
          postsToDecrypt.map(async (post) => {
            try {
              const decrypted = await decryptContent(post.encryptedContent, post.iv, key);
              return { ...post, decryptedContent: decrypted };
            } catch {
              return { ...post, decryptError: true };
            }
          }),
        );
      } catch {
        return postsToDecrypt.map((p) => ({ ...p, decryptError: true }));
      }
    },
    [userId],
  );

  const fetchPosts = useCallback(
    async (cursor?: string) => {
      try {
        const url = cursor ? `/api/posts?cursor=${cursor}` : "/api/posts";
        const res = await fetch(url);

        if (!res.ok) return;

        const data = await res.json();
        const decrypted = await decryptPosts(data.posts);

        if (cursor) {
          setPosts((prev) => [...prev, ...decrypted]);
        } else {
          setPosts(decrypted);
        }

        setNextCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      } catch (err) {
        console.error("Failed to fetch posts:", err);
      }
    },
    [decryptPosts],
  );

  const handleEdit = (post: DecryptedPost) => {
    setEditingPostId(post.id);
    setEditContent(post.decryptedContent || "");
  };

  const handleSaveEdit = async (postId: string) => {
    if (!editContent.trim()) return;

    setSaving(true);
    try {
      const pinHash = sessionStorage.getItem("pinVerified");
      if (!pinHash) return;

      const key = await deriveKeyFromPin(pinHash, userId);
      const { encrypted, iv } = await encryptContent(editContent.trim(), key);

      const res = await fetch("/api/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: postId,
          encryptedContent: encrypted,
          iv,
        }),
      });

      if (res.ok) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, decryptedContent: editContent.trim(), updatedAt: Date.now() } : p,
          ),
        );
        setEditingPostId(null);
        setEditContent("");
      }
    } catch (err) {
      console.error("Failed to edit post:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePostId) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/posts?id=${deletePostId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== deletePostId));
      }
    } catch (err) {
      console.error("Failed to delete post:", err);
    } finally {
      setDeleting(false);
      setDeletePostId(null);
    }
  };

  // Initial load and refresh
  useEffect(() => {
    setLoading(true);
    setPosts([]);
    setNextCursor(null);
    setHasMore(true);
    fetchPosts().finally(() => setLoading(false));
  }, [fetchPosts, refreshTrigger]);

  // Infinite scroll observer
  useEffect(() => {
    if (loading) return;

    observerRef.current = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && nextCursor) {
          setLoadingMore(true);
          await fetchPosts(nextCursor);
          setLoadingMore(false);
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [loading, hasMore, loadingMore, nextCursor, fetchPosts]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="relative">
          <div className="absolute inset-0 animate-ping opacity-20">
            <div className="h-12 w-12 rounded-full bg-primary/40" />
          </div>
          <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">Decrypting your thoughts...</p>
          <p className="text-xs text-muted-foreground">Your memories are safe and encrypted</p>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-xl" />
          <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center border border-border/50">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <h3 className="font-semibold text-foreground text-lg mb-2">Start Your Journey</h3>
        <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed">
          Your encrypted thoughts will appear here. Every word is private and secure.
        </p>
      </div>
    );
  }

  const groupedPosts = groupPostsByDate(processedPosts);
  const dateGroups = Object.keys(groupedPosts);

  // Render a single post card
  const renderPostCard = (post: DecryptedPost, index: number, isCompact = false) => {
    const mood = post.decryptedContent ? detectMood(post.decryptedContent) : null;
    const isExpanded = expandedPostId === post.id;
    const isLiked = likedPosts.has(post.id);
    const content = post.decryptedContent || "";
    const wordCount = getWordCount(content);
    const shouldTruncate = !isCompact && content.length > 280 && !isExpanded;

    return (
      <article
        key={post.id}
        className={`group relative animate-fade-up transition-all duration-300 ${viewMode === "cards"
          ? "bg-card border border-border rounded-xl overflow-hidden hover:border-border/80 hover:shadow-lg"
          : ""
          }`}
        style={{ animationDelay: `${Math.min(index * 50, 250)}ms` }}
      >
        {/* Mood gradient accent for cards view */}
        {viewMode === "cards" && mood && (
          <div className={`absolute inset-0 bg-gradient-to-br ${mood.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
        )}

        <div className={`relative ${viewMode === "cards" ? "p-5" : "px-4 sm:px-6 py-4 sm:py-5"}`}>
          {/* Post header with mood and time */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {mood && !post.decryptError && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-secondary/80 text-muted-foreground">
                  <span>{mood.emoji}</span>
                  <span className="capitalize hidden sm:inline">{mood.mood}</span>
                </span>
              )}
              {wordCount > 50 && !post.decryptError && (
                <span className="text-xs text-muted-foreground/60 hidden sm:inline">
                  {getReadingTime(content)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                {formatDate(post.updatedAt || post.createdAt)}
                {post.updatedAt && post.updatedAt !== post.createdAt && (
                  <span className="text-muted-foreground/50">· edited</span>
                )}
              </span>
            </div>
          </div>

          {/* Post content */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {post.decryptError ? (
                <div className="flex items-center gap-2.5 text-muted-foreground py-2 px-3 bg-secondary/50 rounded-lg">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm">Unable to decrypt this thought</span>
                </div>
              ) : editingPostId === post.id ? (
                <div className="space-y-3">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[100px] resize-none bg-secondary/50 border-border focus:border-primary/30 text-[15px] rounded-lg"
                      disabled={saving}
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-4"
                        onClick={() => {
                          setEditingPostId(null);
                          setEditContent("");
                        }}
                        disabled={saving}
                      >
                        <X className="h-4 w-4 mr-1.5" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-9 px-4"
                        onClick={() => handleSaveEdit(post.id)}
                        disabled={saving || !editContent.trim()}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                        ) : (
                          <Check className="h-4 w-4 mr-1.5" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                    <div>
                      <p className={`text-foreground whitespace-pre-wrap break-words leading-relaxed text-[15px] sm:text-base ${shouldTruncate ? "line-clamp-4" : ""}`}>
                        {content}
                      </p>
                      {shouldTruncate && (
                        <button
                          onClick={() => setExpandedPostId(post.id)}
                          className="text-sm text-primary/80 hover:text-primary mt-2 font-medium transition-colors"
                        >
                          Read more...
                        </button>
                      )}
                      {isExpanded && content.length > 280 && (
                        <button
                          onClick={() => setExpandedPostId(null)}
                          className="text-sm text-muted-foreground hover:text-foreground mt-2 font-medium transition-colors"
                        >
                          Show less
                        </button>
                  )}
                    </div>
              )}
            </div>
          </div>

          {/* Post actions */}
          {!post.decryptError && editingPostId !== post.id && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-2 text-muted-foreground transition-all ${isLiked ? "text-red-500 hover:text-red-600" : "hover:text-red-500"}`}
                  onClick={() => toggleLike(post.id)}
                >
                  <Heart className={`h-4 w-4 mr-1.5 transition-all ${isLiked ? "fill-current scale-110" : ""}`} />
                  <span className="text-xs">{isLiked ? "Loved" : "Love"}</span>
                </Button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={() => handleEdit(post)} className="cursor-pointer">
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeletePostId(post.id)}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-1.5">
          {/* Search toggle */}
          <Button
            variant={showSearch ? "secondary" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) setSearchQuery("");
            }}
          >
            <Search className="h-3.5 w-3.5" />
          </Button>

          {/* View mode toggle */}
          <div className="flex items-center bg-secondary/50 rounded-md p-0.5">
            <button
              onClick={() => setViewMode("timeline")}
              className={`p-1.5 sm:px-2 sm:py-1 rounded transition-all flex items-center gap-1 ${viewMode === "timeline"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
              title="Timeline"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[11px] font-medium">Timeline</span>
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 sm:px-2 sm:py-1 rounded transition-all flex items-center gap-1 ${viewMode === "cards"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
              title="Cards"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[11px] font-medium">Cards</span>
            </button>
            <button
              onClick={() => setViewMode("compact")}
              className={`p-1.5 sm:px-2 sm:py-1 rounded transition-all flex items-center gap-1 ${viewMode === "compact"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
              title="Compact"
            >
              <AlignJustify className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[11px] font-medium">Compact</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Hearted filter toggle */}
          <Button
            variant={showHeartedOnly ? "secondary" : "ghost"}
            size="sm"
            className={`h-7 w-7 p-0 ${showHeartedOnly ? "text-red-500" : "text-muted-foreground"}`}
            onClick={() => setShowHeartedOnly(!showHeartedOnly)}
          >
            <Heart className={`h-3.5 w-3.5 ${showHeartedOnly ? "fill-current" : ""}`} />
          </Button>

          {/* Sort order */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-[11px] ml-1 capitalize">{sortOrder}</span>
                <ChevronDown className="h-2.5 w-2.5 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => setSortOrder("newest")} className="cursor-pointer text-xs">
                <Calendar className="h-3 w-3 mr-2" />
                Newest
                {sortOrder === "newest" && <Check className="h-3 w-3 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder("oldest")} className="cursor-pointer text-xs">
                <Clock className="h-3 w-3 mr-2" />
                Oldest
                {sortOrder === "oldest" && <Check className="h-3 w-3 ml-auto" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="mb-4 animate-fade-up">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search your thoughts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-secondary/50 border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-muted-foreground mt-2">
              Found {processedPosts.length} {processedPosts.length === 1 ? "result" : "results"}
            </p>
          )}
        </div>
      )}

      {/* No results state */}
      {processedPosts.length === 0 && searchQuery && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground text-sm mb-1">No matches found</h3>
          <p className="text-sm text-muted-foreground">
            Try a different search term
          </p>
        </div>
      )}

      {/* No hearted posts state */}
      {processedPosts.length === 0 && showHeartedOnly && !searchQuery && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Heart className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground text-sm mb-1">No loved thoughts yet</h3>
          <p className="text-sm text-muted-foreground">
            Tap the heart on posts to save your favorites
          </p>
        </div>
      )}

      {/* Posts container */}
      {processedPosts.length > 0 && (
        <div className={`${viewMode === "cards" ? "grid gap-4 sm:grid-cols-2" : "space-y-0"}`}>
          {viewMode === "timeline" ? (
            // Timeline view with date grouping
            <div className="space-y-6">
              {dateGroups.map((dateGroup) => (
                <div key={dateGroup} className="animate-fade-up">
                  {/* Date header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/80 rounded-full">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground">{dateGroup}</span>
                    </div>
                    <div className="flex-1 h-px bg-border/50" />
                    <span className="text-xs text-muted-foreground">
                      {groupedPosts[dateGroup].length} {groupedPosts[dateGroup].length === 1 ? "entry" : "entries"}
                    </span>
                  </div>

                  {/* Posts for this date */}
                  <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/50">
                    {groupedPosts[dateGroup].map((post, idx) => renderPostCard(post, idx))}
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === "cards" ? (
            // Cards grid view
            processedPosts.map((post, idx) => renderPostCard(post, idx))
          ) : (
            // Compact list view
            <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border/50">
              {processedPosts.map((post, idx) => {
                const content = post.decryptedContent || "";
                const preview = content.length > 100 ? content.slice(0, 100) + "..." : content;

                return (
                  <div
                    key={post.id}
                    className="group flex items-center gap-4 px-4 py-3 hover:bg-secondary/30 transition-colors cursor-pointer animate-fade-up"
                    style={{ animationDelay: `${Math.min(idx * 30, 150)}ms` }}
                    onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                  >
                    {/* Mood indicator */}
                    <div className="shrink-0">
                      <span className="text-lg">{post.decryptError ? "🔒" : detectMood(content).emoji}</span>
                    </div>

                    {/* Content preview */}
                    <div className="flex-1 min-w-0">
                      {expandedPostId === post.id ? (
                        <p className="text-sm text-foreground whitespace-pre-wrap">{content}</p>
                      ) : (
                        <p className="text-sm text-foreground truncate">{post.decryptError ? "Unable to decrypt" : preview}</p>
                      )}
                    </div>

                    {/* Time */}
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDate(post.createdAt)}
                    </span>

                    {/* Actions */}
                    {!post.decryptError && (
                      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem onClick={() => handleEdit(post)} className="cursor-pointer">
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletePostId(post.id)}
                              className="text-destructive focus:text-destructive cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Infinite scroll trigger */}
      <div ref={loadMoreRef} className="py-4">
        {loadingMore && (
          <div className="flex items-center justify-center gap-3">
            <div className="relative">
              <div className="h-8 w-8 rounded-full bg-secondary/80 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
            <span className="text-sm text-muted-foreground">Loading more thoughts...</span>
          </div>
        )}
      </div>

      {!hasMore && posts.length > 5 && (
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-full">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">You&apos;ve reached the beginning of your journey</span>
          </div>
        </div>
      )}

      <AlertDialog open={!!deletePostId} onOpenChange={(open) => !open && setDeletePostId(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Delete this thought?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The encrypted data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="h-9 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
