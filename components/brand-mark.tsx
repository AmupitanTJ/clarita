export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand" aria-label="Clarita">
      <svg className="brand__mark" viewBox="0 0 64 64" aria-hidden="true">
        <circle className="brand__halo" cx="32" cy="32" r="29" />
        <path className="brand__page brand__page--left" d="M31.8 47.5C27.2 41 20.6 38 13.5 38.4V18.1c7.8-.5 14.3 2.7 18.3 8.5v20.9Z" />
        <path className="brand__page brand__page--right" d="M32.2 47.5C36.8 41 43.4 38 50.5 38.4V18.1c-7.8-.5-14.3 2.7-18.3 8.5v20.9Z" />
        <path className="brand__spine" d="M32 27v20.5" />
        <path className="brand__light" d="M32 10.5v7M28.5 14h7M29.4 11.4l5.2 5.2m0-5.2-5.2 5.2" />
      </svg>
      {!compact && <span className="brand__word">Clarita</span>}
    </span>
  );
}
