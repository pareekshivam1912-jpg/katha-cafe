import React from 'react';

export const StorySection: React.FC = () => {
  return (
    <section id="story" className="py-16 sm:py-24 bg-surface-paper border-y border-kathaBorder-subtle">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Story Narrative */}
          <div>
            <div className="inline-flex items-center space-x-2 text-xs uppercase tracking-widest text-brand-gold font-semibold mb-3">
              <span>Our Philosophy</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif font-bold text-brand-forest mb-6 leading-tight">
              Where Stories Unfold Over Chai
            </h2>
            <p className="text-kathaText-muted text-base leading-relaxed mb-4">
              In a fast-moving world, <strong className="text-kathaText-primary">Katha Cafe</strong> was born from a simple desire: to bring back the lost art of lingering dialogues. The word <em>“कथा”</em> signifies tales, narratives, and shared human connections.
            </p>
            <p className="text-kathaText-muted text-base leading-relaxed mb-6">
              Nestled in Murlipura, Jaipur, we curate a pure vegetarian sanctuary designed for writers, students, artists, and families. Whether it is a steaming kulhad of adrak chai with warm bun maska or a freshly baked farmhouse pizza, every recipe is crafted to accompany your stories.
            </p>

            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-kathaBorder-subtle">
              <div>
                <span className="block text-2xl font-serif font-bold text-brand-forest">100%</span>
                <span className="text-xs text-kathaText-muted">Pure Vegetarian Kitchen</span>
              </div>
              <div>
                <span className="block text-2xl font-serif font-bold text-brand-forest">20+</span>
                <span className="text-xs text-kathaText-muted">Artisan Chai & Coffee Varieties</span>
              </div>
            </div>
          </div>

          {/* Decorative Panel */}
          <div className="bg-brand-forest text-surface-paper p-8 sm:p-12 rounded-2xl shadow-lg border border-brand-gold/30">
            <span className="text-brand-gold text-4xl font-serif">“</span>
            <p className="text-lg sm:text-xl font-serif italic text-surface-ivory leading-relaxed mb-6">
              Chai is not just a beverage here; it is the opening chapter to every conversation.
            </p>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-brand-gold/30 flex items-center justify-center text-brand-gold font-bold">
                क
              </div>
              <div>
                <span className="block font-semibold text-sm text-surface-paper">Katha Cafe Jaipur</span>
                <span className="block text-xs text-brand-gold">Murlipura, Rajasthan</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
