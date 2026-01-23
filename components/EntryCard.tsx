import React from 'react';
import { LogEntry, EntryType, Tag } from '../types';
import { ArrowUpRight, Link as LinkIcon } from 'lucide-react';

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
          <div className="bg-gray-50 border border-gray-200 p-5 rounded-sm font-mono text-sm my-2">
            <div className="grid grid-cols-1 md:grid-cols-[100px_1fr] gap-2 mb-3">
                <span className="text-gray-400 uppercase tracking-widest text-xs pt-1">Hypothesis</span>
                <span className="text-gray-900">{entry.hypothesis}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[100px_1fr] gap-2 mb-3">
                <span className="text-gray-400 uppercase tracking-widest text-xs pt-1">Constraint</span>
                <span className="text-gray-900">{entry.constraint}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[100px_1fr] gap-2 mb-3">
                <span className="text-gray-400 uppercase tracking-widest text-xs pt-1">Result</span>
                <span className={`font-bold uppercase ${
                    entry.result === 'Passed' ? 'text-emerald-700' : 
                    entry.result === 'Failed' ? 'text-red-700' : 'text-amber-700'
                }`}>
                    {entry.result}
                </span>
            </div>
            {/* Result Details inline if needed, or part of result */}
            <div className="grid grid-cols-1 md:grid-cols-[100px_1fr] gap-2 mb-3">
                <span className="text-gray-400 uppercase tracking-widest text-xs pt-1">Details</span>
                <span className="text-gray-800">{entry.resultDetails}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[100px_1fr] gap-2">
                <span className="text-gray-400 uppercase tracking-widest text-xs pt-1">Next Step</span>
                <span className="text-blue-700">{entry.nextStep}</span>
            </div>
          </div>
        );

      case EntryType.StatusUpdate:
        return (
          <div className="space-y-3 font-mono text-sm border-l-2 border-gray-200 pl-4 py-1">
             <div className="flex gap-2 items-baseline">
                <span className="text-gray-500 w-28 shrink-0">Status:</span>
                <span className={`font-bold uppercase tracking-wider ${
                    entry.status === 'Active' ? 'text-emerald-600' :
                    entry.status === 'Paused' ? 'text-amber-600' :
                    entry.status === 'Resolved' ? 'text-blue-600' : 
                    entry.status === 'Rolled back' ? 'text-red-600' : 'text-purple-600'
                }`}>{entry.status}</span>
             </div>
             <div className="flex gap-2 items-baseline">
                <span className="text-gray-500 w-28 shrink-0">What changed:</span>
                <span className="text-gray-900">{entry.whatChanged}</span>
             </div>
             <div className="flex gap-2 items-baseline">
                <span className="text-gray-500 w-28 shrink-0">What broke:</span>
                <span className="text-gray-900">{entry.whatBroke}</span>
             </div>
             <div className="flex gap-2 items-baseline">
                <span className="text-gray-500 w-28 shrink-0">Next step:</span>
                <span className="text-gray-900">{entry.nextStep}</span>
             </div>
          </div>
        );

      case EntryType.ThoughtSnippet:
        return (
          <div className="text-base md:text-lg text-gray-800 leading-relaxed opacity-90">
            {entry.content}
          </div>
        );

      case EntryType.WorkingNote:
        return (
          <div className="space-y-4">
             <div className="text-base text-gray-800 leading-relaxed opacity-90">
                {entry.content}
             </div>
             <div className="flex gap-2 items-start bg-blue-50/50 p-3 rounded-sm">
                <span className="text-blue-600 font-mono text-xs uppercase tracking-wider pt-1 shrink-0">Open Question:</span>
                <span className="text-gray-900 text-sm font-medium italic">{entry.openQuestion}</span>
             </div>
          </div>
        );
    }
  };

  const getTypeColor = (type: EntryType) => {
      switch(type) {
          case EntryType.WorkingNote: return 'text-blue-600';
          case EntryType.StatusUpdate: return 'text-emerald-600';
          case EntryType.ShortEssay: return 'text-gray-900';
          case EntryType.ThoughtSnippet: return 'text-purple-600';
          case EntryType.ExperimentLog: return 'text-amber-600';
          default: return 'text-gray-500';
      }
  };

  return (
    <article className="group mb-20 pb-12 border-b border-gray-100 last:border-0 relative">
      {/* Meta Row */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-3 font-mono text-xs uppercase tracking-wider text-gray-500">
        <div className="flex items-center gap-3">
            <span className={`font-bold ${getTypeColor(entry.type)}`}>
                {entry.type}
            </span>
            {entry.context && (
                <>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-400 normal-case tracking-normal font-sans italic">
                        {entry.context}
                    </span>
                </>
            )}
        </div>
        <div className="mt-1 sm:mt-0 opacity-60">
            {entry.date} • {entry.timestamp}
        </div>
      </div>

      {/* Title Row - Reduced font size by ~10% (text-base md:text-lg) */}
      <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-5 tracking-tight leading-tight">
        {entry.title}
      </h2>

      {/* Body */}
      {renderBody()}

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
            {entry.tags.map(tag => (
                <button
                    key={tag}
                    onClick={() => onTagClick(tag)}
                    className="text-[10px] font-mono text-gray-400 hover:text-black hover:bg-gray-100 px-1.5 py-0.5 rounded-sm transition-all duration-200 uppercase tracking-wider"
                >
                    #{tag}
                </button>
            ))}
        </div>
        
        <div className="flex items-center gap-4">
             <a href={`#${entry.slug}`} className="text-gray-300 hover:text-black transition-colors" title="Permalink">
                <LinkIcon size={12} />
             </a>
        </div>
      </div>
    </article>
  );
};

export default EntryCard;