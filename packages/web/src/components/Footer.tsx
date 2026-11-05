import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-brand-forestDeep text-surface-paper py-12 border-t border-brand-gold/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-brand-gold/20">
          <div className="flex items-center space-x-3">
            <span className="text-2xl font-serif text-brand-gold font-bold">कथा</span>
            <div>
              <span className="block text-lg font-serif font-semibold tracking-wide">Katha Cafe</span>
              <span className="block text-xs text-brand-goldSoft tracking-widest uppercase">Jaipur • 100% Pure Veg</span>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-xs text-surface-ivory/80">
            <a href="#menu" className="hover:text-brand-gold transition-colors">Menu</a>
            <a href="#story" className="hover:text-brand-gold transition-colors">Our Story</a>
            <a href="#location" className="hover:text-brand-gold transition-colors">Location</a>
            <a href="https://instagram.com/katha.jaipur" target="_blank" rel="noopener noreferrer" className="hover:text-brand-gold transition-colors">@katha.jaipur</a>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-surface-ivory/60 gap-4">
          <p>© {new Date().getFullYear()} Katha Cafe. All rights reserved. B-82A Ganga Jamuna Colony, Murlipura, Jaipur.</p>
          <p>Dialogues • Chai • Stories</p>
        </div>
      </div>
    </footer>
  );
};
