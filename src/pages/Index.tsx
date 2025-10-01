"use client";

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import CSVVisualizationDashboard from "../utils/CSVVisualizationDashboard";
import type { Message, Chat, MessageContent } from "@/types";
import {
  LineChart,
  Table,
  BookOpenText,
  MessageCircle,
  Search,
  Plus,
  ArrowUp,
  Copy,
  StopCircle,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  Trash,
  MoreHorizontal,
  Sparkles,
  Database,
  Globe,
  BarChart3,
  Activity,
  Image as ImageIcon,
  X,
  Paperclip,
  Settings,
  EyeOff,
  Brain,
  FileText,
  User,
  Target,
  Lightbulb,
  Star,
  Check,
  Mic,
  MicOff,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fetchData } from "@/utils/api";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import styles from "./index.module.css";
import FunFacts from "../components/ui/FunFacts";

// Gemini API integration
const GEMINI_API_KEY = "AIzaSyBUM2atvtn4ukAxIm5Z2pm8vRagL8Z8v_I";

const analyzeFileWithGemini = async (
  fileBase64: string,
  mimeType: string,
  userPrompt: string,
  fileName: string
) => {
  try {
    // System instructions for file analysis
    const systemPrompt = `
Prompt for ARGO File Interpretation Mode

System Instruction (always enforced):
You are an Anantha, AI assistant specialized in oceanographic data interpretation, focusing on ARGO floats, CTD casts, BGC parameters, salinity, temperature, and oceanographic data analysis.

File Type Handling:
- For images: Analyze visualizations, plots, charts related to oceanography
- For PDF/DOCS: Extract and analyze textual content about oceanographic data
- For XLSX/CSV: Analyze tabular data, provide insights on oceanographic parameters
- For other files: Extract relevant oceanographic information

Check relevance:
- If the file contains oceanographic data, research papers, or related content, analyze it
- If not, respond that the file is not relevant to oceanography

Output:
- Describe the file content and its relevance to oceanography
- Extract key insights, data patterns, or research findings
- Provide scientific analysis based on the content
- Suggest next-step questions a researcher might ask

Tone & style:
- Detailed yet intuitive for non-technical audience
- Use domain terms but explain in plain language
- Behave like a professor or domain expert
`;

    const combinedPrompt = `${systemPrompt}\n\nFile: ${fileName}\nUser Question: ${userPrompt}`;

    // For non-image files, we'll need to handle them differently
    // Currently Gemini primarily supports images, so for other files we'll use text extraction
    if (mimeType.startsWith("image/")) {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: combinedPrompt },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: fileBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8000,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Gemini API error: ${response.status} ${await response.text()}`
        );
      }

      const data = await response.json();
      return (
        data.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text || ""
      );
    } else {
      // For non-image files, we'll use a text-based approach
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${combinedPrompt}\n\nNote: This is a ${mimeType} file. Please provide general analysis capabilities for this file type.`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8000,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Gemini API error: ${response.status} ${await response.text()}`
        );
      }

      const data = await response.json();
      return (
        data.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text ||
        `Analysis of ${fileName} (${mimeType}): This file type contains data that can be analyzed for oceanographic insights.`
      );
    }
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to analyze file with AI");
  }
};

function ChatSidebar({
  chats,
  activeChat,
  onChatSelect,
  onNewChat,
  onDeleteChat,
}: {
  chats: Chat[];
  activeChat: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
}) {
  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar-background">
      <SidebarHeader className="bg-sidebar-background border-b border-sidebar-border">
        <div className="flex items-center justify-between gap-2 p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center size-10 rounded-xl">
              <img
                src="Ananthalogo.png"
                alt="Anantha Logo"
                className="size-8 rounded-lg object-cover"
              />
            </div>

            <div>
              <div className="text-lg font-bold text-foreground tracking-tight">
                Anantha
              </div>
              <div className="text-xs text-muted-foreground">
                Data Intelligence Platform
              </div>
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 text-muted-foreground hover:bg-secondary"
                >
                  <Search className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Search conversations</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4">
        <Button
          variant="default"
          className="mb-6 w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 font-semibold shadow-lg"
          onClick={onNewChat}
        >
          <Plus className="size-4 mr-2" />
          <span>New Analysis</span>
          <Sparkles className="size-4 ml-2" />
        </Button>

        {chats.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2 mb-3">
              Recent Conversations
            </SidebarGroupLabel>
            <SidebarMenu className="space-y-2">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg p-3 transition-all duration-200",
                    activeChat === chat.id
                      ? "bg-accent border border-accent shadow-md"
                      : "hover:bg-secondary"
                  )}
                >
                  <SidebarMenuButton
                    onClick={() => onChatSelect(chat.id)}
                    className="flex-1 justify-start p-0 h-auto font-normal text-foreground"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="size-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                        <MessageCircle className="size-4 text-accent-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-sm text-foreground">
                          {chat.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {chat.messages.length} messages
                        </div>
                      </div>
                    </div>
                  </SidebarMenuButton>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:bg-accent"
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-card border-border text-foreground z-[100]"
                    >
                      <DropdownMenuItem
                        onClick={() => onDeleteChat(chat.id)}
                        className="text-foreground hover:bg-secondary"
                      >
                        <Trash className="size-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

function MessageBubble({
  message,
  isLastMessage,
  onEdit,
  onDelete,
  isEditing,
  onSaveEdit,
  editText,
  setEditText,
  onVote,
  votedState,
}: {
  message: Message;
  isLastMessage: boolean;
  onEdit: (messageId: string | null) => void;
  onDelete: (messageId: string) => void;
  isEditing: boolean;
  onSaveEdit: () => void;
  editText: string;
  setEditText: (text: string) => void;
  onVote: (messageId: string, vote: "up" | "down") => void;
  votedState: { [key: string]: "up" | "down" | null };
}) {
  const isAssistant = message.role === "assistant";
  const { toast } = useToast();
  const isUpvoted = votedState[message.id] === "up";
  const isDownvoted = votedState[message.id] === "down";

  const handleCopy = async (content: string | MessageContent) => {
    try {
      let textToCopy = "";
      if (typeof content === "string") {
        textToCopy = content;
      } else {
        if (content.type === "table") {
          textToCopy =
            content.explanation +
            "\n\n" +
            content.tableData.map((row) => row.join("\t")).join("\n");
        } else if (content.type === "plot") {
          textToCopy =
            content.explanation +
            "\n\n" +
            JSON.stringify(content.plotData, null, 2);
        } else if (content.type === "theory") {
          textToCopy = content.component + "\n\n" + content.explanation;
        } else if (content.type === "file") {
          textToCopy = content.analysis || "File analysis";
        } else {
          textToCopy = JSON.stringify(content, null, 2);
        }
      }

      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: "Copied to clipboard",
        description: "Message content has been copied.",
      });
    } catch (err) {
      console.error("Copy failed:", err);
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleVote = (vote: "up" | "down") => {
    onVote(message.id, vote);
    toast({
      title:
        vote === "up"
          ? "Thanks for your feedback!"
          : "Thank you for helping us with this intimation.",
      description:
        vote === "up"
          ? "This positive rating helps us reinforce the chatbot's current response patterns."
          : "This negative rating signals our system to adjust its weights and reduce the likelihood of generating similar responses.",
    });
  };

  const renderContent = () => {
    const content = message.content;
    if (typeof content === "string") {
      return (
        <div className="prose prose-invert max-w-none">
          <div className="whitespace-pre-wrap text-foreground break-words">
            {content}
          </div>
        </div>
      );
    }

    if (content && typeof content === "object") {
      // File content
      if (content.type === "file") {
        return (
          <div className="space-y-4">
            {content.fileUrl && (
              <div className="rounded-lg overflow-hidden border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <FileText className="size-8 text-primary" />
                  <div>
                    <div className="font-medium text-foreground">
                      {content.fileName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {content.fileType}
                    </div>
                  </div>
                </div>
                {content.fileType?.startsWith("image/") && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-border">
                    <img
                      src={content.fileUrl}
                      alt={content.fileName || "Uploaded image"}
                      className="w-full h-auto max-h-64 object-contain bg-card"
                    />
                  </div>
                )}
              </div>
            )}
            {content.analysis && (
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkBreaks, remarkGfm]}>
                    {content.analysis}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        );
      }

      // Table content
      if (content.type === "table" && content.tableData) {
        return (
          <div className="space-y-6">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse bg-card text-foreground">
                <thead>
                  <tr className="bg-secondary">
                    {content.columns?.map((header: string, i: number) => (
                      <th
                        key={i}
                        className="border-b border-border px-4 py-3 text-left font-medium"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {content.tableData.map((row: any, i: number) => (
                    <tr
                      key={i}
                      className="hover:bg-secondary transition-colors"
                    >
                      {content.columns?.map((col: string, j: number) => (
                        <td
                          key={j}
                          className="border-b border-border px-4 py-3 text-foreground"
                        >
                          {row[col]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {content.explanation && (
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="text-sm text-foreground">{content.explanation}</div>
              </div>
            )}

            {content.csvDownload && (
              <Button
                variant="outline"
                className="border-border text-foreground hover:bg-secondary transition-all duration-200"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href =
                    "https://anantha-kwml.onrender.com/static/tables/userId_chatId_uniqueId.csv";
                  link.download = "data.csv";
                  link.click();
                }}
              >
                <Database className="size-4 mr-2" />
                Download CSV
              </Button>
            )}
          </div>
        );
      }

      // PLOT rendering
      if (content.type === "plot") {
        if (!content.csvUrl) {
          return (
            <div className="bg-card rounded-lg p-4 border border-border">
              <p className="text-sm text-muted-foreground">
                {content.explanation || "No plot available."}
              </p>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            <CSVVisualizationDashboard
              csvFile={content.csvUrl}
              initialPlotType="line"
            />

            <Button
              variant="outline"
              className="border-border text-foreground hover:bg-secondary transition-all duration-200"
              onClick={() => {
                const link = document.createElement("a");
                link.href =
                  "https://anantha-kwml.onrender.com/static/plots/userId_chatId_uniqueId.csv";
                link.download = "data.csv";
                link.click();
              }}
            >
              <Database className="size-4 mr-2" />
              Download Plot Data (CSV)
            </Button>
          </div>
        );
      }

      // Theory content
      if (content.type === "theory") {
        const theoryText = content.message || "No content available.";
        return (
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="prose prose-invert max-w-none whitespace-pre-wrap">
              <ReactMarkdown remarkPlugins={[remarkBreaks, remarkGfm]}>
                {theoryText}
              </ReactMarkdown>
            </div>
          </div>
        );
      }
    }

    return (
      <div className="text-muted-foreground p-4 rounded-lg bg-secondary">
        Unable to render content: {JSON.stringify(content)}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-6xl flex-col gap-3 mb-8 px-4 sm:px-6",
        isAssistant ? "items-start" : "items-end"
      )}
    >
      {isAssistant ? (
        <div className="group flex w-full flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center shadow-lg">
              <Activity className="size-4 text-primary-foreground" />
            </div>
            <div className="text-sm font-medium text-foreground">Anantha AI</div>
            <Badge
              variant="secondary"
              className="text-xs bg-secondary text-foreground"
            >
              {message.content && typeof message.content === "object"
                ? message.content.type
                : "response"}
            </Badge>
          </div>

          <div className="ml-11">{renderContent()}</div>

          <TooltipProvider>
            <div
              className={cn(
                "ml-8 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100",
                isLastMessage && "opacity-100"
              )}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full text-muted-foreground hover:bg-secondary"
                    onClick={() => handleCopy(message.content)}
                  >
                    <Copy className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy response</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isUpvoted ? "default" : "ghost"}
                    size="icon"
                    className={cn(
                      "size-8 rounded-full transition-all duration-200",
                      isUpvoted
                        ? "bg-success hover:bg-success text-foreground shadow-lg"
                        : "hover:bg-secondary text-muted-foreground"
                    )}
                    onClick={() => handleVote("up")}
                  >
                    <ThumbsUp className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Helpful</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isDownvoted ? "default" : "ghost"}
                    size="icon"
                    className={cn(
                      "size-8 rounded-full transition-all duration-200",
                      isDownvoted
                        ? "bg-destructive hover:bg-destructive text-foreground shadow-lg"
                        : "hover:bg-secondary text-muted-foreground"
                    )}
                    onClick={() => handleVote("down")}
                  >
                    <ThumbsDown className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Not helpful</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      ) : (
        <div className="group flex flex-col items-end gap-2">
          {isEditing ? (
            <div className="max-w-[100%] sm:max-w-[100%] space-y-3">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="min-h-[100px] bg-card border-border text-foreground resize-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={onSaveEdit}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                >
                  Save & Regenerate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(null)}
                  className="text-foreground border-border hover:bg-secondary"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-primary text-primary-foreground rounded-2xl px-5 py-3 max-w-[85%] sm:max-w-[80%] break-words space-y-3 shadow-lg">
              {message.uploadedFile && (
                <div className="rounded-lg overflow-hidden bg-primary/80 p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4" />
                    <span className="text-sm">{message.fileName}</span>
                  </div>
                </div>
              )}
              <div className="whitespace-pre-wrap font-medium">
                {typeof message.content === "string"
                  ? message.content
                  : JSON.stringify(message.content)}
              </div>
            </div>
          )}

          <TooltipProvider>
            <div className="flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full text-muted-foreground hover:bg-secondary"
                    onClick={() => onEdit(message.id)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit message</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full text-muted-foreground hover:bg-secondary"
                    onClick={() => onDelete(message.id)}
                  >
                    <Trash className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete message</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}

function ChatContent({
  messages,
  setMessages,
  chatTitle,
}: {
  messages: Message[];
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  chatTitle: string;
}) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [votedMessages, setVotedMessages] = useState<{
    [key: string]: "up" | "down" | null;
  }>({});
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<{
    name: string;
    type: string;
    url: string;
  } | null>(null);
  const [isIncognito, setIsIncognito] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("Plot");

  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userRole, setUserRole] = useState("Student");
  const [explanationLevel, setExplanationLevel] = useState(5);
  const [familiarityLevel, setFamiliarityLevel] = useState(5);
  const [objectives, setObjectives] = useState<string[]>([]);
  const [featureWishlist, setFeatureWishlist] = useState("");
  const [experienceRating, setExperienceRating] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  // Fixed click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setIsSettingsOpen(false);
        setShowSuccess(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Apply preferences function
  const applyPreferences = () => {
    console.log("Preferences applied:", {
      userRole,
      explanationLevel,
      familiarityLevel,
      objectives,
      featureWishlist,
      experienceRating,
    });

    setShowSuccess(true);
    setTimeout(() => {
      setIsSettingsOpen(false);
      setShowSuccess(false);
    }, 2000);
  };

  // Toggle objective selection
  const toggleObjective = (objective: string) => {
    setObjectives((prev) =>
      prev.includes(objective)
        ? prev.filter((item) => item !== objective)
        : [...prev, objective]
    );
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = "auto";
    target.style.height = target.scrollHeight + "px";
    setPrompt(target.value);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Supported file types
    const supportedTypes = [
      "image/*",
      ".pdf",
      ".doc",
      ".docx",
      ".xlsx",
      ".xls",
      ".csv",
      ".txt",
      ".nc",
    ];

    const isValidType = supportedTypes.some((type) => {
      if (type === "image/*") {
        return file.type.startsWith("image/");
      }
      return file.name.toLowerCase().endsWith(type);
    });

    if (!isValidType) {
      toast({
        title: "Unsupported file type",
        description:
          "Please select an image, PDF, Word, Excel, CSV, or text file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 25MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedFile(result);
      setFilePreview({
        name: file.name,
        type: file.type,
        url: result,
      });
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setUploadedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toggleIncognito = () => {
    const newIncognitoState = !isIncognito;
    setIsIncognito(newIncognitoState);
    toast({
      title: newIncognitoState
        ? "Incognito Mode Enabled"
        : "Incognito Mode Disabled",
      description: newIncognitoState
        ? "Your responses won't be saved to chat history"
        : "Responses will be saved to chat history",
    });
  };

  const generateResponse = async (
    userPrompt: string,
    activeTab: string,
    language: string,
    imageData?: string
  ): Promise<Message> => {
    try {
      if (imageData) {
        const base64File = imageData.split(",")[1];
        const analysis = await analyzeFileWithGemini(
          base64File,
          filePreview?.type || "",
          userPrompt,
          filePreview?.name || "Uploaded file"
        );

        return {
          id: `${Date.now()}-${Math.random()}`,
          role: "assistant",
          content: {
            type: "file",
            fileUrl: imageData,
            fileName: filePreview?.name,
            fileType: filePreview?.type,
            analysis: analysis,
          },
        };
      }

      let normalizedTab = activeTab.toLowerCase();
      if (normalizedTab === "advanced reasoning") {
        normalizedTab = "theory";
      }

      console.log("sending to backend", {
        tab: normalizedTab,
        query: userPrompt,
        language,
        imageData,
      });

      const response = await fetchData(
        userPrompt,
        normalizedTab,
        language,
        imageData
      );

      let content: MessageContent;
      console.log("response from backend:", response);
      console.log("response.type:", response.type);

      switch (response.type) {
        case "table":
          content = {
            type: "table",
            tableData: response.raw_data || [],
            columns: response.columns || [],
            explanation: response.message || "No explanation available.",
            csvDownload: response.csv_url || "",
          };
          break;

        case "plot":
          content = {
            type: "plot",
            csvUrl: response.csv_url || "",
            explanation: response.message || "Data prepared for plotting.",
            plotType: "line",
          };
          break;

        case "theory":
          content = {
            type: "theory",
            message: response.message || "No theory content available.",
          };
          break;

        default:
          content = {
            type: "theory",
            message: "Invalid tab selection.",
          };
      }

      return {
        id: `${Date.now()}-${Math.random()}`,
        role: "assistant",
        content,
      };
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error("Request was aborted");
      }
      console.error("Error generating response:", error);
      throw error;
    }
  };

  const handleSubmit = async (submitPrompt?: string) => {
    const finalPrompt = submitPrompt || prompt.trim();
    if ((!finalPrompt && !uploadedFile) || isLoading) return;

    // Stop voice recognition if it's active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    if (!submitPrompt) {
      setPrompt("");
    }

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    const newUserMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      role: "user",
      content:
        finalPrompt ||
        `Analyze this ${
          filePreview?.type.startsWith("image/") ? "image" : "file"
        }`,
      uploadedFile: uploadedFile,
      fileName: filePreview?.name,
      fileType: filePreview?.type,
    };

    if (!isIncognito) {
      setMessages((prev) => [...prev, newUserMessage]);
    }

    try {
      const response = await generateResponse(
        finalPrompt,
        activeTab,
        selectedLanguage,
        uploadedFile || undefined
      );

      if (!isIncognito) {
        setMessages((prev) => [...prev, response]);
      } else {
        setMessages((prev) => {
          const newMessages = [...prev];
          if (
            newMessages.length > 0 &&
            newMessages[newMessages.length - 1].role === "user"
          ) {
            newMessages[newMessages.length - 1] = response;
          } else {
            newMessages.push(response);
          }
          return newMessages;
        });
      }
    } catch (error: any) {
      console.error("Error generating response:", error);
      if (error.name !== "AbortError") {
        toast({
          title: "Analysis Failed",
          description: `Unable to process your request: ${error.message}`,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      setUploadedFile(null);
      setFilePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
  };

  const handleEditMessage = (messageId: string | null) => {
    if (messageId === null) {
      setEditingMessage(null);
      setEditText("");
      return;
    }

    const message = messages.find((m) => m.id === messageId);
    if (message && typeof message.content === "string") {
      setEditingMessage(messageId);
      setEditText(message.content);
    }
  };

  const handleSaveEdit = () => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === editingMessage ? { ...msg, content: editText } : msg
      )
    );

    handleSubmit(editText);
    setEditingMessage(null);
    setEditText("");
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    toast({
      title: "Message deleted",
      description: "The message has been removed from the conversation.",
    });
  };

  const handleVote = (messageId: string, vote: "up" | "down") => {
    setVotedMessages((prev) => ({ ...prev, [messageId]: vote }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Initialize voice recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false; // Changed from true to false
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result) => result.transcript)
            .join("");

          setPrompt(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
          toast({
            title: "Voice input error",
            description: "Could not access microphone. Please check permissions.",
            variant: "destructive",
          });
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Voice input not supported",
        description: "Your browser doesn't support voice input.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const analysisTypes = [
    {
      id: "Plot",
      icon: BarChart3,
      label: "Visualizations",
      description: "Generate interactive charts and graphs",
    },
    {
      id: "Table",
      icon: Table,
      label: "Data Tables",
      description: "Structure and analyze tabular data",
    },
    {
      id: "Theory",
      icon: BookOpenText,
      label: "Theory & Insights",
      description: "Get detailed explanations and analysis",
    },
    {
      id: "Advanced Reasoning",
      icon: Brain,
      label: "Advanced Reasoning",
      description: "Advanced analytical reasoning and insights",
    },
  ];

  const languages = [
    { value: "english", label: "English" },
    { value: "hindi", label: "Hindi" },
    { value: "tamil", label: "Tamil" },
    { value: "telugu", label: "Telugu" },
    { value: "bengali", label: "Bengali" },
    { value: "marathi", label: "Marathi" },
    { value: "punjabi", label: "Punjabi" },
    { value: "afrikaans", label: "Afrikaans" },
    { value: "amharic", label: "Amharic" },
    { value: "assamese", label: "Assamese" },
    { value: "azerbaijani", label: "Azerbaijani" },
    { value: "belarusian", label: "Belarusian" },
    { value: "bosnian", label: "Bosnian" },
    { value: "catalan", label: "Catalan" },
    { value: "cebuano", label: "Cebuano" },
    { value: "corsican", label: "Corsican" },
    { value: "welsh", label: "Welsh" },
    { value: "dhivehi", label: "Dhivehi" },
    { value: "esperanto", label: "Esperanto" },
    { value: "basque", label: "Basque" },
    { value: "persian", label: "Persian / Farsi" },
    { value: "filipino", label: "Filipino (Tagalog)" },
    { value: "frisian", label: "Frisian" },
    { value: "irish", label: "Irish" },
    { value: "scots_gaelic", label: "Scots Gaelic" },
    { value: "galician", label: "Galician" },
    { value: "gujarati", label: "Gujarati" },
    { value: "hausa", label: "Hausa" },
    { value: "hawaiian", label: "Hawaiian" },
    { value: "hmong", label: "Hmong" },
    { value: "haitian_creole", label: "Haitian Creole" },
    { value: "armenian", label: "Armenian" },
    { value: "igbo", label: "Igbo" },
    { value: "icelandic", label: "Icelandic" },
    { value: "javanese", label: "Javanese" },
    { value: "georgian", label: "Georgian" },
    { value: "kazakh", label: "Kazakh" },
    { value: "khmer", label: "Khmer" },
    { value: "kannada", label: "Kannada" },
    { value: "kri", label: "Krio" },
    { value: "kurdish", label: "Kurdish" },
    { value: "kyrgyz", label: "Kyrgyz" },
    { value: "latin", label: "Latin" },
    { value: "luxembourgish", label: "Luxembourgish" },
    { value: "lao", label: "Lao" },
    { value: "malagasy", label: "Malagasy" },
    { value: "maori", label: "Maori" },
    { value: "macedonian", label: "Macedonian" },
    { value: "malayalam", label: "Malayalam" },
    { value: "mongolian", label: "Mongolian" },
    { value: "manipuri", label: "Meiteilon / Manipuri" },
    { value: "malay", label: "Malay" },
    { value: "maltese", label: "Maltese" },
    { value: "burmese", label: "Burmese (Myanmar)" },
    { value: "nepali", label: "Nepali" },
    { value: "nyanja", label: "Nyanja / Chichewa" },
    { value: "odia", label: "Odia (Oriya)" },
    { value: "pashto", label: "Pashto" },
    { value: "sindhi", label: "Sindhi" },
    { value: "sinhala", label: "Sinhala / Sinhalese" },
    { value: "samoan", label: "Samoan" },
    { value: "shona", label: "Shona" },
    { value: "somali", label: "Somali" },
    { value: "albanian", label: "Albanian" },
    { value: "sesotho", label: "Sesotho" },
    { value: "sundanese", label: "Sundanese" },
    { value: "tajik", label: "Tajik" },
    { value: "urdu", label: "Urdu" },
    { value: "uyghur", label: "Uyghur" },
    { value: "uzbek", label: "Uzbek" },
    { value: "xhosa", label: "Xhosa" },
    { value: "yiddish", label: "Yiddish" },
    { value: "yoruba", label: "Yoruba" },
    { value: "zulu", label: "Zulu" },
  ];

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="bg-card z-10 flex h-16 w-full shrink-0 items-center gap-4 border-b border-border px-6 shadow-sm">
        <SidebarTrigger className="-ml-1 text-foreground hover:bg-secondary transition-all duration-200 rounded-lg" />
        <div className="flex items-center gap-3 flex-1">
          <div className="text-foreground font-medium">{chatTitle}</div>
          <Badge
            variant="secondary"
            className="text-xs bg-secondary text-foreground"
          >
            {activeTab} Mode
          </Badge>

          {isIncognito && (
            <Badge className="text-xs bg-red-500 text-white shadow-lg">Incognito</Badge>
          )}
        </div>

        {/* Incognito Mode Icon */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleIncognito}
                className={cn(
                  "p-2 rounded-lg transition-all duration-200",
                  isIncognito
                    ? "bg-accent text-accent-foreground shadow-md"
                    : "text-muted-foreground hover:bg-secondary"
                )}
                aria-label="Incognito mode"
              >
                <EyeOff className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {isIncognito ? "Incognito mode enabled" : "Enable incognito mode"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Settings Icon */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="text-muted-foreground hover:bg-secondary p-2 rounded-lg transition-all duration-200"
                aria-label="Open preferences"
              >
                <Settings className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Preferences</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </header>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            ref={modalRef}
            className="bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border"
          >
            <div className="p-6">
              {!showSuccess ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-foreground">
                      Chatbot Preferences
                    </h2>
                    <button
                      onClick={() => setIsSettingsOpen(false)}
                      className="text-muted-foreground hover:text-foreground transition-colors duration-200 p-1 hover:bg-secondary rounded-lg"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-8">
                    {/* Your Profile Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Your Profile
                      </h3>
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-foreground mb-2">
                          What best describes your role?
                        </label>
                        <Select value={userRole} onValueChange={setUserRole}>
                          <SelectTrigger className="w-full bg-background border-border text-foreground">
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border text-foreground z-[100]">
                            <SelectItem value="Student">Student</SelectItem>
                            <SelectItem value="Working Professional">
                              Working Professional
                            </SelectItem>
                            <SelectItem value="Research Expert">
                              Research Expert
                            </SelectItem>
                            <SelectItem value="Working in ARGO/Oceanography">
                              Working in ARGO/Oceanography
                            </SelectItem>
                            <SelectItem value="Domain Expert/Scientist">
                              Domain Expert/Scientist
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Explanation Preferences Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Explanation Preferences
                      </h3>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-3">
                            On a scale of 1-10, what level of explanations do
                            you need?
                            <span className="block text-xs text-muted-foreground mt-1">
                              (Simple 1 → Detailed 10)
                            </span>
                          </label>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground w-4">
                              1
                            </span>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              value={explanationLevel}
                              onChange={(e) =>
                                setExplanationLevel(parseInt(e.target.value))
                              }
                              className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <span className="text-sm text-muted-foreground w-4">
                              10
                            </span>
                            <span className="text-sm font-medium text-foreground min-w-[30px] text-center bg-secondary px-2 py-1 rounded">
                              {explanationLevel}
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-3">
                            On a scale of 1-10, how familiar are you with ARGO
                            data and oceanography?
                            <span className="block text-xs text-muted-foreground mt-1">
                              (Novice 1 → Expert 10)
                            </span>
                          </label>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground w-4">
                              1
                            </span>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              value={familiarityLevel}
                              onChange={(e) =>
                                setFamiliarityLevel(parseInt(e.target.value))
                              }
                              className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <span className="text-sm text-muted-foreground w-4">
                              10
                            </span>
                            <span className="text-sm font-medium text-foreground min-w-[30px] text-center bg-secondary px-2 py-1 rounded">
                              {familiarityLevel}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Your Objectives Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        Your Objectives
                      </h3>
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-foreground mb-2">
                          What are your main objectives with this application?
                          (Select all that apply)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            "Advanced Reasoning",
                            "Theoretical Discussions",
                            "Visualizations",
                            "Data Fetching",
                            "Data Download",
                            "Other Features",
                          ].map((objective) => (
                            <div
                              key={objective}
                              onClick={() => toggleObjective(objective)}
                              className={cn(
                                "p-3 rounded-lg border cursor-pointer transition-all duration-200",
                                objectives.includes(objective)
                                  ? "bg-primary/20 border-primary text-foreground shadow-md"
                                  : "bg-background border-border text-foreground hover:bg-secondary"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "size-5 rounded border flex items-center justify-center flex-shrink-0 transition-all duration-200",
                                    objectives.includes(objective)
                                      ? "bg-primary border-primary"
                                      : "border-border"
                                  )}
                                >
                                  {objectives.includes(objective) && (
                                    <Check className="size-3 text-primary-foreground" />
                                  )}
                                </div>
                                <span className="text-sm font-medium">
                                  {objective}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Feature Wishlist Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Lightbulb className="w-5 h-5" />
                        Feature Wishlist
                      </h3>
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-foreground mb-2">
                          What feature would you like to see added to this
                          application?
                        </label>
                        <Textarea
                          placeholder="Tell us about your ideal feature…"
                          value={featureWishlist}
                          onChange={(e) => setFeatureWishlist(e.target.value)}
                          className="min-h-[100px] bg-background border-border text-foreground resize-none"
                        />
                      </div>
                    </div>

                    {/* Rate Your Experience Section */}
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Star className="w-5 h-5" />
                        Rate Your Experience
                      </h3>
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-foreground mb-2">
                          How would you rate your experience with our chatbot so
                          far?
                        </label>
                        <div className="flex gap-1 justify-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setExperienceRating(star)}
                              className="p-1 transition-transform duration-200 hover:scale-110 focus:outline-none"
                              type="button"
                            >
                              <Star
                                className={cn(
                                  "w-8 h-8 transition-colors",
                                  star <= experienceRating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground hover:text-yellow-300"
                                )}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t border-border mt-6">
                    <Button
                      onClick={applyPreferences}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg transition-all duration-200 font-medium shadow-lg"
                    >
                      Apply Preferences
                    </Button>
                  </div>
                </>
              ) : (
                /* Success Message */
                <div className="text-center py-8">
                  <div className="size-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
                    <Check className="size-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Preferences Applied Successfully!
                  </h3>
                  <p className="text-muted-foreground">
                    Your settings have been updated and will enhance your
                    chatbot experience.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ScrollArea ref={chatContainerRef} className="flex-1 px-4">
        <div className="pt-4 pb-2">
          {messages.length === 0 && (
            <div className="mx-auto max-w-6xl text-center pt-16 pb-16">
              <h2 className="text-3xl font-bold mb-3 text-foreground">
                Welcome to Anantha
              </h2>
              <p className="text-base text-muted-foreground mb-8 max-w-2xl mx-auto">
                Your intelligent data analysis companion. Explore ocean data,
                generate visualizations, and uncover insights with AI-powered
                analytics.
              </p>
              <FunFacts />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
                {analysisTypes.map((type) => (
                  <Card
                    key={type.id}
                    className="p-4 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer bg-card border-border glass-effect"
                    onClick={() => setActiveTab(type.id)}
                  >
                    <div className="text-center space-y-3">
                      <div className="size-12 rounded-xl bg-accent flex items-center justify-center mx-auto">
                        <type.icon className="size-6 text-accent-foreground" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">
                          {type.label}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {type.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isLastMessage={index === messages.length - 1}
              onEdit={handleEditMessage}
              onDelete={handleDeleteMessage}
              isEditing={editingMessage === message.id}
              onSaveEdit={handleSaveEdit}
              editText={editText}
              setEditText={setEditText}
              onVote={handleVote}
              votedState={votedMessages}
            />
          ))}

          {isLoading && (
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 mb-8 px-4 sm:px-6 items-start">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-primary flex items-center justify-center shadow-lg">
                  <Activity className="size-4 text-primary-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="animate-spin size-4 border-2 border-primary border-t-transparent rounded-full"></div>
                  <span className="text-muted-foreground font-medium">
                    {uploadedFile
                      ? "Analyzing file..."
                      : "Analyzing your data..."}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStopGeneration}
                    className="ml-3 text-muted-foreground hover:bg-secondary"
                  >
                    <StopCircle className="size-4 mr-1" />
                    Stop
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="bg-background z-10 shrink-0 p-4 md:p-6">
        <div className="mx-auto max-w-6xl">
          <Card className="relative border border-border p-0 bg-background shadow-lg">
            <CardContent className="p-0">
              <div className="flex flex-col">
                {/* File Preview */}
                {filePreview && (
                  <div className="p-4 border-b border-border">
                    <div className="relative inline-block">
                      <div className="flex items-center gap-3 bg-secondary rounded-lg p-3 border border-border">
                        {filePreview.type.startsWith("image/") ? (
                          <ImageIcon className="size-6 text-primary" />
                        ) : (
                          <FileText className="size-6 text-primary" />
                        )}
                        <div>
                          <div className="font-medium text-foreground">
                            {filePreview.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {filePreview.type}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={removeFile}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                      {filePreview.type.startsWith("image/") && (
                        <div className="mt-3 rounded-lg overflow-hidden border border-border">
                          <img
                            src={filePreview.url}
                            alt={filePreview.name}
                            className="w-full h-auto max-h-48 object-contain bg-card"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Textarea
                  placeholder={
                    filePreview
                      ? "Describe what you want to know about this file..."
                      : "Analyze ocean temperature patterns..."
                  }
                  value={prompt}
                  onInput={handleInput}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  style={{ minHeight: "80px" }}
                  className="
                    border-0 
                    resize-none 
                    overflow-hidden
                    pt-4 px-4 text-base
                    bg-background text-foreground placeholder:text-muted-foreground
                    min-h-[80px] max-h-[200px]
                  "
                />

                <div className="mt-2 flex w-full items-center justify-between gap-3 px-4 pb-4 flex-nowrap overflow-x-auto">
                  <div className="flex items-center gap-2 flex-nowrap min-w-max">
                    {/* File upload button */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="rounded-xl text-muted-foreground border-border hover:bg-secondary transition-all duration-200"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                          >
                            <Paperclip className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="z-[100]">
                          Upload file (images, PDF, Excel, etc.)
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xlsx,.xls,.csv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <div className="flex items-center gap-1 flex-nowrap">
                      {analysisTypes.map((type) => (
                        <TooltipProvider key={type.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={
                                  activeTab === type.id ? "default" : "outline"
                                }
                                className={cn(
                                  "rounded-xl transition-all duration-200 font-medium whitespace-nowrap",
                                  activeTab === type.id
                                    ? "bg-primary text-primary-foreground shadow-lg"
                                    : "text-muted-foreground border-border hover:bg-secondary"
                                )}
                                disabled={isLoading}
                                onClick={() => setActiveTab(type.id)}
                              >
                                <type.icon size={16} className="md:mr-2" />
                                <span className="hidden md:inline">{type.label}</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-card text-foreground border-border z-[100]">
                              <div className="text-center">
                                <div className="font-medium">{type.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {type.description}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>

                    <Select
                      value={selectedLanguage}
                      onValueChange={setSelectedLanguage}
                    >
                      <SelectTrigger className="w-[130px] bg-primary border-primary text-primary-foreground font-medium">
                        <Globe className="size-4 mr-2" />
                        <SelectValue placeholder="Language" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground z-[100]">
                        {languages.map((lang) => (
                          <SelectItem
                            key={lang.value}
                            value={lang.value}
                            className="focus:bg-secondary"
                          >
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={toggleVoiceInput}
                            disabled={isLoading}
                            className={cn(
                              "size-10 rounded-xl transition-all duration-200",
                              isListening
                                ? "bg-red-500 text-white border-red-500 hover:bg-red-600 animate-pulse shadow-lg"
                                : "text-muted-foreground border-border hover:bg-secondary"
                            )}
                          >
                            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="z-[100]">
                          {isListening ? "Stop voice input" : "Start voice input"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      {isLoading ? (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleStopGeneration}
                          className="size-10 rounded-xl text-muted-foreground border-border hover:bg-secondary transition-all duration-200"
                        >
                          <StopCircle size={18} />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          disabled={
                            (!prompt.trim() && !uploadedFile) || isLoading
                          }
                          onClick={() => handleSubmit()}
                          className="size-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          <ArrowUp size={18} />
                        </Button>
                      )}
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

const Index = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [chatCounter, setChatCounter] = useState(1);

  const createNewChat = useCallback(() => {
    const newChatId = Date.now().toString();
    const newChat: Chat = {
      id: newChatId,
      title: `Analysis Session ${chatCounter}`,
      messages: [],
      createdAt: new Date(),
    };

    setChats((prev) => {
      if (prev.some((c) => c.title === newChat.title)) return prev;
      return [newChat, ...prev];
    });
    setActiveChat(newChatId);
    setChatCounter((prev) => prev + 1);
  }, [chatCounter]);

  const deleteChat = useCallback(
    (chatId: string) => {
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChat === chatId) {
        const remainingChats = chats.filter((c) => c.id !== chatId);
        setActiveChat(remainingChats.length > 0 ? remainingChats[0].id : null);
      }
    },
    [activeChat, chats]
  );

  const updateChatTitle = useCallback(
    (chatId: string, messages: Message[]) => {
      const chat = chats.find((c) => c.id === chatId);
      if (chat && chat.title.startsWith("Analysis Session")) {
        const firstUserMessage = messages.find((m) => m.role === "user");
        if (firstUserMessage && typeof firstUserMessage.content === "string") {
          const title =
            firstUserMessage.content.slice(0, 40) +
            (firstUserMessage.content.length > 40 ? "..." : "");
          setChats((prev) =>
            prev.map((c) => (c.id === chatId ? { ...c, title } : c))
          );
        }
      }
    },
    [chats]
  );

  const selectChat = useCallback((chatId: string) => {
    setActiveChat(chatId);
  }, []);

  const currentChat = chats.find((chat) => chat.id === activeChat);

  useEffect(() => {
    if (chats.length === 0) {
      createNewChat();
    }
  }, [chats.length, createNewChat]);

  useEffect(() => {
    if (currentChat && currentChat.messages.length > 0) {
      updateChatTitle(currentChat.id, currentChat.messages);
    }
  }, [currentChat, updateChatTitle]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TooltipProvider>
        <SidebarProvider>
          <ChatSidebar
            chats={chats}
            activeChat={activeChat}
            onChatSelect={selectChat}
            onNewChat={createNewChat}
            onDeleteChat={deleteChat}
          />
          <SidebarInset>
            {currentChat ? (
              <ChatContent
                messages={currentChat.messages}
                setMessages={(update) => {
                  setChats((prevChats) =>
                    prevChats.map((chat) => {
                      if (chat.id === currentChat.id) {
                        const newMessages =
                          typeof update === "function"
                            ? update(chat.messages)
                            : update;
                        return { ...chat, messages: newMessages };
                      }
                      return chat;
                    })
                  );
                }}
                chatTitle={currentChat.title}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="size-16 rounded-2xl bg-primary mx-auto flex items-center justify-center shadow-lg">
                    <Sparkles className="size-8 text-primary-foreground" />
                  </div>
                  <div className="text-xl font-medium text-muted-foreground">
                    Create a new analysis session to get started
                  </div>
                </div>
              </div>
            )}
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </div>
  );
};

export default Index;