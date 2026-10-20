"use client";

import Image from 'next/image';
import { useState } from 'react';
import { DEFAULT_PROFILE_PHOTO, resolveProfilePhoto } from './profilePhotoSource.mjs';

export default function ProfilePhoto({ src, alt, ...props }) {
  const source = resolveProfilePhoto(src, process.env.NEXT_PUBLIC_API_URL);
  const [failedSource, setFailedSource] = useState(null);
  const displayed = failedSource === source ? DEFAULT_PROFILE_PHOTO : source;

  return (
    <Image
      {...props}
      src={displayed}
      alt={alt}
      unoptimized
      onError={() => {
        if (displayed !== DEFAULT_PROFILE_PHOTO) setFailedSource(source);
      }}
    />
  );
}
