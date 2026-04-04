'use server';
/**
 * @fileOverview This file implements a Genkit flow for generating a personalized booking confirmation message.
 *
 * - generateBookingConfirmation - A function that generates a booking confirmation message.
 * - BookingConfirmationInput - The input type for the generateBookingConfirmation function.
 * - BookingConfirmationOutput - The return type for the generateBookingConfirmation function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const BookingConfirmationInputSchema = z.object({
  studentName: z.string().describe('The full name of the student who booked the appointment.'),
  date: z.string().describe('The date of the appointment in YYYY-MM-DD format.'),
  startTime: z.string().describe('The start time of the appointment in HH:mm format.'),
  endTime: z.string().describe('The end time of the appointment in HH:mm format.'),
});
export type BookingConfirmationInput = z.infer<typeof BookingConfirmationInputSchema>;

const BookingConfirmationOutputSchema = z.object({
  message: z.string().describe('The personalized booking confirmation message.'),
});
export type BookingConfirmationOutput = z.infer<typeof BookingConfirmationOutputSchema>;

export async function generateBookingConfirmation(input: BookingConfirmationInput): Promise<BookingConfirmationOutput> {
  return bookingConfirmationGeneratorFlow(input);
}

const confirmationPrompt = ai.definePrompt({
  name: 'bookingConfirmationPrompt',
  input: { schema: BookingConfirmationInputSchema },
  output: { schema: BookingConfirmationOutputSchema },
  prompt: `Merhaba {{studentName}},

Randevunuz {{date}} tarihinde saat {{startTime}}-{{endTime}} için başarıyla oluşturulmuştur.

Sintia Hoca ile görüşmeniz için sabırsızlanıyoruz.

Saygılarımızla,
Sintia Hoca Danışmanlık`,
});

const bookingConfirmationGeneratorFlow = ai.defineFlow(
  {
    name: 'bookingConfirmationGeneratorFlow',
    inputSchema: BookingConfirmationInputSchema,
    outputSchema: BookingConfirmationOutputSchema,
  },
  async (input) => {
    const { output } = await confirmationPrompt(input);
    return output!;
  }
);
