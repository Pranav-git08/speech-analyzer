import React from 'react';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-20 px-6 py-6 w-full"
    >
      <div className="liquid-glass rounded-full px-6 py-3 flex items-center justify-between max-w-5xl mx-auto">
        {/* Left Side: Logo & Links */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 cursor-pointer">
            <Globe className="w-6 h-6 text-white" />
            <span className="text-white font-semibold text-lg">Asme</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-white/80 text-sm font-medium">
            <a href="#features" className="hover:text-white transition-colors duration-300">
              Features
            </a>
            <a href="#pricing" className="hover:text-white transition-colors duration-300">
              Pricing
            </a>
            <a href="#about" className="hover:text-white transition-colors duration-300">
              About
            </a>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-4">
          <button className="text-white hover:text-white/80 transition-colors text-sm font-medium cursor-pointer">
            Sign Up
          </button>
          <button className="liquid-glass rounded-full px-6 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity cursor-pointer">
            Login
          </button>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
