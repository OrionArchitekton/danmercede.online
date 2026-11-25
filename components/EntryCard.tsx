import React from 'react';
import { LogEntry, EntryType, Tag } from '../types';
import { ArrowUpRight, Link as LinkIcon } from 'lucide-react';
import { noticeSegments } from '../archiveNotice';
import { resolveExternalContext } from '../externalContext';

interface EntryCardProps {
  entry: LogEntry;
  onTagClick: (tag: Tag) => void;
}

const EntryCard: React.FC<EntryCardProps> = ({ entry, onTagClick }) => {
  
  // Helper to render type-specific body content
  const renderBody = () => {
    switch (entry.type) {
      case EntryType.ShortEssay:
        return (
          <div className="space-y-4">
             <div className="font-medium text-gray-900 border-l-2 border-black pl-3 py-1">
                Claim: {entry.claim}
             </div>
             {entry.content && (
               <div className="prose prose-stone prose-p:text-gray-800 prose-p:leading-relaxed max-w-none">
                  {entry.content.split('\n\n').map((paragraph, idx) => (
                      <p key={idx} className="mb-4 text-base opacity-90">{paragraph}</p>
                  ))}
               </div>
             )}
             <div className="text-sm font-mono text-gray-600 italic pt-2">
                {entry.implication}
             </div>
          </div>
        );

      case EntryType.ExperimentLog:
        return (
          <div className="bg-gray-50 border border-gray-200 p-4 sm:p-5 rounded-sm font-mono text-sm my-2 min-w-0 break-words">
            <div className="grid grid-cols-1 md:grid-cols-[110px_1fr] gap-2 mb-3">
                <span className="text-gray-600 font-medium text-xs pt-0.5">Hypothesis</span>
                <span className="text-gray-900 min-w-0 break-words">{entry.hypothesis}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[110px_1fr] gap-2 mb-3">
                <span className="text-gray-600 font-medium text-xs pt-0.5">Constraint</span>
                <span className="text-gray-900 min-w-0 break-words">{entry.constraint}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[110px_1fr] gap-2 mb-3">
                <span className="text-gray-600 font-medium text-xs pt-0.5">Result</span>
                <span className={`font-bold ${
                    entry.result === 'Passed' ? 'text-emerald-700' : 
                    entry.result === 'Failed' ? 'text-red-700' : 'text-amber-800'
                }`}>
                    {entry.result}
                </span>
            </div>
            {/* Result Details inline if needed, or part of result */}
            <div className="grid grid-cols-1 md:grid-cols-[110px_1fr] gap-2 mb-3">
                <span className="text-gray-600 font-medium text-xs pt-0.5">Details</span>
                <span className="text-gray-800 min-w-0 break-words">{entry.resultDetails}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[110px_1fr] gap-2">
                <span className="text-gray-600 font-medium text-xs pt-0.5">Next Step</span>
                <span className="text-blue-700 min-w-0 break-words">{entry.nextStep}</span>
            </div>
          </div>
        );

      case EntryType.StatusUpdate:
        return (
          <div className="space-y-3 font-mono text-sm border-l-2 border-gray-200 pl-4 py-1 min-w-0 break-words">
             <div className="flex flex-wrap gap-2 items-baseline">
                <span className="text-gray-600 w-28 shrink-0">Status:</span>
                <span className={`font-bold ${
                    entry.status === 'Active' ? 'text-emerald-700' :
                    entry.status === 'Paused' ? 'text-amber-800' :
                    entry.status === 'Resolved' ? 'text-blue-700' : 
                    entry.status === 'Rolled back' ? 'text-red-700' : 'text-purple-700'
                }`}>{entry.status}</span>
             </div>
             <div className="flex flex-wrap gap-2 items-baseline">
                <span className="text-gray-600 w-28 shrink-0">What changed:</span>
                <span className="text-gray-900 min-w-0 break-words flex-1">{entry.whatChanged}</span>
             </div>
             <div className="flex flex-wrap gap-2 items-baseline">
                <span className="text-gray-600 w-28 shrink-0">What broke:</span>
                <span className="text-gray-900 min-w-0 break-words flex-1">{entry.whatBroke}</span>
             </div>
             <div className="flex flex-wrap gap-2 items-baseline">
                <span className="text-gray-600 w-28 shrink-0">Next step:</span>
                <span className="text-gray-900 min-w-0 break-words flex-1">{entry.nextStep}</span>
             </div>
          </div>
        );

      case EntryType.ThoughtSnippet:
        return (
          <div className="text-base md:text-lg text-gray-800 leading-relaxed opacity-90 break-words">
            {entry.content}
          </div>
        );

      case EntryType.WorkingNote:
        return (
          <div className="space-y-4 min-w-0 break-words">
             <div className="text-base text-gray-800 leading-relaxed opacity-90">
                {entry.content}
             </div>
             <div className="flex flex-wrap gap-2 items-start bg-blue-50/70 p-3 rounded-sm">
                <span className="text-blue-800 font-mono text-xs font-semibold pt-0.5 shrink-0">Open Question:</span>
                <span className="text-gray-900 text-sm font-medium italic min-w-0 break-words flex-1">{entry.openQuestion}</span>
             </div>
          </div>
        );

      case EntryType.Diagram:
        return (
          <figure className="space-y-3">
            <img
              src={entry.src}
              alt={entry.alt}
              loading="lazy"
              decoding="async"
              width={1200}
              height={675}
              className="w-full h-auto border border-gray-200 bg-white"
            />
            <figcaption className="text-sm text-gray-600 leading-relaxed">
              {entry.caption}
            </figcaption>
          </figure>
        );
    }
  };

  const getTypeColor = (type: EntryType) => {
      switch(type) {
          case EntryType.WorkingNote: return 'text-blue-700';
          case EntryType.StatusUpdate: return 'text-emerald-700';
          case EntryType.ShortEssay: return 'text-gray-900';
          case EntryType.ThoughtSnippet: return 'text-purple-700';
          case EntryType.ExperimentLog: return 'text-amber-800';
          case EntryType.Diagram: return 'text-slate-700';
          default: return 'text-gray-600';
      }
  };

  return (
    <article id={entry.slug} className="group mb-16 pb-12 border-b border-gray-200 last:border-0 relative scroll-mt-24 min-w-0 break-words">
      {/* Meta Row */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-3 font-mono text-xs text-gray-600">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
            <span className={`font-bold ${getTypeColor(entry.type)}`}>
                {entry.type}
            </span>
            {entry.context && (
                <>
                    <span className="text-gray-600" aria-hidden="true">/</span>
                    <span className="text-gray-600 font-sans italic break-words">
                        {entry.context}
                    </span>
                </>
            )}
        </div>
        <div className="mt-1 sm:mt-0 shrink-0">
            {entry.date} · {entry.timestamp}
        </div>
      </div>

      {/* Title Row - Editorial Newsreader scale */}
      <h2 className="font-serif text-[20px] md:text-[22px] font-semibold text-gray-900 mb-5 tracking-tight leading-snug break-words">
        {entry.title}
      </h2>

      {/* Archive banner: leads the entry body (specs/archived-entry-notice-spec.md) */}
      {entry.archiveNotice && (
        <p role="note" className="mb-5 border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-gray-800">
          {noticeSegments(entry.archiveNotice).map((segment, idx) =>
            segment.href ? (
              <a key={idx} href={segment.href} className="underline hover:text-black">
                {segment.text}
              </a>
            ) : (
              <React.Fragment key={idx}>{segment.text}</React.Fragment>
            ),
          )}
        </p>
      )}

      {/* Optional lead figure (e.g. a guide infographic) */}
      {entry.image && (
        <figure className="mb-6 space-y-2">
          <img src={entry.image.src} alt={entry.image.alt} loading="lazy" decoding="async" className="w-full h-auto border border-gray-200 bg-white" />
          {entry.image.caption && <figcaption className="text-sm text-gray-600 leading-relaxed">{entry.image.caption}</figcaption>}
        </figure>
      )}

      {/* Body */}
      {renderBody()}

      {/* HOOK-003: External-reader context card */}
      {(() => {
        const externalContext = resolveExternalContext(entry);
        return (
          <aside
            aria-label="Why This Matters Outside Orion"
            className="mt-5 border-l-2 border-gray-300 bg-gray-50/80 px-3.5 py-2.5 text-sm text-gray-700 space-y-1.5 min-w-0 break-words"
          >
            <p className="font-mono text-xs font-medium text-gray-600">
              Why This Matters Outside Orion
            </p>
            <p className="leading-relaxed text-gray-800">
              {externalContext.whyItMatters}
            </p>
            <p className="text-xs text-gray-600 leading-relaxed">
              <span className="font-semibold text-gray-700">Plain terms:</span>{' '}
              {externalContext.plainTermsNote}
            </p>
            <p className="text-xs">
              <a
                href={externalContext.guideUrl}
                className="inline-flex min-h-[44px] items-center gap-1 text-gray-900 underline underline-offset-2 hover:text-black"
              >
                <span>{externalContext.guideLabel}</span>
                <ArrowUpRight size={12} aria-hidden="true" />
              </a>
            </p>
          </aside>
        );
      })()}

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2 min-w-0">
            {entry.tags.map(tag => (
                <button
                    type="button"
                    key={tag}
                    onClick={() => onTagClick(tag)}
                    className="min-h-[28px] inline-flex items-center text-xs font-mono text-gray-600 hover:text-black hover:bg-gray-100 px-2 py-1 rounded-sm transition-colors duration-200"
                >
                    #{tag}
                </button>
            ))}
        </div>
        
        <div className="flex items-center shrink-0">
             <a href={`#${entry.slug}`} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-sm text-gray-600 hover:bg-gray-100 hover:text-black transition-colors" title="Permalink" aria-label={`Permalink to: ${entry.title}`}>
                <LinkIcon size={14} aria-hidden="true" />
             </a>
        </div>
      </div>
    </article>
  );
};

export default EntryCard;
