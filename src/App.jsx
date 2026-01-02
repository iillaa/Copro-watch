import AppDesktop from './AppDesktop';
import ReloadPrompt from './components/ReloadPrompt';

function App() {
  // STRICT MODE: Always render the Desktop/Tablet UI.
  // CSS Media Queries will handle the resizing for phones.
  return (
    <>
      <ReloadPrompt />
      <AppDesktop />
    </>
  );
}

export default App;