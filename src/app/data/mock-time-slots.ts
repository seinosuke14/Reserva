export interface TimeSlot {
  time: string;
  isOccupied: boolean;
}

export const MOCK_TIME_SLOTS: TimeSlot[] = [
  { time: '09:00', isOccupied: false },
  { time: '09:30', isOccupied: true  },
  { time: '10:00', isOccupied: false },
  { time: '10:30', isOccupied: false },
  { time: '11:00', isOccupied: false },
  { time: '11:30', isOccupied: true  },
  { time: '12:00', isOccupied: false },
  { time: '12:30', isOccupied: false },
  { time: '15:00', isOccupied: false },
  { time: '15:30', isOccupied: false },
  { time: '16:00', isOccupied: false },
  { time: '16:30', isOccupied: true  },
  { time: '17:00', isOccupied: false },
  { time: '17:30', isOccupied: false },
];