import { useState, useEffect } from 'react';
import AppDesktop from './AppDesktop';
import AppMobile from './AppMobile';
import ReloadPrompt from './components/ReloadPrompt';

export default function App() {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const checkDevice = () => {
      // We check the SMALLEST dimension of the screen.
      // - Phone (Portrait): width is ~400, height ~900. Min is 400.
      // - Phone (Landscape): width ~900, height ~400. Min is 400.
      // - Tablet: width ~1200, height ~800. Min is 800.

      const smallestDimension = Math.min(window.innerWidth, window.innerHeight);

      // 600px is the standard Android cutoff for 7-inch tablets.
      // Since your tablet is 12.7" (huge), it will definitely be > 600.
      setIsMobile(smallestDimension < 600);

      console.log(
        `Screen: ${window.innerWidth}x${
          window.innerHeight
        } | Smallest: ${smallestDimension}px | Mode: ${
          smallestDimension < 600 ? 'Mobile' : 'Desktop'
        }`
      );
    };

    // Run on startup
    checkDevice();

    // Run whenever the user rotates the device
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return (
    <>
      <ReloadPrompt />
      {isMobile ? <AppMobile /> : <AppDesktop />}
    </>
  );
}
