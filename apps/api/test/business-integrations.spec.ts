import { wooCommerceService } from '../src/modules/integrations/woocommerce/woocommerce.service';
import { productSyncService } from '../src/modules/integrations/woocommerce/product-sync.service';
import { orderTrackingService } from '../src/modules/integrations/woocommerce/order-tracking.service';
import { bookingService } from '../src/modules/booking/booking.service';
import { slotConflictLocker } from '../src/modules/booking/conflict-locker.service';
import { calendarSyncService } from '../src/modules/integrations/calendar/calendar-sync.service';

describe('Phase 4: Business Tools & Integrations Engine Tests', () => {
  const mockWcConfig = {
    storeUrl: 'https://bistro-store.com',
    consumerKey: 'mock_key_123',
    consumerSecret: 'mock_secret_456',
  };

  describe('WooCommerce Integration', () => {
    it('fetches products from store catalog', async () => {
      const products = await wooCommerceService.fetchProducts(mockWcConfig);
      expect(products.length).toBeGreaterThan(0);
      expect(products[0]).toHaveProperty('name');
      expect(products[0]).toHaveProperty('price');
      expect(products[0].stock_status).toBe('instock');
    });

    it('syncs products into tenant catalog and vector chunks', async () => {
      const result = await productSyncService.syncCatalog('mock-tenant-id', mockWcConfig);
      expect(result.syncedCount).toBeGreaterThan(0);
    });

    it('tracks order and authorizes when customer phone matches billing', async () => {
      const result = await orderTrackingService.trackOrder(mockWcConfig, '1001', '+15551234567');
      expect(result.found).toBe(true);
      expect(result.authorized).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.carrier).toBe('FedEx');
      expect(result.trackingUrl).toContain('fedex.com');
    });

    it('denies order details when customer phone does not match billing', async () => {
      const result = await orderTrackingService.trackOrder(mockWcConfig, '1001', '+15559999999');
      expect(result.found).toBe(true);
      expect(result.authorized).toBe(false);
      expect(result.status).toBe('unauthorized');
      expect(result.message).toContain('verify the billing email or phone number');
    });
  });

  describe('Native Calendar Booking Engine & Conflict Locker', () => {
    it('calculates available slots for business hours', async () => {
      const slots = await bookingService.getAvailableSlots('mock-tenant-id', '2026-10-15', 60);
      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0]).toHaveProperty('displayTime');
      expect(slots[0]).toHaveProperty('available');
    });

    it('acquires and releases slot reservation lock', async () => {
      const slotTime = '2026-10-15T10:00:00.000Z';
      const token = await slotConflictLocker.acquireSlotLock('mock-tenant-id', slotTime);
      expect(token).not.toBeNull();

      // Concurrent attempt should be blocked
      const token2 = await slotConflictLocker.acquireSlotLock('mock-tenant-id', slotTime);
      expect(token2).toBeNull();

      // Release slot lock
      const released = await slotConflictLocker.releaseSlotLock('mock-tenant-id', slotTime, token!);
      expect(released).toBe(true);
    });

    it('safely reserves an appointment with lock protection', async () => {
      const result = await bookingService.reserveAppointment({
        tenantId: 'mock-tenant-id',
        contactId: 'mock-contact-id',
        serviceName: 'Dinner Reservation (Table for 2)',
        startTime: '2026-10-15T18:00:00.000Z',
      });

      expect(result.success).toBe(true);
      expect(result.serviceName).toBe('Dinner Reservation (Table for 2)');
    });
  });

  describe('External Calendar Sync Connector', () => {
    it('exports event to Google Calendar with video meeting link', async () => {
      const result = await calendarSyncService.exportEventToCalendar('google', {}, {
        title: 'Dr. Smith Consultation',
        startTime: '2026-10-15T14:00:00.000Z',
        endTime: '2026-10-15T14:30:00.000Z',
        customerName: 'Alice Smith',
      });

      expect(result.externalEventId).toContain('google_evt');
      expect(result.meetingLink).toContain('meet.google.com');
    });

    it('fetches busy time ranges for external provider', async () => {
      const busy = await calendarSyncService.fetchBusyRanges('google', {}, {
        start: '2026-10-15T00:00:00.000Z',
        end: '2026-10-15T23:59:59.000Z',
      });

      expect(busy.length).toBeGreaterThan(0);
      expect(busy[0]).toHaveProperty('start');
      expect(busy[0]).toHaveProperty('end');
    });
  });
});
