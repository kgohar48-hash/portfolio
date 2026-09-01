export default function Footer({ person }) {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span>
          © {new Date().getFullYear()} {person?.name || "Gohar Khan Awan"}. Built with the MERN stack.
        </span>
        <span>
          <a href="/privacy">Privacy</a> · Designed &amp; engineered by{" "}
          {person?.name?.split(" ")[0] || "Gohar"} · <a href="#hero">Back to top ↑</a>
        </span>
      </div>
    </footer>
  );
}
