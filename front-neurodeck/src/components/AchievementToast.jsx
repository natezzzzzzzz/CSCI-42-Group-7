import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";

const AchievementNotificationContext = createContext();

export function AchievementNotificationProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);

  const notify = useCallback((achievement) => {
    setQueue((prev) => [...prev, achievement]);
  }, []);

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

export function useAchievementNotify() {
  return useContext(AchievementNotificationContext);
}

function AchievementToast({ achievement, onDismiss }) {
  const [exiting, setExiting] = useState(false);
  const dismissTimerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      dismissTimerRef.current = setTimeout(onDismiss, 300);
    }, 3700);
    return () => {
      clearTimeout(timer);
      clearTimeout(dismissTimerRef.current);
    };
  }, [onDismiss]);

  return (
    <div className={`ach-toast ${exiting ? "ach-toast-exit" : "ach-toast-enter"}`}>
      <div className="ach-toast-icon">{achievement.icon}</div>
      <div className="ach-toast-body">
        <div className="ach-toast-label">Achievement Unlocked!</div>
        <div className="ach-toast-name">{achievement.name}</div>
      </div>
    </div>
  );
}