import { dolibarrClient } from '@/lib/dolibarr/client';
import type { DolibarrProduct } from '@/lib/dolibarr/types';
import { getProductById, getProductImage, getProducts } from './products';
import type { AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/dolibarr/client', () => ({
  dolibarrClient: {
    get: vi.fn()
  },
  getDolibarrAuthHeaders: (apiKey?: string) => ({ DOLAPIKEY: apiKey })
}));

const product: DolibarrProduct = {
  id: '42',
  ref: 'ART-42',
  label: 'Article test',
  description: 'Description',
  price: '12.00',
  price_ht: '10.00',
  tva_tx: '20',
  stock_reel: 8,
  fk_unit: '1'
};

describe('Dolibarr products API functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches products with filters', async () => {
    const getMock = vi.mocked(dolibarrClient.get);
    getMock.mockResolvedValue({ data: [product] } as AxiosResponse<DolibarrProduct[]>);

    const products = await getProducts(
      { search: 'art', category: 'cables', limit: 10 },
      'user-token'
    );

    expect(products).toEqual([product]);
    expect(getMock).toHaveBeenCalledWith('/products', {
      headers: {
        DOLAPIKEY: 'user-token'
      },
      params: {
        category: 'cables',
        search: 'art',
        limit: 10
      }
    });
  });

  it('fetches a product by id', async () => {
    const getMock = vi.mocked(dolibarrClient.get);
    getMock.mockResolvedValue({ data: product } as AxiosResponse<DolibarrProduct>);

    const result = await getProductById('42', 'user-token');

    expect(result).toEqual(product);
    expect(getMock).toHaveBeenCalledWith('/products/42', {
      headers: {
        DOLAPIKEY: 'user-token'
      }
    });
  });

  it('downloads a product image when Dolibarr omits the content type', async () => {
    const getMock = vi.mocked(dolibarrClient.get);
    getMock
      .mockResolvedValueOnce({ data: product } as AxiosResponse<DolibarrProduct>)
      .mockResolvedValueOnce({
        data: [
          {
            level1name: 'produit',
            relativename: 'ART-42/photo-principale.png',
            filename: 'photo-principale.png'
          }
        ]
      } as AxiosResponse)
      .mockResolvedValueOnce({
        data: {
          filename: 'photo-principale.png',
          'content-type': '',
          content: Buffer.from('image-content').toString('base64')
        }
      } as AxiosResponse);

    const image = await getProductImage('42', 'user-token');

    expect(image).toEqual({
      buffer: Buffer.from('image-content'),
      contentType: 'image/png'
    });
    expect(getMock).toHaveBeenNthCalledWith(1, '/products/42', {
      headers: {
        DOLAPIKEY: 'user-token'
      }
    });
    expect(getMock).toHaveBeenNthCalledWith(2, '/documents', {
      headers: {
        DOLAPIKEY: 'user-token'
      },
      params: { modulepart: 'product', id: '42' }
    });
    expect(getMock).toHaveBeenNthCalledWith(3, '/documents/download', {
      headers: {
        DOLAPIKEY: 'user-token'
      },
      params: {
        modulepart: 'product',
        original_file: 'produit/ART-42/photo-principale.png'
      }
    });
  });
});
