import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Share2, X, QrCode as QrIcon, ExternalLink } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  pollId: string;
  question: string;
  code?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, pollId, question, code }) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const publicUrl = `${window.location.origin}/?poll=${pollId}`;

  useEffect(() => {
    if (isOpen && pollId) {
      QRCode.toDataURL(publicUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code', err));
    }
  }, [isOpen, pollId, publicUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      showToast('Poll link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Failed to copy link', 'error');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Vote on: ${question}`,
          text: `Cast your vote on PulsePoll: "${question}"`,
          url: publicUrl,
        });
        showToast('Shared successfully!', 'success');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Share2 className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-white">Share Live Poll</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 italic bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            "{question}"
          </p>

          {code && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Audience Join Key</span>
                <span className="text-base font-mono font-extrabold text-amber-300 tracking-wider">{code}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  showToast(`Poll Key ${code} copied!`, 'success');
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Key</span>
              </button>
            </div>
          )}

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-950 rounded-xl border border-slate-800">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Poll QR Code"
                className="w-48 h-48 rounded-lg shadow-md border-4 border-white bg-white"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-slate-500">
                <QrIcon className="w-8 h-8 animate-spin" />
              </div>
            )}
            <span className="text-[11px] text-slate-400 mt-2 font-mono">
              Scan with camera to vote instantly
            </span>
          </div>

          {/* Copy input block */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Public Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 focus:outline-none"
              />
              <button
                id="btn-copy-share-link"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 transition-colors shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={handleNativeShare}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Share via Device</span>
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
