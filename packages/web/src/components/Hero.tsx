import React from 'react';

export const Hero: React.FC = () => {
  return (
    <section id="home" className="relative bg-brand-forest text-surface-paper py-16 sm:py-24 border-b border-brand-gold/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-3xl">
          {/* Tagline / Accent badge */}
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-gold/15 border border-brand-gold/40 text-brand-gold text-xs tracking-widest uppercase mb-6">
            <span>Jaipur • Pure Vegetarian</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl font-serif font-bold text-surface-paper leading-tight tracking-wide mb-6">
            Dialogues. Chai. Stories.
          </h1>

          {/* Descriptive text */}
          <p className="text-lg sm:text-xl text-surface-ivory/90 font-light leading-relaxed mb-8 max-w-2xl">
            Welcome to <strong className="font-semibold text-brand-gold">Katha Cafe</strong>. A literary haven in Murlipura, Jaipur where authentic handcrafted kulhad chai, comforting snacks, artisan pizzas, and heartfelt conversations come alive.
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-4 items-center mb-12">
            <a
              href="#menu"
              className="px-6 py-3.5 rounded-lg bg-brand-gold hover:bg-brand-goldSoft text-brand-forestDeep font-semibold text-base transition-all shadow-md"
            >
              Browse Full Menu
            </a>
            <a
              href="#location"
              className="px-6 py-3.5 rounded-lg bg-brand-forestDeep hover:bg-brand-forest border border-brand-gold/40 text-surface-paper font-medium text-base transition-all"
            >
              Find Us in Jaipur
            </a>
          </div>

          {/* Verified Quick Info Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-brand-gold/20 text-xs text-surface-ivory/80">
            <div>
              <span className="block text-brand-gold uppercase tracking-wider font-semibold mb-1">Location</span>
              <span>Murlipura, Jaipur (Dadi Ka Phatak)</span>
            </div>
            <div>
              <span className="block text-brand-gold uppercase tracking-wider font-semibold mb-1">Direct Contact</span>
              <a href="tel:07427045840" className="hover:underline text-surface-paper font-medium">074270 45840</a>
            </div>
            <div>
              <span className="block text-brand-gold uppercase tracking-wider font-semibold mb-1">Community</span>
              <a href="https://instagram.com/katha.jaipur" target="_blank" rel="noopener noreferrer" className="hover:underline text-surface-paper font-medium">@katha.jaipur</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
