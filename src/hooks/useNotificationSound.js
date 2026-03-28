import { useCallback } from 'react';
import notificationSound from '../assets/audios/notifications.mp3';

export const useNotificationSound = () => {
  const playNotification = useCallback(() => {
    try {
      const audio = new Audio(notificationSound);
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('Audio playback prevented by browser (Click anywhere on the Dashboard first!):', error);
        });
      }
    } catch (err) {
      console.error('Failed to play audio:', err);
    }
  }, []);

  return playNotification;
};
