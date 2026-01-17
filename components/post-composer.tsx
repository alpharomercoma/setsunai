"use client"

import { Button } from "@/components/ui/button";
import { deriveKeyFromPin, encryptContent } from "@/lib/crypto";
import { AlertCircle, Loader2, Lock, Mic, MicOff, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null
  onend: ((this: SpeechRecognition, ev: Event) => void) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null
  onnomatch: ((this: SpeechRecognition, ev: Event) => void) | null
  onaudiostart: ((this: SpeechRecognition, ev: Event) => void) | null
  onaudioend: ((this: SpeechRecognition, ev: Event) => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

interface PostComposerProps {
  userName: string
  userId: string
  onPostCreated: () => void
}

export function PostComposer({ userName, userId, onPostCreated }: PostComposerProps) {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const contentBeforeListeningRef = useRef("")

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px"
    }
  }, [content, interimTranscript])

  // Check for speech recognition support and initialize
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      setSpeechSupported(false)
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  // Setup speech recognition event handlers
  const setupRecognitionHandlers = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) return

    recognition.onstart = () => {
      setIsListening(true)
      setPermissionDenied(false)
      setError("")
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ""
      let interimText = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript

        if (result.isFinal) {
          finalTranscript += transcript
        } else {
          interimText += transcript
        }
      }

      // Update content with final transcript
      if (finalTranscript) {
        setContent(prev => {
          const separator = prev && !prev.endsWith(" ") ? " " : ""
          return prev + separator + finalTranscript
        })
        setInterimTranscript("")
      } else {
        setInterimTranscript(interimText)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error)

      switch (event.error) {
        case "not-allowed":
        case "permission-denied":
          setPermissionDenied(true)
          setError("Microphone access denied. Please allow microphone permission.")
          break
        case "no-speech":
          // This is normal, just no speech detected
          break
        case "network":
          setError("Network error occurred. Please check your connection.")
          break
        case "aborted":
          // User aborted, no error needed
          break
        default:
          setError(`Speech recognition error: ${event.error}`)
      }

      setIsListening(false)
      setInterimTranscript("")
    }

    recognition.onend = () => {
      setIsListening(false)
      // Append any remaining interim transcript as final
      if (interimTranscript) {
        setContent(prev => {
          const separator = prev && !prev.endsWith(" ") ? " " : ""
          return prev + separator + interimTranscript
        })
        setInterimTranscript("")
      }
    }
  }, [interimTranscript])

  // Request microphone permission explicitly
  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Stop the stream immediately - we just needed to request permission
      stream.getTracks().forEach(track => track.stop())
      return true
    } catch (err) {
      console.error("Microphone permission error:", err)
      setPermissionDenied(true)
      setError("Microphone access denied. Please allow microphone permission in your browser settings.")
      return false
    }
  }

  const toggleListening = async () => {
    if (!speechSupported) {
      setError("Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.")
      return
    }

    if (isListening) {
      // Stop listening
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      // Start listening - first check/request microphone permission
      const hasPermission = await requestMicrophonePermission()
      if (!hasPermission) return

      // Store current content before starting
      contentBeforeListeningRef.current = content

      // Setup handlers and start
      setupRecognitionHandlers()

      try {
        recognitionRef.current?.start()
      } catch (err) {
        console.error("Failed to start speech recognition:", err)
        // If already started, stop and restart
        recognitionRef.current?.stop()
        setTimeout(() => {
          recognitionRef.current?.start()
        }, 100)
      }
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSubmit = async () => {
    if (!content.trim()) return

    setLoading(true)
    setError("")

    try {
      const pinHash = sessionStorage.getItem("pinVerified")
      if (!pinHash) {
        setError("Please unlock with your PIN first")
        return
      }

      // Derive encryption key from PIN hash and user ID as salt
      const key = await deriveKeyFromPin(pinHash, userId)

      // Encrypt the content
      const { encrypted, iv } = await encryptContent(content, key)

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedContent: encrypted, iv }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to create post")
        return
      }

      setContent("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
      onPostCreated()
    } catch {
      setError("Failed to create post")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && content.trim()) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm">
      <div className="flex gap-3 p-4">
        {/* Avatar */}
        <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
          {getInitials(userName)}
        </div>

        {/* Input area */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <textarea
              ref={textareaRef}
              placeholder={`What's on your mind, ${userName.split(" ")[0]}?`}
              value={content + (interimTranscript ? (content && !content.endsWith(" ") ? " " : "") + interimTranscript : "")}
              onChange={(e) => {
                // Only allow direct changes when not listening (interimTranscript will be appended)
                if (!isListening) {
                  setContent(e.target.value)
                } else {
                  // When listening, only update if user is typing (not from interim)
                  const baseContent = content
                  const fullValue = e.target.value
                  // If user deleted the interim part or typed more
                  if (!fullValue.endsWith(interimTranscript)) {
                    setContent(fullValue.replace(new RegExp(interimTranscript.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'), ''))
                    setInterimTranscript("")
                  }
                }
              }}
              onKeyDown={handleKeyDown}
              className={"w-full min-h-[56px] max-h-[200px] resize-none bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 text-base leading-relaxed"}
              disabled={loading}
              rows={2}
            />
            {/* Listening indicator */}
            {isListening && (
              <div className="absolute right-0 top-0 flex items-center gap-1.5 text-xs text-primary animate-pulse">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="hidden sm:inline">Listening...</span>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-1.5 text-sm text-destructive mt-2 animate-fade-in">
              {permissionDenied && <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 pb-3 pt-0">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span className="hidden sm:inline">End-to-end encrypted</span>
          <span className="sm:hidden">Encrypted</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice Input Button */}
          <Button
            type="button"
            onClick={toggleListening}
            disabled={loading}
            size="sm"
            variant={isListening ? "destructive" : "outline"}
            className={`h-8 px-3 text-xs font-medium transition-all ${
              isListening
                ? 'animate-pulse'
                : !speechSupported
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
            }`}
            title={
              !speechSupported
                ? "Speech recognition not supported in this browser"
                : isListening
                  ? "Stop recording"
                  : "Start voice input"
            }
          >
            {isListening ? (
              <>
                <MicOff className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Stop</span>
              </>
            ) : (
              <>
                <Mic className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Voice</span>
              </>
            )}
          </Button>

          {/* Post Button */}
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || loading || isListening}
            size="sm"
            className="h-8 px-3 text-xs font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                <span className="hidden sm:inline">Posting...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Post</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
