'use client';

import React, { useState, useEffect } from 'react';

interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  pricePaise: number;
  priceInr: number;
  isAvailable: boolean;
}

interface MenuCategory {
  id: string;
  name: string;
  displayOrder: number;
  items: MenuItem[];
}

export const MenuSection: React.FC = () => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch('http://localhost:4000/api/menu');
        if (res.ok) {
          const data = await res.json();
          if (data.categories && data.categories.length > 0) {
            setCategories(data.categories);
            setSelectedCategory(data.categories[0].name);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        // Fallback or development mode
      }

      // Fallback fallback if API not reachable
      setCategories([
        {
          id: 'cat-chai',
          name: 'Chai Pe Charcha',
          displayOrder: 1,
          items: [
            { id: '1', name: 'Katha Ki Chai', pricePaise: 2000, priceInr: 20, isAvailable: true },
            { id: '2', name: 'Adrak Chai', pricePaise: 2500, priceInr: 25, isAvailable: true },
            { id: '3', name: 'Kulhad Chai', pricePaise: 2500, priceInr: 25, isAvailable: true },
          ],
        },
        {
          id: 'cat-breads',
          name: 'Breads',
          displayOrder: 2,
          items: [
            { id: '4', name: 'Bun Maska', pricePaise: 3500, priceInr: 35, isAvailable: true },
            { id: '5', name: 'Butter Toast', pricePaise: 4000, priceInr: 40, isAvailable: true },
          ],
        },
      ]);
      setSelectedCategory('Chai Pe Charcha');
      setLoading(false);
    }

    fetchMenu();
  }, []);

  const currentCategory = categories.find((c) => c.name === selectedCategory) || categories[0];

  const filteredItems = currentCategory
    ? currentCategory.items.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <section id="menu" className="py-16 sm:py-24 bg-surface-ivory">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-2 text-xs uppercase tracking-widest text-brand-gold font-semibold mb-2">
            <span>Handcrafted Recipes</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-brand-forest mb-4">
            Our Café Menu
          </h2>
          <p className="text-kathaText-muted text-sm sm:text-base">
            Every dish is 100% vegetarian, made fresh to order with authentic spices and wholesome ingredients.
          </p>
        </div>

        {/* Search bar */}
        <div className="max-w-md mx-auto mb-10">
          <div className="relative">
            <input
              type="text"
              placeholder="Search dishes (e.g. Bun Maska, Pizza, Maggi)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-kathaBorder-subtle bg-surface-paper text-sm text-kathaText-primary placeholder-kathaText-muted focus:outline-none focus:ring-2 focus:ring-brand-gold shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-xs text-kathaText-muted hover:text-kathaText-primary"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs (Horizontally scrollable on mobile) */}
        {categories.length > 0 && (
          <div className="flex overflow-x-auto space-x-2 pb-4 mb-10 scrollbar-none border-b border-kathaBorder-subtle">
            {categories.map((cat) => {
              const isSelected = cat.name === selectedCategory;
              return (
                <button
                  key={cat.id || cat.name}
                  onClick={() => {
                    setSelectedCategory(cat.name);
                    setSearchQuery('');
                  }}
                  className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-brand-forest text-brand-gold shadow-sm'
                      : 'bg-surface-paper text-kathaText-primary hover:bg-brand-gold/10 border border-kathaBorder-subtle'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Items Grid */}
        {loading ? (
          <div className="text-center py-16 text-kathaText-muted">Loading menu items...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-surface-paper rounded-xl border border-kathaBorder-subtle p-8">
            <p className="text-kathaText-muted">No items matched your search in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-surface-paper rounded-xl p-5 border border-kathaBorder-subtle hover:border-brand-gold/50 transition-all shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {/* Vegetarian Icon */}
                      <span className="w-3.5 h-3.5 border border-emerald-600 flex items-center justify-center rounded-sm">
                        <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                      </span>
                      <h3 className="font-semibold text-kathaText-primary text-base">
                        {item.name}
                      </h3>
                    </div>
                    <span className="font-serif font-bold text-lg text-brand-forest">
                      ₹{item.priceInr}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-xs text-kathaText-muted mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-kathaBorder-subtle/40 flex items-center justify-between text-xs text-kathaText-muted">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                    Available
                  </span>
                  <span className="text-[11px] text-kathaText-muted">Fresh to Order</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
