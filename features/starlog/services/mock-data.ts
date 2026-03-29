import type { StarlogEntry } from '../types';

export const MOCK_STARLOG_ENTRIES: StarlogEntry[] = [
  {
    id: 'se1',
    userId: 'mock-user',
    goalId: '1',
    content: 'First run done! Only made it 1.5 miles but felt good to start. Legs were heavy but I pushed through the last quarter mile.',
    aiInsightRequested: true,
    classification: 'GROWTH',
    confidence: 0.85,
    themes: ['exercise', 'persistence'],
    aiResponse: 'Starting is the hardest part and you did it. That last quarter mile when your legs were heavy — that is where the real training happens.',
    processedAt: new Date('2026-03-25T19:00:00'),
    createdAt: new Date('2026-03-25T18:30:00'),
  },
  {
    id: 'se2',
    userId: 'mock-user',
    goalId: '1',
    content: 'Skipped my run today. Work was brutal and I just could not find the energy. Feeling guilty about it.',
    aiInsightRequested: true,
    classification: 'OBSTACLE',
    confidence: 0.78,
    themes: ['work-stress', 'guilt', 'energy'],
    aiResponse: 'Rest is part of training, not the absence of it. The guilt tells me this goal matters to you — that is more signal than one missed day.',
    processedAt: new Date('2026-03-27T21:00:00'),
    createdAt: new Date('2026-03-27T20:45:00'),
  },
  {
    id: 'se3',
    userId: 'mock-user',
    goalId: '1',
    content: 'Hit 2 miles today without stopping. Progress!',
    mediaUrl: 'https://placehold.co/400x300/E85D04/FFF?text=Run+Photo',
    aiInsightRequested: false,
    createdAt: new Date('2026-03-28T07:30:00'),
  },
];
