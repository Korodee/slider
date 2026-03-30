import { ControlsBar } from "./components/controls-bar";
import { MobilePrototype } from "./components/mobile-prototype";

export default function App() {
  const isMobileRoute =
    typeof window !== "undefined" &&
    (window.location.pathname === "/mobile" || window.location.pathname === "/mobile/");

  return (
    <div className="flex min-h-dvh flex-col bg-gray-900">
      {isMobileRoute ? <MobilePrototype /> : <ControlsBar />}
    </div>
  );
}
