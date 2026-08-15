'use client';
import { MotionConfig } from 'framer-motion';

// Centralizes reduced-motion handling so every animated component
// (buttons, cards, modals) automatically respects the user's OS setting
// instead of each component re-checking it individually.
export default function MotionProvider({ children }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
