import { useState, useEffect, createContext, useContext, useCallback } from "react";

// This component provides a context for showing achievement unlock notifications as toasts. It manages a queue of pending notifications and ensures they display one at a time without stacking.
const AchievementNotificationContext = createContext();

// The provider component that wraps the app and manages the achievement notification state and logic.
export function AchievementNotificationProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);

  const notify = useCallback((achievement) => {
    setQueue((prev) => [...prev, achievement]);
  }, []);

  // This effect manages the display of achievement notifications. 
  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((prev) => prev.slice(1));
      const timer = setTimeout(() => setCurrent(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [current, queue]);

  return (
    <AchievementNotificationContext.Provider value={notify}>
      {children}
      {current && <AchievementToast achievement={current} onDismiss={() => setCurrent(null)} />}
    </AchievementNotificationContext.Provider>
  );
}

// This hook allows any component to trigger an achievement toast by calling the returned function with the achievement data.
export function useAchievementNotify() {
  return useContext(AchievementNotificationContext);
}

// This component displays an individual achievement unlock notification.
function AchievementToast({ achievement, onDismiss }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 300);
    }, 3700);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`ach-toast ${exiting ? "ach-toast-exit" : "ach-toast-enter"}`}>
      <div className="ach-toast-body">
        <div className="ach-toast-label">Achievement Unlocked!</div>
        <div className="ach-toast-name">{achievement.name} <span className="ach-toast-arrow">&#8594;</span> {achievement.description}</div>
      </div>
    </div>
  );
}