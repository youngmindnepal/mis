// components/Avatar.js
'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function Avatar({ src, alt, size = 40, className = '' }) {
  const [error, setError] = useState(false);

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate a consistent color based on name
  const getColorFromName = (name) => {
    const colors = [
      'from-red-500 to-red-600',
      'from-blue-500 to-blue-600',
      'from-green-500 to-green-600',
      'from-yellow-500 to-yellow-600',
      'from-purple-500 to-purple-600',
      'from-pink-500 to-pink-600',
      'from-indigo-500 to-indigo-600',
      'from-teal-500 to-teal-600',
    ];

    if (!name) return colors[0];

    const index = name.length % colors.length;
    return colors[index];
  };

  // If there's an error loading image or no image, show initials
  if (error || !src) {
    return (
      <div
        className={`bg-gradient-to-br ${getColorFromName(
          alt
        )} rounded-lg flex items-center justify-center text-white font-medium ${className}`}
        style={{ width: size, height: size }}
      >
        {getInitials(alt)}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-lg object-cover ${className}`}
      onError={() => setError(true)}
    />
  );
}
