import { useState, useEffect } from 'react';
// Import your two distinct interfaces
import AppDesktop from './AppDesktop';
import AppMobile from './AppMobile'; // This is the file we fixed earlier

export default function App() {
  // Logic: If width is less than 768px (standard tablet breakpoint), it's a phone.
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    // Listen for screen resizing (e.g. rotating the tablet)
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup listener on unmount
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // The Switch
  return isMobile ? <AppMobile /> : <AppDesktop />;
}
