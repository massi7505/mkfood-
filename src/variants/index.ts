export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export const staggerContainer = {
  show: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const slideInRight = {
  hidden: { x: 100, opacity: 0 },
  show: { x: 0, opacity: 1 }
};
