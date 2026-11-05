import React from 'react';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { MenuSection } from '../components/MenuSection';
import { StorySection } from '../components/StorySection';
import { ContactSection } from '../components/ContactSection';
import { Footer } from '../components/Footer';

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <MenuSection />
        <StorySection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
