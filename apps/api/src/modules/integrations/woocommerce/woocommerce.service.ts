export interface WooCommerceConfig {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export interface WCProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  price: string;
  regular_price: string;
  description: string;
  short_description: string;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  images: Array<{ src: string }>;
  categories: Array<{ id: number; name: string }>;
}

export interface WCOrder {
  id: number;
  number: string;
  status: string;
  currency: string;
  total: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    address_1: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    quantity: number;
    total: string;
  }>;
  meta_data: Array<{ key: string; value: any }>;
}

export class WooCommerceService {
  private timeoutMs = 10000; // 10s timeout per AGENT_INSTRUCTIONS.md

  /**
   * Fetches products list with pagination from WooCommerce REST API v3.
   */
  async fetchProducts(config: WooCommerceConfig, page: number = 1, perPage: number = 50): Promise<WCProduct[]> {
    const url = `${config.storeUrl.replace(/\/$/, '')}/wp-json/wc/v3/products?page=${page}&per_page=${perPage}`;
    const authHeader = 'Basic ' + Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');

    // In local dev/test or mock keys, return simulated product catalog
    if (process.env.NODE_ENV === 'test' || config.consumerKey.startsWith('mock_')) {
      return [
        {
          id: 101,
          name: 'Handmade Truffle Pasta',
          slug: 'handmade-truffle-pasta',
          permalink: `${config.storeUrl}/product/truffle-pasta`,
          price: '28.00',
          regular_price: '28.00',
          description: 'Authentic handmade pasta tossed with winter black truffles.',
          short_description: 'Handmade truffle pasta with Parmigiano.',
          stock_status: 'instock',
          images: [{ src: 'https://images.unsplash.com/photo-pasta' }],
          categories: [{ id: 1, name: 'Main Courses' }],
        },
        {
          id: 102,
          name: 'Classic Tiramisu',
          slug: 'classic-tiramisu',
          permalink: `${config.storeUrl}/product/tiramisu`,
          price: '12.00',
          regular_price: '12.00',
          description: 'Espresso-soaked ladyfingers layered with mascarpone cream.',
          short_description: 'Traditional Italian tiramisu.',
          stock_status: 'instock',
          images: [{ src: 'https://images.unsplash.com/photo-tiramisu' }],
          categories: [{ id: 2, name: 'Desserts' }],
        },
      ];
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`WooCommerce API Error [${response.status}]: ${response.statusText}`);
      }

      return (await response.json()) as WCProduct[];
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Fetches order details by order ID.
   */
  async fetchOrder(config: WooCommerceConfig, orderId: string | number): Promise<WCOrder | null> {
    const url = `${config.storeUrl.replace(/\/$/, '')}/wp-json/wc/v3/orders/${orderId}`;
    const authHeader = 'Basic ' + Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');

    if (process.env.NODE_ENV === 'test' || config.consumerKey.startsWith('mock_')) {
      return {
        id: Number(orderId),
        number: String(orderId),
        status: 'completed',
        currency: 'USD',
        total: '40.00',
        billing: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '+15551234567',
        },
        shipping: {
          first_name: 'John',
          last_name: 'Doe',
          address_1: '123 Market St',
          city: 'San Francisco',
          state: 'CA',
          postcode: '94105',
          country: 'US',
        },
        line_items: [
          { id: 1, name: 'Handmade Truffle Pasta', product_id: 101, quantity: 1, total: '28.00' },
          { id: 2, name: 'Classic Tiramisu', product_id: 102, quantity: 1, total: '12.00' },
        ],
        meta_data: [
          { key: '_tracking_number', value: 'FX-8392019482' },
          { key: '_tracking_provider', value: 'FedEx' },
        ],
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`WooCommerce API Error [${response.status}]: ${response.statusText}`);
      }

      return (await response.json()) as WCOrder;
    } finally {
      clearTimeout(timer);
    }
  }
}

export const wooCommerceService = new WooCommerceService();
