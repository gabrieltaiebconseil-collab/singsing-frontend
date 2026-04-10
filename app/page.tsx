"use client";

import { FormEvent, useMemo, useState } from "react";

type Song = {
  id?: string | number;
  title?: string;
  artist?: string;
  coverImage?: string;
  cover_url?: string;
  cover?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function getCoverImage(song: Song): string {
  return song.coverImage || song.cover_url || song.cover || "";
}

function getSongTitle(song: Song): string {
  return song.title || "Unknown Title";
}

function getSongArtist(song: Song): string {
  return song.artist || "Unknown Artist";
}

export default function Page() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloadingId, setIsDownloadingId] = useState<string>("");
  const [error, setError] = useState("");

  const canSearch = useMemo(() => query.trim().length > 0 && !!API_URL, [query]);

  async function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!API_URL) {
      setError("API URL is missing. Set NEXT_PUBLIC_API_URL.");
      return;
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(trimmedQuery)}`);
      if (!response.ok) {
        throw new Error(`Search failed with status ${response.status}`);
      }

      const data = await response.json();
      const list: Song[] = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      setResults(list);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Search failed");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  async function onGenerateClip(song: Song, index: number) {
    setError("");

    if (!API_URL) {
      setError("API URL is missing. Set NEXT_PUBLIC_API_URL.");
      return;
    }

    const songKey = String(song.id ?? index);
    setIsDownloadingId(songKey);

    try {
      const response = await fetch(`${API_URL}/clip`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lyrics: query.trim() }),
      });

      if (!response.ok) {
        throw new Error(`Clip generation failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeTitle = getSongTitle(song).replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeArtist = getSongArtist(song).replace(/[^a-zA-Z0-9_-]/g, "_");
      link.href = url;
      link.download = `${safeArtist}-${safeTitle}.ogg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (clipError) {
      setError(clipError instanceof Error ? clipError.message : "Clip generation failed");
    } finally {
      setIsDownloadingId("");
    }
  }

  return (
    <main className="min-h-screen bg-stone-100 text-stone-900">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Sing Sing Search</h1>

        <form onSubmit={onSearch} className="space-y-3 rounded-xl border border-stone-300 bg-white p-4 shadow-sm">
          <label htmlFor="lyrics" className="block text-sm font-medium text-stone-700">
            Lyrics Input
          </label>
          <textarea
            id="lyrics"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type song lyrics here"
            className="h-36 w-full resize-y rounded-md border border-stone-300 bg-stone-50 px-3 py-2 text-sm outline-none transition focus:border-stone-500"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!canSearch || isSearching}
              className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSearching ? "Searching" : "Search"}
            </button>
            {!API_URL && <span className="text-xs text-stone-600">Set NEXT_PUBLIC_API_URL to enable search.</span>}
          </div>
        </form>

        {error && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          {results.map((song, index) => {
            const cover = getCoverImage(song);
            const songKey = String(song.id ?? index);
            const downloading = isDownloadingId === songKey;

            return (
              <article key={songKey} className="overflow-hidden rounded-xl border border-stone-300 bg-white shadow-sm">
                <div className="aspect-square bg-stone-200">
                  {cover ? (
                    <img src={cover} alt={`${getSongTitle(song)} cover`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-stone-500">No Cover</div>
                  )}
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <h2 className="line-clamp-1 text-base font-semibold">{getSongTitle(song)}</h2>
                    <p className="line-clamp-1 text-sm text-stone-600">{getSongArtist(song)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onGenerateClip(song, index)}
                    disabled={downloading}
                    className="w-full rounded-md border border-stone-400 px-3 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {downloading ? "Generating Clip" : "Generate Clip"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
