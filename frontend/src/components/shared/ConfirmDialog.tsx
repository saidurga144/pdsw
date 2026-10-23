'use client';

import React from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  auditPreviewMessage?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm Action',
  cancelText = 'Cancel',
  isDestructive = true,
  auditPreviewMessage = 'This action will generate an immutable audit log and IPFS evidence entry.',
}) => {
  if (!isOpen) return null;

  return (
    <div className="responsive-modal-overlay-muted">
      <div className="responsive-modal-panel responsive-modal-panel-sm animate-in fade-in zoom-in-95 duration-150">
        <div className="responsive-modal-header flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="shrink-0 p-2 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground">Security Control Confirmation</p>
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Close confirmation dialog">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="responsive-modal-body space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>

          {auditPreviewMessage && (
            <div className="p-2.5 bg-background border border-border rounded-md flex items-start gap-2 text-[11px] text-foreground font-mono">
              <AlertTriangle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <span className="technical-value-wrap min-w-0">{auditPreviewMessage}</span>
            </div>
          )}
        </div>

        <div className="responsive-modal-footer flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border bg-card hover:bg-muted/50 text-foreground text-xs font-semibold rounded-md transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors shadow-subtle ${
              isDestructive
                ? 'bg-destructive hover:bg-destructive/90 text-white'
                : 'bg-primary hover:bg-primary-hover text-white'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
