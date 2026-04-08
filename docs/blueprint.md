# **App Name**: Takvimer

## Core Features:

- Hardcoded Schedule Slot Generation: Dynamically generate 15-minute appointment slots based strictly on Sintia Hoca's predefined weekly availability, automatically graying out unavailable days.
- Real-time Slot Availability: Display appointment slots with their current booking status from Firestore, instantly disabling ('Dolu' - Booked) any occupied slots via onSnapshot for real-time updates.
- Student Booking Interface: Allow students to easily select an available 15-minute slot, enter their full name ('Adınız Soyadınız'), and book the appointment without needing an account.
- Secure Slot Booking & Prevention: Ensure double-booking is prevented by atomically writing appointment data to Firestore upon booking, ensuring each slot can only be taken once.
- Responsive Mobile Design: Provide a mobile-first, responsive user interface optimized for phone screens using Tailwind CSS, suitable for access via QR code.
- AI Confirmation Message Tool: Utilize a generative AI tool to craft a personalized and polite confirmation message for students immediately after a successful booking, incorporating the booking details.
- Counselor Admin Dashboard: A simple '/admin' view for Sintia Hoca to see a chronological list of all upcoming booked student appointments.

## Style Guidelines:

- Light color scheme. Primary: A professional, calming medium blue (`#2978CC`) representing trust and focus. Background: A very light, subtle blue (`#E4ECF4`) for a clean and open feel. Accent: A vibrant aqua (`#56DFDF`) for clear call-to-actions and highlights.
- Headline and body font: 'PT Sans', a humanist sans-serif for a modern, approachable, and highly readable text experience across the application.
- Utilize simple, clean line-art icons that provide intuitive visual cues for actions like date selection, booking confirmation, and navigation, maintaining a professional aesthetic.
- A mobile-first layout with generous padding and clear content separation for ease of use on smaller screens, dynamically adjusting to larger viewports. Time slots and forms will be stacked vertically on mobile.
- Subtle, fluid transition animations for UI element states (e.g., button clicks, slot selection, form submission) to provide positive user feedback without distracting.