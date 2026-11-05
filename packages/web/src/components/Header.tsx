import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 bg-brand-forest text-white border-b border-brand-goldSoft/30 shadow-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        {/* Brand identity */}
        <a href="#home" className="flex items-center space-x-3 group">
          <div className="w-11 h-11 rounded-full bg-brand-gold/20 border border-brand-gold flex items-center justify-center text-brand-gold text-2xl font-serif font-bold group-hover:scale-105 transition-transform">
            कथा
          </div>
          <div>
            <span className="block text-xl font-serif tracking-wider font-semibold text-surface-paper">
              KATHA CAFE
            </span>
            <span className="block text-[11px] tracking-widest text-brand-gold uppercase font-sans">
              Dialogues • Chai • Stories
            </span>
          </div>
        </a>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium tracking-wide">
          <a href="#menu" className="hover:text-brand-gold transition-colors">
            Menu
          </a>
          <a href="#story" className="hover:text-brand-gold transition-colors">
            Our Story
          </a>
          <a href="#location" className="hover:text-brand-gold transition-colors">
            Location & Hours
          </a>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-brand-forestDeep border border-brand-gold/40 text-xs text-brand-goldSoft">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>100% Pure Veg</span>
          </div>
        </nav>

        {/* CTA */}
        <div>
          <a
            href="#menu"
            className="px-5 py-2.5 rounded-lg bg-brand-gold hover:bg-brand-goldSoft text-brand-forestDeep font-semibold text-sm transition-all shadow-sm inline-block"
          >
            Explore Menu
          </a>
        </div>
      </div>
    </header>
  );
};
