import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import ShareCard from '../ShareCard';
import './ShareSheet.css';

export default function ShareSheet({ shareCardProps, caption, link, onClose, onStartTip }) {
  const captureRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const shareUrl = /^https?:\/\//i.test(link) ? link : `https://${link}`;
  const shareText = `${caption}\n\nCheck yours: ${shareUrl}`;

  async function copy(kind, text) {
    try {
      await copyText(text);
      setStatus(kind);
      setError('');
      setTimeout(() => setStatus('idle'), 1800);
    } catch {
      setError('Could not copy automatically. Please select and copy the caption.');
    }
  }

  async function createImageFile() {
    if (!captureRef.current) throw new Error('Share card is not ready.');
    if (document.fonts?.ready) await document.fonts.ready;
    const dataUrl = await toPng(captureRef.current, {
      cacheBust: true,
      pixelRatio: 3,
      width: 420,
      height: 600,
      backgroundColor: '#ffffff',
      style: { transform: 'none', transformOrigin: 'top left' },
    });
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], 'am-i-underpaid-result.png', { type: 'image/png' });
  }

  async function downloadImage() {
    setStatus('generating');
    setError('');
    try {
      const file = await createImageFile();
      const objectUrl = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setStatus('downloaded');
      setTimeout(() => setStatus('idle'), 1800);
    } catch {
      setStatus('idle');
      setError('The image could not be generated. Please try again.');
    }
  }

  function shareToX() {
    const url = `https://x.com/intent/post?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(shareUrl)}`;
    openShareWindow(url, 'share-on-x');
  }

  function shareToLinkedIn() {
    void copy('linkedin', shareText);
    openShareWindow(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      'share-on-linkedin',
    );
  }

  async function nativeShare() {
    setStatus('sharing');
    setError('');
    try {
      const file = await createImageFile();
      const data = { title: 'My salary check', text: shareText, url: shareUrl };
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: data.title, text: shareText, files: [file] });
      } else if (navigator.share) {
        await navigator.share(data);
      } else {
        await copyText(shareText);
        setStatus('shared-copy');
        setTimeout(() => setStatus('idle'), 1800);
        return;
      }
      setStatus('idle');
    } catch (shareError) {
      setStatus('idle');
      if (shareError?.name !== 'AbortError') {
        setError('Sharing was not available. You can download the image or copy the caption instead.');
      }
    }
  }

  const busy = status === 'generating' || status === 'sharing';

  return (
    <div className="share-sheet__overlay" onClick={onClose}>
      <div className="share-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="share-title" onClick={e => e.stopPropagation()}>
        <div className="share-sheet__header">
          <h3 id="share-title" className="share-sheet__title">Share your result</h3>
          <button className="share-sheet__close" onClick={onClose} type="button" aria-label="Close share dialog">&times;</button>
        </div>

        <div className="share-sheet__preview-wrap">
          <a className="share-sheet__preview" href={shareUrl} target="_blank" rel="noopener noreferrer" aria-label="Open Am I Underpaid">
            <div ref={captureRef} className="share-sheet__capture">
              <ShareCard {...shareCardProps} />
            </div>
          </a>
        </div>

        <div className="share-sheet__actions">
          <button type="button" className="share-action share-action--neutral" onClick={() => copy('link', shareUrl)}>
            {status === 'link' ? 'Link copied ✓' : 'Copy link'}
          </button>
          <button type="button" className="share-action share-action--neutral" onClick={downloadImage} disabled={busy}>
            {status === 'generating' ? 'Creating image…' : status === 'downloaded' ? 'Downloaded ✓' : 'Download image'}
          </button>
          <button type="button" className="share-action share-action--x" onClick={shareToX}>Share on X</button>
          <button type="button" className="share-action share-action--linkedin" onClick={shareToLinkedIn}>
            {status === 'linkedin' ? 'LinkedIn opened ✓' : 'Share on LinkedIn'}
          </button>
        </div>

        <div className="share-sheet__caption-block">
          <div className="share-sheet__caption-label">Caption</div>
          <p className="share-sheet__caption-text">
            {caption}<br /><br />
            <a href={shareUrl} target="_blank" rel="noopener noreferrer">Check yours: {shareUrl}</a>
          </p>
          <div className="share-sheet__caption-actions">
            <button type="button" className="btn btn--secondary" onClick={() => copy('caption', shareText)}>
              {status === 'caption' ? 'Caption copied ✓' : 'Copy caption'}
            </button>
            <button type="button" className="btn btn--dark" onClick={nativeShare} disabled={busy}>
              {status === 'sharing' ? 'Preparing…' : status === 'shared-copy' ? 'Caption copied ✓' : 'Share'}
            </button>
          </div>
          {error && <p className="share-sheet__error" role="status">{error}</p>}
        </div>

        <p className="share-sheet__hint">On desktop, download the image and attach it to your LinkedIn or X post. Mobile sharing can attach it automatically when supported.</p>

        <button type="button" className="share-sheet__tip-nudge" onClick={onStartTip}>
          Free tool! If it helped, buy me a coffee
        </button>
      </div>
    </div>
  );
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Copy failed.');
}

function openShareWindow(url, name) {
  window.open(url, name, 'popup=yes,width=720,height=720,noopener,noreferrer');
}
