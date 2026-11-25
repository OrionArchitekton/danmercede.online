import React, { useState, useMemo, useRef } from 'react';
import { ENTRIES as LEGACY_ENTRIES, getImageMeta } from './constants';
import { ENTRIES as GENERATED_ENTRIES } from './constants.generated';
import { Tag, EntryType } from './types';


// Parse timestamp like "04:10 PM PT" to comparable value
const parseFullDateTime = (date: string, timestamp: string): number => {
    const match = timestamp.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return new Date(date).getTime();

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const isPM = match[3].toUpperCase() === 'PM';

    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;

    return new Date(`${date}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`).getTime();
};

// Merge generated entries with legacy entries, sorted newest first (by date AND time)
const ENTRIES = [...GENERATED_ENTRIES, ...LEGACY_ENTRIES].sort((a, b) =>
    parseFullDateTime(b.date, b.timestamp) - parseFullDateTime(a.date, a.timestamp)
);
import EntryCard from './components/EntryCard';
import Analytics from './components/Analytics';
import { ExternalLink, Rss, Archive as ArchiveIcon, BookOpen, X } from 'lucide-react';

type ViewMode = 'feed' | 'archive' | 'tags';

const App: React.FC = () => {
    const [activeTag, setActiveTag] = useState<Tag | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('feed');
    const mainRef = useRef<HTMLElement>(null);

    // Filter logic
    const filteredEntries = useMemo(() => {
        let result = ENTRIES;
        if (activeTag) {
            result = result.filter(entry => entry.tags.includes(activeTag));
        }
        return result;
    }, [activeTag]);

    // Archive data aggregation
    const archiveByMonth = useMemo(() => {
        const grouped: Record<string, typeof ENTRIES> = {};
        ENTRIES.forEach(entry => {
            const monthYear = new Date(entry.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            if (!grouped[monthYear]) grouped[monthYear] = [];
            grouped[monthYear].push(entry);
        });
        return grouped;
    }, []);

    return (
        <div className="min-h-screen flex flex-col max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-12 overflow-x-hidden selection:bg-black selection:text-white">
            <Analytics />

            {/* Skip link: visually hidden until keyboard-focused, then jumps to main content (a11y parity with the other brand sites). */}
            <a
                href="#main-content"
                onClick={() => mainRef.current?.focus()}
                className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:rounded focus:bg-black focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:no-underline"
            >
                Skip to main content
            </a>

            {/* 1. Header Hardening (Fixed lines) */}
            <header className="mb-14 sm:mb-20 pb-8 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start gap-6 sm:gap-8 min-w-0">
                <div className="flex-1 min-w-0 w-full">
                    {/* Line 1: Identity + Micro-links (responsive) */}
                    <div className="flex flex-col gap-2 mb-2">
                        <h1 className="font-serif text-[28px] sm:text-[32px] font-semibold tracking-tight leading-tight text-gray-900 break-words">
                            danmercede.online <span className="text-gray-600 font-sans text-sm sm:text-base font-normal sm:ml-2 block sm:inline">Living Signal Surface</span>
                        </h1>
                        {/* Micro-links - touch-friendly >=44px controls */}
                        <div className="flex flex-wrap items-center gap-1 text-xs font-mono text-gray-600">
                            <a href="/rss" className="min-h-[44px] min-w-[44px] px-2.5 inline-flex items-center justify-center gap-1.5 rounded hover:bg-gray-100 hover:text-black transition-colors">
                                RSS <Rss size={12} aria-hidden="true" />
                            </a>
                            <button type="button" onClick={() => setViewMode('archive')} className="min-h-[44px] min-w-[44px] px-2.5 inline-flex items-center justify-center gap-1.5 rounded hover:bg-gray-100 hover:text-black transition-colors">
                                Archive <ArchiveIcon size={12} aria-hidden="true" />
                            </button>
                            <a href="/policies" className="min-h-[44px] min-w-[44px] px-2.5 inline-flex items-center justify-center gap-1.5 rounded hover:bg-gray-100 hover:text-black transition-colors">
                                Policies <BookOpen size={12} aria-hidden="true" />
                            </a>
                        </div>
                    </div>

                    {/* Line 2: Disclaimer */}
                    <div className="text-xs text-gray-600 font-mono mb-1 break-words">
                        Public working log. Not polished. Not canonical.
                    </div>

                    {/* Line 3: Scope */}
                    <div className="text-xs text-gray-600 font-mono mb-4 break-words">
                        Scope: Operator workflows, owned AI systems, and fail-closed proof depth.
                    </div>

                    {/* Line 4: Focus */}
                    <div className="text-xs font-mono flex flex-wrap items-center gap-2">
                        <span className="text-gray-600 font-medium">Current Focus:</span>
                        <div className="flex flex-wrap gap-2">
                            <span className="text-gray-900 bg-gray-100 px-2 py-1 rounded-sm">Workflow Ownership</span>
                            <span className="text-gray-900 bg-gray-100 px-2 py-1 rounded-sm">AI Agents</span>
                            <span className="text-gray-900 bg-gray-100 px-2 py-1 rounded-sm">Proof Depth</span>
                        </div>
                    </div>
                </div>

                <div className="shrink-0 pt-1 sm:pt-0">
                    <img
                        src="/dan-mercede-founder-working-avatar.webp"
                        alt={getImageMeta("/dan-mercede-founder-working-avatar.webp").alt}
                        width={80}
                        height={80}
                        loading="lazy"
                        decoding="async"
                        className="w-20 h-20 rounded-full border border-gray-200 object-cover grayscale hover:grayscale-0 transition-all duration-500"
                    />
                </div>
            </header>

            {/* 4. Navigation Hardening */}
            <nav aria-label="Views" className="flex flex-wrap items-center gap-2 mb-12 text-sm font-medium text-gray-600 border-b border-gray-200 pb-3">
                <button
                    type="button"
                    onClick={() => { setViewMode('feed'); setActiveTag(null); }}
                    aria-pressed={viewMode === 'feed' && !activeTag}
                    className={`min-h-[44px] min-w-[44px] px-3 inline-flex items-center justify-center rounded transition-colors ${viewMode === 'feed' && !activeTag ? 'text-black font-semibold bg-gray-100' : 'hover:text-black hover:bg-gray-50'}`}
                >
                    Feed
                </button>
                <button
                    type="button"
                    onClick={() => setViewMode('tags')}
                    aria-pressed={viewMode === 'tags' || activeTag !== null}
                    className={`min-h-[44px] min-w-[44px] px-3 inline-flex items-center justify-center rounded transition-colors ${viewMode === 'tags' || activeTag ? 'text-black font-semibold bg-gray-100' : 'hover:text-black hover:bg-gray-50'}`}
                >
                    Tags
                </button>
                <button
                    type="button"
                    onClick={() => setViewMode('archive')}
                    aria-pressed={viewMode === 'archive'}
                    className={`min-h-[44px] min-w-[44px] px-3 inline-flex items-center justify-center rounded transition-colors ${viewMode === 'archive' ? 'text-black font-semibold bg-gray-100' : 'hover:text-black hover:bg-gray-50'}`}
                >
                    Archive
                </button>
            </nav>

            {/* Content Area */}
            <main id="main-content" ref={mainRef} tabIndex={-1} className="min-w-0 flex-grow outline-none break-words">
                {activeTag && (
                    <div className="mb-12 flex items-center gap-2 bg-black text-white px-3 py-1.5 text-xs font-mono w-fit rounded-sm">
                        <span>Filtering by: #{activeTag}</span>
                        <button type="button" onClick={() => setActiveTag(null)} aria-label="Clear tag filter" className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center hover:text-gray-300">
                            <X size={14} aria-hidden="true" />
                        </button>
                    </div>
                )}

                {/* FEED VIEW */}
                {viewMode === 'feed' && (
                    <div>
                        {filteredEntries.map(entry => (
                            <EntryCard
                                key={entry.id}
                                entry={entry}
                                onTagClick={(tag) => {
                                    setActiveTag(tag);
                                    setViewMode('tags'); // Switch to tags view implicitly or keep feed filtered
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* TAGS VIEW */}
                {viewMode === 'tags' && (
                    <div>
                        {!activeTag ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {Array.from(new Set(ENTRIES.flatMap(e => e.tags))).map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setActiveTag(tag)}
                                        className="text-left border border-gray-200 p-4 hover:border-black hover:bg-gray-50 transition-all group"
                                    >
                                        <span className="font-mono text-xs text-gray-500 block mb-1">Tag</span>
                                        <span className="font-medium text-gray-900 group-hover:underline uppercase tracking-wider text-sm">#{tag}</span>
                                        <span className="font-mono text-xs text-gray-500 mt-2 block">
                                            {ENTRIES.filter(e => e.tags.includes(tag)).length} entries
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div>
                                {filteredEntries.map(entry => (
                                    <EntryCard
                                        key={entry.id}
                                        entry={entry}
                                        onTagClick={setActiveTag}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ARCHIVE VIEW */}
                {viewMode === 'archive' && (
                    <div className="space-y-12">
                        {Object.entries(archiveByMonth).map(([month, entries]) => (
                            <div key={month}>
                                <h3 className="font-mono text-sm text-gray-500 uppercase tracking-widest mb-6 border-b border-gray-100 pb-2">{month}</h3>
                                <div className="space-y-4">
                                    {entries.map(entry => (
                                        <div key={entry.id} className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-8 group">
                                            <span className="font-mono text-xs text-gray-500 w-24 shrink-0">{entry.date}</span>
                                            <div className="flex-grow">
                                                <a
                                                    href={`#${entry.slug}`}
                                                    onClick={() => {
                                                        // Return to the feed so the target entry is rendered, then
                                                        // scroll to its #slug anchor (EntryCard id={slug}). The element
                                                        // is not in the DOM until React commits the feed view, so defer
                                                        // the scroll a tick rather than relying on native hash jump.
                                                        setViewMode('feed');
                                                        setActiveTag(null);
                                                        setTimeout(() => {
                                                            document.getElementById(entry.slug)?.scrollIntoView();
                                                        }, 0);
                                                    }}
                                                    className="text-gray-900 font-medium hover:underline text-left"
                                                >
                                                    {entry.title}
                                                </a>
                                                <span className="ml-3 text-xs font-mono text-gray-500 uppercase border border-gray-100 px-1 rounded-sm">
                                                    {entry.type}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Minimal Footer (Locked Structure) */}
            <footer className="mt-24 pt-12 border-t border-gray-200 flex flex-col gap-6 text-sm text-gray-600 font-mono">
                <div className="flex flex-col items-center gap-1 text-center">
                    <a
                        href="https://www.orionintelligenceagency.com/book?utm_source=danmercede.online&utm_medium=signal_cta&utm_campaign=readiness_scan"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[44px] inline-flex items-center px-3 text-gray-900 font-medium text-xs uppercase tracking-wider hover:underline transition-colors"
                    >
                        Work with OIA on one workflow &rarr;
                    </a>
                    <span className="text-gray-600 text-xs tracking-wide font-normal normal-case">
                        Strategy &bull; Leadership &bull; Engineering &bull; Agents
                    </span>
                </div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex flex-col gap-1">
                        <span className="text-gray-900 font-medium">Dan Mercede</span>
                        <span>{new Date().getFullYear()}</span>
                    </div>

                    <div className="flex flex-col md:items-end gap-1">
                        <span className="italic">This is a working log.</span>
                        <a
                            href="https://www.danmercede.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[44px] flex items-center gap-1 hover:text-black transition-colors"
                        >
                            Context: danmercede.com
                            <ExternalLink size={12} aria-hidden="true" />
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default App;
