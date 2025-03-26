'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timer, Download, Pause } from "lucide-react";

type Activity = 'moving' | 'traffic' | 'dwelling' | null;
type TimeEntry = {
  activity: Activity;
  startTime: number;
  endTime: number | null;
};

export default function Home() {
  const [currentActivity, setCurrentActivity] = useState<Activity>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>("00:00.000");

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (currentActivity) {
      const currentStartTime = timeEntries[timeEntries.length - 1].startTime;
      
      intervalId = setInterval(() => {
        const elapsed = Date.now() - currentStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        const milliseconds = elapsed % 1000;
        
        setElapsedTime(
          `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`
        );
      }, 10); // Update every 10ms for smooth milliseconds display
    } else {
      setElapsedTime("00:00.000");
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentActivity, timeEntries]);

  const handleActivityClick = (activity: Activity) => {
    const now = Date.now();
    
    // End the current activity if there is one
    if (currentActivity) {
      setTimeEntries(prev => prev.map(entry => 
        entry.endTime === null ? { ...entry, endTime: now } : entry
      ));
    }

    // Start the new activity if it's different from the current one
    if (activity !== currentActivity) {
      setTimeEntries(prev => [...prev, {
        activity,
        startTime: now,
        endTime: null
      }]);
      setCurrentActivity(activity);
      if (startTime === null) setStartTime(now);
    } else {
      setCurrentActivity(null);
    }
  };

  const formatTimeForCSV = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (startTime: number, endTime: number): string => {
    const duration = endTime - startTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    const milliseconds = duration % 1000;
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  const exportToCSV = async () => {
    const headers = ['activity_type', 'start_time', 'end_time', 'duration'];
    const rows = timeEntries.map(entry => {
      const endTime = entry.endTime || Date.now();
      const duration = formatDuration(entry.startTime, endTime);
      return `${entry.activity},${formatTimeForCSV(entry.startTime)},${formatTimeForCSV(endTime)},${duration}`;
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const fileName = `bus-timing-${new Date().toISOString().split('T')[0]}.csv`;
    const blob = new Blob([csv], { type: 'text/csv' });

    try {
      // Check if the browser supports the Native Share API and files sharing
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'text/csv' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Bus Timing Data',
            text: 'Export of bus timing data'
          });
          return;
        }
      }

      // Fallback for desktop or when share API is not available
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      // Fallback method for iOS Safari and other browsers
      window.location.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    }
  };

  const calculateDurations = () => {
    const durations = {
      moving: 0,
      traffic: 0,
      dwelling: 0
    };

    timeEntries.forEach(entry => {
      const end = entry.endTime || Date.now();
      const duration = end - entry.startTime;
      if (entry.activity) {
        durations[entry.activity] += duration;
      }
    });

    const total = durations.moving + durations.traffic + durations.dwelling;
    return {
      moving: (durations.moving / total * 100).toFixed(1),
      traffic: (durations.traffic / total * 100).toFixed(1),
      dwelling: (durations.dwelling / total * 100).toFixed(1)
    };
  };

  const durations = calculateDurations();

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Bus Activity Timer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentActivity && (
            <div className="text-center mb-6">
              <div className="font-mono text-4xl font-bold mb-2">{elapsedTime}</div>
              <Badge variant="outline" className="text-base">
                {currentActivity.charAt(0).toUpperCase() + currentActivity.slice(1)}
              </Badge>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3">
            <Button 
              className={`h-16 text-lg ${currentActivity === 'moving' ? 'bg-green-600 hover:bg-green-700' : ''}`}
              onClick={() => handleActivityClick('moving')}
            >
              {currentActivity === 'moving' ? 'Stop Moving' : 'Start Moving'}
            </Button>
            <Button 
              className={`h-16 text-lg ${currentActivity === 'traffic' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}
              onClick={() => handleActivityClick('traffic')}
            >
              {currentActivity === 'traffic' ? 'Stop Traffic' : 'Start Traffic'}
            </Button>
            <Button 
              className={`h-16 text-lg ${currentActivity === 'dwelling' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              onClick={() => handleActivityClick('dwelling')}
            >
              {currentActivity === 'dwelling' ? 'Stop Dwelling' : 'Start Dwelling'}
            </Button>
          </div>

          {timeEntries.length > 0 && (
            <div className="space-y-4 mt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Time Split</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportToCSV}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Moving:</span>
                  <Badge variant="default" className="bg-green-600">
                    {durations.moving}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Traffic:</span>
                  <Badge variant="default" className="bg-yellow-600">
                    {durations.traffic}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Dwelling:</span>
                  <Badge variant="default" className="bg-blue-600">
                    {durations.dwelling}%
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}