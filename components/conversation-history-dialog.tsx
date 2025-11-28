"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
    MessageSquare, 
    Trash2, 
    Calendar, 
    Image as ImageIcon,
    Loader2,
    Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConversationHistoryItem } from "@/hooks/use-conversation-history";

interface ConversationHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    conversations: ConversationHistoryItem[];
    isLoading: boolean;
    onDeleteConversation: (conversationId: string) => void;
    onClearAll: () => void;
    onStartNew: () => void;
    onLoadConversation?: (conversation: ConversationHistoryItem) => void;
}

export function ConversationHistoryDialog({
    open,
    onOpenChange,
    conversations,
    isLoading,
    onDeleteConversation,
    onClearAll,
    onStartNew,
    onLoadConversation,
}: ConversationHistoryDialogProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays === 1) {
            return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays < 7) {
            return `${diffDays}天前`;
        } else {
            return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        }
    };

    const handleDelete = async (conversationId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        setDeletingId(conversationId);
        try {
            onDeleteConversation(conversationId);
        } finally {
            setDeletingId(null);
        }
    };

    const handleStartNew = () => {
        onStartNew();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        对话历史
                    </DialogTitle>
                    <DialogDescription>
                        查看最近的对话记录。最多保存 15 次对话。
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-2 mb-4 flex-shrink-0">
                    <Button
                        onClick={handleStartNew}
                        className="flex-1 gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        开始新对话
                    </Button>
                    {conversations.length > 0 && (
                        <Button
                            variant="outline"
                            onClick={onClearAll}
                            className="gap-2 text-red-600 hover:text-red-700"
                        >
                            <Trash2 className="h-4 w-4" />
                            清空全部
                        </Button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pr-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="text-center p-8 text-gray-500">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-sm">暂无对话历史</p>
                            <p className="text-xs text-gray-400 mt-1">
                                开始聊天后会自动保存对话记录
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {conversations.map((conversation) => (
                                <div
                                    key={conversation.id}
                                    onClick={() => {
                                        if (onLoadConversation) {
                                            onLoadConversation(conversation);
                                            onOpenChange(false);
                                        }
                                    }}
                                    className="group flex items-start gap-3 p-3 rounded-xl border hover:border-gray-300 hover:bg-gray-50 cursor-pointer transition-all"
                                >
                                    <div className="shrink-0 mt-1">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                            <MessageSquare className="h-4 w-4 text-blue-600" />
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className="text-sm font-medium text-gray-900 truncate">
                                                {conversation.title}
                                            </h4>
                                            <button
                                                onClick={(e) => handleDelete(conversation.id, e)}
                                                disabled={deletingId === conversation.id}
                                                className="shrink-0 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                                            >
                                                {deletingId === conversation.id ? (
                                                    <Loader2 className="h-3 w-3 animate-spin text-red-500" />
                                                ) : (
                                                    <Trash2 className="h-3 w-3 text-red-500" />
                                                )}
                                            </button>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {formatDate(conversation.updatedAt)}
                                            </div>
                                            
                                            <div className="flex items-center gap-1">
                                                <MessageSquare className="h-3 w-3" />
                                                {conversation.messageCount} 条消息
                                            </div>
                                            
                                            {conversation.diagramResults && conversation.diagramResults.length > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <ImageIcon className="h-3 w-3" />
                                                    {conversation.diagramResults.length} 张图
                                                </div>
                                            )}

                                            {conversation.renderMode && (
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase",
                                                    conversation.renderMode === "svg" 
                                                        ? "bg-purple-100 text-purple-700"
                                                        : "bg-blue-100 text-blue-700"
                                                )}>
                                                    {conversation.renderMode}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
