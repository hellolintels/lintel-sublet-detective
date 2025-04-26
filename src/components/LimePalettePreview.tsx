
import React from "react";

const PALETTE = [
  { name: "Primary", className: "bg-primary text-primary-foreground" },
  { name: "Primary Foreground", className: "bg-primary-foreground text-primary" },
  { name: "Secondary", className: "bg-secondary text-secondary-foreground" },
  { name: "Secondary Foreground", className: "bg-secondary-foreground text-secondary" },
  { name: "Border", className: "bg-border text-black" },
  { name: "Input", className: "bg-input text-black" },
  { name: "Ring", className: "bg-ring text-white" },
  { name: "Muted", className: "bg-muted text-muted-foreground" },
  { name: "Muted Foreground", className: "bg-white text-muted-foreground border border-muted-foreground" },
  { name: "Accent", className: "bg-accent text-accent-foreground" },
  { name: "Accent Foreground", className: "bg-accent-foreground text-accent" },
  { name: "Popover", className: "bg-popover text-popover-foreground" },
  { name: "Popover Foreground", className: "bg-popover-foreground text-popover" },
  { name: "Card", className: "bg-card text-card-foreground" },
  { name: "Card Foreground", className: "bg-card-foreground text-card" },
  { name: "Destructive", className: "bg-destructive text-destructive-foreground" },
  { name: "Destructive Foreground", className: "bg-destructive-foreground text-destructive" },
];

const LimePalettePreview = () => (
  <div className="py-10 bg-white text-black dark:bg-black dark:text-white border-b border-muted">
    <div className="container mx-auto px-4">
      <h2 className="text-2xl font-bold mb-6 text-center">Orange Color Palette Preview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {PALETTE.map((color) => (
          <div
            key={color.name}
            className={`flex items-center justify-center h-20 rounded-lg shadow ${color.className} border`}
            style={{ minWidth: 0, fontFamily: "Roboto, Inter, sans-serif" }}
          >
            <span className="font-semibold text-lg truncate px-2">{color.name}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default LimePalettePreview;
