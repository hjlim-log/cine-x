'use client';

import { useState } from 'react';

export default function TrailerSection({ url }: { url: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4 border-b border-zinc-800 pb-2">예고편</h2>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-red-600 rounded-xl px-5 py-4 transition-colors group"
        >
          <span className="w-12 h-12 flex items-center justify-center bg-red-600 group-hover:bg-red-500 rounded-full text-white text-xl transition-colors">
            ▶
          </span>
          <span className="font-semibold text-sm">예고편 재생</span>
        </button>
      </section>

      {open && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white text-2xl font-light transition-colors"
              aria-label="닫기"
            >
              ✕
            </button>
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                src={url}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
