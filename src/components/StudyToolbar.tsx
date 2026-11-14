"use client";

import { motion } from "motion/react";
import { Info, Pencil, SkipForward, Trash2, Undo2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SPRING } from "@/components/springs";

type ToolbarButtonProps = {
    Icon: LucideIcon;
    label: string;
    isDisabled?: boolean;
    isDanger?: boolean;
    isActive?: boolean;
    onPress: () => void;
};

function ToolbarButton({
                           Icon,
                           label,
                           isDisabled = false,
                           isDanger = false,
                           isActive = false,
                           onPress,
                       }: ToolbarButtonProps) {
    return (
        <motion.button
            type="button"
            onClick={onPress}
            disabled={isDisabled}
            aria-label={label}
            aria-pressed={isActive}
            title={label}
            whileTap={{ scale: 0.88 }}
            transition={SPRING}
            className={`flex h-11 w-11 items-center justify-center rounded-full disabled:text-placeholder pointer-fine:hover:bg-foreground/[0.05] ${
                isDanger ? "text-danger" : "text-secondary"
            } ${isActive ? "bg-foreground/[0.06] text-foreground" : ""}`}
        >
            <Icon className="h-5 w-5" />
        </motion.button>
    );
}

type StudyToolbarProps = {
    canUndo: boolean;
    isInfoOpen: boolean;
    onUndo: () => void;
    onEdit: () => void;
    onSkip: () => void;
    onInfo: () => void;
    onDelete: () => void;
};

export default function StudyToolbar({
                                         canUndo,
                                         isInfoOpen,
                                         onUndo,
                                         onEdit,
                                         onSkip,
                                         onInfo,
                                         onDelete,
                                     }: StudyToolbarProps) {
    return (
        <div
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            className="flex items-center gap-1 rounded-full bg-surface p-1.5 ring-1 ring-foreground/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)]"
        >
            <ToolbarButton Icon={Undo2} label="Undo" isDisabled={!canUndo} onPress={onUndo} />
            <ToolbarButton Icon={Pencil} label="Edit card" onPress={onEdit} />
            <ToolbarButton Icon={SkipForward} label="Skip for now" onPress={onSkip} />
            <ToolbarButton Icon={Info} label="Card info" isActive={isInfoOpen} onPress={onInfo} />
            <ToolbarButton Icon={Trash2} label="Delete card" isDanger onPress={onDelete} />
        </div>
    );
}