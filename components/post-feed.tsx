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
import { Check, FileText, Loader2, Lock, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface DecryptedPost extends Post {
  decryptedContent?: string;
  decryptError?: boolean;
}

interface PostFeedProps {
  userId: string;
  userName: string;
  refreshTrigger: number;
}

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

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

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
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Decrypting your thoughts...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground text-sm mb-0.5">No thoughts yet</h3>
        <p className="text-sm text-muted-foreground">
          Your encrypted thoughts will appear here
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {posts.map((post, index) => (
          <article
            key={post.id}
            className="animate-fade-up"
            style={{ animationDelay: `${Math.min(index * 40, 200)}ms` }}
          >
            {/* Divider line - only show if not the first post */}
            {index > 0 && (
              <div className="border-t border-border/50" />
            )}

            <div className="px-4 sm:px-6 py-4 sm:py-5">
              {/* Post content and metadata row */}
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Post content area */}
                <div className="flex-1 min-w-0">
                  {/* Post content */}
                  {post.decryptError ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-1">
                      <Lock className="h-3.5 w-3.5" />
                      <span className="text-sm">Unable to decrypt</span>
                    </div>
                  ) : editingPostId === post.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[72px] resize-none bg-secondary/50 border-border text-sm"
                        disabled={saving}
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            setEditingPostId(null);
                            setEditContent("");
                          }}
                          disabled={saving}
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => handleSaveEdit(post.id)}
                          disabled={saving || !editContent.trim()}
                        >
                          {saving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : (
                            <Check className="h-3.5 w-3.5 mr-1" />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-foreground whitespace-pre-wrap break-words leading-relaxed text-[15px] sm:text-base">
                      {post.decryptedContent}
                    </p>
                  )}
                </div>

                {/* Right side: Date and menu */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-start">
                  <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap leading-none">
                    {formatDate(post.updatedAt || post.createdAt)}
                    {post.updatedAt && post.updatedAt !== post.createdAt && (
                      <span className="hidden sm:inline"> · edited</span>
                    )}
                  </span>

                  {!post.decryptError && editingPostId !== post.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem onClick={() => handleEdit(post)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeletePostId(post.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Infinite scroll trigger */}
      <div ref={loadMoreRef} className="py-3">
        {loadingMore && (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading more...</span>
          </div>
        )}
      </div>

      {!hasMore && posts.length > 5 && (
        <p className="text-center text-xs text-muted-foreground py-3">
          You&apos;ve reached the beginning
        </p>
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
