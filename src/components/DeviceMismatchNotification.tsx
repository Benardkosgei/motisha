'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface DeviceMismatchNotificationProps {
  show: boolean;
  onClose: () => void;
}

/**
 * Notification component shown when user is about to be logged out
 * due to device mismatch (account accessed from another device)
 */
export function DeviceMismatchNotification({ show, onClose }: DeviceMismatchNotificationProps) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!show) {
      setCountdown(5);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start mb-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          <div className="ml-4 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Account Active on Another Device
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Your account is now being accessed from another device. For security reasons, you will be logged out in{' '}
              <span className="font-bold text-amber-600">{countdown} seconds</span>.
            </p>
            <div className="bg-gray-50 rounded-md p-3 mb-4">
              <p className="text-xs text-gray-700">
                <strong>Note:</strong> Only one device can be active at a time. You can log back in on this device, which will log out the other device.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Stay Logged In
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors text-sm font-medium"
              >
                Logout Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
