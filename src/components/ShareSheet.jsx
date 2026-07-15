import React, { useState } from 'react';
import ShareCard from '../ShareCard';
import './ShareSheet.css';

/**
 * Share sheet — modal triggered by "Share this". Shows a live preview of
 * the ShareCard plus one-tap actions. Wire copyLink/downloadImage/share-to-*
 * to your real implementations (Web Share API, html-to-image export, etc).
 */
export default function ShareSheet({ shareCardProps, caption, link, onClose, onStartTip }) {
  const [copied, setCopied] = useState(null); // 'link' | 'caption' | null

  function copy(kind, text) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    setCopied(kind);
    setTimeout(() => setCopied(null), 1600);
  }

  return (
    <div className="share-sheet__overlay" onClick={onClose}>
      <div className="share-sheet__panel" onClick={e => e.stopPropagation()}>
        <div className="share-sheet__header">
          <div>
            <h3 className="share-sheet__title">Share your result</h3>
          </div>
          <button className="share-sheet__close" onClick={onClose} type="button">&times;</button>
        </div>

        <div className="share-sheet__preview-wrap">
          <div className="share-sheet__preview">
            <ShareCard {...shareCardProps} />
          </div>
        </div>

        <div className="share-sheet__actions">
          <button type="button" className="btn btn--secondary" onClick={() => copy('link', link)}>
            {copied === 'link' ? 'Copied ✓' : 'Copy link'}
          </button>
          <button type="button" className="share-action share-action--neutral">Download image</button>
          <button type="button" className="share-action share-action--whatsapp">Share to WhatsApp</button>
          <button type="button" className="share-action share-action--linkedin">Share to LinkedIn</button>
        </div>

        <div className="share-sheet__caption-block">
          <div className="share-sheet__caption-label">Caption</div>
          <p className="share-sheet__caption-text">{caption}</p>
          <button type="button" className="btn btn--dark" style={{ width: '100%', height: 44, fontSize: 14 }} onClick={() => copy('caption', caption)}>
            {copied === 'caption' ? 'Copied ✓' : 'Copy caption'}
          </button>
        </div>

        <button type="button" className="share-sheet__tip-nudge" onClick={onStartTip}>
          Free tool! If it helped, buy me a coffee
        </button>
      </div>
    </div>
  );
}
