export interface IScheduleBlock {
  id: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  reason?: string;
}

export let MOCK_SCHEDULE_BLOCKS: IScheduleBlock[] = [
  { id: 'b1', startDate: '2026-04-02', startTime: '10:00', endDate: '2026-04-02', endTime: '12:00', reason: 'Mantenimiento de equipos' }
];

export const addScheduleBlock = (block: IScheduleBlock): void => {
  MOCK_SCHEDULE_BLOCKS = [...MOCK_SCHEDULE_BLOCKS, block];
};

export const removeScheduleBlock = (id: string): void => {
  MOCK_SCHEDULE_BLOCKS = MOCK_SCHEDULE_BLOCKS.filter(b => b.id !== id);
};