import Section from "./Section";
import { Reveal } from "./primitives";

import deliverance from "../assets/books/deliverance-from-error.jpg";
import whiteNights from "../assets/books/white-nights.jpg";
import genealogy from "../assets/books/genealogy-of-morals.jpg";
import thinking from "../assets/books/thinking-fast-slow.jpg";
import courage from "../assets/books/courage-to-be-disliked.jpg";

const COVERS = {
  "deliverance-from-error": deliverance,
  "white-nights": whiteNights,
  "genealogy-of-morals": genealogy,
  "thinking-fast-slow": thinking,
  "courage-to-be-disliked": courage
};

export default function Bookshelf({ bookshelf }) {
  if (!bookshelf?.length) return null;

  return (
    <Section id="bookshelf" eyebrow="My bookshelf" title="The company I keep">
      <div className="books">
        {bookshelf.map((b, i) => (
          <Reveal key={b.title} delay={i * 0.04}>
            <div className="book-row">
              {COVERS[b.coverId] ? (
                <img className="book-cover" src={COVERS[b.coverId]} alt={`${b.title} cover`} loading="lazy" />
              ) : (
                <div className="book-cover book-cover-blank" aria-hidden="true">
                  {b.title}
                </div>
              )}
              <div className="book-meta">
                <h3 className="book-title">{b.title}</h3>
                <p className="book-byline">
                  {b.author}
                  {b.year ? ` · ${b.year}` : ""}
                </p>
                {b.quote && <p className="book-quote">“{b.quote}”</p>}
                {b.tags?.length > 0 && <p className="book-tags">{b.tags.join(" · ")}</p>}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
