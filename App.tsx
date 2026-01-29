import React, { useState, useMemo } from 'react';
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
import { ExternalLink, Rss, Archive as ArchiveIcon, BookOpen, X } from 'lucide-react';

type ViewMode = 'feed' | 'archive' | 'tags';

const App: React.FC = () => {
    const [activeTag, setActiveTag] = useState<Tag | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('feed');

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
        <div className="min-h-screen flex flex-col max-w-3xl mx-auto px-6 py-12 selection:bg-black selection:text-white">

            {/* 1. Header Hardening (Fixed lines) */}
            {/* 1. Header Hardening (Fixed lines) */}
            <header className="mb-20 pb-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start gap-8">
                <div className="flex-1">
                    {/* Line 1: Identity + Micro-links (responsive) */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
                        <div className="text-base font-bold tracking-tight text-gray-900">
                            danmercede.online <span className="text-gray-400 font-normal ml-2">— Living Signal Surface</span>
                        </div>
                        {/* Micro-links - below on mobile, inline on desktop */}
                        <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
                            <a href="/rss" className="hover:text-black transition-colors flex items-center gap-1">
                                RSS <Rss size={10} />
                            </a>
                            <button onClick={() => setViewMode('archive')} className="hover:text-black transition-colors flex items-center gap-1">
                                Archive <ArchiveIcon size={10} />
                            </button>
                            <a href="/policies" className="hover:text-black transition-colors flex items-center gap-1">
                                Policies <BookOpen size={10} />
                            </a>
                        </div>
                    </div>

                    {/* Line 2: Disclaimer */}
                    <div className="text-xs text-gray-500 font-mono mb-1">
                        Public working log. Not polished. Not canonical.
                    </div>

                    {/* Line 3: Scope */}
                    <div className="text-xs text-gray-500 font-mono mb-4">
                        Scope: Systems architecture, governed execution, failure analysis.
                    </div>

                    {/* Line 4: Focus */}
                    <div className="text-xs font-mono flex items-center gap-2">
                        <span className="text-gray-400 uppercase tracking-wider">Current Focus:</span>
                        <div className="flex gap-2">
                            <span className="text-black bg-gray-100 px-1.5 py-0.5 rounded-sm">Systems</span>
                            <span className="text-black bg-gray-100 px-1.5 py-0.5 rounded-sm">Governance</span>
                            <span className="text-black bg-gray-100 px-1.5 py-0.5 rounded-sm">Failure Modes</span>
                        </div>
                    </div>
                </div>

                <div className="shrink-0 pt-1 sm:pt-0">
                    <img
                        src="/dan-mercede-founder-working-portrait.png"
                        alt={getImageMeta("/dan-mercede-founder-working-portrait.png").alt}
                        className="w-20 h-20 rounded-full border border-gray-100 object-cover grayscale hover:grayscale-0 transition-all duration-500"
                    />
                </div>
            </header>

            {/* 4. Navigation Hardening */}
            <nav className="flex items-center gap-6 mb-16 text-sm font-medium text-gray-500 border-b border-gray-50 pb-4">
                <button
                    onClick={() => { setViewMode('feed'); setActiveTag(null); }}
                    className={`${viewMode === 'feed' && !activeTag ? 'text-black' : 'hover:text-gray-800'} transition-colors`}
                >
                    Feed
                </button>
                <button
                    onClick={() => setViewMode('tags')}
                    className={`${viewMode === 'tags' || activeTag ? 'text-black' : 'hover:text-gray-800'} transition-colors`}
                >
                    Tags
                </button>
                <button
                    onClick={() => setViewMode('archive')}
                    className={`${viewMode === 'archive' ? 'text-black' : 'hover:text-gray-800'} transition-colors`}
                >
                    Archive
                </button>
            </nav>

            {/* Content Area */}
            <main className="flex-grow">
                {activeTag && (
                    <div className="mb-12 flex items-center gap-2 bg-black text-white px-3 py-2 text-xs font-mono uppercase w-fit rounded-sm">
                        <span>Filtering by: #{activeTag}</span>
                        <button onClick={() => setActiveTag(null)} className="ml-2 hover:text-gray-300">
                            <X size={12} />
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
                                        <span className="font-mono text-xs text-gray-400 block mb-1">Tag</span>
                                        <span className="font-medium text-gray-900 group-hover:underline uppercase tracking-wider text-sm">#{tag}</span>
                                        <span className="font-mono text-xs text-gray-400 mt-2 block">
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
                                <h3 className="font-mono text-sm text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-100 pb-2">{month}</h3>
                                <div className="space-y-4">
                                    {entries.map(entry => (
                                        <div key={entry.id} className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-8 group">
                                            <span className="font-mono text-xs text-gray-400 w-24 shrink-0">{entry.date}</span>
                                            <div className="flex-grow">
                                                <button
                                                    onClick={() => {
                                                        // Ideally navigate to single post, here we just filter to it or show it
                                                        alert(`Navigate to ${entry.slug}`);
                                                    }}
                                                    className="text-gray-900 font-medium hover:underline text-left"
                                                >
                                                    {entry.title}
                                                </button>
                                                <span className="ml-3 text-xs font-mono text-gray-400 uppercase border border-gray-100 px-1 rounded-sm">
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
            <footer className="mt-32 pt-12 border-t border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-sm text-gray-400 font-mono">
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
                        className="flex items-center gap-1 hover:text-black transition-colors"
                    >
                        Context: danmercede.com
                        <ExternalLink size={12} />
                    </a>
                </div>
            </footer>
        </div>
    );
};

export default App;