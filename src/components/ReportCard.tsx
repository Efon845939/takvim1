'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertTriangle, 
  Calendar, 
  Car, 
  CloudRain, 
  Flame, 
  HeartPulse, 
  MapPin, 
  Stethoscope, 
  Users 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportCardProps {
  title: string;
  value: string | number;
  icon: 'alert' | 'calendar' | 'car' | 'rain' | 'fire' | 'heart' | 'map' | 'medical' | 'users';
  color?: string;
  description?: string;
}

/**
 * A reusable dashboard card for displaying metrics with icons.
 * Fixed non-existent icon names (Fire -> Flame, Medical -> Stethoscope)
 */
export function ReportCard({ title, value, icon, color, description }: ReportCardProps) {
  const icons = {
    alert: AlertTriangle,
    calendar: Calendar,
    car: Car,
    rain: CloudRain,
    fire: Flame,
    heart: HeartPulse,
    map: MapPin,
    medical: Stethoscope,
    users: Users
  };

  const IconComponent = icons[icon] || AlertTriangle;

  return (
    <Card className="overflow-hidden bg-slate-900 border-slate-800 text-white shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
        <IconComponent className={cn("h-4 w-4", color)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-slate-500 mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
