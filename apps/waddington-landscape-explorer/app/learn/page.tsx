import type { Metadata } from "next";
import Link from "next/link";
import { ARTICLES, GLOSSARY, RESOURCES } from "@/lib/content";
import { GENE_INFO, GENE_NAMES } from "@/lib/model/params";

export const metadata: Metadata = {
  title: "Learn",
  description: "Plain-language explanations of Waddington's landscape, single-cell RNA sequencing, UMAP, RNA velocity, pseudotime and the genes that decide cell fates.",
};

export default function LearnPage() {
  return (
    <div className="app learn">
      <header className="app-header">
        <a href="#main" className="skip-link">
          Skip to the articles
        </a>
        <div className="brand">
          <p className="kicker">Waddington Explorer</p>
          <h1>Learn</h1>
          <p className="tagline">The ideas behind the explorer, explained without assuming a biology degree.</p>
        </div>
        <nav className="header-actions" aria-label="Learn">
          <Link href="/" className="button primary">
            Back to the explorer
          </Link>
        </nav>
      </header>
      <div className="learn-layout">
        <nav className="toc panel" aria-labelledby="toc-h">
          <h2 id="toc-h">Contents</h2>
          <ol>
            {ARTICLES.map((a) => (
              <li key={a.id}>
                <a href={`#${a.id}`}>{a.title}</a>
              </li>
            ))}
            <li>
              <a href="#genes">The genes, at a glance</a>
            </li>
            <li>
              <a href="#glossary">Words used here</a>
            </li>
            <li>
              <a href="#reading">Further reading</a>
            </li>
          </ol>
        </nav>
        <main id="main" className="articles">
          {ARTICLES.map((a, i) => (
            <article key={a.id} id={a.id} className="article panel" aria-labelledby={`${a.id}-h`}>
              <p className="kicker">Article {i + 1}</p>
              <h2 id={`${a.id}-h`}>{a.title}</h2>
              <p className="subtitle">{a.subtitle}</p>
              {a.sections.map((s) => (
                <section key={s.heading} aria-labelledby={`${a.id}-${s.heading.replace(/\W+/g, "-")}`}>
                  <h3 id={`${a.id}-${s.heading.replace(/\W+/g, "-")}`}>{s.heading}</h3>
                  {s.paragraphs.map((p, k) => (
                    <p key={k}>{p}</p>
                  ))}
                  {s.aside ? (
                    <p className="note" role="note">
                      <span className="label">Side note</span> {s.aside}
                    </p>
                  ) : null}
                </section>
              ))}
              <p>
                <a href="#toc-h" className="text-link">
                  Back to contents
                </a>
              </p>
            </article>
          ))}
          <section id="genes" className="article panel" aria-labelledby="genes-h">
            <h2 id="genes-h">The genes, at a glance</h2>
            <div className="table-wrap" role="region" aria-label="The genes" tabIndex={0}>
              <table className="data-table">
                <caption>The eight genes in the explorer</caption>
                <thead>
                  <tr>
                    <th scope="col">Gene</th>
                    <th scope="col">What it is</th>
                    <th scope="col">What it does in this model</th>
                  </tr>
                </thead>
                <tbody>
                  {GENE_NAMES.map((g) => (
                    <tr key={g}>
                      <th scope="row">{g}</th>
                      <td className="wrap">{GENE_INFO[g].role}</td>
                      <td className="wrap">{GENE_INFO[g].effect}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section id="glossary" className="article panel" aria-labelledby="glossary-h">
            <h2 id="glossary-h">Words used here</h2>
            <dl className="glossary">
              {GLOSSARY.map((g) => (
                <div key={g.term}>
                  <dt>{g.term}</dt>
                  <dd>{g.definition}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section id="reading" className="article panel" aria-labelledby="reading-h">
            <h2 id="reading-h">Further reading</h2>
            <ul className="resources">
              {RESOURCES.map((r) => (
                <li key={r.url}>
                  <a href={r.url} className="text-link" rel="noopener noreferrer">
                    {r.title}
                  </a>
                  : {r.desc}
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </div>
  );
}
