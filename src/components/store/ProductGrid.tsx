'use client';

import { ProductCard } from '@/components/store/ProductCard';
import type { DolibarrProduct } from '@/lib/dolibarr/types';
import { fadeUp, staggerContainer } from '@/variants';
import { motion } from 'framer-motion';

interface ProductGridProps {
  products: DolibarrProduct[];
  viewMode: 'grid' | 'list';
  onAdd: (product: DolibarrProduct, qty: number) => void;
}

export function ProductGrid({ products, viewMode, onAdd }: ProductGridProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial='hidden'
      animate='show'
      className={
        viewMode === 'grid'
          ? 'grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
          : 'space-y-3'
      }
    >
      {products.map((product) => (
        <motion.div variants={fadeUp} key={product.id}>
          <ProductCard product={product} viewMode={viewMode} onAdd={(qty) => onAdd(product, qty)} />
        </motion.div>
      ))}
    </motion.div>
  );
}
