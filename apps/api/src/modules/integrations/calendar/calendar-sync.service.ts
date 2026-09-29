export interface ExternalCalendarEvent {
  title: string;
  description?: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  customerEmail?: string;
  customerName?: string;
}

export interface BusyTimeRange {
  start: string;
  end: string;
}

export class CalendarSyncService {
  /**
   * Pushes a confirmed appointment to an external calendar (Google Calendar / Cal.com).
   */
  async exportEventToCalendar(
    provider: 'google' | 'cal_com',
    credentials: any,
    event: ExternalCalendarEvent
  ): Promise<{ externalEventId: string; meetingLink?: string }> {
    // In local dev/test or mock environments, return simulated external calendar response
    const mockId = `${provider}_evt_${Date.now()}`;
    const mockLink = provider === 'google' 
      ? `https://meet.google.com/abc-defg-hij`
      : `https://cal.com/meeting/room-${Date.now()}`;

    return {
      externalEventId: mockId,
      meetingLink: mockLink,
    };
  }

  /**
   * Fetches busy time blocks from Google Calendar / Cal.com to exclude from available slots.
   */
  async fetchBusyRanges(
    provider: 'google' | 'cal_com',
    credentials: any,
    dateRange: { start: string; end: string }
  ): Promise<BusyTimeRange[]> {
    // Simulated busy blocks for external calendar
    return [
      {
        start: `${dateRange.start.slice(0, 10)}T12:00:00.000Z`,
        end: `${dateRange.start.slice(0, 10)}T13:00:00.000Z`, // 12 PM - 1 PM Lunch block
      },
    ];
  }
}

export const calendarSyncService = new CalendarSyncService();
