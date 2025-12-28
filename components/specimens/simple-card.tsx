/**
 * Simple Card Specimen
 * A basic card component with static content
 */

export default function SimpleCard() {
  return (
    <div className="simple-card">
      <div className="simple-card-image">
        <div className="placeholder-image" />
      </div>
      <div className="simple-card-content">
        <h3 className="simple-card-title">Card Title</h3>
        <p className="simple-card-description">
          This is a simple card component with static content. It demonstrates
          the basic structure and styling of a reusable specimen.
        </p>
        <button className="simple-card-button">
          Learn More
        </button>
      </div>

      <style jsx>{`
        .simple-card {
          max-width: 320px;
          border-radius: 12px;
          overflow: hidden;
          background: white;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
        }

        .simple-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        .simple-card-image {
          width: 100%;
          aspect-ratio: 16 / 9;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          position: relative;
        }

        .placeholder-image {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .simple-card-content {
          padding: 24px;
        }

        .simple-card-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 12px 0;
          color: #111827;
        }

        .simple-card-description {
          font-size: 14px;
          line-height: 1.6;
          color: #6b7280;
          margin: 0 0 20px 0;
        }

        .simple-card-button {
          width: 100%;
          padding: 10px 16px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .simple-card-button:hover {
          background: #5568d3;
        }

        .simple-card-button:active {
          transform: scale(0.98);
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .simple-card {
            background: #1f2937;
            border-color: #374151;
          }

          .simple-card-title {
            color: #f9fafb;
          }

          .simple-card-description {
            color: #9ca3af;
          }
        }
      `}</style>
    </div>
  )
}
