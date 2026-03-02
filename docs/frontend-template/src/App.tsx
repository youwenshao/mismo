import { useState, useEffect, useCallback } from 'react'
import { ArrowUp, Menu, X } from 'lucide-react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import HeroSection from './sections/HeroSection'
import FeaturedCards from './sections/FeaturedCards'
import RecentNews from './sections/RecentNews'
import Stories from './sections/Stories'
import LatestResearch from './sections/LatestResearch'
import BusinessSection from './sections/BusinessSection'
import CTASection from './sections/CTASection'
import Footer from './sections/Footer'

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev)
  }, [])

  return (
    <div className="min-h-dvh bg-white">
      {/* Header */}
      <Header scrolled={scrolled} isSidebarOpen={isSidebarOpen} />

      {/* Sidebar Toggle Button - Always visible with high z-index */}
      <div
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-[60] p-2 bg-white hover:bg-gray-100 rounded-full transition-colors shadow-sm cursor-pointer select-none"
        role="button"
        aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </div>

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content - Animates margin based on sidebar state */}
      <main
        className={`pt-20 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'ml-64' : 'ml-0'
        }`}
      >
        {/* Hero Section */}
        <HeroSection />

        {/* Featured Cards */}
        <FeaturedCards />

        {/* Recent News */}
        <RecentNews />

        {/* Stories */}
        <Stories />

        {/* Latest Research */}
        <LatestResearch />

        {/* Business Section */}
        <BusinessSection />

        {/* CTA Section */}
        <CTASection />

        {/* Footer */}
        <Footer />
      </main>

      {/* Floating Chat Button */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full px-4 py-2 shadow-lg">
          <span className="text-sm text-gray-600">Ask ChatGPT</span>
          <button className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-white hover:bg-gray-700 transition-colors">
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
