import React from 'react';

export const ContactSection: React.FC = () => {
  return (
    <section id="location" className="py-16 sm:py-24 bg-surface-ivory">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-2 text-xs uppercase tracking-widest text-brand-gold font-semibold mb-2">
            <span>Visit Us</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-brand-forest mb-4">
            Location & Contact
          </h2>
          <p className="text-kathaText-muted text-sm sm:text-base">
            We are situated in Dadi Ka Phatak, Murlipura. Drop by for tea or get in touch.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Address */}
          <div className="bg-surface-paper rounded-xl p-6 border border-kathaBorder-subtle shadow-sm">
            <div className="w-10 h-10 rounded-full bg-brand-forest/10 flex items-center justify-center text-brand-forest mb-4 font-serif font-bold">
              📍
            </div>
            <h3 className="text-lg font-serif font-semibold text-brand-forest mb-2">
              Our Address
            </h3>
            <p className="text-sm text-kathaText-muted leading-relaxed mb-4">
              B-82A Ganga Jamuna Colony, Dadi Ka Phatak, Murlipura, Jaipur, Rajasthan 302039
            </p>
            <a
              href="https://maps.google.com/?q=B-82A+Ganga+Jamuna+Colony+Dadi+Ka+Phatak+Murlipura+Jaipur+Rajasthan+302039"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-brand-forest hover:text-brand-gold underline inline-block"
            >
              Open in Google Maps →
            </a>
          </div>

          {/* Card 2: Phone */}
          <div className="bg-surface-paper rounded-xl p-6 border border-kathaBorder-subtle shadow-sm">
            <div className="w-10 h-10 rounded-full bg-brand-forest/10 flex items-center justify-center text-brand-forest mb-4 font-serif font-bold">
              📞
            </div>
            <h3 className="text-lg font-serif font-semibold text-brand-forest mb-2">
              Phone & Inquiries
            </h3>
            <p className="text-sm text-kathaText-muted leading-relaxed mb-4">
              Call us directly for table inquiries, party orders, or takeaway pickup.
            </p>
            <a
              href="tel:07427045840"
              className="text-base font-semibold text-brand-forest hover:text-brand-gold inline-block"
            >
              074270 45840
            </a>
          </div>

          {/* Card 3: Social & Hours */}
          <div className="bg-surface-paper rounded-xl p-6 border border-kathaBorder-subtle shadow-sm">
            <div className="w-10 h-10 rounded-full bg-brand-forest/10 flex items-center justify-center text-brand-forest mb-4 font-serif font-bold">
              ☕
            </div>
            <h3 className="text-lg font-serif font-semibold text-brand-forest mb-2">
              Instagram & Updates
            </h3>
            <p className="text-sm text-kathaText-muted leading-relaxed mb-4">
              Follow our daily specials, seasonal smoothies, and community tales on Instagram.
            </p>
            <a
              href="https://instagram.com/katha.jaipur"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-brand-forest hover:text-brand-gold inline-block"
            >
              @katha.jaipur →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
