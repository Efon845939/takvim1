'use server';
/**
 * @fileOverview Calendar Helper AI agent.
 *
 * - calendarHelper - A function that handles calendar-related queries.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CalendarHelperInputSchema = z.object({
  message: z.string().describe('The user message or question about the calendar.'),
  userContext: z.string().optional().describe('Context about the user or their current calendar state.'),
});

const CalendarHelperOutputSchema = z.object({
  reply: z.string().describe('The AI response to the user.'),
});

export async function calendarHelper(input: z.infer<typeof CalendarHelperInputSchema>) {
  const { output } = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    system: `Sen profesyonel bir Takvim ve Planlama Asistanısın. 
    Kullanıcılara randevularını yönetme, etkinlik oluşturma ve takvim özelliklerini kullanma konusunda yardımcı oluyorsun.
    Dilin nazik, yardımsever ve çözüm odaklı olmalı. Yanıtlarını Türkçe ver.`,
    prompt: `Kullanıcı Mesajı: ${input.message}\nBağlam: ${input.userContext || 'Genel takvim kullanımı'}`,
    output: { schema: CalendarHelperOutputSchema }
  });
  return output!;
}
