"use client";

import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
// \ce{H2SO4} — химиялық формулалар мен теңдеулер (mhchem)
import "katex/contrib/mhchem";

/** AI жауабы мен тақырып теориясы: Markdown + KaTeX формулалар ($...$ және $$...$$, \ce{...}) */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="min-w-0 leading-relaxed [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-cyan-dim [&_blockquote]:pl-3 [&_blockquote]:text-[0.88rem] [&_blockquote]:text-muted-foreground [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-1 [&_code]:rounded [&_code]:bg-panel-2 [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.88em] [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h1]:text-[1.05rem] [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-[1rem] [&_h2]:font-semibold [&_h3]:mt-2.5 [&_h3]:mb-1 [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_table]:my-2 [&_table]:block [&_table]:overflow-x-auto [&_td]:border [&_td]:border-line [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-line [&_th]:px-2 [&_th]:py-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
      {/* Сілтемелерді жаңа бетте ашамыз; HTML тегтері қауіпсіздік үшін өңделмейді (react-markdown әдепкісі) */}
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({ href, children: text }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan underline">
              {text}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
