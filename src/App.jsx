import AppDesktop from './AppDesktop';
import ReloadPrompt from './components/ReloadPrompt';

export default function App() {
  // Strategy: Unified UI. 
  // We strictly serve the Desktop UI. 
  // Orientation handling is done natively in AndroidManifest.
  return (
    <>
      <ReloadPrompt />
      <AppDesktop />
    </>
  );
}
