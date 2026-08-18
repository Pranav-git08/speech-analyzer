import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';

export const Hero: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [placeholderText, setPlaceholderText] = useState('');

  const targetPlaceholder = isSubmitted
    ? 'You Will Receive Notifications By Email'
    : 'Enter Your Email Here For Early Access';

  // Typewriter effect for placeholder
  useEffect(() => {
    if (!isFormOpen) {
      setPlaceholderText('');
      return;
    }

    setPlaceholderText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < targetPlaceholder.length) {
        setPlaceholderText(targetPlaceholder.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 60);

    return () => clearInterval(interval);
  }, [isFormOpen, isSubmitted, targetPlaceholder]);

  // Reset back to button state 4 seconds after submit
  useEffect(() => {
    if (isSubmitted) {
      const timer = setTimeout(() => {
        setIsSubmitted(false);
        setIsFormOpen(false);
        setEmail('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isSubmitted]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim().length > 0 || isFormOpen) {
      setIsSubmitted(true);
    }
  };

  return (
    <section className="relative flex-1 flex flex-col items-center justify-center px-6">
      <div className="relative z-10 text-center max-w-5xl mx-auto flex flex-col items-center justify-center w-full gap-12">
        {/* Tagline & Heading Container */}
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8 }}
            className="text-white/80 text-[10px] md:text-[11px] font-medium tracking-[0.2em] uppercase mb-4"
          >
            BUILD A NO-CODE AI APP IN MINUTES
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            style={{ fontFamily: "'Instrument Serif', serif" }}
            className="text-4xl md:text-[64px] font-medium tracking-[-0.01em] leading-[1.1] mb-6 bg-gradient-to-b from-white via-white/95 to-white/70 bg-clip-text text-transparent max-w-4xl"
          >
            A new way to think and create <br className="hidden md:block" />
            with computers
          </motion.h1>
        </div>

        {/* CTA Area with AnimatePresence */}
        <div className="flex flex-col items-center gap-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="min-h-[50px] mt-2 flex items-center justify-center"
          >
            <AnimatePresence mode="wait">
              {!isFormOpen ? (
                <motion.button
                  key="button-state"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setIsFormOpen(true)}
                  className="px-10 py-3 text-[14px] font-medium border border-white/10 rounded-full hover:border-white/30 hover:bg-white/[0.02] transition-all duration-300 text-white/90 backdrop-blur-sm cursor-pointer"
                >
                  Get early access
                </motion.button>
              ) : (
                <motion.form
                  key="form-state"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSubmit}
                  className="flex items-center gap-2 pl-5 pr-1.5 py-1.5 text-[14px] font-medium border border-white/20 rounded-full bg-white/[0.02] backdrop-blur-sm w-full max-w-[320px] focus-within:border-white/40 transition-colors duration-300"
                >
                  <input
                    type="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={placeholderText}
                    disabled={isSubmitted}
                    className="w-full bg-transparent text-white placeholder-white/45 text-[13px] outline-none border-none pr-1"
                  />
                  <button
                    type="submit"
                    className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/90 transition-colors flex-shrink-0 cursor-pointer"
                    aria-label="Submit Email"
                  >
                    {isSubmitted ? (
                      <Check className="w-4 h-4 text-black" strokeWidth={2.5} />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-black" strokeWidth={2.5} />
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* "Play Video Demo" Link */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            <a
              href="#demo"
              className="text-white/80 hover:text-white/40 transition-colors duration-300 text-[13px] font-medium tracking-wide"
            >
              Play Video Demo
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
